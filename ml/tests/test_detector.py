import argparse
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.detector import YOLODetector, select_device


def test_detector_initialization():
    detector = YOLODetector("yolo11n.pt", device=select_device())
    assert detector.confidence_threshold == 0.35
    assert not detector.model_loaded


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    image_path = Path(args.image)
    if not image_path.is_file():
        raise FileNotFoundError(image_path)
    detector = YOLODetector("yolo11n.pt", device=select_device())
    print(detector.predict(str(image_path)))