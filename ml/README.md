# IBVAP Machine Learning Platform

This directory contains the computer vision and edge analytics services for the Intelligent Border Video Analytics Platform (IBVAP). It combines custom object detection, persistent multi-object tracking, polygon intrusion detection, behavioral rule monitors, ArcFace facial recognition, Automatic Number Plate Recognition (ANPR), and RTSP stream workers connected to the Node.js backend.

---

## 1. General Detection Model & Checkpoint

- **Model Architecture:** Ultralytics YOLOv11 (Detection mode, input size 416x416).
- **Active Model Path:** `runs/merged_det_yolo/weights/best.pt` (configured in [`config.yaml`](config.yaml) and overridable via `MODEL_PATH` environment variable).
- **File Size:** 21,219,235 bytes (~21.2 MB).
- **SHA-256 Checksum:** `5ff891f6b6dd08a68202aeca339b8e975abc3acd4e190e41564f8d98359b0020`.
- **Training Base:** Initialized from `yolo11n.pt` and fine-tuned on the merged border traffic dataset (`data/merged-detection/data.yaml`).

---

## 2. Verified Training Metrics

Recorded directly from [`runs/merged_det_yolo/results.csv`](runs/merged_det_yolo/results.csv) at Epoch 2 (completed on CPU, ~102 minutes total compute):

| Metric | Verified Value |
|---|---|
| **Precision (B)** | `0.5699` (57.0%) |
| **Recall (B)** | `0.5525` (55.3%) |
| **mAP@50 (B)** | `0.5357` (53.6%) |
| **mAP@50-95 (B)** | `0.3298` (33.0%) |
| **Validation Box Loss** | `1.2373` |
| **Validation Class Loss** | `1.1921` |
| **Validation DFL Loss** | `1.0316` |

*Note: Per-class PR curves and confusion matrix artifacts were not exported in this CPU training run.*

---

## 3. YOLO Detection Classes

The custom traffic model is trained on 7 specific target classes:

```python
{
    0: "car",
    1: "bus",
    2: "truck",
    3: "van",
    4: "bicycle",
    5: "motorbike",
    6: "person",
}
```

---

## 4. Multi-Object Tracking (ByteTrack)

Implemented in [`src/tracker.py`](src/tracker.py):
- Uses Ultralytics ByteTrack integration configured via `bytetrack.yaml`.
- Associates detections across consecutive frames to maintain consistent, persistent `track_id` integers.
- Bounding boxes are tracked with millisecond-precision timestamps to calculate speed, trajectories, and dwell times.

---

## 5. Polygon Intrusion Detection

Implemented in [`src/intrusion.py`](src/intrusion.py):
- Uses `VirtualFence` with point-in-polygon ray-casting geometry.
- Evaluates object ground contact points (bottom-center of bounding boxes) against named restricted polygons.
- Fires normalized `INTRUSION` events with severity `HIGH` or `CRITICAL`.
- Supports dynamic zone reconfiguration via RTSP worker stream APIs.

---

## 6. Loitering Detection

Implemented in [`src/activity.py`](src/activity.py):
- `ActivityMonitor` tracks the duration that a given `track_id` remains within the field of view.
- When an object's dwell time exceeds `loitering_seconds` (default: 60s in `config.yaml`), a `LOITERING` event is emitted.

---

## 7. Night Movement Detection

Implemented in [`src/activity.py`](src/activity.py):
- Evaluates UTC timestamps against the configured `night_hours` window (default: `[22, 6]`, representing 22:00 to 06:00 UTC).
- Any detected movement during night hours generates a `NIGHT_ACTIVITY` security event.

---

## 8. Face Detection & ArcFace Recognition

Implemented in [`src/face.py`](src/face.py) and [`src/face_recognition.py`](src/face_recognition.py):
- **Detection:** OpenCV Haar Cascade (`haarcascade_frontalface_default.xml`) extracts face crops.
- **Embedding Extraction:** Pretrained ArcFace ResNet50 ONNX model located at `.insightface/buffalo_l/w600k_r50.onnx`.
- **Matching:** Calculates cosine similarity against gallery embeddings. Matches above `face_recognition_threshold` (default: 0.45) produce `FACE_MATCH` events; unmatched faces are labeled `UNKNOWN` without raising false-positive alarms.

---

## 9. Face Gallery & Multi-Identity Support

- Gallery directory: `data/faces/`.
- Scans `.jpg` and `.png` reference images.
- Supports multiple identities as well as **multiple reference images per identity** (e.g. `officer_smith_1.jpg`, `officer_smith_2.jpg`).
- New reference images can be placed into the gallery directory without retraining the embedding model.

---

## 10. ANPR License Plate Detector

- **Model:** `models/anpr/plate_detector.pt` (YOLOv8n license plate detector).
- **SHA-256 Checksum:** `2d95861825bb4184404344c9cf809f40fd31dba785fe54e8ba5b9a3583789822`.
- **Target Class:** `license_plate`.
- **Confidence Threshold:** Configurable via `anpr.detector_confidence` (default: `0.35`).

---

## 11. ANPR ONNX OCR Adapter

- **Model:** `models/anpr/plate_ocr.onnx` (CCT-S global plate OCR model).
- **SHA-256 Checksum:** `384bbbd2cea3ef54761d3df70822ef3a349ee1a112aeafddbe0e3ba06bc6e47b`.
- **Input Contract:** RGB `uint8`, shape `(1, 64, 128, 3)`.
- **Alphabet (37 classes):** `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_` (where `_` represents padding).
- **Adapter:** [`src/anpr_runtime.py`](src/anpr_runtime.py) (`OnnxPlateOCR`). Calculates non-padding character confidence mean and returns PaddleOCR-compatible lines.
- **Threshold:** Configurable via `anpr.ocr.confidence` (default: `0.50`).

---

## 12. Watchlist Matching

- **Normalization:** Cleans whitespace, dashes, and non-alphanumeric characters, converting text to uppercase via `normalize_plate_text()`.
- **Candidate Matching:** Evaluates active (`status: ACTIVE`) vehicles matching the normalized plate string.
- **Backend Confirmation:** The Node.js backend (`AiService.ingestEvent`) authoritatively re-validates watchlist matches transactionally against the database, updates vehicle `lastMatch` timestamps, and prevents forged watchlist alerts.

---

## 13. ANPR Evidence Generation

Two-tier evidence generation:
1. **Full-Frame Evidence:**
   - Captured as a JPEG snapshot when `event_requires_evidence()` evaluates to `True` (`ANPR_MATCH`, `PLATE`, `INTRUSION`, `FACE_MATCH`, or `CRITICAL`).
   - Base64-encoded and sent under `payload.evidence.contentBase64` with `frameNumber`.
2. **Plate-Crop Evidence:**
   - Extracted directly using the boundary-clamped detection bounding box without running OCR twice.
   - Encoded as base64 JPEG and attached to `metadata.plate_crop` and `event.plate_crop`.
   - Propagated through backend JSON metadata directly into database records and WebSocket broadcasts.

---

## 14. Event Normalization & Stable Identifiers

Centralized in [`src/events.py`](src/events.py) (`EventManager`):
- Every event receives a stable UUIDv4 `event_id` ensuring idempotency.
- Includes `camera_id`, ISO-8601 UTC `timestamp`, `event_type`, `severity`, `track_id`, `object_type`, `confidence`, `bounding_box`, and `metadata`.

---

## 15. FastAPI Endpoints

Served by [`api/main.py`](api/main.py):

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Service index and documentation URLs |
| `/health` | `GET` | Health status, device, model loaded flags, active streams |
| `/analyze/frame` | `POST` | Process multipart image frame (detection, tracking, ANPR, rules) |
| `/analyze/image` | `POST` | Alias for single image analysis |
| `/analyze/video` | `POST` | Process video file upload with temporary annotation |
| `/events` | `GET` | Retrieve in-memory normalized event buffer |
| `/simulate/intrusion` | `POST` | Test endpoint injecting an event into the backend |
| `/cameras` | `GET` | Get status of all active RTSP stream workers |
| `/cameras/start` | `POST` | Start a persistent RTSP camera stream worker |
| `/cameras/{camera_id}/stop` | `POST` | Stop an RTSP camera stream worker |
| `/cameras/test` | `POST` | Test stream connection reachability |

---

## 16. RTSP Stream Processing

Implemented in [`api/stream_worker.py`](api/stream_worker.py):
- Background worker per camera stream using OpenCV `VideoCapture` with FFMPEG.
- Reconnect loop with automatic backoff and camera status heartbeat reporting (`ONLINE`, `DEGRADED`, `OFFLINE`).
- **Selective Dispatch:** Frame snapshot JPEG encoding only executes when at least one event in the batch requires evidence.
- **Plate-Aware Cooldown:** Event deduplication incorporates plate text (`key = (event_type, track_id, plate or zone)`) so distinct license plates are not suppressed by cooldown when `track_id` is missing.

---

## 17. Backend Event Forwarding

Implemented in [`api/backend_client.py`](api/backend_client.py):
- `forward_events()`: Normalizes and POSTs detection events to Node.js backend at `POST /api/ai/events`.
- `report_camera_status()`: Transmits worker heartbeat and FPS metrics to `POST /api/ai/cameras/status`.
- Uses HTTP client with configurable timeout and authentication headers (`X-AI-API-Key`).

---

## 18. Configuration (`config.yaml`)

Configuration is declared in [`config.yaml`](config.yaml):

```yaml
model_path: runs/merged_det_yolo/weights/best.pt
confidence_threshold: 0.35
iou_threshold: 0.5
camera_id: BOP12-CAM04
bop_id: BOP-12
tracker: bytetrack.yaml
night_hours: [22, 6]
loitering_seconds: 60
process_every_n_frames: 1
enabled_modules:
  tracking: true
  anpr: false
  face: true
  face_recognition: true
  intrusion: true
  activity: true
anpr:
  enabled: false
  plate_detector_model: ml/models/anpr/plate_detector.pt
  detector_confidence: 0.35
  ocr:
    engine: onnxruntime
    model: ml/models/anpr/plate_ocr.onnx
    confidence: 0.50
```

---

## 19. Environment Variables & Secrets

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:4000` | Node.js backend URL |
| `AI_API_KEY` | `ibvap-ai-dev-key-change-in-production` | Secret API key for `/api/ai/*` |
| `FORWARD_TO_BACKEND` | `true` | Toggle automatic backend HTTP forwarding |
| `MODEL_PATH` | *(none, uses config)* | Optional environment override for YOLO weights |

---

## 20. Testing & Verification

Run focused unit tests using the project virtual environment:

```powershell
# Custom YOLO model verification & smoke test
ml\.venv\Scripts\python.exe -m pytest ml/tests/test_custom_yolo_model.py

# Real ANPR API wiring & config tests
ml\.venv\Scripts\python.exe -m pytest ml/tests/test_anpr_api_wiring.py

# Plate-crop evidence extraction & preservation
ml\.venv\Scripts\python.exe -m pytest ml/tests/test_plate_crop_evidence.py

# Stream worker dispatch, selective snapshot & plate deduplication
ml\.venv\Scripts\python.exe -m pytest ml/tests/test_stream_worker.py

# ANPR ONNX OCR adapter & runtime tests
ml\.venv\Scripts\python.exe -m pytest ml/tests/test_anpr_runtime.py
```

---

## 21. Known Limitations

1. **CPU Training Baseline:** The custom traffic YOLO model completed 2 training epochs on CPU (~102 minutes total). While achieving 53.6% mAP@50 on the 7 target classes, longer training runs on GPU hardware can further improve vehicle recall and bounding box precision.
2. **Haar Cascade Lighting Sensitivity:** The frontal-face Haar cascade requires adequate frontal illumination. Oblique face angles or strong backlight reduce face detection rate before reaching ArcFace.
3. **CPU Video Pacing:** High-resolution RTSP streams processed on CPU should set `process_every_n_frames` to `2` or higher to prevent frame buffer queuing.
