import sys
from pathlib import Path

import numpy as np
import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.detector import YOLODetector


REQUIRED_CLASSES = {"person", "car", "bus", "truck", "van", "bicycle", "motorbike"}
MODEL_REL_PATH = Path("runs/merged_det_yolo/weights/best.pt")
ML_ROOT = Path(__file__).resolve().parents[1]
WEIGHTS_PATH = ML_ROOT / MODEL_REL_PATH


def test_custom_model_weights_exist():
    assert WEIGHTS_PATH.is_file(), f"Custom weights not found at {WEIGHTS_PATH}"
    assert WEIGHTS_PATH.stat().st_size > 1_000_000, "Model weights file is unexpectedly small"


def test_custom_model_classes_cover_all_required_categories():
    from ultralytics import YOLO

    model = YOLO(str(WEIGHTS_PATH))
    class_names = set(model.names.values())
    missing = REQUIRED_CLASSES - class_names
    assert not missing, f"Model is missing required classes: {missing}. Present: {class_names}"
    assert len(class_names) == 7


def test_yolo_detector_loads_custom_model_and_predicts():
    detector = YOLODetector(str(WEIGHTS_PATH), confidence_threshold=0.35)
    dummy_frame = np.zeros((416, 416, 3), dtype=np.uint8)

    detections = detector.predict(dummy_frame)
    assert isinstance(detections, list)


def test_config_yaml_points_to_custom_best_pt():
    config_path = ML_ROOT / "config.yaml"
    with config_path.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    assert cfg.get("model_path") == "runs/merged_det_yolo/weights/best.pt"
