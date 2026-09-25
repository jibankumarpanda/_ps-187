import sys
from pathlib import Path
from unittest.mock import Mock

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.anpr import ANPRPipeline


def make_image(height: int = 20, width: int = 30) -> np.ndarray:
    return np.zeros((height, width, 3), dtype=np.uint8)


def make_ocr_line(text: str, confidence: float) -> list:
    box = [[0, 0], [10, 0], [10, 5], [0, 5]]
    return [[box, (text, confidence)]]


def make_pipeline(detections: list, ocr_result, threshold: float = 0.5):
    detector = Mock()
    detector.predict.return_value = detections
    ocr = Mock()
    ocr.ocr.return_value = ocr_result
    return ANPRPipeline(detector, ocr, threshold), detector, ocr


def test_valid_plate_detection_and_ocr():
    image = make_image()
    pipeline, detector, ocr = make_pipeline(
        [{"bbox": [2, 3, 12, 10], "confidence": 0.88}],
        [make_ocr_line("AB12CD", 0.96)],
    )

    result = pipeline.read(image)

    assert result == [{
        "text": "AB12CD",
        "confidence": 0.96,
        "bbox": [2, 3, 12, 10],
        "detector_confidence": 0.88,
    }]
    detector.predict.assert_called_once_with(image)
    crop = ocr.ocr.call_args.args[0]
    assert crop.shape == (7, 10, 3)
    assert ocr.ocr.call_args.kwargs == {"cls": True}


def test_multiple_ocr_results_are_returned_in_order():
    pipeline, _detector, _ocr = make_pipeline(
        [{"bbox": [4, 4, 20, 12]}],
        [make_ocr_line("AB12CD", 0.91), make_ocr_line("XY99ZZ", 0.84)],
    )

    assert pipeline.read(make_image()) == [
        {"text": "AB12CD", "confidence": 0.91, "bbox": [4, 4, 20, 12], "detector_confidence": None},
        {"text": "XY99ZZ", "confidence": 0.84, "bbox": [4, 4, 20, 12], "detector_confidence": None},
    ]


def test_low_ocr_confidence_is_rejected():
    pipeline, _detector, _ocr = make_pipeline(
        [{"bbox": [2, 2, 15, 10]}],
        [make_ocr_line("AB12CD", 0.49)],
    )

    assert pipeline.read(make_image()) == []


def test_plate_text_is_normalized():
    pipeline, _detector, _ocr = make_pipeline(
        [{"bbox": [2, 2, 15, 10]}],
        [make_ocr_line("  ab-12 cd  ", 0.93)],
    )

    result = pipeline.read(make_image())

    assert result[0]["text"] == "AB12CD"


def test_invalid_bounding_box_is_rejected():
    pipeline, _detector, ocr = make_pipeline(
        [{"bbox": [1, 2, "invalid", 4]}],
        [make_ocr_line("AB12CD", 0.99)],
    )

    assert pipeline.read(make_image()) == []
    ocr.ocr.assert_not_called()


def test_bounding_box_is_clamped_to_image_boundaries():
    pipeline, _detector, ocr = make_pipeline(
        [{"bbox": [-5, -4, 40, 30]}],
        [make_ocr_line("AB12CD", 0.97)],
    )

    result = pipeline.read(make_image())

    assert result[0]["bbox"] == [0, 0, 30, 20]
    assert ocr.ocr.call_args.args[0].shape == (20, 30, 3)


def test_empty_crop_is_rejected():
    pipeline, _detector, ocr = make_pipeline(
        [{"bbox": [5, 5, 5, 10]}],
        [make_ocr_line("AB12CD", 0.99)],
    )

    assert pipeline.read(make_image()) == []
    ocr.ocr.assert_not_called()


def test_no_plate_detected_returns_empty_results():
    pipeline, _detector, ocr = make_pipeline([], [make_ocr_line("AB12CD", 0.99)])

    assert pipeline.read(make_image()) == []
    ocr.ocr.assert_not_called()


def test_malformed_ocr_result_is_safely_ignored():
    malformed_result = [
        None,
        "invalid",
        [None],
        [["invalid"]],
        [[[[0, 0]], ("AB12CD", "invalid-confidence")]],
        [[[[0, 0]], None]],
    ]
    pipeline, _detector, _ocr = make_pipeline(
        [{"bbox": [2, 2, 15, 10]}],
        malformed_result,
    )

    assert pipeline.read(make_image()) == []


def test_detector_confidence_is_returned_when_available():
    pipeline, _detector, _ocr = make_pipeline(
        [{"bbox": [2, 2, 15, 10], "detector_confidence": 0.73}],
        [make_ocr_line("AB12CD", 0.95)],
    )

    result = pipeline.read(make_image())

    assert result[0]["detector_confidence"] == 0.73
