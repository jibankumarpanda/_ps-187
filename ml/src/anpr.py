"""Pure, injectable plate detection and OCR pipeline."""

import base64
import math
import re
from collections.abc import Mapping
from typing import Any

import cv2


_INVALID_PLATE_CHARACTERS = re.compile(r"[^A-Z0-9]")


def encode_plate_crop(crop: Any) -> str | None:
	"""Encode a plate crop numpy array to a base64 JPEG string."""
	if crop is None:
		return None
	if isinstance(crop, str):
		return crop if crop.strip() else None
	shape = getattr(crop, "shape", None)
	if shape is None or len(shape) != 3 or shape[0] <= 0 or shape[1] <= 0:
		return None
	try:
		encoded, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
		if not encoded:
			return None
		return base64.b64encode(buffer.tobytes()).decode("ascii")
	except Exception:
		return None


def crop_plate(image: Any, bbox: Any) -> tuple[Any, list[int]] | None:
	"""Extract and validate plate crop from image using bounding box."""
	return ANPRPipeline._crop(image, bbox)


def normalize_plate_text(value: Any) -> str:
	if not isinstance(value, str):
		return ""
	return _INVALID_PLATE_CHARACTERS.sub("", value.strip().upper())


def match_watchlist_plate(plate: Any, watchlist: Any = None) -> dict[str, Any] | None:
	normalized_plate = normalize_plate_text(plate)
	if not normalized_plate:
		return None

	try:
		provider = watchlist() if callable(watchlist) else watchlist
		if provider is None:
			return None
		entries = (provider,) if isinstance(provider, Mapping) else iter(provider)
		for entry in entries:
			if not isinstance(entry, Mapping):
				continue
			status = entry.get("status")
			if not isinstance(status, str) or status.strip().upper() != "ACTIVE":
				continue
			if normalize_plate_text(entry.get("numberPlate")) != normalized_plate:
				continue
			return dict(entry)
	except Exception:
		return None
	return None


def _watchlist_match_metadata(record: Mapping[str, Any], matched_plate: str) -> dict[str, Any]:
	metadata: dict[str, Any] = {
		"watchlist_match": True,
		"matched_plate": matched_plate,
		"watchlist_vehicle_id": record.get("vehicleId") or record.get("id"),
	}
	if record.get("id") is not None:
		metadata["watchlist_id"] = record["id"]

	canonical: dict[str, Any] = {}
	for key in (
		"id",
		"vehicleId",
		"numberPlate",
		"vehicleType",
		"status",
		"addedBy",
		"description",
		"category",
	):
		if key in record:
			canonical[key] = record[key]
	metadata["watchlist"] = canonical

	field_names = {
		"numberPlate": "watchlist_number_plate",
		"status": "watchlist_status",
		"vehicleType": "watchlist_vehicle_type",
		"category": "watchlist_category",
		"description": "watchlist_description",
	}
	for source, target in field_names.items():
		if source in record:
			metadata[target] = record[source]
	return metadata


def _finite_float(value: Any) -> float | None:
	try:
		result = float(value)
	except (TypeError, ValueError):
		return None
	return result if math.isfinite(result) else None


def _valid_event_bbox(value: Any, image_shape: Any = None) -> list[float] | None:
	if isinstance(value, (str, bytes, dict)):
		return None
	try:
		bbox = [float(item) for item in value]
	except (TypeError, ValueError):
		return None
	if len(bbox) != 4 or not all(math.isfinite(item) for item in bbox):
		return None
	left, top, right, bottom = bbox
	if left < 0 or top < 0 or right <= left or bottom <= top:
		return None
	if image_shape is not None:
		try:
			height, width = int(image_shape[0]), int(image_shape[1])
		except (IndexError, TypeError, ValueError):
			return None
		if height <= 0 or width <= 0 or right > width or bottom > height:
			return None
	return bbox


def _event_track_id(value: Any) -> int | None:
	if value is None or isinstance(value, bool):
		return None
	try:
		track_id = int(value)
	except (TypeError, ValueError, OverflowError):
		return None
	if isinstance(value, float) and value != track_id:
		return None
	return track_id


def anpr_result_to_raw_event(result: Any, frame_number: int | None = None,
								image_shape: Any = None, watchlist: Any = None,
								image: Any = None) -> dict[str, Any] | None:
	if not isinstance(result, dict):
		return None
	plate = normalize_plate_text(result.get("text"))
	if not plate:
		return None
	ocr_confidence = _finite_float(result.get("confidence"))
	if ocr_confidence is None:
		ocr_confidence = _finite_float(result.get("ocr_confidence"))
	if ocr_confidence is None or not 0.0 <= ocr_confidence <= 1.0:
		return None
	bbox = _valid_event_bbox(result.get("bbox"), image_shape)
	if bbox is None:
		return None
	detector_confidence = _finite_float(result.get("detector_confidence"))
	if detector_confidence is not None and not 0.0 <= detector_confidence <= 1.0:
		detector_confidence = None
	metadata: dict[str, Any] = {
		"plate": plate,
		"ocr_confidence": ocr_confidence,
		"detector_confidence": detector_confidence,
	}
	if frame_number is not None:
		metadata["frame_number"] = frame_number
	metadata["watchlist_match"] = False
	watchlist_match = match_watchlist_plate(plate, watchlist)
	if watchlist_match is not None:
		metadata.update(_watchlist_match_metadata(watchlist_match, plate))

	plate_crop_encoded = None
	if isinstance(result, dict) and result.get("plate_crop"):
		plate_crop_encoded = encode_plate_crop(result["plate_crop"])
	elif isinstance(result, dict) and result.get("crop") is not None:
		plate_crop_encoded = encode_plate_crop(result["crop"])
	elif image is not None and bbox is not None:
		cropped = ANPRPipeline._crop(image, bbox)
		if cropped is not None:
			plate_crop_encoded = encode_plate_crop(cropped[0])

	if plate_crop_encoded:
		metadata["plate_crop"] = plate_crop_encoded

	event_payload = {
		"event_type": "ANPR_MATCH" if watchlist_match is not None else "VEHICLE_DETECTED",
		"severity": "HIGH",
		"track_id": _event_track_id(result.get("track_id")),
		"object_type": "PLATE",
		"confidence": ocr_confidence,
		"bbox": bbox,
		"metadata": metadata,
	}
	if plate_crop_encoded:
		event_payload["plate_crop"] = plate_crop_encoded
	return event_payload


class ANPRPipeline:
	def __init__(self, plate_detector: Any = None, ocr: Any = None, ocr_threshold: float = 0.5) -> None:
		self.plate_detector = plate_detector
		self.ocr = ocr
		self.ocr_threshold = float(ocr_threshold)

	def read(self, image: Any, return_crop: bool = False) -> list[dict[str, Any]]:
		if not self._valid_image(image) or self.plate_detector is None or self.ocr is None:
			return []
		try:
			detections = self.plate_detector.predict(image) or []
		except (TypeError, ValueError, IndexError):
			return []
		results: list[dict[str, Any]] = []
		for detection in detections:
			if not isinstance(detection, dict):
				continue
			cropped = self._crop(image, detection.get("bbox"))
			if cropped is None:
				continue
			crop, bbox = cropped
			detector_confidence = _finite_float(
				detection.get("confidence", detection.get("detector_confidence"))
			)
			try:
				ocr_result = self.ocr.ocr(crop, cls=True)
			except Exception:
				continue
			for text, confidence in self._parse_ocr_result(ocr_result):
				normalized_text = normalize_plate_text(text)
				if not normalized_text or confidence is None or confidence < self.ocr_threshold:
					continue
				item: dict[str, Any] = {
					"text": normalized_text,
					"confidence": confidence,
					"bbox": bbox,
					"detector_confidence": detector_confidence,
				}
				if return_crop:
					item["crop"] = crop
				results.append(item)
		return results

	@staticmethod
	def _valid_image(image: Any) -> bool:
		shape = getattr(image, "shape", None)
		if shape is None:
			return False
		try:
			height, width, channels = (int(shape[index]) for index in range(3))
		except (IndexError, TypeError, ValueError):
			return False
		return height > 0 and width > 0 and channels == 3

	@staticmethod
	def _crop(image: Any, bbox: Any) -> tuple[Any, list[int]] | None:
		shape = getattr(image, "shape", None)
		if shape is None:
			return None
		try:
			height, width = int(shape[0]), int(shape[1])
		except (IndexError, TypeError, ValueError):
			return None
		if height <= 0 or width <= 0 or isinstance(bbox, (str, bytes, dict)):
			return None
		try:
			values = tuple(float(value) for value in bbox)
		except (TypeError, ValueError):
			return None
		if len(values) != 4 or not all(math.isfinite(value) for value in values):
			return None
		left, top, right, bottom = values
		if right <= left or bottom <= top:
			return None
		x1 = max(0, min(width, math.floor(left)))
		y1 = max(0, min(height, math.floor(top)))
		x2 = max(0, min(width, math.ceil(right)))
		y2 = max(0, min(height, math.ceil(bottom)))
		if x2 <= x1 or y2 <= y1:
			return None
		try:
			crop = image[y1:y2, x1:x2]
		except (IndexError, TypeError, ValueError):
			return None
		crop_shape = getattr(crop, "shape", None)
		if crop_shape is None:
			return None
		try:
			crop_height, crop_width = int(crop_shape[0]), int(crop_shape[1])
		except (IndexError, TypeError, ValueError):
			return None
		if crop_height <= 0 or crop_width <= 0:
			return None
		return crop, [x1, y1, x2, y2]

	@staticmethod
	def _parse_ocr_result(result: Any) -> list[tuple[str, float | None]]:
		parsed: list[tuple[str, float | None]] = []
		if not isinstance(result, (list, tuple)):
			return parsed
		for line in result:
			if not isinstance(line, (list, tuple)):
				continue
			for item in line:
				if not isinstance(item, (list, tuple)) or len(item) != 2:
					continue
				_recognition = item[1]
				if not isinstance(_recognition, (list, tuple)) or len(_recognition) < 2:
					continue
				text, confidence = _recognition[:2]
				if isinstance(text, str):
					parsed.append((text, _finite_float(confidence)))
		return parsed
