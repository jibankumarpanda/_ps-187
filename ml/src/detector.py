"""Reusable Ultralytics YOLO detector with lazy, configurable loading."""

from dataclasses import asdict, dataclass
from typing import Any, Iterable

import cv2


@dataclass
class Detection:
	class_id: int
	class_name: str
	confidence: float
	bbox: list[float]

	def to_dict(self) -> dict[str, Any]:
		return asdict(self)


class YOLODetector:
	def __init__(self, model_name: str = "yolo11n.pt", confidence_threshold: float = 0.35,
				 device: str | None = None, class_filter: Iterable[str] | None = None) -> None:
		self.model_name = model_name
		self.confidence_threshold = confidence_threshold
		self.device = device
		self.class_filter = set(class_filter) if class_filter else None
		self._model: Any = None

	def load(self) -> Any:
		if self._model is None:
			try:
				from ultralytics import YOLO
			except ImportError as exc:
				raise RuntimeError("Install ultralytics before loading a YOLO model") from exc
			self._model = YOLO(self.model_name)
		return self._model

	def predict(self, frame: Any) -> list[dict[str, Any]]:
		model = self.load()
		kwargs: dict[str, Any] = {"conf": self.confidence_threshold, "verbose": False}
		if self.device:
			kwargs["device"] = self.device
		results = model.predict(frame, **kwargs)
		return self._parse_result(results[0]) if results else []

	def draw(self, frame: Any, detections: list[dict[str, Any]]) -> Any:
		output = frame.copy()
		for detection in detections:
			x1, y1, x2, y2 = [int(value) for value in detection["bbox"]]
			label = f"{detection['class_name']} {detection['confidence']:.2f}"
			cv2.rectangle(output, (x1, y1), (x2, y2), (0, 200, 0), 2)
			cv2.putText(output, label, (x1, max(y1 - 8, 0)), cv2.FONT_HERSHEY_SIMPLEX,
						0.5, (0, 200, 0), 1, cv2.LINE_AA)
		return output

	def _parse_result(self, result: Any) -> list[dict[str, Any]]:
		names = result.names
		detections: list[dict[str, Any]] = []
		boxes = result.boxes
		surveillance_classes = {"person", "car", "truck", "bus", "motorcycle", "bicycle"}
		vehicle_classes = {"car", "truck", "bus", "motorcycle", "bicycle"}

		for index in range(len(boxes)):
			class_id = int(boxes.cls[index].item())
			class_name = str(names[class_id]).lower()
			if self.class_filter:
				if class_name not in self.class_filter:
					continue
			elif class_name not in surveillance_classes:
				continue

			conf = float(boxes.conf[index].item())
			# Suppress false vehicle detections from indoor background objects
			if class_name in vehicle_classes and conf < 0.55:
				continue

			detection = Detection(
				class_id=class_id,
				class_name=class_name,
				confidence=conf,
				bbox=[float(value) for value in boxes.xyxy[index].tolist()],
			)
			detections.append(detection.to_dict())
		return detections

	@property
	def model_loaded(self) -> bool:
		return self._model is not None


def select_device(preferred: str | None = None) -> str:
	if preferred:
		return preferred
	try:
		import torch
		return "cuda" if torch.cuda.is_available() else "cpu"
	except ImportError:
		return "cpu"
