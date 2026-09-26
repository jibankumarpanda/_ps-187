import sys
from pathlib import Path
from unittest.mock import Mock

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.backend_client import _normalize_event, event_requires_evidence
from api.stream_worker import CameraStreamConfig, CameraStreamWorker


def test_event_requires_evidence_for_anpr_and_critical():
    assert event_requires_evidence({"event_type": "ANPR_MATCH"}) is True
    assert event_requires_evidence({"object_type": "PLATE"}) is True
    assert event_requires_evidence({"eventType": "INTRUSION"}) is True
    assert event_requires_evidence({"event_type": "FACE_MATCH"}) is True
    assert event_requires_evidence({"severity": "CRITICAL", "event_type": "LOITERING"}) is True

    assert event_requires_evidence({"event_type": "PERSON_DETECTED", "object_type": "PERSON", "severity": "LOW"}) is False
    assert event_requires_evidence({"event_type": "VEHICLE_DETECTED", "object_type": "CAR", "severity": "MEDIUM"}) is False


def test_normalize_event_attaches_evidence_snapshot_and_frame_number():
    event = {
        "event_id": "evt-anpr-1",
        "event_type": "ANPR_MATCH",
        "object_type": "PLATE",
        "confidence": 0.94,
        "bbox": [10, 20, 110, 60],
        "metadata": {"plate": "DL01AB1234"},
    }

    normalized = _normalize_event(
        event,
        camera_id="CAM-01",
        bop_id="BOP-01",
        timestamp="2026-09-25T12:00:00Z",
        evidence_snapshot="base64_encoded_jpeg_bytes",
        frame_number=42,
    )

    assert normalized["eventId"] == "evt-anpr-1"
    assert normalized["cameraId"] == "CAM-01"
    assert normalized["bopId"] == "BOP-01"
    assert normalized["evidence"] == {
        "contentBase64": "base64_encoded_jpeg_bytes",
        "mimeType": "image/jpeg",
        "frameNumber": 42,
    }


def test_normalize_event_omits_evidence_when_not_required():
    event = {
        "event_type": "PERSON_DETECTED",
        "object_type": "PERSON",
        "severity": "LOW",
    }

    normalized = _normalize_event(
        event,
        camera_id="CAM-01",
        bop_id="BOP-01",
        timestamp="2026-09-25T12:00:00Z",
        evidence_snapshot="base64_encoded_jpeg_bytes",
        frame_number=42,
    )

    assert "evidence" not in normalized


def make_worker():
    pipeline = Mock()
    pipeline_factory = Mock(return_value=pipeline)
    forward_mock = Mock(return_value=[{"status": "ok"}])
    report_mock = Mock()
    config = CameraStreamConfig(
        camera_id="CAM-TEST",
        bop_id="BOP-TEST",
        stream_url="rtsp://dummy/live",
        zones=[],
        event_cooldown_seconds=10.0,
    )
    worker = CameraStreamWorker(config, pipeline_factory, forward_mock, report_mock)
    return worker, forward_mock


def test_dispatch_skips_snapshot_when_no_evidence_required():
    worker, forward_mock = make_worker()
    worker._snapshot = Mock(return_value="snapshot_base64")
    frame = np.zeros((100, 100, 3), dtype=np.uint8)

    events = [{"event_type": "PERSON_DETECTED", "object_type": "PERSON", "severity": "LOW"}]
    worker._dispatch(frame, events, frame_number=10, timestamp="2026-09-25T12:00:00Z")

    worker._snapshot.assert_not_called()
    forward_mock.assert_called_once_with(
        events,
        camera_id="CAM-TEST",
        bop_id="BOP-TEST",
        timestamp="2026-09-25T12:00:00Z",
        evidence_snapshot=None,
        frame_number=10,
    )


def test_dispatch_takes_snapshot_when_anpr_event_present():
    worker, forward_mock = make_worker()
    worker._snapshot = Mock(return_value="snapshot_base64")
    frame = np.zeros((100, 100, 3), dtype=np.uint8)

    events = [{"event_type": "ANPR_MATCH", "object_type": "PLATE", "metadata": {"plate": "DL01AB1234"}}]
    worker._dispatch(frame, events, frame_number=15, timestamp="2026-09-25T12:00:00Z")

    worker._snapshot.assert_called_once_with(frame)
    forward_mock.assert_called_once_with(
        events,
        camera_id="CAM-TEST",
        bop_id="BOP-TEST",
        timestamp="2026-09-25T12:00:00Z",
        evidence_snapshot="snapshot_base64",
        frame_number=15,
    )


def test_new_events_deduplicates_by_plate_for_anpr():
    worker, _ = make_worker()

    event1 = {
        "event_type": "ANPR_MATCH",
        "track_id": None,
        "metadata": {"plate": "DL01AB1234"},
    }
    event2 = {
        "event_type": "ANPR_MATCH",
        "track_id": None,
        "metadata": {"plate": "HR26DK8888"},
    }

    # First event for DL01AB1234 should pass
    fresh1 = worker._new_events([event1])
    assert len(fresh1) == 1

    # Immediate second event for DL01AB1234 should be suppressed by cooldown
    fresh_repeat = worker._new_events([event1])
    assert len(fresh_repeat) == 0

    # Event for a different plate HR26DK8888 should pass even with track_id=None
    fresh2 = worker._new_events([event2])
    assert len(fresh2) == 1
