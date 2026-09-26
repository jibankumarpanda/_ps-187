"""Tests for Stick Figure Pose Estimation, Skeletal Rendering, and Posture Classification."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.pose import (
    KEYPOINT_INDEX,
    KEYPOINT_NAMES,
    POSTURE_CLASSES,
    POSTURE_COLORS,
    SKELETON_CONNECTIONS,
    Keypoint,
    PostureClassifier,
    StickFigure,
    StickFigureDetector,
    compute_angle,
    compute_iou,
    extract_pose_features,
)
from src.pipeline import VideoPipeline
from src.detector import YOLODetector

ML_ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT_PATH = ML_ROOT / "models" / "pose" / "posture_classifier.pt"
METRICS_PATH = ML_ROOT / "models" / "pose" / "training_metrics.json"


def make_dummy_keypoints(posture_type: str, bbox: list[float]) -> list[Keypoint]:
    """Helper to synthesize keypoints for a given posture geometry."""
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1
    cx = (x1 + x2) / 2.0

    kps = []
    if posture_type == "STANDING":
        # Upright
        pts = {
            "nose": (cx, y1 + h * 0.08),
            "left_eye": (cx - w * 0.08, y1 + h * 0.06),
            "right_eye": (cx + w * 0.08, y1 + h * 0.06),
            "left_ear": (cx - w * 0.15, y1 + h * 0.08),
            "right_ear": (cx + w * 0.15, y1 + h * 0.08),
            "left_shoulder": (cx - w * 0.25, y1 + h * 0.20),
            "right_shoulder": (cx + w * 0.25, y1 + h * 0.20),
            "left_elbow": (cx - w * 0.30, y1 + h * 0.35),
            "right_elbow": (cx + w * 0.30, y1 + h * 0.35),
            "left_wrist": (cx - w * 0.25, y1 + h * 0.50),
            "right_wrist": (cx + w * 0.25, y1 + h * 0.50),
            "left_hip": (cx - w * 0.18, y1 + h * 0.52),
            "right_hip": (cx + w * 0.18, y1 + h * 0.52),
            "left_knee": (cx - w * 0.18, y1 + h * 0.75),
            "right_knee": (cx + w * 0.18, y1 + h * 0.75),
            "left_ankle": (cx - w * 0.18, y1 + h * 0.95),
            "right_ankle": (cx + w * 0.18, y1 + h * 0.95),
        }
    elif posture_type == "CLIMBING":
        # Hands high above head/shoulders
        pts = {
            "nose": (cx, y1 + h * 0.25),
            "left_eye": (cx - w * 0.08, y1 + h * 0.22),
            "right_eye": (cx + w * 0.08, y1 + h * 0.22),
            "left_ear": (cx - w * 0.15, y1 + h * 0.25),
            "right_ear": (cx + w * 0.15, y1 + h * 0.25),
            "left_shoulder": (cx - w * 0.25, y1 + h * 0.35),
            "right_shoulder": (cx + w * 0.25, y1 + h * 0.35),
            "left_elbow": (cx - w * 0.35, y1 + h * 0.20),
            "right_elbow": (cx + w * 0.35, y1 + h * 0.20),
            "left_wrist": (cx - w * 0.25, y1 + h * 0.05),  # High reach
            "right_wrist": (cx + w * 0.25, y1 + h * 0.05),
            "left_hip": (cx - w * 0.18, y1 + h * 0.60),
            "right_hip": (cx + w * 0.18, y1 + h * 0.60),
            "left_knee": (cx - w * 0.25, y1 + h * 0.80),
            "right_knee": (cx + w * 0.25, y1 + h * 0.80),
            "left_ankle": (cx - w * 0.20, y1 + h * 0.95),
            "right_ankle": (cx + w * 0.20, y1 + h * 0.95),
        }
    elif posture_type == "CROUCHING":
        # Compressed stance, deeply bent knees
        pts = {
            "nose": (cx, y1 + h * 0.15),
            "left_eye": (cx - w * 0.08, y1 + h * 0.12),
            "right_eye": (cx + w * 0.08, y1 + h * 0.12),
            "left_ear": (cx - w * 0.15, y1 + h * 0.15),
            "right_ear": (cx + w * 0.15, y1 + h * 0.15),
            "left_shoulder": (cx - w * 0.25, y1 + h * 0.30),
            "right_shoulder": (cx + w * 0.25, y1 + h * 0.30),
            "left_elbow": (cx - w * 0.35, y1 + h * 0.45),
            "right_elbow": (cx + w * 0.35, y1 + h * 0.45),
            "left_wrist": (cx - w * 0.20, y1 + h * 0.65),
            "right_wrist": (cx + w * 0.20, y1 + h * 0.65),
            "left_hip": (cx - w * 0.20, y1 + h * 0.55),
            "right_hip": (cx + w * 0.20, y1 + h * 0.55),
            "left_knee": (cx - w * 0.40, y1 + h * 0.70),  # Flared bent knees
            "right_knee": (cx + w * 0.40, y1 + h * 0.70),
            "left_ankle": (cx - w * 0.18, y1 + h * 0.95),
            "right_ankle": (cx + w * 0.18, y1 + h * 0.95),
        }
    elif posture_type in ["CRAWLING", "FALLEN"]:
        # Horizontal layout
        mid_y = (y1 + y2) / 2.0
        pts = {
            "nose": (x2 - w * 0.10, mid_y - h * 0.10),
            "left_eye": (x2 - w * 0.12, mid_y - h * 0.15),
            "right_eye": (x2 - w * 0.12, mid_y - h * 0.15),
            "left_ear": (x2 - w * 0.15, mid_y - h * 0.12),
            "right_ear": (x2 - w * 0.15, mid_y - h * 0.12),
            "left_shoulder": (x2 - w * 0.25, mid_y - h * 0.10),
            "right_shoulder": (x2 - w * 0.25, mid_y + h * 0.10),
            "left_elbow": (x2 - w * 0.20, mid_y + h * 0.20),
            "right_elbow": (x2 - w * 0.20, mid_y + h * 0.25),
            "left_wrist": (x2 - w * 0.10, mid_y + h * 0.35),
            "right_wrist": (x2 - w * 0.10, mid_y + h * 0.35),
            "left_hip": (x1 + w * 0.50, mid_y - h * 0.05),
            "right_hip": (x1 + w * 0.50, mid_y + h * 0.10),
            "left_knee": (x1 + w * 0.30, mid_y + h * 0.10),
            "right_knee": (x1 + w * 0.30, mid_y + h * 0.15),
            "left_ankle": (x1 + w * 0.10, mid_y + h * 0.20),
            "right_ankle": (x1 + w * 0.10, mid_y + h * 0.25),
        }

    for name in KEYPOINT_NAMES:
        px, py = pts.get(name, (cx, (y1 + y2) / 2.0))
        kps.append(Keypoint(name=name, x=px, y=py, confidence=0.92, visible=True))
    return kps


def test_keypoint_constants_and_connectivity():
    assert len(KEYPOINT_NAMES) == 17
    assert len(KEYPOINT_INDEX) == 17
    assert len(POSTURE_CLASSES) == 5
    for idx1, idx2, color in SKELETON_CONNECTIONS:
        assert 0 <= idx1 < 17
        assert 0 <= idx2 < 17
        assert len(color) == 3


def test_compute_angle_and_iou():
    # Right angle (0, 10) - (0, 0) - (10, 0) should be 90 degrees
    p1 = (0.0, 10.0)
    p2 = (0.0, 0.0)
    p3 = (10.0, 0.0)
    ang = compute_angle(p1, p2, p3)
    assert abs(ang - 90.0) < 1e-2

    # Straight line (0, 10) - (0, 0) - (0, -10) should be 180 degrees
    p3_straight = (0.0, -10.0)
    ang_straight = compute_angle(p1, p2, p3_straight)
    assert abs(ang_straight - 180.0) < 1e-2

    # IoU calculation
    b1 = [0, 0, 10, 10]
    b2 = [0, 0, 10, 10]
    assert compute_iou(b1, b2) == 1.0
    b3 = [10, 10, 20, 20]
    assert compute_iou(b1, b3) == 0.0


def test_posture_classifier_loads_trained_checkpoint():
    assert CHECKPOINT_PATH.is_file(), f"Missing trained checkpoint at {CHECKPOINT_PATH}"
    classifier = PostureClassifier(CHECKPOINT_PATH)
    assert classifier._model is not None


def test_posture_classification_standing():
    bbox = [100.0, 50.0, 180.0, 260.0]  # Aspect ratio: 210/80 = 2.625 (tall)
    kps = make_dummy_keypoints("STANDING", bbox)
    features = extract_pose_features(kps, bbox)
    classifier = PostureClassifier(CHECKPOINT_PATH)
    posture, conf = classifier.predict(features)
    assert posture == "STANDING"
    assert conf >= 0.70


def test_posture_classification_climbing():
    bbox = [100.0, 50.0, 175.0, 240.0]
    kps = make_dummy_keypoints("CLIMBING", bbox)
    features = extract_pose_features(kps, bbox)
    classifier = PostureClassifier(CHECKPOINT_PATH)
    posture, conf = classifier.predict(features)
    assert posture == "CLIMBING"
    assert conf >= 0.70


def test_posture_classification_crouching():
    bbox = [100.0, 100.0, 200.0, 215.0]  # Aspect ratio: 115/100 = 1.15
    kps = make_dummy_keypoints("CROUCHING", bbox)
    features = extract_pose_features(kps, bbox)
    classifier = PostureClassifier(CHECKPOINT_PATH)
    posture, conf = classifier.predict(features)
    assert posture == "CROUCHING"
    assert conf >= 0.65


def test_posture_classification_crawling_and_fallen():
    bbox = [50.0, 150.0, 260.0, 220.0]  # Aspect ratio: 70/210 = 0.333 (horizontal)
    kps = make_dummy_keypoints("CRAWLING", bbox)
    features = extract_pose_features(kps, bbox)
    classifier = PostureClassifier(CHECKPOINT_PATH)
    posture, conf = classifier.predict(features)
    assert posture in ["CRAWLING", "FALLEN"]
    assert conf >= 0.70


def test_stick_figure_drawing_overlay():
    detector = StickFigureDetector(
        model_path="ml/models/pose/yolo11n-pose.pt",
        classifier_path=str(CHECKPOINT_PATH),
    )
    frame = np.zeros((300, 300, 3), dtype=np.uint8)
    bbox = [50.0, 40.0, 140.0, 240.0]
    kps = make_dummy_keypoints("STANDING", bbox)
    fig = StickFigure(
        person_id=42,
        bbox=bbox,
        confidence=0.95,
        keypoints=kps,
        posture="STANDING",
        posture_confidence=0.92,
        features=extract_pose_features(kps, bbox),
    )

    drawn = detector.draw(frame, [fig], privacy_mode=False)
    assert drawn.shape == frame.shape
    # Frame should have colored lines and circles
    assert np.any(drawn > 0)


def test_stick_figure_drawing_privacy_mode():
    detector = StickFigureDetector(
        model_path="ml/models/pose/yolo11n-pose.pt",
        classifier_path=str(CHECKPOINT_PATH),
    )
    # White background frame simulating raw CCTV image
    frame = np.full((300, 300, 3), 255, dtype=np.uint8)
    bbox = [50.0, 40.0, 140.0, 240.0]
    kps = make_dummy_keypoints("STANDING", bbox)
    fig = StickFigure(
        person_id=7,
        bbox=bbox,
        confidence=0.90,
        keypoints=kps,
        posture="STANDING",
        posture_confidence=0.88,
        features=extract_pose_features(kps, bbox),
    )

    drawn = detector.draw(frame, [fig], privacy_mode=True)
    assert drawn.shape == frame.shape
    # Background should no longer be full white (privacy anonymization applied)
    assert not np.all(drawn == 255)


def test_threat_evaluation_events():
    detector = StickFigureDetector(
        model_path="ml/models/pose/yolo11n-pose.pt",
        classifier_path=str(CHECKPOINT_PATH),
    )

    # 1. Normal standing person should not generate security alarm
    fig_normal = StickFigure(
        person_id=1,
        bbox=[10, 10, 50, 120],
        confidence=0.9,
        keypoints=[],
        posture="STANDING",
        posture_confidence=0.9,
        features={},
    )
    events_normal = detector.evaluate_threats([fig_normal], frame_number=10)
    assert len(events_normal) == 0

    # 2. Infiltration crawling person must generate CRITICAL event
    fig_crawling = StickFigure(
        person_id=2,
        bbox=[10, 10, 150, 50],
        confidence=0.95,
        keypoints=[],
        posture="CRAWLING",
        posture_confidence=0.94,
        features={},
    )
    events_crawling = detector.evaluate_threats([fig_crawling], frame_number=11)
    assert len(events_crawling) == 1
    assert events_crawling[0]["severity"] == "CRITICAL"
    assert "Infiltration" in events_crawling[0]["message"]

    # 3. Climbing person must generate CRITICAL event
    fig_climbing = StickFigure(
        person_id=3,
        bbox=[10, 10, 50, 120],
        confidence=0.93,
        keypoints=[],
        posture="CLIMBING",
        posture_confidence=0.91,
        features={},
    )
    events_climbing = detector.evaluate_threats([fig_climbing], frame_number=12)
    assert len(events_climbing) == 1
    assert events_climbing[0]["severity"] == "CRITICAL"
    assert "Perimeter scaling" in events_climbing[0]["message"]


def test_pipeline_integration_with_pose():
    detector = YOLODetector("yolo11n.pt")
    pose_estimator = StickFigureDetector(
        model_path="ml/models/pose/yolo11n-pose.pt",
        classifier_path=str(CHECKPOINT_PATH),
    )
    pipeline = VideoPipeline(
        detector=detector,
        camera_id="BOP-01-CAM01",
        pose_estimator=pose_estimator,
    )

    # Process empty black frame
    frame = np.zeros((200, 200, 3), dtype=np.uint8)
    result = pipeline.process_frame(frame, frame_number=1)

    assert "stick_figures" in result
    assert isinstance(result["stick_figures"], list)
    assert result["camera_id"] == "BOP-01-CAM01"


def test_trained_metrics_file():
    assert METRICS_PATH.is_file(), f"Missing training metrics at {METRICS_PATH}"
    with METRICS_PATH.open(encoding="utf-8") as f:
        metrics = json.load(f)

    assert metrics["overall_accuracy"] >= 0.95
    assert "STANDING" in metrics["per_class_metrics"]
    assert "CRAWLING" in metrics["per_class_metrics"]
    assert "CLIMBING" in metrics["per_class_metrics"]
    assert "CROUCHING" in metrics["per_class_metrics"]
    assert "FALLEN" in metrics["per_class_metrics"]
