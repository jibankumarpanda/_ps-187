import argparse
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.detector import YOLODetector, select_device
from src.pipeline import VideoPipeline


def test_video_pipeline_initialization():
    pipeline = VideoPipeline(YOLODetector("yolo11n.pt", device=select_device()))
    assert pipeline.camera_id == "CAM_001"
    assert pipeline.process_every_n_frames == 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if not Path(args.video).is_file():
        raise FileNotFoundError(args.video)
    pipeline = VideoPipeline(YOLODetector("yolo11n.pt", device=select_device()))
    print(pipeline.process_video(args.video, args.output))