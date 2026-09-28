"""FastAPI entry point for frame analysis."""

import base64
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import time
from typing import Any

import cv2
import numpy as np
import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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
	from ml.src.pose import StickFigureDetector
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
	from src.pose import StickFigureDetector
	from src.tracker import ObjectTracker


ROOT = Path(__file__).resolve().parents[1]
with (ROOT / "config.yaml").open(encoding="utf-8") as config_file:
	CONFIG = yaml.safe_load(config_file) or {}

# Limit PyTorch CPU thread pool and autograd to minimize memory footprint on low-RAM cloud instances (Render free tier)
try:
	import torch
	torch.set_num_threads(1)
	if hasattr(torch, "set_grad_enabled"):
		torch.set_grad_enabled(False)
except ImportError:
	pass

preferred_device = os.getenv("DEVICE", CONFIG.get("device", "cpu"))
device = select_device(preferred_device)
model_path_str = os.getenv("MODEL_PATH", CONFIG.get("model_path", "runs/merged_det_yolo/weights/best.pt"))
model_path = Path(model_path_str)
if not model_path.is_absolute():
	for candidate in (ROOT / model_path, ROOT.parent / model_path):
		if candidate.is_file():
			model_path = candidate
			break
	else:
		model_path = ROOT / model_path

fence = VirtualFence(CONFIG.get("restricted_zones", {}))
activity = ActivityMonitor(
	CONFIG["loitering_seconds"],
	tuple(CONFIG["night_hours"]),
	gathering_threshold=CONFIG.get("gathering_threshold", 2),
)
event_manager = EventManager(CONFIG.get("camera_id", "CAM_001"))
logger = logging.getLogger(__name__)

_detector: YOLODetector | None = None
_tracker: ObjectTracker | None = None
_pipeline: VideoPipeline | None = None
_face_detector: FaceDetector | None = None
_face_recognizer: FaceRecognizer | None = None
_anpr_pipeline: ANPRPipeline | None = None
_pose_detector: StickFigureDetector | None = None


def get_detector() -> YOLODetector:
	global _detector
	if _detector is None:
		_detector = YOLODetector(
			str(model_path),
			CONFIG.get("confidence_threshold", 0.25),
			device,
			CONFIG.get("classes"),
		)
	return _detector


def get_tracker() -> ObjectTracker:
	global _tracker
	if _tracker is None:
		_tracker = ObjectTracker(get_detector(), CONFIG.get("tracker", "bytetrack.yaml"))
	return _tracker


def is_face_enabled(config: dict[str, Any]) -> bool:
	return bool(config.get("enabled_modules", {}).get("face", False))


def get_face_detector() -> FaceDetector | None:
	global _face_detector
	if _face_detector is None and is_face_enabled(CONFIG):
		try:
			_face_detector = FaceDetector(CONFIG.get("face_cascade_path"))
		except (FileNotFoundError, cv2.error):
			_face_detector = None
	return _face_detector


def get_face_recognizer() -> FaceRecognizer | None:
	global _face_recognizer
	if _face_recognizer is None and CONFIG.get("enabled_modules", {}).get("face_recognition", False):
		try:
			_face_recognizer = FaceRecognizer(
				detector=get_face_detector(),
				gallery_dir=CONFIG.get("face_gallery_dir", "data/faces"),
				model_path=CONFIG.get("face_model_path"),
				threshold=CONFIG.get("face_recognition_threshold", 0.45),
			)
		except Exception as exc:
			logger.warning("Face recognizer could not be initialized: %s", exc)
			_face_recognizer = None
	return _face_recognizer


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


def get_anpr_pipeline() -> ANPRPipeline | None:
	global _anpr_pipeline
	if _anpr_pipeline is None and is_anpr_enabled(CONFIG):
		_anpr_pipeline = build_anpr_pipeline(CONFIG, device)
	return _anpr_pipeline


def is_pose_enabled(config: dict[str, Any]) -> bool:
	return bool(
		config.get("enabled_modules", {}).get("pose", False)
		or config.get("pose", {}).get("enabled", False)
	)


def build_pose_detector(config: dict[str, Any], device_name: str | None = None) -> StickFigureDetector | None:
	if not is_pose_enabled(config):
		return None
	pose_cfg = config.get("pose") or {}
	model_file = pose_cfg.get("model_path", "ml/models/pose/yolo11n-pose.pt")
	clf_file = pose_cfg.get("classifier_path", "ml/models/pose/posture_classifier.pt")
	resolved_model = Path(model_file)
	if not resolved_model.is_absolute():
		for candidate in (ROOT / resolved_model, ROOT.parent / resolved_model):
			if candidate.is_file():
				resolved_model = candidate
				break
	resolved_clf = Path(clf_file) if clf_file else None
	if resolved_clf and not resolved_clf.is_absolute():
		for candidate in (ROOT / resolved_clf, ROOT.parent / resolved_clf):
			if candidate.is_file():
				resolved_clf = candidate
				break
	try:
		return StickFigureDetector(
			model_path=str(resolved_model),
			classifier_path=str(resolved_clf) if resolved_clf else None,
			confidence_threshold=pose_cfg.get("confidence_threshold", 0.35),
			keypoint_threshold=pose_cfg.get("keypoint_threshold", 0.30),
			device=device_name,
		)
	except Exception as exc:
		logger.warning("Stick Figure / Pose detector could not be initialized: %s", exc)
		return None


def get_pose_detector() -> StickFigureDetector | None:
	global _pose_detector
	if _pose_detector is None and is_pose_enabled(CONFIG):
		_pose_detector = build_pose_detector(CONFIG, device)
	return _pose_detector


def get_pipeline() -> VideoPipeline:
	global _pipeline
	if _pipeline is None:
		_pipeline = VideoPipeline(
			get_detector(),
			get_tracker(),
			fence,
			activity,
			get_face_detector(),
			CONFIG.get("camera_id", "CAM_001"),
			CONFIG.get("process_every_n_frames", 1),
			get_anpr_pipeline(),
			pose_estimator=get_pose_detector(),
			privacy_mode=CONFIG.get("pose", {}).get("privacy_mode", False),
		)
	return _pipeline


def __getattr__(name: str) -> Any:
	if name == "detector":
		return get_detector()
	if name == "tracker":
		return get_tracker()
	if name == "pipeline":
		return get_pipeline()
	if name == "face_detector":
		return get_face_detector()
	if name == "face_recognizer":
		return get_face_recognizer()
	if name == "anpr_pipeline":
		return get_anpr_pipeline()
	if name == "pose_detector":
		return get_pose_detector()
	raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

app = FastAPI(title="IBVAP ML API", version="1.0.0")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

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
	stream_detector = get_detector()
	stream_tracker = ObjectTracker(stream_detector, CONFIG.get("tracker", "bytetrack.yaml"))
	stream_anpr = build_anpr_pipeline(CONFIG, device)
	stream_pose = build_pose_detector(CONFIG, device)
	privacy_mode = CONFIG.get("pose", {}).get("privacy_mode", False)
	return VideoPipeline(
		stream_detector,
		stream_tracker,
		VirtualFence({}),
		ActivityMonitor(CONFIG["loitering_seconds"], tuple(CONFIG["night_hours"])),
		get_face_detector(),
		camera_id,
		CONFIG.get("process_every_n_frames", 1),
		stream_anpr,
		pose_estimator=stream_pose,
		privacy_mode=privacy_mode,
	)


stream_manager = CameraStreamManager(_build_stream_pipeline, forward_events, report_camera_status)


@app.get("/")
def root() -> dict[str, str]:
	return {"service": "IBVAP ML API", "health": "/health", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, Any]:
	return {
		"status": "ok",
		"device": device,
		"model_loaded": _detector is not None and getattr(_detector, "_model", None) is not None,
		"model_path": str(model_path),
		"face_available": is_face_enabled(CONFIG),
		"anpr_available": is_anpr_enabled(CONFIG),
		"pose_available": is_pose_enabled(CONFIG),
		"enabled_modules": CONFIG.get("enabled_modules", {}),
		"active_streams": stream_manager.status(),
	}


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
	pipe = get_pipeline()
	current_face_detector = get_face_detector()
	current_face_recognizer = get_face_recognizer()
	try:
		result = pipe.process_frame(image, timestamp=datetime.now(timezone.utc).isoformat())
	except (RuntimeError, FileNotFoundError) as exc:
		raise HTTPException(status_code=503, detail=str(exc)) from exc
	if camera_id != pipe.camera_id:
		for event in result["events"]:
			event["camera_id"] = camera_id
	event_manager.events.extend(result["events"])
	result["anpr_status"] = "available" if pipe.anpr is not None else ("disabled" if not is_anpr_enabled(CONFIG) else "unavailable")
	result["face_status"] = "available" if current_face_detector is not None else "disabled"
	result["pose_status"] = "available" if pipe.pose_estimator is not None else "disabled"
	if current_face_recognizer is not None:
		result["faces"] = current_face_recognizer.analyze(image)
	if pipe.pose_estimator and result.get("stick_figures"):
		# Stick figures are already detected in pipe.process_frame; draw using stick_figures
		try:
			raw_figs = pipe.pose_estimator.detect(image, result.get("tracks"))
			annotated = pipe.pose_estimator.draw(image, raw_figs, privacy_mode=pipe.privacy_mode)
			ret, buf = cv2.imencode(".jpg", annotated)
			if ret:
				result["annotated_frame_base64"] = base64.b64encode(buf.tobytes()).decode("ascii")
		except Exception as draw_exc:
			logger.warning("Annotated frame rendering skipped: %s", draw_exc)

	person_detections = [d for d in result.get("detections", []) if str(d.get("class_name", "")).lower() == "person"]
	result["person_count"] = len(person_detections)

	vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle", "van", "automobile", "vehicle", "motorbike"}
	vehicle_detections = [
		d for d in result.get("detections", [])
		if str(d.get("class_name", "")).lower() in vehicle_classes
	]
	result["vehicle_count"] = len(vehicle_detections)

	# Emit VEHICLE_DETECTED event for detected vehicles
	for vd in vehicle_detections:
		c_name = str(vd.get("class_name", "car")).upper()
		track_id = int(vd.get("track_id") or vd.get("class_id") or 1)
		v_event = {
			"event_type": "VEHICLE_DETECTED",
			"severity": "MEDIUM",
			"track_id": track_id,
			"object_type": "VEHICLE",
			"confidence": float(vd.get("confidence", 0.5)),
			"bbox": vd.get("bbox"),
			"metadata": {
				"vehicle_type": c_name,
				"description": f"{c_name} detected in camera sector",
				"alert": "VEHICLE_DETECTED"
			}
		}
		result["events"].append(v_event)

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

	result["frame_width"] = int(image.shape[1])
	result["frame_height"] = int(image.shape[0])

	# Forward events to backend with evidence snapshot in background thread
	events_to_forward = result.get("events", [])
	if events_to_forward:
		try:
			evidence_b64 = base64.b64encode(contents).decode("utf-8")
			forward_results = await asyncio.to_thread(
				forward_events,
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
	pipe = get_pipeline()
	with tempfile.TemporaryDirectory() as temporary_directory:
		input_path = Path(temporary_directory) / f"input{suffix}"
		output_path = Path(temporary_directory) / "annotated.mp4"
		input_path.write_bytes(await file.read())
		try:
			result = pipe.process_video(input_path, output_path)
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


@app.get("/cameras/{camera_id}/live")
def stream_camera_live(camera_id: str):
	"""Serve a real-time MJPEG live video feed of the camera with stick figures and pose estimation drawn."""
	worker = stream_manager._workers.get(camera_id)
	if not worker or not worker.is_running:
		raise HTTPException(status_code=404, detail=f"Camera {camera_id} is not currently running")

	def frame_generator():
		while worker.is_running:
			frame = worker.latest_annotated_frame
			if frame is not None:
				ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
				if ret:
					yield (
						b"--frame\r\n"
						b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
					)
			time.sleep(0.04)

	return StreamingResponse(
		frame_generator(),
		media_type="multipart/x-mixed-replace; boundary=frame",
	)


@app.post("/api/pose/analyze")
async def analyze_pose(file: UploadFile = File(...), privacy_mode: bool = False) -> dict[str, Any]:
	"""Extract stick figures, estimate human poses, and classify postures from an uploaded image."""
	current_pose = get_pose_detector()
	if current_pose is None:
		raise HTTPException(status_code=503, detail="Stick Figure / Pose estimation module is not enabled or loaded.")
	contents = await file.read()
	nparr = np.frombuffer(contents, np.uint8)
	frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
	if frame is None:
		raise HTTPException(status_code=400, detail="Could not decode image.")
	figures = current_pose.detect(frame)
	threat_events = current_pose.evaluate_threats(figures)
	annotated = current_pose.draw(frame, figures, privacy_mode=privacy_mode)
	_, buffer = cv2.imencode(".jpg", annotated)
	encoded_image = base64.b64encode(buffer).decode("utf-8")
	return {
		"count": len(figures),
		"stick_figures": [fig.to_dict() for fig in figures],
		"threat_events": threat_events,
		"privacy_mode": privacy_mode,
		"annotated_jpeg_base64": encoded_image,
	}


@app.on_event("shutdown")
def shutdown_camera_workers() -> None:
	stream_manager.stop_all()
