import sys
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.main import _build_stream_pipeline, build_anpr_pipeline, is_anpr_enabled
from src.anpr import ANPRPipeline
from src.pipeline import VideoPipeline


def test_is_anpr_enabled_flag_checks():
    # Both absent or False
    assert is_anpr_enabled({}) is False
    assert is_anpr_enabled({"enabled_modules": {"anpr": False}, "anpr": {"enabled": False}}) is False

    # anpr.enabled = True
    assert is_anpr_enabled({"anpr": {"enabled": True}}) is True

    # enabled_modules.anpr = True
    assert is_anpr_enabled({"enabled_modules": {"anpr": True}}) is True


def test_build_anpr_pipeline_returns_none_when_disabled():
    with patch("api.main.create_anpr_pipeline") as mock_factory:
        config = {
            "enabled_modules": {"anpr": False},
            "anpr": {"enabled": False},
        }
        result = build_anpr_pipeline(config)
        assert result is None
        mock_factory.assert_not_called()


def test_build_anpr_pipeline_creates_real_pipeline_when_enabled():
    mock_pipeline = Mock(spec=ANPRPipeline)
    with patch("api.main.create_anpr_pipeline", return_value=mock_pipeline) as mock_factory:
        config = {
            "anpr": {
                "enabled": True,
                "plate_detector_model": "ml/models/anpr/plate_detector.pt",
                "detector_confidence": 0.40,
                "ocr": {
                    "model": "ml/models/anpr/plate_ocr.onnx",
                    "confidence": 0.55,
                },
            }
        }
        result = build_anpr_pipeline(config, device_name="cpu")

        assert result is mock_pipeline
        mock_factory.assert_called_once_with(
            plate_detector_model="ml/models/anpr/plate_detector.pt",
            ocr_model="ml/models/anpr/plate_ocr.onnx",
            detector_confidence=0.40,
            ocr_confidence=0.55,
            device="cpu",
        )


def test_build_anpr_pipeline_graceful_failure_on_missing_model():
    with patch("api.main.create_anpr_pipeline", side_effect=FileNotFoundError("missing model")):
        config = {"anpr": {"enabled": True}}
        result = build_anpr_pipeline(config)
        # Does not crash; returns None gracefully
        assert result is None


def test_stream_pipeline_construction_uses_anpr_factory():
    mock_pipeline = Mock(spec=ANPRPipeline)
    with patch("api.main.build_anpr_pipeline", return_value=mock_pipeline) as mock_builder:
        stream_pipe = _build_stream_pipeline("CAM-TEST-99")
        assert type(stream_pipe).__name__ == "VideoPipeline"
        assert stream_pipe.anpr is mock_pipeline
        assert stream_pipe.camera_id == "CAM-TEST-99"
        mock_builder.assert_called_once()


def test_anpr_results_reach_normalization_in_api_pipeline():
    detector = Mock()
    detector.predict.return_value = []
    tracker = Mock()
    tracker.track.return_value = []
    fence = Mock()
    fence.evaluate.return_value = []
    activity = Mock()
    activity.evaluate.return_value = []

    mock_anpr = Mock(spec=ANPRPipeline)
    mock_anpr.read.return_value = [{
        "text": "KA01AB1234",
        "confidence": 0.95,
        "bbox": [10, 15, 60, 45],
        "detector_confidence": 0.90,
    }]

    pipeline = VideoPipeline(
        detector, tracker, fence, activity, camera_id="CAM-API-01", anpr=mock_anpr
    )
    frame = np.zeros((100, 150, 3), dtype=np.uint8)

    result = pipeline.process_frame(frame, frame_number=1)

    assert result["camera_id"] == "CAM-API-01"
    assert len(result["events"]) == 1
    event = result["events"][0]
    assert event["event_type"] == "VEHICLE_DETECTED"
    assert event["object_type"] == "PLATE"
    assert event["confidence"] == pytest.approx(0.95)
    assert event["metadata"]["plate"] == "KA01AB1234"
    assert "plate_crop" in event["metadata"]
