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
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
	from ml.api.backend_client import forward_events, report_camera_status
	from ml.api.stream_worker import CameraStreamConfig, CameraStreamManager
	from ml.src.activity import ActivityMonitor
	from ml.src.anpr import ANPRPipeline
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
model_path = Path(CONFIG["model_path"])
if not model_path.is_absolute():
	model_path = ROOT / model_path
detector = YOLODetector(str(model_path), CONFIG["confidence_threshold"], device,
						CONFIG.get("classes"))
tracker = ObjectTracker(detector, CONFIG.get("tracker", "bytetrack.yaml"))
fence = VirtualFence(CONFIG.get("restricted_zones", {}))
activity = ActivityMonitor(
	CONFIG["loitering_seconds"],
	tuple(CONFIG["night_hours"]),
	gathering_threshold=CONFIG.get("gathering_threshold", 2),
)
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
pipeline = VideoPipeline(detector, tracker, fence, activity, face_detector,
						 CONFIG.get("camera_id", "CAM_001"), CONFIG.get("process_every_n_frames", 1),
						 ANPRPipeline() if CONFIG.get("enabled_modules", {}).get("anpr", False) else None)
app = FastAPI(title="IBVAP ML API", version="1.0.0")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
logger = logging.getLogger(__name__)

DEFAULT_CAMERA_ID = CONFIG.get("camera_id", "BOP12-CAM04")
DEFAULT_BOP_ID = CONFIG.get("bop_id", "BOP-12")
FORWARD_TO_BACKEND = os.getenv("FORWARD_TO_BACKEND", "true").lower() in {"1", "true", "yes"}



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
	return VideoPipeline(
		stream_detector,
		stream_tracker,
		VirtualFence({}),
		ActivityMonitor(CONFIG["loitering_seconds"], tuple(CONFIG["night_hours"])),
		face_detector,
		camera_id,
		CONFIG.get("process_every_n_frames", 1),
		ANPRPipeline() if CONFIG.get("enabled_modules", {}).get("anpr", False) else None,
	)


stream_manager = CameraStreamManager(_build_stream_pipeline, forward_events, report_camera_status)


@app.get("/")
def root() -> dict[str, str]:
	return {"service": "IBVAP ML API", "health": "/health", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, Any]:
	return {"status": "ok", "device": device, "model_loaded": detector.model_loaded,
			"model_path": str(model_path), "face_available": face_detector is not None,
			"enabled_modules": CONFIG.get("enabled_modules", {}), "active_streams": stream_manager.status()}


async def _decode_image(file: UploadFile) -> tuple[np.ndarray, bytes]:
	if not file.content_type or not file.content_type.startswith("image/"):
		raise HTTPException(status_code=415, detail="Upload an image frame")
	contents = await file.read()
	image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)
	if image is None:
		raise HTTPException(status_code=400, detail="Could not decode image")
	return image, contents


async def _analyze_image(file: UploadFile, camera_id: str, bop_id: str | None = None) -> dict[str, Any]:
	image, contents = await _decode_image(file)
	try:
		result = pipeline.process_frame(image, timestamp=datetime.now(timezone.utc).isoformat())
	except (RuntimeError, FileNotFoundError) as exc:
		raise HTTPException(status_code=503, detail=str(exc)) from exc
	if camera_id != pipeline.camera_id:
		for event in result["events"]:
			event["camera_id"] = camera_id
	event_manager.events.extend(result["events"])
	result["anpr_status"] = "disabled" if not CONFIG.get("enabled_modules", {}).get("anpr", False) else "unavailable"
	result["face_status"] = "available" if face_detector is not None else "disabled"
	if face_recognizer is not None:
		result["faces"] = face_recognizer.analyze(image)
	person_detections = [d for d in result.get("detections", []) if str(d.get("class_name", "")).lower() == "person"]
	result["person_count"] = len(person_detections)
	gathering_active = any(e.get("event_type") == "GATHERING" for e in result.get("events", [])) or len(person_detections) >= CONFIG.get("gathering_threshold", 2)
	result["is_gathering"] = gathering_active

	# If gathering condition is met but not yet in result['events'], build gathering event
	if gathering_active and not any(e.get("event_type") == "GATHERING" for e in result.get("events", [])):
		cluster_boxes = [d["bbox"] for d in person_detections]
		min_x = min(b[0] for b in cluster_boxes)
		min_y = min(b[1] for b in cluster_boxes)
		max_x = max(b[2] for b in cluster_boxes)
		max_y = max(b[3] for b in cluster_boxes)
		count = len(person_detections)
		lead = person_detections[0]
		gathering_event = {
			"event_type": "GATHERING",
			"severity": "HIGH" if count >= 4 else "MEDIUM",
			"track_id": 1,
			"object_type": "PERSON",
			"confidence": float(lead.get("confidence", 0.9)),
			"bbox": [min_x, min_y, max_x, max_y],
			"metadata": {
				"people_count": count,
				"cluster_bbox": [min_x, min_y, max_x, max_y],
				"description": f"Gathering of {count} people detected in camera sector",
				"alert": "CROWD_GATHERING"
			}
		}
		result["events"].append(gathering_event)

	# Forward events to backend with evidence snapshot
	events_to_forward = result.get("events", [])
	if events_to_forward:
		try:
			evidence_b64 = base64.b64encode(contents).decode("utf-8")
			forward_results = forward_events(
				events_to_forward,
				camera_id=camera_id,
				bop_id=bop_id,
				evidence_snapshot=evidence_b64,
			)
			result["forwarded"] = forward_results
		except Exception as exc:
			logger.warning("Event forwarding failed: %s", exc)
			result["forwarded"] = [{"error": str(exc)}]

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
