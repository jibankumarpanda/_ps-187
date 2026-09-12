# IBVAP ML Platform

This directory contains the ML services for the Intelligent Border Video Analytics Platform. The design uses pretrained models where appropriate and keeps measurable rule-based events separate from future action-recognition models.

## Architecture

- `src/detector.py`: lazy-loaded Ultralytics YOLO detection and CPU/CUDA selection.
- `src/tracker.py`: YOLO tracking with ByteTrack or BoT-SORT; no tracker training.
- `src/anpr.py`: optional plate-detector plus PaddleOCR adapter. OCR confidence remains probabilistic.
- `src/face.py`: OpenCV Haar face detector used to locate faces in this prototype.
- `src/face_recognition.py`: pretrained ArcFace `w600k_r50.onnx` embedding comparison against the six-image local gallery; no identities are fabricated.
- `src/intrusion.py`: polygon fence geometry and `INTRUSION` events.
- `src/activity.py`: configurable loitering, night movement, and movement rules. These are not a trained suspicious-activity model.
- `src/events.py`: central JSON-compatible event normalization.
- `src/pipeline.py`: reusable frame/video processing and annotated video output.
- `api/main.py`: FastAPI service.
- `config.yaml`: model paths, thresholds, zones, and module switches.

Face recognition uses the pretrained ArcFace model at `.insightface/buffalo_l/w600k_r50.onnx`, ONNX Runtime, and the configurable `face_recognition_threshold` in `config.yaml`. The six reference images are stored directly under `data/faces/` and are named for their identities. The InsightFace Python wrapper is optional; the direct ONNX model avoids a native C++ build requirement on Windows.

## Setup

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ml/requirements.txt
```

The repository currently includes the pretrained `ml/yolo11n.pt`. No custom `best.pt`, dataset, or metric is present, so no custom training result is claimed.

## Dataset and training

Use a real YOLO dataset with `images/{train,val,test}`, `labels/{train,val,test}`, and `data.yaml`. Confirm that `data.yaml` contains the class names; do not assume the suggested `person`, `car`, `truck`, `bus`, and `motorcycle` classes exist.

The downloaded prototype dataset is available at `data/traffic-detection-project/data.yaml` and currently contains 5,805 training images, 549 validation images, and 279 test images with classes `bicycle`, `bus`, `car`, `motorbike`, and `person`. It does not contain a `truck` class. The dataset metadata identifies the source as CC BY 4.0; retain its attribution if you redistribute it.

Open the existing `notebooks/01_yolo_training.ipynb`, set `DATASET_YAML`, `MODEL_NAME`, `EPOCHS`, `IMAGE_SIZE`, `BATCH_SIZE`, and `CONFIDENCE_THRESHOLD`, then run the explicit training cell. Training is never started automatically. Validation and metrics are only real after that cell is executed on a real dataset.

## API

```powershell
python -m uvicorn ml.api.main:app --reload
```

`GET /health` reports service state and selected device. `GET /events` returns normalized events seen by the current process. Send an image to either `POST /analyze/image` or `POST /analyze/frame`:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/analyze/frame?camera_id=CAM_001" -F "file=@frame.jpg"
```

The response contains JSON-serializable `detections`, `tracks`, and `events`. Events use `camera_id`, ISO-8601 `timestamp`, `event_type`, `severity`, `track_id`, `object_type`, `confidence`, `bbox`, and `metadata` fields. The backend can consume this response directly or forward events to its event bus.

`POST /analyze/video` accepts a video upload and processes it with the configured frame interval. It returns processing counts; the temporary annotated output is not persisted by the API. For persistent output, call `VideoPipeline.process_video` from Python with an explicit output path.

From the `ml/` directory, run smoke scripts with real paths only:

```powershell
python tests/test_detector.py --image C:\path\to\frame.jpg
python tests/test_pipeline.py --video C:\path\to\video.mp4 --output C:\path\to\annotated.mp4
```

## Video and notebook testing

The existing notebook provides guarded cells for environment verification, imports, dataset/data.yaml inspection, class inspection, manual YOLO training, validation, metrics, image/video inference, tracking, fence, loitering, night movement, ANPR, face, activity, full-pipeline testing, and JSON event serialization. Cells that need a path or model weight skip cleanly until configured. It does not fabricate data or results.
