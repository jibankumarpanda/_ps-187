"""ONNX Runtime adapter for the verified license-plate OCR model."""

from __future__ import annotations

import math
from collections.abc import Callable
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from .anpr import ANPRPipeline
from .detector import YOLODetector


_ML_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_MODEL_PATH = _ML_ROOT / "models" / "anpr" / "plate_ocr.onnx"
_DEFAULT_PLATE_DETECTOR_PATH = _ML_ROOT / "models" / "anpr" / "plate_detector.pt"
_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_"
_PAD_CHAR = "_"
_IMAGE_HEIGHT = 64
_IMAGE_WIDTH = 128
_MAX_PLATE_SLOTS = 10
_SESSION_FACTORY_TYPE = Callable[..., Any]


class OnnxPlateOCR:
	"""Expose the verified ONNX model through a PaddleOCR-compatible ``ocr`` method."""

	def __init__(self, model_path: str | Path | None = None, session_factory: _SESSION_FACTORY_TYPE | None = None) -> None:
		self.model_path = Path(model_path) if model_path is not None else _DEFAULT_MODEL_PATH
		self._session_factory = session_factory
		self._session: Any = None
		self.last_character_confidences: tuple[float, ...] = ()

	@property
	def model_loaded(self) -> bool:
		return self._session is not None

	def load(self) -> Any:
		"""Load and validate the CPU ONNX session on first use."""
		if self._session is not None:
			return self._session
		if not self.model_path.is_file():
			raise FileNotFoundError(f"ONNX OCR model not found: {self.model_path}")
		factory = self._session_factory
		if factory is None:
			try:
				import onnxruntime as ort
			except ImportError as exc:
				raise RuntimeError("onnxruntime is required for the plate OCR adapter") from exc
			factory = ort.InferenceSession
		try:
			session = factory(str(self.model_path), providers=["CPUExecutionProvider"])
		except FileNotFoundError:
			raise
		except Exception as exc:
			raise RuntimeError(f"Could not load ONNX OCR model: {self.model_path}") from exc
		self._validate_session(session)
		self._session = session
		return session

	@property
	def input_name(self) -> str:
		return "input"

	@property
	def output_name(self) -> str:
		return "plate"

	def preprocess(self, image: Any) -> np.ndarray:
		"""Convert one OpenCV BGR crop to an RGB uint8 batch for the model."""
		if not isinstance(image, np.ndarray):
			raise TypeError("OCR image must be a NumPy array")
		if image.ndim != 3 or image.shape[2] != 3:
			raise ValueError("OCR image must have shape (height, width, 3)")
		if image.size == 0 or image.shape[0] <= 0 or image.shape[1] <= 0:
			raise ValueError("OCR image must not be empty")
		try:
			is_numeric = np.issubdtype(image.dtype, np.number)
		except TypeError as exc:
			raise TypeError("OCR image must have a numeric dtype") from exc
		if not is_numeric:
			raise TypeError("OCR image must have a numeric dtype")
		try:
			bgr = np.clip(image, 0, 255).astype(np.uint8)
			rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
			resized = cv2.resize(rgb, (_IMAGE_WIDTH, _IMAGE_HEIGHT), interpolation=cv2.INTER_LINEAR)
		except (cv2.error, TypeError, ValueError) as exc:
			raise ValueError("OCR image could not be preprocessed") from exc
		if resized.shape != (_IMAGE_HEIGHT, _IMAGE_WIDTH, 3):
			raise ValueError("OCR preprocessing produced an unexpected image shape")
		return np.expand_dims(np.ascontiguousarray(resized, dtype=np.uint8), axis=0)

	def ocr(self, image: Any, cls: bool = False) -> list[Any]:
		"""Run one crop and return PaddleOCR-style lines with text and confidence."""
		del cls
		batch = self.preprocess(image)
		session = self.load()
		try:
			raw_output = session.run([self.output_name], {self.input_name: batch})
		except Exception as exc:
			raise RuntimeError("ONNX OCR inference failed") from exc
		plate_output = self._extract_plate_output(raw_output)
		return self.decode(plate_output, (int(image.shape[0]), int(image.shape[1])))

	def decode(self, model_output: Any, original_shape: tuple[int, int] | None = None) -> list[Any]:
		"""Decode normalized plate probabilities and return a PaddleOCR-compatible result.

		Each character score is the maximum probability in its 37-class slot. The returned
		confidence is the arithmetic mean of scores for non-padding characters.
		"""
		try:
			plate = np.asarray(model_output, dtype=np.float32)
		except (TypeError, ValueError) as exc:
			raise ValueError("ONNX OCR plate output is not numeric") from exc
		if plate.ndim != 3 or plate.shape != (1, _MAX_PLATE_SLOTS, len(_ALPHABET)):
			raise ValueError("ONNX OCR plate output must have shape (1, 10, 37)")
		if not np.isfinite(plate).all():
			raise ValueError("ONNX OCR plate output contains non-finite values")
		if np.any(plate < -1e-4) or np.any(plate > 1.0001):
			raise ValueError("ONNX OCR plate output contains invalid probabilities")
		if not np.allclose(plate.sum(axis=-1), 1.0, rtol=1e-3, atol=1e-3):
			raise ValueError("ONNX OCR plate output is not normalized per character")
		indices = np.argmax(plate[0], axis=-1)
		scores = np.max(plate[0], axis=-1)
		characters = "".join(_ALPHABET[int(index)] for index in indices)
		text = characters.rstrip(_PAD_CHAR)
		if not text:
			self.last_character_confidences = ()
			return []
		character_confidences = scores[:len(text)]
		self.last_character_confidences = tuple(float(value) for value in character_confidences)
		confidence = float(np.mean(character_confidences))
		height, width = original_shape or (_IMAGE_HEIGHT, _IMAGE_WIDTH)
		box = [[0, 0], [max(width - 1, 0), 0], [max(width - 1, 0), max(height - 1, 0)], [0, max(height - 1, 0)]]
		return [[[box, (text, confidence)]]]

	@staticmethod
	def _extract_plate_output(raw_output: Any) -> Any:
		if isinstance(raw_output, dict):
			if "plate" not in raw_output:
				raise ValueError("ONNX OCR session did not return the plate output")
			return raw_output["plate"]
		if not isinstance(raw_output, (list, tuple)) or len(raw_output) != 1:
			raise ValueError("ONNX OCR session returned malformed output")
		return raw_output[0]

	@staticmethod
	def _metadata_type(node: Any) -> str:
		value = getattr(node, "type", getattr(node, "dtype", ""))
		return str(value).replace(" ", "").lower()

	@classmethod
	def _validate_session(cls, session: Any) -> None:
		try:
			inputs = session.get_inputs()
			outputs = session.get_outputs()
		except Exception as exc:
			raise ValueError("ONNX OCR session does not expose model metadata") from exc
		if not isinstance(inputs, (list, tuple)) or not isinstance(outputs, (list, tuple)):
			raise ValueError("ONNX OCR session metadata is malformed")
		input_node = next((node for node in inputs if getattr(node, "name", None) == "input"), None)
		if input_node is None:
			raise ValueError("ONNX OCR model is missing the input named 'input'")
		input_type = cls._metadata_type(input_node)
		if input_type not in {"tensor(uint8)", "uint8"}:
			raise ValueError("ONNX OCR model input must have dtype uint8")
		input_shape = getattr(input_node, "shape", None)
		if not isinstance(input_shape, (list, tuple)) or len(input_shape) != 4 or tuple(input_shape[-3:]) != (_IMAGE_HEIGHT, _IMAGE_WIDTH, 3):
			raise ValueError("ONNX OCR model input must have shape (N, 64, 128, 3)")
		plate_node = next((node for node in outputs if getattr(node, "name", None) == "plate"), None)
		if plate_node is None:
			raise ValueError("ONNX OCR model is missing the output named 'plate'")
		plate_type = cls._metadata_type(plate_node)
		if "float" not in plate_type:
			raise ValueError("ONNX OCR plate output must be floating point")
		plate_shape = getattr(plate_node, "shape", None)
		if not isinstance(plate_shape, (list, tuple)) or len(plate_shape) != 3 or tuple(plate_shape[-2:]) != (_MAX_PLATE_SLOTS, len(_ALPHABET)):
			raise ValueError("ONNX OCR plate output must have shape (N, 10, 37)")


def create_onnx_plate_ocr(model_path: str | Path | None = None, session_factory: _SESSION_FACTORY_TYPE | None = None) -> OnnxPlateOCR:
	"""Create a lazy ONNX plate OCR adapter."""
	return OnnxPlateOCR(model_path, session_factory)


def _resolve_model_path(value: str | Path | None, default: Path) -> Path:
	if value is None:
		return default
	path = Path(value)
	if path.is_absolute():
		return path
	for candidate in (Path.cwd() / path, _ML_ROOT / path, _ML_ROOT.parent / path):
		if candidate.is_file():
			return candidate
	return path


def _require_model(path: Path, label: str) -> None:
	if not path.is_file():
		raise FileNotFoundError(f"{label} model not found: {path}")


def _validated_confidence(value: float, name: str) -> float:
	try:
		result = float(value)
	except (TypeError, ValueError) as exc:
		raise ValueError(f"{name} must be a finite confidence") from exc
	if not math.isfinite(result) or not 0.0 <= result <= 1.0:
		raise ValueError(f"{name} must be between 0 and 1")
	return result


def create_anpr_pipeline(
		plate_detector_model: str | Path | None = None,
		ocr_model: str | Path | None = None,
		detector_confidence: float = 0.35,
		ocr_confidence: float = 0.5,
		device: str | None = None,
		detector: Any | None = None,
		ocr: Any | None = None,
) -> ANPRPipeline:
	"""Create a lazy real plate-detector and ONNX-OCR ANPR pipeline."""
	detector_confidence_value = _validated_confidence(detector_confidence, "detector_confidence")
	ocr_confidence_value = _validated_confidence(ocr_confidence, "ocr_confidence")
	if detector is None:
		detector_path = _resolve_model_path(plate_detector_model, _DEFAULT_PLATE_DETECTOR_PATH)
		_require_model(detector_path, "ANPR plate detector")
		detector = YOLODetector(
			str(detector_path),
			confidence_threshold=detector_confidence_value,
			device=device,
			class_filter=("license_plate",),
		)
	if ocr is None:
		ocr_path = _resolve_model_path(ocr_model, _DEFAULT_MODEL_PATH)
		_require_model(ocr_path, "ANPR OCR")
		ocr = create_onnx_plate_ocr(ocr_path)
	return ANPRPipeline(detector, ocr, ocr_threshold=ocr_confidence_value)


__all__ = ["OnnxPlateOCR", "create_anpr_pipeline", "create_onnx_plate_ocr"]
