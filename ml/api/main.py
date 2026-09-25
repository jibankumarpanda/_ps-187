"""FastAPI entry point for frame analysis."""

import base64
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
from typing import Any

import cv2
import numpy as np
import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

try:
	from ml.api.backend_client import forward_events, report_camera_status
	from ml.api.stream_worker import CameraStreamConfig, CameraStreamManager
	from ml.src.activity import ActivityMonitor
	from ml.src.anpr import ANPRPipeline
	from ml.src.anpr_runtime import create_anpr_pipeline
	from ml.src.detector import YOLODetector, select_device
	from ml.src.events import EventManager
	from ml.src.face import FaceDetector
	from ml.src.face_recognition import FaceRecognizer
	from ml.src.intrusion import VirtualFence
	from ml.src.pipeline import VideoPipeline
	from ml.src.tracker import ObjectTracker
except ModuleNotFoundError:
	from api.backend_client import forward_events, report_camera_status
	from api.stream_worker import CameraStreamConfig, CameraStreamManager
	from src.activity import ActivityMonitor
	from src.anpr import ANPRPipeline
	from src.anpr_runtime import create_anpr_pipeline
	from src.detector import YOLODetector, select_device
	from src.events import EventManager
	from src.face import FaceDetector
	from src.face_recognition import FaceRecognizer
	from src.intrusion import VirtualFence
	from src.pipeline import VideoPipeline
	from src.tracker import ObjectTracker


ROOT = Path(__file__).resolve().parents[1]
with (ROOT / "config.yaml").open(encoding="utf-8") as config_file:
	CONFIG = yaml.safe_load(config_file) or {}

device = select_device(CONFIG.get("device"))
model_path_str = os.getenv("MODEL_PATH", CONFIG.get("model_path", "runs/merged_det_yolo/weights/best.pt"))
model_path = Path(model_path_str)
if not model_path.is_absolute():
	for candidate in (ROOT / model_path, ROOT.parent / model_path):
		if candidate.is_file():
			model_path = candidate
			break
	else:
		model_path = ROOT / model_path
detector = YOLODetector(str(model_path), CONFIG["confidence_threshold"], device,
						CONFIG.get("classes"))
tracker = ObjectTracker(detector, CONFIG.get("tracker", "bytetrack.yaml"))
fence = VirtualFence(CONFIG.get("restricted_zones", {}))
activity = ActivityMonitor(CONFIG["loitering_seconds"], tuple(CONFIG["night_hours"]))
event_manager = EventManager(CONFIG.get("camera_id", "CAM_001"))
face_detector = None
if CONFIG.get("enabled_modules", {}).get("face", False):
	try:
		face_detector = FaceDetector(CONFIG.get("face_cascade_path"))
	except (FileNotFoundError, cv2.error):
		face_detector = None
face_recognizer = None
if CONFIG.get("enabled_modules", {}).get("face_recognition", False):
	face_recognizer = FaceRecognizer(
		detector=face_detector,
		gallery_dir=CONFIG.get("face_gallery_dir", "data/faces"),
		model_path=CONFIG.get("face_model_path"),
		threshold=CONFIG.get("face_recognition_threshold", 0.45),
	)
logger = logging.getLogger(__name__)


def is_anpr_enabled(config: dict[str, Any]) -> bool:
	return bool(
		config.get("enabled_modules", {}).get("anpr", False)
		or config.get("anpr", {}).get("enabled", False)
	)


def build_anpr_pipeline(config: dict[str, Any], device_name: str | None = None) -> ANPRPipeline | None:
	"""Construct real ANPR pipeline if enabled; handles graceful fallback if models missing."""
	if not is_anpr_enabled(config):
		return None
	anpr_cfg = config.get("anpr") or {}
	ocr_cfg = anpr_cfg.get("ocr") or {}
	try:
		return create_anpr_pipeline(
			plate_detector_model=anpr_cfg.get("plate_detector_model"),
			ocr_model=ocr_cfg.get("model"),
			detector_confidence=anpr_cfg.get("detector_confidence", 0.35),
			ocr_confidence=ocr_cfg.get("confidence", 0.50),
			device=device_name,
		)
	except (FileNotFoundError, RuntimeError, ValueError) as exc:
		logger.warning("ANPR pipeline could not be initialized: %s", exc)
		return None


anpr_pipeline = build_anpr_pipeline(CONFIG, device)
pipeline = VideoPipeline(detector, tracker, fence, activity, face_detector,
						 CONFIG.get("camera_id", "CAM_001"), CONFIG.get("process_every_n_frames", 1),
						 anpr_pipeline)
app = FastAPI(title="IBVAP ML API", version="1.0.0")

DEFAULT_CAMERA_ID = CONFIG.get("camera_id", "BOP12-CAM04")
DEFAULT_BOP_ID = CONFIG.get("bop_id", "BOP-12")
FORWARD_TO_BACKEND = os.getenv("FORWARD_TO_BACKEND", "true").lower() in {"1", "true", "yes"}


class SimulateIntrusionRequest(BaseModel):
	camera_id: str = Field(default=DEFAULT_CAMERA_ID)
	bop_id: str = Field(default=DEFAULT_BOP_ID)
	event_type: str = Field(default="INTRUSION")
	object_type: str = Field(default="PERSON")
	confidence: float = Field(default=0.96, ge=0, le=1)
	track_id: int = Field(default=72)
	zone: str = Field(default="NORTH_FENCE")
	bbox: list[float] = Field(default=[421, 183, 523, 462])


class CameraZoneRequest(BaseModel):
	name: str
	zone_type: str = "RESTRICTED"
	coordinates: list[list[float]]


class CameraStartRequest(BaseModel):
	camera_id: str = Field(min_length=1)
	bop_id: str = Field(min_length=1)
	stream_url: str = Field(min_length=1)
	zones: list[CameraZoneRequest] = Field(default_factory=list)
	process_every_n_frames: int = Field(default=CONFIG.get("process_every_n_frames", 1), ge=1, le=60)


class CameraTestRequest(BaseModel):
	camera_id: str = Field(min_length=1)
	stream_url: str = Field(min_length=1)


def _build_stream_pipeline(camera_id: str) -> VideoPipeline:
	"""Create isolated tracker and rule state for one long-running camera."""
	stream_detector = YOLODetector(str(model_path), CONFIG["confidence_threshold"], device, CONFIG.get("classes"))
	stream_tracker = ObjectTracker(stream_detector, CONFIG.get("tracker", "bytetrack.yaml"))
	stream_anpr = build_anpr_pipeline(CONFIG, device)
	return VideoPipeline(
		stream_detector,
		stream_tracker,
		VirtualFence({}),
		ActivityMonitor(CONFIG["loitering_seconds"], tuple(CONFIG["night_hours"])),
		face_detector,
		camera_id,
		CONFIG.get("process_every_n_frames", 1),
		stream_anpr,
	)


stream_manager = CameraStreamManager(_build_stream_pipeline, forward_events, report_camera_status)


@app.get("/")
def root() -> dict[str, str]:
	return {"service": "IBVAP ML API", "health": "/health", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, Any]:
	return {"status": "ok", "device": device, "model_loaded": detector.model_loaded,
			"model_path": str(model_path), "face_available": face_detector is not None,
			"anpr_available": pipeline.anpr is not None,
			"enabled_modules": CONFIG.get("enabled_modules", {}), "active_streams": stream_manager.status()}


async def _decode_image(file: UploadFile) -> np.ndarray:
	if not file.content_type or not file.content_type.startswith("image/"):
		raise HTTPException(status_code=415, detail="Upload an image frame")
	contents = await file.read()
	image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
	if image is None:
		raise HTTPException(status_code=400, detail="Could not decode image")
	return image


async def _analyze_image(file: UploadFile, camera_id: str, bop_id: str | None = None) -> dict[str, Any]:
	image = await _decode_image(file)
	try:
		result = pipeline.process_frame(image, timestamp=datetime.now(timezone.utc).isoformat())
	except (RuntimeError, FileNotFoundError) as exc:
		raise HTTPException(status_code=503, detail=str(exc)) from exc
	if camera_id != pipeline.camera_id:
		for event in result["events"]:
			event["camera_id"] = camera_id
	event_manager.events.extend(result["events"])
	result["anpr_status"] = "available" if pipeline.anpr is not None else ("disabled" if not is_anpr_enabled(CONFIG) else "unavailable")
	result["face_status"] = "available" if face_detector is not None else "disabled"
	if face_recognizer is not None:
		result["faces"] = face_recognizer.analyze(image)
	return result


@app.post("/analyze/frame")
async def analyze_frame(
	file: UploadFile = File(...),
	camera_id: str = DEFAULT_CAMERA_ID,
	bop_id: str | None = None,
) -> dict[str, Any]:
	return await _analyze_image(file, camera_id, bop_id)


@app.post("/analyze/image")
async def analyze_image(
	file: UploadFile = File(...),
	camera_id: str = DEFAULT_CAMERA_ID,
	bop_id: str | None = None,
) -> dict[str, Any]:
	return await _analyze_image(file, camera_id, bop_id)


@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...), camera_id: str = "CAM_001") -> dict[str, Any]:
	if not file.filename:
		raise HTTPException(status_code=400, detail="A video filename is required")
	suffix = Path(file.filename).suffix or ".mp4"
	with tempfile.TemporaryDirectory() as temporary_directory:
		input_path = Path(temporary_directory) / f"input{suffix}"
		output_path = Path(temporary_directory) / "annotated.mp4"
		input_path.write_bytes(await file.read())
		try:
			result = pipeline.process_video(input_path, output_path)
		except (FileNotFoundError, RuntimeError, cv2.error) as exc:
			raise HTTPException(status_code=503, detail=str(exc)) from exc
		result.update({"camera_id": camera_id, "events": [], "message": "Annotated output was created during processing but is not persisted by this API."})
		return result


@app.get("/events")
def events() -> dict[str, Any]:
	return {"camera_id": event_manager.camera_id, "events": event_manager.events}


@app.post("/simulate/intrusion")
def simulate_intrusion(body: SimulateIntrusionRequest) -> dict[str, Any]:
	"""Demo endpoint: inject a synthetic INTRUSION into the Node.js backend."""
	timestamp = datetime.now(timezone.utc).isoformat()
	raw_event = {
		"event_type": body.event_type,
		"object_type": body.object_type,
		"track_id": body.track_id,
		"confidence": body.confidence,
		"bbox": body.bbox,
		"metadata": {"zone": body.zone},
		"timestamp": timestamp,
	}
	backend = forward_events(
		[raw_event],
		camera_id=body.camera_id,
		bop_id=body.bop_id,
		timestamp=timestamp,
	)
	return {"simulated": raw_event, "backend": backend}


@app.get("/cameras")
def camera_workers() -> dict[str, Any]:
	return {"streams": stream_manager.status()}


@app.post("/cameras/start")
def start_camera(body: CameraStartRequest) -> dict[str, Any]:
	config = CameraStreamConfig(
		camera_id=body.camera_id,
		bop_id=body.bop_id,
		stream_url=body.stream_url,
		zones=[zone.model_dump() for zone in body.zones],
		process_every_n_frames=body.process_every_n_frames,
	)
	return stream_manager.start(config)


@app.post("/cameras/{camera_id}/stop")
def stop_camera(camera_id: str) -> dict[str, Any]:
	return stream_manager.stop(camera_id)


@app.post("/cameras/test")
def test_camera(body: CameraTestRequest) -> dict[str, Any]:
	return CameraStreamManager.test(body.stream_url)


@app.on_event("shutdown")
def shutdown_camera_workers() -> None:
	stream_manager.stop_all()
