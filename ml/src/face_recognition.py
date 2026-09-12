"""Pretrained ArcFace embedding comparison against a local face gallery."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np

try:
	import onnxruntime as ort
except ImportError:  # pragma: no cover - optional runtime dependency
	ort = None

from .face import FaceDetector


def _cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
	left = np.asarray(left, dtype=np.float32)
	right = np.asarray(right, dtype=np.float32)
	left_norm = np.linalg.norm(left)
	right_norm = np.linalg.norm(right)
	if left_norm == 0.0 or right_norm == 0.0:
		return 0.0
	return float(np.dot(left, right) / (left_norm * right_norm))


class FaceRecognizer:
	def __init__(self, detector: Any | None = None, embedder: Any = None,
				 gallery_dir: str | Path | None = None, threshold: float = 0.45,
				 model_path: str | Path | None = None) -> None:
		root = Path(__file__).resolve().parents[1]
		self.detector = detector or FaceDetector()
		self.gallery_dir = Path(gallery_dir) if gallery_dir else root / "data" / "faces"
		if not self.gallery_dir.is_absolute():
			self.gallery_dir = root / self.gallery_dir
		self.threshold = float(threshold)
		self.model_path = Path(model_path) if model_path else root / ".insightface" / "buffalo_l" / "w600k_r50.onnx"
		if not self.model_path.is_absolute():
			self.model_path = root / self.model_path
		self.embedder = embedder or self._load_embedder()
		self.gallery: dict[str, np.ndarray] = {}
		self._load_gallery()

	def _load_embedder(self) -> Any | None:
		if ort is None or not self.model_path.is_file():
			return None
		try:
			return ort.InferenceSession(str(self.model_path), providers=["CPUExecutionProvider"])
		except Exception:
			return None

	def _embedding_from_crop(self, crop: np.ndarray) -> np.ndarray | None:
		if self.embedder is None or crop.size == 0:
			return None
		if hasattr(self.embedder, "get"):
			faces = self.embedder.get(crop)
			if not faces:
				return None
			face = faces[0]
			value = face.embedding if hasattr(face, "embedding") else face.get("embedding")
			return self._normalise_embedding(value)
		if hasattr(self.embedder, "run"):
			input_name = self.embedder.get_inputs()[0].name
			resized = cv2.resize(crop, (112, 112), interpolation=cv2.INTER_AREA)
			rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32)
			blob = ((rgb - 127.5) / 127.5).transpose(2, 0, 1)[None, ...]
			return self._normalise_embedding(self.embedder.run(None, {input_name: blob})[0])
		return self._normalise_embedding(self.embedder(crop)) if callable(self.embedder) else None

	@staticmethod
	def _normalise_embedding(value: Any) -> np.ndarray | None:
		array = np.asarray(value, dtype=np.float32).reshape(-1)
		if array.size == 0:
			return None
		norm = np.linalg.norm(array)
		return array / norm if norm else None

	def _embed_face(self, frame: np.ndarray, bbox: list[float] | None) -> np.ndarray | None:
		if bbox is None:
			return self._embedding_from_crop(frame)
		x1, y1, x2, y2 = [int(round(float(value))) for value in bbox]
		crop = frame[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
		return self._embedding_from_crop(crop)

	def _load_gallery(self) -> None:
		if not self.gallery_dir.is_dir():
			return
		for image_path in sorted(self.gallery_dir.iterdir()):
			if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
				continue
			image = cv2.imread(str(image_path))
			if image is None:
				continue
			faces = self.detector.detect(image) if self.detector else []
			bbox = faces[0]["bbox"] if faces else [0.0, 0.0, float(image.shape[1]), float(image.shape[0])]
			embedding = self._embed_face(image, bbox)
			if embedding is not None:
				self.gallery[image_path.stem] = embedding

	def analyze(self, frame: Any) -> list[dict[str, Any]]:
		if not isinstance(frame, np.ndarray):
			return []
		faces = self.detector.detect(frame) if self.detector else []
		if not faces:
			faces = [{"bbox": [0.0, 0.0, float(frame.shape[1]), float(frame.shape[0])], "confidence": None}]
		results: list[dict[str, Any]] = []
		for face in faces:
			embedding = self._embed_face(frame, face["bbox"])
			best_identity = "UNKNOWN"
			best_score = 0.0
			if embedding is not None:
				for identity, reference in self.gallery.items():
					score = _cosine_similarity(embedding, reference)
					if score > best_score:
						best_identity, best_score = identity, score
			if best_score < self.threshold:
				best_identity = "UNKNOWN"
			results.append({"bbox": face["bbox"], "confidence": best_score, "identity": best_identity})
		return results
