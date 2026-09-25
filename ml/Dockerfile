# ══════════════════════════════════════════════════════════════════════════════
# IBVAP ML Inference – Hugging Face Docker Space
# ──────────────────────────────────────────────────────────────────────────────
# Deploys the full ml/ tree (src/, api/, video/, worker, config, weights)
# as a CPU-only inference container.
#
# LAYER ORDER is deliberate for Docker-cache efficiency:
#   1. System packages        (~2 min, rarely changes)
#   2. PyTorch CPU wheels     (~3 min, pinned version)
#   3. PaddlePaddle CPU       (~2 min, pinned version)
#   4. requirements.txt       (~3 min, changes occasionally)
#   5. Application code       (<10s, changes frequently)
#
# SINGLE WORKER is deliberate: YOLO + PaddleOCR + ORT each hold multi-GB
# resident memory. HF free-tier Spaces cap at 16 GB RAM. Scale by cloning
# the Space (horizontal), NOT by adding --workers (vertical → OOM).
# ══════════════════════════════════════════════════════════════════════════════

FROM python:3.10-slim-bookworm

# ── Environment hardening ────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Redirect EVERY model / cache directory to HF's persistent /data volume.
    # Without this each cold boot re-downloads hundreds of MB of weights,
    # burning CPU allowance and hitting network timeouts.
    HF_HOME=/data/hf_home \
    XDG_CACHE_HOME=/data/cache \
    TORCH_HOME=/data/torch \
    YOLO_CONFIG_DIR=/data/yolo_config \
    MPLCONFIGDIR=/data/mpl \
    NUMBA_CACHE_DIR=/data/numba \
    # Default port for HF Spaces; overridden by $PORT at runtime.
    PORT=7860

# ── System dependencies ─────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
        ffmpeg \
        curl \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# ── PyTorch CPU-ONLY ─────────────────────────────────────────────────────────
# MUST install from the CPU index FIRST. Default PyPI pulls ~2.5 GB of
# nvidia-cuda-* wheels that serve no purpose on a CPU Space and will OOM
# or time-out the builder.
RUN pip install torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu

# ── PaddlePaddle CPU ─────────────────────────────────────────────────────────
# paddlepaddle is NOT on default PyPI. It is a mandatory runtime dependency
# of paddleocr — without it you get ImportError at import time.
# Pin to a version with confirmed stable py3.10 CPU wheels.
RUN pip install paddlepaddle==2.6.2 \
        -f https://www.paddlepaddle.org.cn/packages/stable/cpu/

# ── Python dependencies ─────────────────────────────────────────────────────
# COPY requirements.txt first (separate layer) so code-only edits don't
# bust the ~10 min dependency layer.
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt \
    # paddleocr's setup.py may pin opencv-python<=4.6 and silently downgrade
    # the headless build, breaking ultralytics. Re-assert AFTER install.
    && pip install --force-reinstall "opencv-python-headless>=4.6.0.66" \
    && rm /tmp/requirements.txt

# ── Non-root user (HF requirement: uid 1000, named "user") ──────────────────
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

# Pre-create cache directories.  /data is mounted at runtime, so these may
# silently fail at build time — that is fine; the app creates them at startup.
RUN mkdir -p /data/hf_home /data/cache /data/torch /data/yolo_config \
             /data/mpl /data/numba 2>/dev/null || true

# ── Application code (LAST for fast rebuilds) ────────────────────────────────
COPY --chown=user:user . .

EXPOSE 7860

# tini as PID 1 ensures HF's SIGTERM propagates cleanly to uvicorn instead
# of a SIGKILL that orphans in-flight requests and corrupts model downloads.
ENTRYPOINT ["tini", "--"]

# Health check with a long start-period to cover first-time model downloads
# which can take 3–5 minutes on the free tier.
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

# Single worker — see comment at top of file.
# Use shell form so $PORT expands at runtime.  `exec` replaces sh so tini
# can signal python directly.
CMD ["sh", "-c", "exec python -m uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1 --timeout-keep-alive 75"]
