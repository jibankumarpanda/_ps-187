import base64
import sys
from pathlib import Path
from unittest.mock import Mock

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.backend_client import _normalize_event
from src.anpr import ANPRPipeline, anpr_result_to_raw_event, crop_plate, encode_plate_crop
from src.pipeline import VideoPipeline


def make_test_frame(height: int = 100, width: int = 200) -> np.ndarray:
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    # Paint a distinctive color block in the plate region [20, 30, 80, 70]
    frame[30:70, 20:80] = [120, 180, 240]
    return frame


def test_valid_plate_crop():
    frame = make_test_frame()
    bbox = [20, 30, 80, 70]

    cropped = crop_plate(frame, bbox)
    assert cropped is not None
    crop, clamped_bbox = cropped
    assert crop.shape == (40, 60, 3)
    assert clamped_bbox == [20, 30, 80, 70]

    encoded = encode_plate_crop(crop)
    assert isinstance(encoded, str)
    assert len(encoded) > 0

    decoded_bytes = base64.b64decode(encoded)
    decoded_img = cv2.imdecode(np.frombuffer(decoded_bytes, np.uint8), cv2.IMREAD_COLOR)
    assert decoded_img is not None
    assert decoded_img.shape == (40, 60, 3)


def test_invalid_bbox():
    frame = make_test_frame()

    # Inverted bbox (x2 < x1)
    assert crop_plate(frame, [80, 30, 20, 70]) is None

    # Inverted bbox (y2 < y1)
    assert crop_plate(frame, [20, 70, 80, 30]) is None

    # Malformed non-numeric coordinates
    assert crop_plate(frame, [20, "invalid", 80, 70]) is None

    # Negative out-of-bounds coordinates that clamp to zero-area
    assert crop_plate(frame, [-50, -50, -10, -10]) is None


def test_empty_crop():
    frame = make_test_frame()

    # Zero width bbox
    assert crop_plate(frame, [20, 30, 20, 70]) is None

    # Zero height bbox
    assert crop_plate(frame, [20, 30, 80, 30]) is None

    # Zero sized ndarray
    assert encode_plate_crop(np.zeros((0, 50, 3), dtype=np.uint8)) is None
    assert encode_plate_crop(np.zeros((50, 0, 3), dtype=np.uint8)) is None
    assert encode_plate_crop(None) is None


def test_anpr_event_with_plate_evidence():
    frame = make_test_frame()
    anpr_result = {
        "text": "HR26DK8337",
        "confidence": 0.94,
        "bbox": [20, 30, 80, 70],
        "detector_confidence": 0.89,
        "track_id": 12,
    }

    event = anpr_result_to_raw_event(
        anpr_result,
        frame_number=7,
        image_shape=frame.shape,
        image=frame,
    )

    assert event is not None
    assert event["event_type"] == "VEHICLE_DETECTED"
    assert event["object_type"] == "PLATE"
    assert event["confidence"] == pytest.approx(0.94)
    assert event["bbox"] == [20, 30, 80, 70]
    assert event["track_id"] == 12

    # Verify plate crop is attached in metadata and top-level
    assert "plate_crop" in event
    assert "plate_crop" in event["metadata"]
    assert event["plate_crop"] == event["metadata"]["plate_crop"]

    # Verify plate crop decodes to the expected crop dimensions (40x60)
    decoded_bytes = base64.b64decode(event["metadata"]["plate_crop"])
    decoded_img = cv2.imdecode(np.frombuffer(decoded_bytes, np.uint8), cv2.IMREAD_COLOR)
    assert decoded_img.shape == (40, 60, 3)

    # Verify existing metadata fields are preserved
    assert event["metadata"]["plate"] == "HR26DK8337"
    assert event["metadata"]["ocr_confidence"] == pytest.approx(0.94)
    assert event["metadata"]["detector_confidence"] == pytest.approx(0.89)
    assert event["metadata"]["frame_number"] == 7
    assert event["metadata"]["watchlist_match"] is False


def test_existing_full_frame_evidence_remains_intact():
    frame = make_test_frame()
    full_frame_snapshot = "full_frame_base64_snapshot_data"

    anpr_result = {
        "text": "DL01AB1234",
        "confidence": 0.96,
        "bbox": [20, 30, 80, 70],
        "detector_confidence": 0.91,
    }

    raw_event = anpr_result_to_raw_event(
        anpr_result,
        frame_number=42,
        image_shape=frame.shape,
        image=frame,
    )
    assert raw_event is not None
    assert "plate_crop" in raw_event["metadata"]

    normalized = _normalize_event(
        raw_event,
        camera_id="CAM-BOP01",
        bop_id="BOP-12",
        timestamp="2026-09-25T14:30:00Z",
        evidence_snapshot=full_frame_snapshot,
        frame_number=42,
    )

    # Full frame evidence snapshot is preserved intact in evidence
    assert normalized["evidence"] == {
        "contentBase64": full_frame_snapshot,
        "mimeType": "image/jpeg",
        "frameNumber": 42,
    }

    # Plate crop evidence is preserved intact in metadata
    assert normalized["metadata"]["plate_crop"] == raw_event["metadata"]["plate_crop"]
    assert normalized["metadata"]["plate"] == "DL01AB1234"
    assert normalized["cameraId"] == "CAM-BOP01"
    assert normalized["bopId"] == "BOP-12"


def test_video_pipeline_propagates_plate_crop_evidence():
    detector = Mock()
    detector.predict.return_value = []
    tracker = Mock()
    tracker.track.return_value = []
    fence = Mock()
    fence.evaluate.return_value = []
    activity = Mock()
    activity.evaluate.return_value = []

    anpr = Mock()
    anpr.read.return_value = [{
        "text": "MH12AB1234",
        "confidence": 0.92,
        "bbox": [10, 10, 50, 40],
        "detector_confidence": 0.85,
    }]

    pipeline = VideoPipeline(
        detector, tracker, fence, activity, camera_id="CAM-01", anpr=anpr
    )
    frame = make_test_frame()

    result = pipeline.process_frame(frame, frame_number=10)

    assert len(result["events"]) == 1
    event = result["events"][0]
    assert event["object_type"] == "PLATE"
    assert "plate_crop" in event["metadata"]

    # Verify crop shape from encoded plate_crop
    decoded = cv2.imdecode(np.frombuffer(base64.b64decode(event["metadata"]["plate_crop"]), np.uint8), cv2.IMREAD_COLOR)
    assert decoded.shape == (30, 40, 3)
