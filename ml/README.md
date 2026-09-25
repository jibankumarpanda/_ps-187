---
title: IBVAP ML Inference
emoji: 🛡️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Intelligent Border Video Analytics – ML inference API
---

# IBVAP ML Inference API

Real-time object detection, face recognition, and OCR inference for the
**Intelligent Border Video Analytics Platform**.  Runs on Hugging Face
Spaces with `sdk: docker` (CPU-only).

## Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET`  | `/` | Always returns `200 OK`, even during model warm-up |
| `GET`  | `/health` | Per-model readiness status and warm-up times (ms) |
| `GET`  | `/config` | Current configuration (secrets redacted) |
| `POST` | `/predict` | YOLO object detection (multipart image upload) |
| `POST` | `/predict/base64` | YOLO detection from JSON `{ "image": "<base64>" }` |
| `POST` | `/predict/onnx` | ArcFace embedding from uploaded face crop |
| `POST` | `/jobs` | Submit async BullMQ job (requires `REDIS_URL`) |
| `GET`  | `/jobs/{id}` | Poll job status and result |

Interactive docs are available at `/docs` (Swagger UI).

## Quick Start (curl)

```bash
# Health check
curl https://YOUR-SPACE.hf.space/health

# Run YOLO detection
curl -X POST https://YOUR-SPACE.hf.space/predict \
  -F "file=@photo.jpg"
```

**Sample response:**

```json
{
  "detections": [
    {
      "bbox": [120.5, 45.2, 380.1, 510.7],
      "confidence": 0.9124,
      "class_id": 0,
      "class_name": "person"
    }
  ],
  "image_shape": [720, 1280]
}
```

## Configuration

Every key in `config.yaml` can be overridden by an environment variable
of the **same name uppercased**.

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PORT` | `7860` | Bind port (set automatically by HF) |
| `MODEL_PATH` | `yolo11n.pt` | Path to YOLO weights |
| `CONFIDENCE_THRESHOLD` | `0.35` | YOLO detection threshold |
| `IOU_THRESHOLD` | `0.5` | YOLO NMS IoU threshold |
| `MAX_IMAGE_BYTES` | `20971520` | Upload size limit (20 MB) |
| `MAX_IMAGE_EDGE` | `2048` | Longest-edge downscale |
| `OCR_THRESHOLD` | `0.5` | PaddleOCR confidence |
| `FACE_MODEL_PATH` | `.insightface/…/w600k_r50.onnx` | ArcFace ONNX path |
| `REDIS_URL` | *(none)* | Enable BullMQ job queue |

Set secrets in **Settings → Variables and secrets** on HF, never in a
committed file.

## Architecture

```
src/
├── detector.py        # Ultralytics YOLO detector
├── tracker.py         # ByteTrack / BoT-SORT tracker
├── anpr.py            # PaddleOCR license-plate reader
├── face.py            # OpenCV Haar face detector
├── face_recognition.py# ArcFace ONNX embedding comparison
├── intrusion.py       # Polygon virtual-fence geometry
├── activity.py        # Loitering / night-movement rules
├── events.py          # Normalised event schema
└── pipeline.py        # Frame / video processing pipeline

api/main.py            # Full-featured local-dev API
app.py                 # HF Space entry point (lazy loading)
worker.py              # BullMQ async job worker
bullmq_compat.py       # Compat shim for bullmq API changes
config.yaml            # Default config (env-var overrideable)
Dockerfile             # Production CPU-only image
```

## Hardware Notes

> **⚠️ ZeroGPU is NOT available for `sdk: docker`.**
>
> HF's free ZeroGPU (T4 burst) is only available via `sdk: gradio` +
> `@spaces.GPU`.  Docker Spaces run on shared CPU instances.
>
> If you need GPU inference, use one of:
> - **Inference Endpoints** (dedicated GPU, pay-per-hour)
> - **`sdk: gradio`** Space with `@spaces.GPU` decorator
> - A self-hosted machine with an NVIDIA GPU
>
> This container is tuned for **CPU-only** inference.  A single uvicorn
> worker is used deliberately — YOLO + PaddleOCR + ONNX Runtime are
> multi-GB resident against the 16 GB RAM cap.  Scale horizontally by
> **duplicating the Space**, not by adding `--workers`.

## ML Modules

| Module | Method | Notes |
|:-------|:-------|:------|
| Object Detection | YOLOv11n (ultralytics) | Pretrained COCO or custom `best.pt` |
| Tracking | ByteTrack / BoT-SORT | No separate training needed |
| OCR (ANPR) | PaddleOCR | CPU-only; disabled by default |
| Face Detection | OpenCV Haar Cascade | Basic frontal/well-lit |
| Face Recognition | ArcFace `w600k_r50.onnx` | Pretrained; ONNX Runtime CPU |
| Intrusion | Polygon geometry | Rule-based, 100% deterministic |
| Activity | Time / motion thresholds | Loitering, night movement |

## Dataset & Training

The pretrained `yolo11n.pt` ships in the image.  For custom training
see `notebooks/01_yolo_training.ipynb`.  The training dataset
(`data/traffic-detection-project/`) is **not** included in the Docker
image — mount it via `/data` if needed.
