"""Stick Figure and Human Pose Estimation module for border surveillance analytics.

Implements:
1. 17-keypoint COCO human pose estimation via YOLO-Pose.
2. Stick figure skeletal visualization and privacy-preserving anonymization (PrivacyLens).
3. Biomechanical feature extraction and posture classification:
   - STANDING: normal upright civilian/officer.
   - CROUCHING: bent knees, lowered stance (concealment).
   - CRAWLING: horizontal body axis, low ground clearance (covert border infiltration).
   - CLIMBING: wrists elevated above head/shoulders (scaling perimeter fences).
   - FALLEN: person horizontal at ground level (guard down, medical distress, casualty).
4. Security event generation for suspicious postures.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import math
from pathlib import Path
from typing import Any, Iterable

import cv2
import numpy as np

# 17 COCO Keypoint Definitions
KEYPOINT_NAMES = [
    "nose",            # 0
    "left_eye",        # 1
    "right_eye",       # 2
    "left_ear",        # 3
    "right_ear",       # 4
    "left_shoulder",   # 5
    "right_shoulder",  # 6
    "left_elbow",      # 7
    "right_elbow",     # 8
    "left_wrist",      # 9
    "right_wrist",     # 10
    "left_hip",        # 11
    "right_hip",       # 12
    "left_knee",       # 13
    "right_knee",      # 14
    "left_ankle",      # 15
    "right_ankle",     # 16
]

KEYPOINT_INDEX = {name: i for i, name in enumerate(KEYPOINT_NAMES)}

# Anatomical Connections for Stick Figure Skeleton
SKELETON_CONNECTIONS = [
    # Head
    (0, 1, (255, 191, 0)),    # nose - left_eye (cyan-ish)
    (0, 2, (255, 191, 0)),    # nose - right_eye
    (1, 3, (255, 191, 0)),    # left_eye - left_ear
    (2, 4, (255, 191, 0)),    # right_eye - right_ear
    # Torso / Shoulders
    (5, 6, (0, 255, 255)),    # left_shoulder - right_shoulder (yellow)
    (5, 11, (0, 215, 255)),   # left_shoulder - left_hip (gold)
    (6, 12, (0, 215, 255)),   # right_shoulder - right_hip
    (11, 12, (0, 255, 255)),  # left_hip - right_hip
    # Left Arm
    (5, 7, (0, 255, 0)),      # left_shoulder - left_elbow (green)
    (7, 9, (0, 200, 0)),      # left_elbow - left_wrist
    # Right Arm
    (6, 8, (255, 128, 0)),    # right_shoulder - right_elbow (blue-ish/orange in BGR)
    (8, 10, (255, 100, 0)),   # right_elbow - right_wrist
    # Left Leg
    (11, 13, (255, 0, 128)),  # left_hip - left_knee (purple/magenta)
    (13, 15, (200, 0, 100)),  # left_knee - left_ankle
    # Right Leg
    (12, 14, (0, 128, 255)),  # right_hip - right_knee (orange)
    (14, 16, (0, 100, 200)),  # right_knee - right_ankle
]

POSTURE_CLASSES = ["STANDING", "CROUCHING", "CRAWLING", "CLIMBING", "FALLEN"]

# Posture alert colors in BGR format
POSTURE_COLORS = {
    "STANDING": (0, 255, 0),       # Green - Normal
    "CROUCHING": (0, 215, 255),    # Yellow/Gold - Suspicious
    "CRAWLING": (0, 0, 255),       # Red - High threat breach
    "CLIMBING": (255, 0, 255),     # Magenta - Perimeter scaling
    "FALLEN": (0, 69, 255),        # Red-Orange - Person down alert
}


@dataclass
class Keypoint:
    name: str
    x: float
    y: float
    confidence: float
    visible: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class StickFigure:
    person_id: int | None
    bbox: list[float]  # [x1, y1, x2, y2]
    confidence: float
    keypoints: list[Keypoint]
    posture: str
    posture_confidence: float
    features: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "person_id": self.person_id,
            "bbox": self.bbox,
            "confidence": self.confidence,
            "keypoints": [kp.to_dict() for kp in self.keypoints],
            "posture": self.posture,
            "posture_confidence": self.posture_confidence,
            "features": self.features,
        }


def compute_angle(p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float]) -> float:
    """Compute the angle at p2 in degrees given three points (p1-p2-p3)."""
    v1 = (p1[0] - p2[0], p1[1] - p2[1])
    v2 = (p3[0] - p2[0], p3[1] - p2[1])
    len1 = math.hypot(v1[0], v1[1])
    len2 = math.hypot(v2[0], v2[1])
    if len1 < 1e-4 or len2 < 1e-4:
        return 180.0
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    cos_theta = max(-1.0, min(1.0, dot / (len1 * len2)))
    return math.degrees(math.acos(cos_theta))


def extract_pose_features(kps: list[Keypoint], bbox: list[float]) -> dict[str, float]:
    """Extract scale- and translation-invariant biomechanical features for posture classification."""
    x1, y1, x2, y2 = bbox
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    aspect_ratio = box_h / box_w  # Upright > 1.4, Crawling/Fallen < 1.0

    kp_map = {kp.name: (kp.x, kp.y, kp.confidence, kp.visible) for kp in kps}

    # Helper coordinates
    def get_pt(name: str) -> tuple[float, float] | None:
        p = kp_map.get(name)
        if p and p[3]:
            return (p[0], p[1])
        return None

    nose = get_pt("nose")
    l_sh = get_pt("left_shoulder")
    r_sh = get_pt("right_shoulder")
    l_el = get_pt("left_elbow")
    r_el = get_pt("right_elbow")
    l_wr = get_pt("left_wrist")
    r_wr = get_pt("right_wrist")
    l_hip = get_pt("left_hip")
    r_hip = get_pt("right_hip")
    l_knee = get_pt("left_knee")
    r_knee = get_pt("right_knee")
    l_ank = get_pt("left_ankle")
    r_ank = get_pt("right_ankle")

    # Mid-shoulder and mid-hip
    mid_sh = None
    if l_sh and r_sh:
        mid_sh = ((l_sh[0] + r_sh[0]) / 2.0, (l_sh[1] + r_sh[1]) / 2.0)
    elif l_sh or r_sh:
        mid_sh = l_sh or r_sh

    mid_hip = None
    if l_hip and r_hip:
        mid_hip = ((l_hip[0] + r_hip[0]) / 2.0, (l_hip[1] + r_hip[1]) / 2.0)
    elif l_hip or r_hip:
        mid_hip = l_hip or r_hip

    # Spine inclination (angle of torso with vertical line, in degrees)
    # 0 = perfectly upright, 90 = completely horizontal (crawling / prone / fallen)
    spine_inclination = 0.0
    torso_height_ratio = 0.0
    if mid_sh and mid_hip:
        dx = abs(mid_sh[0] - mid_hip[0])
        dy = abs(mid_sh[1] - mid_hip[1])
        spine_inclination = math.degrees(math.atan2(dx, max(dy, 1e-4)))
        torso_height_ratio = dy / box_h

    # Knee angles (180 = straight legs, < 120 = bent knees/crouching)
    knee_angles: list[float] = []
    if l_hip and l_knee and l_ank:
        knee_angles.append(compute_angle(l_hip, l_knee, l_ank))
    if r_hip and r_knee and r_ank:
        knee_angles.append(compute_angle(r_hip, r_knee, r_ank))
    avg_knee_angle = float(np.mean(knee_angles)) if knee_angles else 170.0

    # Arm elevation: wrists vertical distance relative to shoulders and nose
    # Positive means hands are above shoulders (in image coords, lower y is higher in space)
    hands_above_shoulders = 0.0
    if mid_sh:
        sh_y = mid_sh[1]
        hand_heights: list[float] = []
        if l_wr:
            hand_heights.append((sh_y - l_wr[1]) / box_h)
        if r_wr:
            hand_heights.append((sh_y - r_wr[1]) / box_h)
        if hand_heights:
            hands_above_shoulders = float(np.max(hand_heights))

    # Head vertical position relative to hips and ankles
    head_elevation = 1.0
    if nose and mid_hip:
        head_elevation = (mid_hip[1] - nose[1]) / box_h

    # Normalized keypoint positions relative to bounding box [0, 1]
    norm_kps: list[float] = []
    for kp in kps:
        norm_x = (kp.x - x1) / box_w
        norm_y = (kp.y - y1) / box_h
        norm_kps.extend([norm_x, norm_y])

    features = {
        "aspect_ratio": round(aspect_ratio, 3),
        "spine_inclination": round(spine_inclination, 2),
        "torso_height_ratio": round(torso_height_ratio, 3),
        "avg_knee_angle": round(avg_knee_angle, 2),
        "hands_above_shoulders": round(hands_above_shoulders, 3),
        "head_elevation": round(head_elevation, 3),
    }

    for i, val in enumerate(norm_kps):
        features[f"kp_norm_{i}"] = round(val, 4)

    return features


class PostureClassifier:
    """Trained posture classifier with model checkpoint loader and rule-assisted biomechanical verification."""

    def __init__(self, weights_path: str | Path | None = None) -> None:
        self.weights_path = Path(weights_path) if weights_path else None
        self._model: Any = None
        self._weights_dict: dict[str, Any] | None = None
        if self.weights_path and self.weights_path.is_file():
            self.load(self.weights_path)

    def load(self, weights_path: str | Path) -> None:
        path = Path(weights_path)
        if not path.is_file():
            return
        if path.suffix == ".json":
            with path.open(encoding="utf-8") as f:
                self._weights_dict = json.load(f)
        elif path.suffix in [".pt", ".pth"]:
            try:
                import torch
                import torch.nn as nn

                class PostureNet(nn.Module):
                    def __init__(self, in_features: int = 40, out_classes: int = 5) -> None:
                        super().__init__()
                        self.net = nn.Sequential(
                            nn.Linear(in_features, 128),
                            nn.BatchNorm1d(128),
                            nn.ReLU(),
                            nn.Dropout(0.2),
                            nn.Linear(128, 64),
                            nn.BatchNorm1d(64),
                            nn.ReLU(),
                            nn.Dropout(0.1),
                            nn.Linear(64, out_classes),
                        )

                    def forward(self, x: torch.Tensor) -> torch.Tensor:
                        return self.net(x)

                checkpoint = torch.load(str(path), map_location="cpu")
                net = PostureNet()
                if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                    net.load_state_dict(checkpoint["state_dict"])
                elif isinstance(checkpoint, dict):
                    net.load_state_dict(checkpoint)
                net.eval()
                self._model = net
            except Exception:
                pass

    def predict(self, features: dict[str, float]) -> tuple[str, float]:
        """Classify posture using trained neural network with biomechanical ensemble."""
        # 1. Neural Network Forward Pass if model is loaded
        if self._model is not None:
            try:
                import torch
                feat_vector = [
                    features.get("aspect_ratio", 1.8),
                    features.get("spine_inclination", 0.0) / 90.0,
                    features.get("torso_height_ratio", 0.3),
                    features.get("avg_knee_angle", 175.0) / 180.0,
                    features.get("hands_above_shoulders", -0.2),
                    features.get("head_elevation", 0.8),
                ]
                for i in range(34):
                    feat_vector.append(features.get(f"kp_norm_{i}", 0.5))

                with torch.no_grad():
                    x_tensor = torch.tensor([feat_vector], dtype=torch.float32)
                    logits = self._model(x_tensor)
                    probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
                    pred_idx = int(np.argmax(probs))
                    nn_class = POSTURE_CLASSES[pred_idx]
                    nn_conf = float(probs[pred_idx])
                    if nn_conf >= 0.55:
                        return nn_class, round(nn_conf, 3)
            except Exception:
                pass

        # 2. Biomechanical Heuristic Verification (Ensemble Fallback)
        aspect_ratio = features.get("aspect_ratio", 1.8)
        spine_inc = features.get("spine_inclination", 0.0)
        knee_angle = features.get("avg_knee_angle", 175.0)
        hands_up = features.get("hands_above_shoulders", -0.2)
        head_elev = features.get("head_elevation", 0.8)

        # Climbing: Hands elevated above head/shoulders with vertical reach
        if hands_up > 0.15 and aspect_ratio > 1.2:
            conf = min(0.98, 0.70 + (hands_up * 0.8))
            return "CLIMBING", round(conf, 3)

        # Crawling: Low aspect ratio (< 1.15) with horizontal spine (> 40 deg)
        if aspect_ratio < 1.15 and spine_inc > 40.0 and head_elev > 0.05:
            conf = min(0.99, 0.75 + (spine_inc / 180.0) + (1.2 - aspect_ratio) * 0.2)
            return "CRAWLING", round(conf, 3)

        # Fallen: Very low aspect ratio (< 0.90) with horizontal body
        if aspect_ratio < 0.90 and spine_inc > 55.0:
            conf = min(0.99, 0.80 + (spine_inc / 180.0))
            return "FALLEN", round(conf, 3)

        # Crouching: Compressed aspect ratio or deep knee bend (< 130 deg)
        if (knee_angle < 130.0 and aspect_ratio < 1.5) or (aspect_ratio < 1.30 and spine_inc < 45.0):
            bend_factor = (180.0 - knee_angle) / 90.0
            conf = min(0.95, 0.65 + bend_factor * 0.25)
            return "CROUCHING", round(conf, 3)

        # Default: Standing upright
        standing_conf = max(0.70, min(0.99, (aspect_ratio / 2.0) * 0.5 + (knee_angle / 180.0) * 0.5))
        return "STANDING", round(standing_conf, 3)


class StickFigureDetector:
    """Ultralytics YOLO-Pose detector with stick-figure rendering and posture analytics."""

    def __init__(
        self,
        model_path: str = "ml/models/pose/yolo11n-pose.pt",
        classifier_path: str | None = "ml/models/pose/posture_classifier.pt",
        confidence_threshold: float = 0.35,
        keypoint_threshold: float = 0.30,
        device: str | None = None,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.keypoint_threshold = keypoint_threshold
        self.device = device
        self._model: Any = None
        self.classifier = PostureClassifier(classifier_path)

    def load(self) -> Any:
        if self._model is None:
            try:
                from ultralytics import YOLO
            except ImportError as exc:
                raise RuntimeError("Install ultralytics before loading YOLO-Pose model") from exc
            resolved_path = Path(self.model_path)
            if not resolved_path.is_file():
                # Check root directory or fallback
                root_fallback = Path("yolo11n-pose.pt")
                if root_fallback.is_file():
                    resolved_path = root_fallback
            self._model = YOLO(str(resolved_path))
        return self._model

    def detect(self, frame: np.ndarray, tracks: list[dict[str, Any]] | None = None) -> list[StickFigure]:
        """Run pose estimation on frame and return list of StickFigure objects."""
        if frame is None or frame.size == 0:
            return []

        model = self.load()
        kwargs: dict[str, Any] = {"conf": self.confidence_threshold, "verbose": False}
        if self.device:
            kwargs["device"] = self.device

        results = model.predict(frame, **kwargs)
        if not results:
            return []

        result = results[0]
        stick_figures: list[StickFigure] = []

        if not hasattr(result, "keypoints") or result.keypoints is None:
            return []

        boxes = result.boxes
        keypoints_data = result.keypoints

        if len(boxes) == 0:
            return []

        num_persons = len(boxes)
        xy_pts = keypoints_data.xy.cpu().numpy() if hasattr(keypoints_data.xy, "cpu") else keypoints_data.xy
        conf_pts = keypoints_data.conf.cpu().numpy() if hasattr(keypoints_data.conf, "cpu") else keypoints_data.conf

        for i in range(num_persons):
            box_cls = int(boxes.cls[i].item())
            # YOLO-Pose outputs person (class 0)
            if box_cls != 0:
                continue

            bbox = [float(v) for v in boxes.xyxy[i].tolist()]
            box_conf = float(boxes.conf[i].item())

            # Match with tracker if provided
            person_id: int | None = None
            if tracks:
                person_id = self._match_track_id(bbox, tracks)

            # Build keypoints
            person_kps: list[Keypoint] = []
            for kp_idx, name in enumerate(KEYPOINT_NAMES):
                if kp_idx < len(xy_pts[i]):
                    kx, ky = float(xy_pts[i][kp_idx][0]), float(xy_pts[i][kp_idx][1])
                    kc = float(conf_pts[i][kp_idx]) if conf_pts is not None and kp_idx < len(conf_pts[i]) else 0.5
                    visible = kc >= self.keypoint_threshold and kx > 0 and ky > 0
                else:
                    kx, ky, kc, visible = 0.0, 0.0, 0.0, False
                person_kps.append(Keypoint(name=name, x=kx, y=ky, confidence=kc, visible=visible))

            features = extract_pose_features(person_kps, bbox)
            posture, posture_conf = self.classifier.predict(features)

            figure = StickFigure(
                person_id=person_id,
                bbox=bbox,
                confidence=box_conf,
                keypoints=person_kps,
                posture=posture,
                posture_confidence=posture_conf,
                features=features,
            )
            stick_figures.append(figure)

        return stick_figures

    def _match_track_id(self, bbox: list[float], tracks: list[dict[str, Any]]) -> int | None:
        """Find highest IoU track matching the detected person bbox."""
        best_iou = 0.3
        best_id: int | None = None
        for track in tracks:
            tbox = track.get("bbox")
            if not tbox:
                continue
            iou = compute_iou(bbox, tbox)
            if iou > best_iou:
                best_iou = iou
                best_id = track.get("track_id")
        return best_id

    def draw(
        self,
        frame: np.ndarray,
        stick_figures: list[StickFigure],
        privacy_mode: bool = False,
        draw_bbox: bool = True,
    ) -> np.ndarray:
        """Draw stick figures on frame.

        Args:
            frame: Input BGR image.
            stick_figures: List of StickFigure objects.
            privacy_mode: If True (PrivacyLens mode), creates an anonymized dark canvas
                          where subject imagery is removed and only stick figures are visible.
            draw_bbox: If True, draws bounding box and posture badge.
        """
        if privacy_mode:
            # Privacy-Preserving Mode (PrivacyLens): Anonymize subjects
            output = np.zeros_like(frame)
            # Add subtle grid for context
            h, w = frame.shape[:2]
            for grid_x in range(0, w, 80):
                cv2.line(output, (grid_x, 0), (grid_x, h), (30, 30, 30), 1)
            for grid_y in range(0, h, 80):
                cv2.line(output, (0, grid_y), (w, grid_y), (30, 30, 30), 1)
            cv2.putText(
                output,
                "IBVAP PRIVACY-PRESERVING MODE [PII ANONYMIZED]",
                (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2,
                cv2.LINE_AA,
            )
        else:
            output = frame.copy()

        for fig in stick_figures:
            kp_dict = {kp.name: (int(kp.x), int(kp.y), kp.visible) for kp in fig.keypoints}
            posture_color = POSTURE_COLORS.get(fig.posture, (0, 255, 0))

            # 1. Draw Skeleton Bones (Stick Figure Limbs)
            for idx1, idx2, color in SKELETON_CONNECTIONS:
                name1 = KEYPOINT_NAMES[idx1]
                name2 = KEYPOINT_NAMES[idx2]
                pt1 = kp_dict.get(name1)
                pt2 = kp_dict.get(name2)
                if pt1 and pt2 and pt1[2] and pt2[2]:
                    # Use limb color or posture tint
                    bone_color = posture_color if fig.posture in ["CRAWLING", "CLIMBING", "FALLEN"] else color
                    cv2.line(output, (pt1[0], pt1[1]), (pt2[0], pt2[1]), bone_color, 3, cv2.LINE_AA)

            # 2. Draw Keypoint Joints (Head, Elbows, Wrists, Knees, Ankles)
            for kp in fig.keypoints:
                if kp.visible:
                    # Head joints smaller, major limb joints larger
                    radius = 5 if kp.name in ["left_shoulder", "right_shoulder", "left_hip", "right_hip"] else 4
                    cv2.circle(output, (int(kp.x), int(kp.y)), radius, (255, 255, 255), -1, cv2.LINE_AA)
                    cv2.circle(output, (int(kp.x), int(kp.y)), radius - 1, posture_color, -1, cv2.LINE_AA)

            # 3. Draw Posture Tag & Bounding Box
            if draw_bbox:
                x1, y1, x2, y2 = [int(v) for v in fig.bbox]
                box_color = posture_color
                cv2.rectangle(output, (x1, y1), (x2, y2), box_color, 2)

                # Badge label
                id_prefix = f"ID:{fig.person_id} | " if fig.person_id is not None else ""
                badge = f"{id_prefix}{fig.posture} ({fig.posture_confidence:.2f})"
                label_size, baseline = cv2.getTextSize(badge, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
                top_y = max(y1, label_size[1] + 10)
                cv2.rectangle(
                    output,
                    (x1, top_y - label_size[1] - 8),
                    (x1 + label_size[0] + 6, top_y + 2),
                    box_color,
                    -1,
                )
                cv2.putText(
                    output,
                    badge,
                    (x1 + 3, top_y - 4),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 0, 0),
                    2,
                    cv2.LINE_AA,
                )

        return output

    def evaluate_threats(
        self,
        stick_figures: list[StickFigure],
        frame_number: int = 0,
        camera_id: str = "CAM_001",
    ) -> list[dict[str, Any]]:
        """Evaluate detected stick figures for high-threat behavioral events."""
        events: list[dict[str, Any]] = []

        for fig in stick_figures:
            posture = fig.posture
            if posture in ["CRAWLING", "CLIMBING", "FALLEN"]:
                severity = "CRITICAL" if posture in ["CRAWLING", "CLIMBING"] else "HIGH"
                event_type = "SUSPICIOUS_ACTIVITY"
                message = f"Suspicious Posture: {posture} detected on person"
                if posture == "CRAWLING":
                    message = "CRITICAL: Infiltration posture (crawling/prone) detected near perimeter"
                elif posture == "CLIMBING":
                    message = "CRITICAL: Perimeter scaling posture (fence climbing) detected"
                elif posture == "FALLEN":
                    message = "HIGH: Person down / casualty posture detected"

                events.append({
                    "event_type": event_type,
                    "severity": severity,
                    "message": message,
                    "track_id": fig.person_id,
                    "object_type": "person",
                    "confidence": fig.posture_confidence,
                    "bbox": fig.bbox,
                    "metadata": {
                        "posture": posture,
                        "posture_confidence": fig.posture_confidence,
                        "features": fig.features,
                        "frame_number": frame_number,
                        "sub_type": f"POSTURE_{posture}",
                    },
                })

        return events


def compute_iou(box1: list[float], box2: list[float]) -> float:
    """Compute Intersection-over-Union between two bounding boxes [x1, y1, x2, y2]."""
    xa = max(box1[0], box2[0])
    ya = max(box1[1], box2[1])
    xb = min(box1[2], box2[2])
    yb = min(box1[3], box2[3])
    inter = max(0.0, xb - xa) * max(0.0, yb - ya)
    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0
