import argparse
import json
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.detector import YOLODetector, select_device
from src.intrusion import VirtualFence
from src.tracker import ObjectTracker


def test_virtual_fence_evaluation():
    fence = VirtualFence({"restricted": [[0, 0], [100, 0], [100, 100], [0, 100]]})
    assert fence is not None
    # Test point inside restricted zone
    inside_track = {"track_id": 1, "class_name": "person", "confidence": 0.95, "bbox": [10, 10, 50, 50]}
    events = fence.evaluate([inside_track])
    assert len(events) == 1
    assert events[0]["event_type"] == "INTRUSION"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--zone", required=True, help="JSON polygon, e.g. [[0,0],[500,0],[500,500],[0,500]]")
    args = parser.parse_args()
    if not Path(args.image).is_file():
        raise FileNotFoundError(args.image)
    tracks = ObjectTracker(YOLODetector("yolo11n.pt", device=select_device())).track(args.image)
    print(VirtualFence({"restricted": json.loads(args.zone)}).evaluate(tracks))