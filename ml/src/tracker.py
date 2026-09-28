"""Ultralytics tracking adapter; tracking itself is not trained here."""

from datetime import datetime, timezone
from typing import Any

from .detector import YOLODetector


class ObjectTracker:
	def __init__(self, detector: YOLODetector, tracker: str = "bytetrack.yaml") -> None:
		self.detector = detector
		self.tracker = tracker

	def track(self, frame: Any, frame_number: int | None = None,
			  timestamp: str | None = None) -> list[dict[str, Any]]:
		model = self.detector.load()
		kwargs: dict[str, Any] = {
			"conf": self.detector.confidence_threshold,
			"tracker": self.tracker,
			"persist": True,
			"verbose": False,
		}
		if self.detector.device:
			kwargs["device"] = self.detector.device
		results = model.track(frame, **kwargs)
		if not results:
			return []
		result = results[0]
		vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle", "van", "automobile", "vehicle", "motorbike"}
		surveillance_classes = {"person", *vehicle_classes}

		if result.boxes is None or len(result.boxes) == 0:
			return []

		min_vehicle_conf = min(self.detector.confidence_threshold, 0.25)

		if result.boxes.id is None:
			output = []
			for index in range(len(result.boxes)):
				class_id = int(result.boxes.cls[index].item())
				class_name = str(result.names[class_id]).lower()
				if class_name in {"automobile", "auto"}:
					class_name = "car"
				if self.detector.class_filter:
					if class_name not in self.detector.class_filter:
						continue
				elif class_name not in surveillance_classes:
					continue
				conf = float(result.boxes.conf[index].item())
				if class_name in vehicle_classes and conf < min_vehicle_conf:
					continue
				bbox = [float(value) for value in result.boxes.xyxy[index].tolist()]
				output.append({
					"track_id": index + 1,
					"class_name": class_name,
					"confidence": conf,
					"bbox": bbox,
					"center_x": (bbox[0] + bbox[2]) / 2,
					"center_y": bbox[3],
					"frame_number": frame_number,
					"timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
				})
			return output

		output = []
		for index, track_id in enumerate(result.boxes.id.int().tolist()):
			class_id = int(result.boxes.cls[index].item())
			class_name = str(result.names[class_id]).lower()
			if class_name in {"automobile", "auto"}:
				class_name = "car"
			if self.detector.class_filter:
				if class_name not in self.detector.class_filter:
					continue
			elif class_name not in surveillance_classes:
				continue
			conf = float(result.boxes.conf[index].item())
			if class_name in vehicle_classes and conf < min_vehicle_conf:
				continue
			bbox = [float(value) for value in result.boxes.xyxy[index].tolist()]
			output.append({
				"track_id": int(track_id),
				"class_name": class_name,
				"confidence": conf,
				"bbox": bbox,
				"center_x": (bbox[0] + bbox[2]) / 2,
				"center_y": bbox[3],
				"frame_number": frame_number,
				"timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
			})
		return output
