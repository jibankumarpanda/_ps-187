import argparse
import sys
from pathlib import Path
import cv2
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.face import FaceDetector


def test_face_detector_initialization():
    detector = FaceDetector()
    assert detector is not None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    if not Path(args.image).is_file():
        raise FileNotFoundError(args.image)
    print(FaceDetector().detect(cv2.imread(args.image)))