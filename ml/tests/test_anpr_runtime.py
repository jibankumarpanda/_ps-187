import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.backend_client import _normalize_event
from src.anpr import ANPRPipeline, match_watchlist_plate
from src.anpr_runtime import OnnxPlateOCR, create_anpr_pipeline, create_onnx_plate_ocr
from src.detector import YOLODetector
from src.pipeline import VideoPipeline


PLATE_DETECTOR_PATH = Path(__file__).resolve().parents[1] / "models" / "anpr" / "plate_detector.pt"
MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "anpr" / "plate_ocr.onnx"
ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_"


class FakeSession:
    def __init__(self, output=None, input_type="tensor(uint8)", input_shape=("N", 64, 128, 3), output_shape=("N", 10, 37)):
        self.output = make_plate_output("") if output is None else output
        self.inputs = [SimpleNamespace(name="input", type=input_type, shape=list(input_shape))]
        self.outputs = [SimpleNamespace(name="plate", type="tensor(float)", shape=list(output_shape))]
        self.calls = []

    def get_inputs(self):
        return self.inputs

    def get_outputs(self):
        return self.outputs

    def run(self, output_names, feeds):
        self.calls.append((output_names, feeds))
        return [self.output.copy()]


def make_plate_output(text, scores=None):
    if len(text) > 10:
        raise ValueError("test plate is too long")
    if scores is None:
        scores = [0.95] * len(text)
    output = np.zeros((1, 10, 37), dtype=np.float32)
    padded_text = text + "_" * (10 - len(text))
    for position, character in enumerate(padded_text):
        index = ALPHABET.index(character)
        score = scores[position] if position < len(text) else 0.99
        output[0, position, index] = score
        output[0, position, (index + 1) % 37] = 1.0 - score
    return output


def make_adapter(output, session=None):
    fake_session = session or FakeSession(output)
    factory = Mock(return_value=fake_session)
    return OnnxPlateOCR(session_factory=factory), fake_session


def make_image(height=6, width=8):
    return np.zeros((height, width, 3), dtype=np.uint8)


def test_adapter_initialization_is_lazy_and_loads_on_demand():
    session = FakeSession(make_plate_output("A"))
    factory = Mock(return_value=session)
    adapter = OnnxPlateOCR(session_factory=factory)

    assert not adapter.model_loaded
    factory.assert_not_called()
    assert adapter.load() is session
    assert adapter.model_loaded
    factory.assert_called_once_with(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    assert isinstance(create_onnx_plate_ocr(session_factory=factory), OnnxPlateOCR)


def test_preprocessing_converts_bgr_to_rgb_and_resizes_to_uint8_batch():
    adapter = OnnxPlateOCR()
    image = np.full((2, 4, 3), [10, 20, 30], dtype=np.uint8)

    batch = adapter.preprocess(image)

    assert batch.shape == (1, 64, 128, 3)
    assert batch.dtype == np.uint8
    assert np.array_equal(batch[0, 0, 0], [30, 20, 10])


def test_mocked_inference_decodes_text_removes_padding_and_calculates_confidence():
    adapter, session = make_adapter(make_plate_output("AB12", [0.9, 0.8, 0.7, 0.6]))
    image = np.full((2, 4, 3), [10, 20, 30], dtype=np.uint8)

    result = adapter.ocr(image, cls=True)

    assert session.calls[0][0] == ["plate"]
    batch = session.calls[0][1]["input"]
    assert batch.shape == (1, 64, 128, 3)
    assert batch.dtype == np.uint8
    assert result[0][0][1][0] == "AB12"
    assert result[0][0][1][1] == pytest.approx(0.75)
    assert adapter.last_character_confidences == pytest.approx((0.9, 0.8, 0.7, 0.6))


def test_all_padding_returns_no_ocr_line():
    adapter, _session = make_adapter(make_plate_output(""))

    assert adapter.ocr(make_image()) == []


@pytest.mark.parametrize("output", [
    np.zeros((1, 10, 36), dtype=np.float32),
    np.zeros((1, 2, 37), dtype=np.float32),
    np.full((1, 10, 37), np.nan, dtype=np.float32),
])
def test_malformed_model_output_is_rejected(output):
    adapter, _session = make_adapter(output)

    with pytest.raises(ValueError):
        adapter.ocr(make_image())


def test_missing_model_is_reported_before_session_creation(tmp_path):
    factory = Mock()
    adapter = OnnxPlateOCR(tmp_path / "missing.onnx", session_factory=factory)

    with pytest.raises(FileNotFoundError, match="ONNX OCR model not found"):
        adapter.load()
    factory.assert_not_called()


@pytest.mark.parametrize("image", [
    None,
    np.zeros((0, 4, 3), dtype=np.uint8),
    np.zeros((4, 4), dtype=np.uint8),
    np.zeros((4, 4, 4), dtype=np.uint8),
])
def test_invalid_images_are_rejected(image):
    adapter = OnnxPlateOCR()

    with pytest.raises((TypeError, ValueError)):
        adapter.preprocess(image)


def test_invalid_session_metadata_is_rejected():
    session = FakeSession(make_plate_output("A"), input_type="tensor(float)")
    adapter = OnnxPlateOCR(session_factory=Mock(return_value=session))

    with pytest.raises(ValueError, match="dtype uint8"):
        adapter.load()


def test_returned_result_is_accepted_by_existing_anpr_pipeline():
    adapter, _session = make_adapter(make_plate_output("AB12", [0.9, 0.8, 0.7, 0.6]))
    detector = Mock()
    detector.predict.return_value = [{"bbox": [1, 1, 5, 3], "confidence": 0.88}]
    pipeline = ANPRPipeline(detector, adapter, ocr_threshold=0.5)

    result = pipeline.read(make_image())

    assert result == [{
        "text": "AB12",
        "confidence": pytest.approx(0.75),
        "bbox": [1, 1, 5, 3],
        "detector_confidence": 0.88,
    }]
    detector.predict.assert_called_once()


def test_factory_creates_lazy_real_detector_and_ocr_with_separate_confidences():
    pipeline = create_anpr_pipeline(detector_confidence=0.42, ocr_confidence=0.61)

    assert isinstance(pipeline, ANPRPipeline)
    assert isinstance(pipeline.plate_detector, YOLODetector)
    assert isinstance(pipeline.ocr, OnnxPlateOCR)
    assert pipeline.plate_detector.model_name == str(PLATE_DETECTOR_PATH)
    assert pipeline.plate_detector.confidence_threshold == pytest.approx(0.42)
    assert pipeline.plate_detector.class_filter == {"license_plate"}
    assert pipeline.plate_detector.model_loaded is False
    assert pipeline.ocr.model_path == MODEL_PATH
    assert pipeline.ocr.model_loaded is False
    assert pipeline.ocr_threshold == pytest.approx(0.61)


def test_factory_injects_detector_and_ocr_dependencies():
    detector = Mock()
    ocr = Mock()

    pipeline = create_anpr_pipeline(detector=detector, ocr=ocr)

    assert pipeline.plate_detector is detector
    assert pipeline.ocr is ocr


def test_factory_reports_missing_detector_model(tmp_path):
    with pytest.raises(FileNotFoundError, match="plate detector"):
        create_anpr_pipeline(plate_detector_model=tmp_path / "missing.pt", ocr=Mock())


def test_factory_reports_missing_ocr_model(tmp_path):
    with pytest.raises(FileNotFoundError, match="OCR"):
        create_anpr_pipeline(detector=Mock(), ocr_model=tmp_path / "missing.onnx")


def test_factory_pipeline_returns_empty_when_no_plate_is_detected():
    detector = Mock()
    detector.predict.return_value = []
    ocr = Mock()
    pipeline = create_anpr_pipeline(detector=detector, ocr=ocr)

    assert pipeline.read(make_image()) == []
    ocr.ocr.assert_not_called()


def test_factory_pipeline_propagates_detection_crop_and_ocr_result():
    detector = Mock()
    detector.predict.return_value = [{"bbox": [1, 1, 5, 3], "confidence": 0.88}]
    ocr = Mock()
    ocr.ocr.return_value = [
        [
            [
                [[1, 1], [4, 1], [4, 2], [1, 2]],
                ("ab-12", 0.91),
            ]
        ]
    ]
    pipeline = create_anpr_pipeline(detector=detector, ocr=ocr, ocr_confidence=0.5)

    result = pipeline.read(make_image())

    assert result == [{
        "text": "AB12",
        "confidence": pytest.approx(0.91),
        "bbox": [1, 1, 5, 3],
        "detector_confidence": 0.88,
    }]
    crop = ocr.ocr.call_args.args[0]
    assert crop.shape == (2, 4, 3)
    assert ocr.ocr.call_args.kwargs == {"cls": True}


def test_factory_pipeline_skips_malformed_or_failed_ocr_without_fake_text():
    detector = Mock()
    detector.predict.return_value = [{"bbox": [1, 1, 5, 3], "confidence": 0.88}]
    ocr = Mock()
    ocr.ocr.side_effect = RuntimeError("OCR session failed")
    pipeline = create_anpr_pipeline(detector=detector, ocr=ocr)

    assert pipeline.read(make_image()) == []
    ocr.ocr.assert_called_once()

    ocr.ocr.side_effect = None
    ocr.ocr.return_value = [["malformed"]]
    assert pipeline.read(make_image()) == []


def test_factory_pipeline_ignores_invalid_images():
    detector = Mock()
    ocr = Mock()
    pipeline = create_anpr_pipeline(detector=detector, ocr=ocr)

    assert pipeline.read(None) == []
    assert pipeline.read(np.zeros((0, 8, 3), dtype=np.uint8)) == []
    detector.predict.assert_not_called()
    ocr.ocr.assert_not_called()


def make_video_pipeline(anpr, watchlist_provider=None):
	detector = Mock()
	detector.predict.return_value = []
	tracker = Mock()
	tracker.track.return_value = []
	fence = Mock()
	fence.evaluate.return_value = []
	activity = Mock()
	activity.evaluate.return_value = []
	return VideoPipeline(detector, tracker, fence, activity, camera_id="CAM-7", anpr=anpr,
						 watchlist_provider=watchlist_provider)



def test_valid_anpr_result_becomes_normalized_event():
    anpr_result = {
        "text": " ab-12 ",
        "confidence": 0.91,
        "bbox": [1, 2, 8, 10],
        "detector_confidence": 0.88,
        "track_id": 7,
    }
    anpr = Mock()
    anpr.read.return_value = [anpr_result]
    pipeline = make_video_pipeline(anpr)
    frame = np.zeros((20, 30, 3), dtype=np.uint8)
    timestamp = "2026-09-25T12:00:00+00:00"

    result = pipeline.process_frame(frame, frame_number=42, timestamp=timestamp)

    assert result["anpr"] == [anpr_result]
    assert len(result["events"]) == 1
    event = result["events"][0]
    assert event["event_type"] == "VEHICLE_DETECTED"
    assert event["camera_id"] == "CAM-7"
    assert event["timestamp"] == timestamp
    assert event["track_id"] == 7
    assert event["object_type"] == "PLATE"
    assert event["bounding_box"] == pytest.approx([1, 2, 8, 10])
    assert event["confidence"] == pytest.approx(0.91)
    assert event["metadata"]["plate"] == "AB12"
    assert event["metadata"]["ocr_confidence"] == pytest.approx(0.91)
    assert event["metadata"]["detector_confidence"] == pytest.approx(0.88)
    assert event["metadata"]["frame_number"] == 42


@pytest.mark.parametrize("plate", [None, "", "---", "  _  "])
def test_watchlist_matcher_rejects_empty_normalized_plate(plate):
	assert match_watchlist_plate(plate, [{"numberPlate": "AB12"}]) is None


def test_watchlist_match_propagates_canonical_metadata():
	anpr_result = {
		"text": " AB12CD3456 ",
		"confidence": 0.91,
		"bbox": [1, 2, 8, 10],
	}
	watchlist = [
		{
			"id": "internal-1",
			"vehicleId": "WLV-001",
			"numberPlate": "ab-12 cd 3456",
			"vehicleType": "CAR",
			"status": "ACTIVE",
			"category": "VIP",
			"description": "Priority vehicle",
		},
		{
			"vehicleId": "WLV-002",
			"numberPlate": "ZZZ999",
			"status": "ACTIVE",
		},
	]
	provider = Mock(return_value=watchlist)
	anpr = Mock()
	anpr.read.return_value = [anpr_result]
	pipeline = make_video_pipeline(anpr, provider)

	result = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8), frame_number=4)
	metadata = result["events"][0]["metadata"]

	assert result["events"][0]["event_type"] == "ANPR_MATCH"
	assert metadata["watchlist_match"] is True
	assert metadata["matched_plate"] == "AB12CD3456"
	assert metadata["watchlist_vehicle_id"] == "WLV-001"
	assert metadata["watchlist_id"] == "internal-1"
	assert metadata["watchlist_number_plate"] == "ab-12 cd 3456"
	assert metadata["watchlist_status"] == "ACTIVE"
	assert metadata["watchlist_vehicle_type"] == "CAR"
	assert metadata["watchlist_category"] == "VIP"
	assert metadata["watchlist"] == watchlist[0]
	provider.assert_called_once_with()


def test_valid_anpr_without_watchlist_match_keeps_event_and_sets_false():
	anpr = Mock()
	anpr.read.return_value = [{
		"text": "AB12",
		"confidence": 0.91,
		"bbox": [1, 2, 8, 10],
	}]
	pipeline = make_video_pipeline(anpr, [{
		"vehicleId": "WLV-OTHER",
		"numberPlate": "ZZZ999",
		"status": "ACTIVE",
	}])

	result = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8))
	event = result["events"][0]

	assert event["event_type"] == "VEHICLE_DETECTED"
	assert event["metadata"]["watchlist_match"] is False
	assert "watchlist" not in event["metadata"]


def test_watchlist_duplicate_entries_choose_first_active_match():
	first = {"vehicleId": "WLV-FIRST", "numberPlate": "AB12", "status": "ACTIVE"}
	second = {"vehicleId": "WLV-SECOND", "numberPlate": "ab 12", "status": "ACTIVE"}

	assert match_watchlist_plate("AB-12", [first, second]) == first


@pytest.mark.parametrize("status", ["INACTIVE", None, ""])
def test_non_active_watchlist_entry_does_not_match(status):
	assert match_watchlist_plate("AB12", [{
		"vehicleId": "WLV-INACTIVE",
		"numberPlate": "AB12",
		"status": status,
	}]) is None


@pytest.mark.parametrize("error", [TimeoutError("watchlist timeout"), RuntimeError("backend unavailable")])
def test_watchlist_provider_errors_fail_closed(error):
	def provider():
		raise error

	assert match_watchlist_plate("AB12", provider) is None


def test_video_pipeline_watchlist_provider_error_keeps_generic_anpr_event():
	anpr = Mock()
	anpr.read.return_value = [{
		"text": "AB12",
		"confidence": 0.91,
		"bbox": [1, 2, 8, 10],
	}]
	pipeline = make_video_pipeline(anpr, Mock(side_effect=TimeoutError("watchlist timeout")))

	event = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8))["events"][0]

	assert event["event_type"] == "VEHICLE_DETECTED"
	assert event["metadata"]["watchlist_match"] is False


def test_backend_client_preserves_event_id_and_match_metadata():
	payload = _normalize_event({
		"event_id": "ml-event-123",
		"event_type": "ANPR_MATCH",
		"object_type": "PLATE",
		"bounding_box": [1, 2, 8, 10],
		"confidence": 0.91,
		"metadata": {
			"plate": "AB12",
			"watchlist_match": True,
			"watchlist_vehicle_id": "WLV-001",
		},
	}, "CAM-7", "BOP-7", "2026-09-25T12:00:00+00:00")

	assert payload["eventId"] == "ml-event-123"
	assert payload["eventType"] == "ANPR_MATCH"
	assert payload["metadata"]["watchlist_vehicle_id"] == "WLV-001"
	assert payload["bbox"] == [1.0, 2.0, 8.0, 10.0]


def test_no_anpr_result_creates_no_event():
    anpr = Mock()
    anpr.read.return_value = []
    pipeline = make_video_pipeline(anpr)

    result = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8))

    assert result["events"] == []


@pytest.mark.parametrize("anpr_result", [
    None,
    {},
    {"text": "", "confidence": 0.91, "bbox": [1, 2, 8, 10]},
    {"text": "---", "confidence": 0.91, "bbox": [1, 2, 8, 10]},
    {"text": "AB12", "confidence": "invalid", "bbox": [1, 2, 8, 10]},
    {"text": "AB12", "confidence": 0.91, "bbox": [1, 2, 31, 10]},
])
def test_invalid_anpr_results_create_no_event(anpr_result):
    anpr = Mock()
    anpr.read.return_value = [anpr_result]
    pipeline = make_video_pipeline(anpr)

    result = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8))

    assert result["events"] == []


def test_failed_or_malformed_ocr_creates_no_event():
    detector = Mock()
    detector.predict.return_value = [{"bbox": [1, 1, 8, 6], "confidence": 0.88}]
    ocr = Mock()
    ocr.ocr.side_effect = RuntimeError("OCR failed")
    pipeline = make_video_pipeline(ANPRPipeline(detector, ocr))
    frame = np.zeros((20, 30, 3), dtype=np.uint8)

    assert pipeline.process_frame(frame)["events"] == []

    ocr.ocr.side_effect = None
    ocr.ocr.return_value = [["malformed"]]
    assert pipeline.process_frame(frame)["events"] == []


def test_existing_non_anpr_events_remain_unchanged():
    anpr = Mock()
    anpr.read.return_value = []
    pipeline = make_video_pipeline(anpr)
    pipeline.fence.evaluate.return_value = [{
        "event_type": "INTRUSION",
        "severity": "HIGH",
        "track_id": 4,
        "object_type": "PERSON",
        "confidence": 0.8,
        "bbox": [1, 2, 8, 10],
        "metadata": {"zone": "NORTH"},
    }]
    pipeline.activity.evaluate.return_value = [{
        "event_type": "LOITERING",
        "severity": "MEDIUM",
        "track_id": 5,
        "object_type": "PERSON",
        "confidence": 0.7,
        "bbox": [4, 6, 12, 14],
        "metadata": {"duration_seconds": 60},
    }]

    events = pipeline.process_frame(np.zeros((20, 30, 3), dtype=np.uint8))["events"]

    assert [event["event_type"] for event in events] == ["INTRUSION", "LOITERING"]
    assert events[0]["metadata"] == {"zone": "NORTH"}
    assert events[1]["metadata"] == {"duration_seconds": 60}
