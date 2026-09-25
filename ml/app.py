"""
app.py – IBVAP ML Inference API entry point for Hugging Face Docker Space.

This file is the uvicorn target (CMD runs `uvicorn app:app`).  It wraps the
existing src/ modules with lazy, fault-tolerant model loading so:
  - GET / answers 200 immediately (even while multi-GB models download)
  - One model failure degrades that capability instead of crash-looping
  - Upload guards prevent OOM-kills from huge images

The existing api/main.py is left untouched for local development.
"""

from __future__ import annotations

import base64
import logging
import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import yaml
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("ibvap")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)

ROOT = Path(__file__).resolve().parent  # ml/

# ═════════════════════════════════════════════════════════════════════════════
# Configuration – config.yaml with env-var overrides
# ═════════════════════════════════════════════════════════════════════════════

def _coerce(value: str, exemplar: Any) -> Any:
    """Coerce an env-var string to the type of the YAML default.
    Falls back to the raw string on any parse error so a bad override
    never crashes startup."""
    if exemplar is None:
        return value
    try:
        if isinstance(exemplar, bool):
            return value.lower() in ("1", "true", "yes")
        if isinstance(exemplar, int):
            return int(value)
        if isinstance(exemplar, float):
            return float(value)
        if isinstance(exemplar, (dict, list)):
            return yaml.safe_load(value)
    except (ValueError, yaml.YAMLError):
        pass
    return value


def _load_config() -> dict[str, Any]:
    cfg_path = ROOT / "config.yaml"
    cfg: dict[str, Any] = {}
    if cfg_path.exists():
        cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    # Env-var overrides (CONFIG_KEY → config_key)
    for key in list(cfg.keys()):
        env = os.environ.get(key.upper())
        if env is not None:
            cfg[key] = _coerce(env, cfg[key])
    # Extra env vars not declared in the YAML
    for extra in ("REDIS_URL", "BACKEND_URL", "PORT"):
        val = os.environ.get(extra)
        if val and extra.lower() not in cfg:
            cfg[extra.lower()] = val
    return cfg


CONFIG: dict[str, Any] = _load_config()

# ═════════════════════════════════════════════════════════════════════════════
# Model Registry – thread-safe, lazy, per-model try/except
# ═════════════════════════════════════════════════════════════════════════════

class ModelRegistry:
    """Each model loads in its own try/except so one failure degrades that
    capability instead of crash-looping the Space."""

    def __init__(self) -> None:
        self._models: dict[str, Any] = {}
        self._status: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._warming = False

    # ── individual loaders ───────────────────────────────────────────────

    def _load_yolo(self) -> Any | None:
        try:
            from src.detector import YOLODetector, select_device
            path = CONFIG.get("model_path", "yolo11n.pt")
            if not Path(path).is_absolute():
                path = str(ROOT / path)
            device = select_device(CONFIG.get("device"))
            det = YOLODetector(
                path,
                CONFIG.get("confidence_threshold", 0.35),
                device,
                CONFIG.get("classes"),
            )
            # Warm up with a tiny dummy frame to JIT-compile internal ops
            det.predict(np.zeros((32, 32, 3), dtype=np.uint8))
            logger.info("YOLO loaded on %s from %s", device, path)
            return det
        except Exception as exc:
            logger.error("YOLO load failed: %s", exc, exc_info=True)
            return None

    def _load_ocr(self) -> Any | None:
        try:
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(
                use_angle_cls=True, lang="en", use_gpu=False, show_log=False,
            )
            logger.info("PaddleOCR loaded (CPU)")
            return ocr
        except Exception as exc:
            logger.error("PaddleOCR load failed: %s", exc, exc_info=True)
            return None

    def _load_onnx(self) -> Any | None:
        try:
            import onnxruntime as ort
            path = CONFIG.get(
                "face_model_path", ".insightface/buffalo_l/w600k_r50.onnx"
            )
            if not Path(path).is_absolute():
                path = str(ROOT / path)
            if not Path(path).exists():
                logger.warning("ONNX model not found: %s", path)
                return None
            sess = ort.InferenceSession(
                path, providers=["CPUExecutionProvider"],
            )
            logger.info("ONNX session loaded from %s", path)
            return sess
        except Exception as exc:
            logger.error("ONNX load failed: %s", exc, exc_info=True)
            return None

    # ── warm-up (runs in background thread) ──────────────────────────────

    def warm_all(self) -> None:
        """Load every enabled model.  Runs in a daemon thread so GET /
        answers 200 immediately while multi-GB models are downloading."""
        self._warming = True
        enabled = CONFIG.get("enabled_modules", {})

        loaders: list[tuple[str, Any, bool]] = [
            ("yolo", self._load_yolo, enabled.get("yolo", True)),
            ("ocr",  self._load_ocr,  enabled.get("ocr", False)),
            ("onnx", self._load_onnx, enabled.get("onnx", False)),
        ]

        for name, loader, is_on in loaders:
            if not is_on:
                with self._lock:
                    self._status[name] = {"status": "disabled", "warm_ms": 0}
                continue
            t0 = time.monotonic()
            model = loader()
            ms = round((time.monotonic() - t0) * 1000, 1)
            with self._lock:
                if model is not None:
                    self._models[name] = model
                    self._status[name] = {"status": "ready", "warm_ms": ms}
                else:
                    self._status[name] = {"status": "failed", "warm_ms": ms}

        self._warming = False
        logger.info("Warm-up complete: %s", self._status)

    # ── accessors ────────────────────────────────────────────────────────

    def get(self, name: str) -> Any | None:
        with self._lock:
            return self._models.get(name)

    def health(self) -> dict[str, Any]:
        with self._lock:
            return {"warming": self._warming, "models": dict(self._status)}


registry = ModelRegistry()


# ═════════════════════════════════════════════════════════════════════════════
# BullMQ Queue singleton
# ═════════════════════════════════════════════════════════════════════════════
# CACHED at module level.  Building a Queue per request leaks one Redis
# connection pool per request.

_queue_instance: Any | None = None
_queue_lock = threading.Lock()


def _get_queue() -> Any | None:
    global _queue_instance
    if _queue_instance is not None:
        return _queue_instance

    redis_url = CONFIG.get("redis_url") or os.environ.get("REDIS_URL")
    if not redis_url:
        return None

    with _queue_lock:
        if _queue_instance is not None:
            return _queue_instance
        try:
            from bullmq_compat import create_queue
            _queue_instance = create_queue(
                CONFIG.get("queue_name", "ibvap-inference"), redis_url,
            )
            logger.info("BullMQ queue connected (%s)", redis_url.split("@")[-1])
            return _queue_instance
        except Exception as exc:
            logger.warning("BullMQ unavailable: %s", exc)
            return None


async def _close_queue() -> None:
    global _queue_instance
    if _queue_instance is not None:
        try:
            await _queue_instance.close()
        except Exception:
            pass
        _queue_instance = None


# ═════════════════════════════════════════════════════════════════════════════
# Image helpers
# ═════════════════════════════════════════════════════════════════════════════

MAX_BYTES = int(CONFIG.get("max_image_bytes", 20 * 1024 * 1024))  # 20 MB
MAX_EDGE = int(CONFIG.get("max_image_edge", 2048))


def _guard_and_decode(raw: bytes) -> np.ndarray:
    """Validate size, decode, and optionally downscale.
    Guards against a huge upload OOM-killing the container during
    cv2.imdecode / heavy YOLO inference."""
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, f"Image exceeds {MAX_BYTES:,} byte limit")
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(422, "Could not decode image")
    h, w = img.shape[:2]
    longest = max(h, w)
    if longest > MAX_EDGE:
        scale = MAX_EDGE / longest
        img = cv2.resize(
            img, (int(w * scale), int(h * scale)),
            interpolation=cv2.INTER_AREA,
        )
    return img


def _yolo_detections_to_list(detections: list[dict[str, Any]]) -> list[dict]:
    """Normalise detections from YOLODetector._parse_result.
    The existing src/detector.py already returns clean dicts, but we
    make sure bbox is always a flat 4-element list regardless of the
    ultralytics version (8.x has shipped both (N,4) and (1,N,4))."""
    out = []
    for d in detections:
        bbox = d.get("bbox", [])
        # Flatten in case ultralytics returned nested arrays
        bbox = np.asarray(bbox).reshape(-1).tolist()[:4]
        out.append({
            "bbox": bbox,
            "confidence": round(float(d.get("confidence", 0)), 4),
            "class_id": int(d.get("class_id", -1)),
            "class_name": str(d.get("class_name", "")),
        })
    return out


# ═════════════════════════════════════════════════════════════════════════════
# Lifespan
# ═════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure /data cache dirs exist (volume is mounted at runtime, not build)
    for d in ("hf_home", "cache", "torch", "yolo_config", "mpl", "numba"):
        Path(f"/data/{d}").mkdir(parents=True, exist_ok=True)

    # Warm models in a background thread so GET / returns 200 NOW.
    t = threading.Thread(target=registry.warm_all, daemon=True, name="warmup")
    t.start()

    yield

    await _close_queue()
    logger.info("Shutdown complete")


# ═════════════════════════════════════════════════════════════════════════════
# FastAPI application
# ═════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="IBVAP ML Inference",
    description="Intelligent Border Video Analytics – ML inference API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── GET / — always 200 ──────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Always returns 200, even while models are still loading."""
    return {"status": "ok", "service": "ibvap-ml", "version": "1.0.0"}


# ── GET /health — per-model readiness ────────────────────────────────────────

@app.get("/health")
async def health():
    """Per-model status and warm-up timings."""
    return registry.health()


# ── GET /config — secrets redacted ───────────────────────────────────────────

@app.get("/config")
async def config_endpoint():
    """Current configuration with sensitive values masked."""
    REDACT = {"redis_url", "redis_password", "secret", "token", "key", "password"}
    safe: dict[str, Any] = {}
    for k, v in CONFIG.items():
        if any(r in k.lower() for r in REDACT):
            safe[k] = "***REDACTED***" if v else None
        else:
            safe[k] = v
    return safe


# ── POST /predict — multipart image ─────────────────────────────────────────

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Run YOLO object detection on an uploaded image (multipart)."""
    det = registry.get("yolo")
    if det is None:
        raise HTTPException(503, "YOLO model not loaded yet — try again shortly")

    raw = await file.read()
    img = _guard_and_decode(raw)
    detections = det.predict(img)

    return {
        "detections": _yolo_detections_to_list(detections),
        "image_shape": list(img.shape[:2]),
    }


# ── POST /predict/base64 — JSON body ────────────────────────────────────────

@app.post("/predict/base64")
async def predict_base64(request: Request):
    """Run YOLO on a base64-encoded image."""
    det = registry.get("yolo")
    if det is None:
        raise HTTPException(503, "YOLO model not loaded yet")

    body = await request.json()
    b64 = body.get("image")
    if not b64:
        raise HTTPException(422, "Missing 'image' field (base64 string)")

    try:
        raw = base64.b64decode(b64)
    except Exception:
        raise HTTPException(422, "Invalid base64 encoding")

    img = _guard_and_decode(raw)
    detections = det.predict(img)
    return {
        "detections": _yolo_detections_to_list(detections),
        "image_shape": list(img.shape[:2]),
    }


# ── POST /predict/onnx — face embedding ─────────────────────────────────────

@app.post("/predict/onnx")
async def predict_onnx(file: UploadFile = File(...)):
    """Run ONNX ArcFace face-recognition embedding on an uploaded face crop."""
    session = registry.get("onnx")
    if session is None:
        raise HTTPException(503, "ONNX model not loaded or disabled")

    raw = await file.read()
    img = _guard_and_decode(raw)

    # ArcFace preprocessing: resize to 112×112, normalise, CHW, add batch dim
    face = cv2.resize(img, (112, 112))
    face = face.astype(np.float32) / 255.0
    face = np.transpose(face, (2, 0, 1))[np.newaxis, ...]

    input_name = session.get_inputs()[0].name
    embedding = session.run(None, {input_name: face})[0]

    return {
        "embedding": embedding.flatten().tolist(),
        "embedding_dim": int(embedding.shape[-1]),
    }


# ── POST /jobs — submit async BullMQ job ─────────────────────────────────────

@app.post("/jobs")
async def create_job(file: UploadFile = File(...)):
    """Submit an async inference job via BullMQ (requires REDIS_URL)."""
    queue = _get_queue()
    if queue is None:
        raise HTTPException(
            503, "Job queue unavailable. Set REDIS_URL to enable async jobs.",
        )

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, f"Image exceeds {MAX_BYTES:,} byte limit")

    b64 = base64.b64encode(raw).decode()
    try:
        from bullmq_compat import add_job
        job = await add_job(queue, "predict", {"image_b64": b64})
        return {"job_id": job.id, "status": "queued"}
    except Exception as exc:
        raise HTTPException(500, f"Failed to enqueue job: {exc}")


# ── GET /jobs/{id} — check job status ────────────────────────────────────────

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Check the status and result of an async job."""
    queue = _get_queue()
    if queue is None:
        raise HTTPException(503, "Job queue unavailable")

    try:
        from bullmq_compat import fetch_job, get_job_state, get_return_value
        job = await fetch_job(queue, job_id)
        if job is None:
            raise HTTPException(404, "Job not found")
        state = await get_job_state(job)
        return {
            "job_id": job_id,
            "state": state,
            "result": get_return_value(job),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Failed to fetch job: {exc}")
