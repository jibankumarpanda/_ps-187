"""Training script for Stick Figure Posture and Behavioral Threat Classification.

Trains a deep neural network on biomechanical human pose keypoint features to detect:
1. STANDING (Normal)
2. CROUCHING (Concealment / suspicious)
3. CRAWLING (Border infiltration breach)
4. CLIMBING (Perimeter fence scaling)
5. FALLEN (Guard down / casualty)

Exports:
- ml/models/pose/posture_classifier.pt (PyTorch model checkpoint)
- ml/models/pose/posture_classifier_weights.json (portable numpy/json weights)
- ml/models/pose/training_metrics.json (verified training & validation metrics)
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import random
import sys
from typing import Any

import numpy as np

# Ensure local ml module can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.pose import (
    KEYPOINT_INDEX,
    KEYPOINT_NAMES,
    POSTURE_CLASSES,
    Keypoint,
    extract_pose_features,
)


def generate_synthetic_pose_samples(
    num_samples_per_class: int = 400,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate realistic keypoint configurations for each posture class with augmentations."""
    random.seed(seed)
    np.random.seed(seed)

    all_features: list[list[float]] = []
    all_labels: list[int] = []

    for class_idx, class_name in enumerate(POSTURE_CLASSES):
        for _ in range(num_samples_per_class):
            bbox_x1 = random.uniform(50, 200)
            bbox_y1 = random.uniform(50, 150)

            # Base templates per class
            if class_name == "STANDING":
                box_w = random.uniform(50, 100)
                box_h = box_w * random.uniform(2.0, 3.2)  # Upright aspect ratio
                spine_tilt = random.uniform(-10, 10)
                knee_bend = random.uniform(160, 180)
                hands_up = random.uniform(-0.35, -0.05)

            elif class_name == "CROUCHING":
                box_w = random.uniform(60, 110)
                box_h = box_w * random.uniform(1.0, 1.4)  # Squat/compact
                spine_tilt = random.uniform(-25, 25)
                knee_bend = random.uniform(70, 125)       # Deep bend
                hands_up = random.uniform(-0.25, 0.05)

            elif class_name == "CRAWLING":
                box_w = random.uniform(120, 220)          # Wide horizontal profile
                box_h = box_w * random.uniform(0.35, 0.75)
                spine_tilt = random.choice([1, -1]) * random.uniform(50, 85)  # Horizontal spine
                knee_bend = random.uniform(80, 140)
                hands_up = random.uniform(-0.15, 0.10)

            elif class_name == "CLIMBING":
                box_w = random.uniform(55, 95)
                box_h = box_w * random.uniform(1.8, 2.8)  # Elongated vertically
                spine_tilt = random.uniform(-15, 15)
                knee_bend = random.uniform(100, 150)
                hands_up = random.uniform(0.18, 0.45)     # Wrists well above head/shoulders

            elif class_name == "FALLEN":
                box_w = random.uniform(130, 240)          # Fully horizontal ground profile
                box_h = box_w * random.uniform(0.25, 0.60)
                spine_tilt = random.choice([1, -1]) * random.uniform(65, 90)
                knee_bend = random.uniform(140, 180)
                hands_up = random.uniform(-0.20, 0.05)

            bbox = [bbox_x1, bbox_y1, bbox_x1 + box_w, bbox_y1 + box_h]
            cx = bbox_x1 + box_w / 2.0

            # Synthesize 17 keypoints with realistic anatomical geometry
            kps_dict: dict[str, tuple[float, float]] = {}

            if class_name in ["STANDING", "CLIMBING"]:
                head_y = bbox_y1 + box_h * random.uniform(0.05, 0.12)
                sh_y = bbox_y1 + box_h * random.uniform(0.18, 0.25)
                hip_y = bbox_y1 + box_h * random.uniform(0.50, 0.58)
                knee_y = bbox_y1 + box_h * random.uniform(0.72, 0.80)
                ank_y = bbox_y1 + box_h * random.uniform(0.92, 0.98)

                kps_dict["nose"] = (cx + random.uniform(-5, 5), head_y)
                kps_dict["left_eye"] = (cx - box_w * 0.08, head_y - 4)
                kps_dict["right_eye"] = (cx + box_w * 0.08, head_y - 4)
                kps_dict["left_ear"] = (cx - box_w * 0.16, head_y)
                kps_dict["right_ear"] = (cx + box_w * 0.16, head_y)

                kps_dict["left_shoulder"] = (cx - box_w * 0.28, sh_y)
                kps_dict["right_shoulder"] = (cx + box_w * 0.28, sh_y)

                if class_name == "CLIMBING":
                    # Wrists up high above head
                    kps_dict["left_elbow"] = (cx - box_w * 0.35, sh_y - box_h * 0.15)
                    kps_dict["right_elbow"] = (cx + box_w * 0.35, sh_y - box_h * 0.15)
                    kps_dict["left_wrist"] = (cx - box_w * 0.25, sh_y - box_h * hands_up)
                    kps_dict["right_wrist"] = (cx + box_w * 0.25, sh_y - box_h * hands_up)
                else:
                    kps_dict["left_elbow"] = (cx - box_w * 0.32, sh_y + box_h * 0.15)
                    kps_dict["right_elbow"] = (cx + box_w * 0.32, sh_y + box_h * 0.15)
                    kps_dict["left_wrist"] = (cx - box_w * 0.30, sh_y + box_h * 0.30)
                    kps_dict["right_wrist"] = (cx + box_w * 0.30, sh_y + box_h * 0.30)

                kps_dict["left_hip"] = (cx - box_w * 0.18, hip_y)
                kps_dict["right_hip"] = (cx + box_w * 0.18, hip_y)
                kps_dict["left_knee"] = (cx - box_w * 0.20, knee_y)
                kps_dict["right_knee"] = (cx + box_w * 0.20, knee_y)
                kps_dict["left_ankle"] = (cx - box_w * 0.22, ank_y)
                kps_dict["right_ankle"] = (cx + box_w * 0.22, ank_y)

            elif class_name == "CROUCHING":
                head_y = bbox_y1 + box_h * 0.15
                sh_y = bbox_y1 + box_h * 0.30
                hip_y = bbox_y1 + box_h * 0.55
                knee_y = bbox_y1 + box_h * 0.70
                ank_y = bbox_y1 + box_h * 0.95

                kps_dict["nose"] = (cx, head_y)
                kps_dict["left_eye"] = (cx - box_w * 0.08, head_y - 3)
                kps_dict["right_eye"] = (cx + box_w * 0.08, head_y - 3)
                kps_dict["left_ear"] = (cx - box_w * 0.15, head_y)
                kps_dict["right_ear"] = (cx + box_w * 0.15, head_y)

                kps_dict["left_shoulder"] = (cx - box_w * 0.30, sh_y)
                kps_dict["right_shoulder"] = (cx + box_w * 0.30, sh_y)
                kps_dict["left_elbow"] = (cx - box_w * 0.35, sh_y + box_h * 0.25)
                kps_dict["right_elbow"] = (cx + box_w * 0.35, sh_y + box_h * 0.25)
                kps_dict["left_wrist"] = (cx - box_w * 0.25, sh_y + box_h * 0.45)
                kps_dict["right_wrist"] = (cx + box_w * 0.25, sh_y + box_h * 0.45)

                kps_dict["left_hip"] = (cx - box_w * 0.25, hip_y)
                kps_dict["right_hip"] = (cx + box_w * 0.25, hip_y)
                kps_dict["left_knee"] = (cx - box_w * 0.40, knee_y)
                kps_dict["right_knee"] = (cx + box_w * 0.40, knee_y)
                kps_dict["left_ankle"] = (cx - box_w * 0.22, ank_y)
                kps_dict["right_ankle"] = (cx + box_w * 0.22, ank_y)

            else:  # CRAWLING or FALLEN (Horizontal postures)
                dir_sign = 1 if spine_tilt > 0 else -1
                x_head = bbox_x1 + (0.85 if dir_sign > 0 else 0.15) * box_w
                x_feet = bbox_x1 + (0.15 if dir_sign > 0 else 0.85) * box_w
                mid_y = bbox_y1 + box_h * 0.55

                kps_dict["nose"] = (x_head, mid_y - box_h * 0.15)
                kps_dict["left_eye"] = (x_head - dir_sign * 5, mid_y - box_h * 0.20)
                kps_dict["right_eye"] = (x_head - dir_sign * 5, mid_y - box_h * 0.20)
                kps_dict["left_ear"] = (x_head - dir_sign * 10, mid_y - box_h * 0.18)
                kps_dict["right_ear"] = (x_head - dir_sign * 10, mid_y - box_h * 0.18)

                x_sh = x_head - dir_sign * box_w * 0.22
                kps_dict["left_shoulder"] = (x_sh, mid_y - box_h * 0.20)
                kps_dict["right_shoulder"] = (x_sh, mid_y + box_h * 0.15)

                if class_name == "CRAWLING":
                    kps_dict["left_elbow"] = (x_sh + dir_sign * 10, mid_y + box_h * 0.15)
                    kps_dict["right_elbow"] = (x_sh + dir_sign * 10, mid_y + box_h * 0.25)
                    kps_dict["left_wrist"] = (x_head, mid_y + box_h * 0.35)
                    kps_dict["right_wrist"] = (x_head, mid_y + box_h * 0.35)
                else:  # FALLEN
                    kps_dict["left_elbow"] = (x_sh - dir_sign * 15, mid_y + box_h * 0.20)
                    kps_dict["right_elbow"] = (x_sh - dir_sign * 15, mid_y + box_h * 0.20)
                    kps_dict["left_wrist"] = (x_sh - dir_sign * 25, mid_y + box_h * 0.30)
                    kps_dict["right_wrist"] = (x_sh - dir_sign * 25, mid_y + box_h * 0.30)

                x_hip = x_head - dir_sign * box_w * 0.50
                kps_dict["left_hip"] = (x_hip, mid_y - box_h * 0.10)
                kps_dict["right_hip"] = (x_hip, mid_y + box_h * 0.15)

                x_knee = x_head - dir_sign * box_w * 0.70
                kps_dict["left_knee"] = (x_knee, mid_y + box_h * 0.10)
                kps_dict["right_knee"] = (x_knee, mid_y + box_h * 0.20)

                kps_dict["left_ankle"] = (x_feet, mid_y + box_h * 0.25)
                kps_dict["right_ankle"] = (x_feet, mid_y + box_h * 0.35)

            # Apply data augmentation (noise, random keypoint dropouts)
            keypoint_objs: list[Keypoint] = []
            for name in KEYPOINT_NAMES:
                pt = kps_dict.get(name, (cx, bbox_y1 + box_h / 2))
                noise_x = random.gauss(0, box_w * 0.02)
                noise_y = random.gauss(0, box_h * 0.02)
                visible = random.random() > 0.08  # 8% occlusion rate
                conf = random.uniform(0.70, 0.99) if visible else random.uniform(0.10, 0.30)
                keypoint_objs.append(Keypoint(
                    name=name,
                    x=pt[0] + noise_x,
                    y=pt[1] + noise_y,
                    confidence=conf,
                    visible=visible,
                ))

            # Feature vector calculation
            features = extract_pose_features(keypoint_objs, bbox)
            feat_vector = [
                features["aspect_ratio"],
                features["spine_inclination"] / 90.0,
                features["torso_height_ratio"],
                features["avg_knee_angle"] / 180.0,
                features["hands_above_shoulders"],
                features["head_elevation"],
            ]
            # Add normalized keypoint coordinates (17 * 2 = 34 values)
            for i in range(34):
                feat_vector.append(features.get(f"kp_norm_{i}", 0.5))

            all_features.append(feat_vector)
            all_labels.append(class_idx)

    X = np.array(all_features, dtype=np.float32)
    y = np.array(all_labels, dtype=np.int64)
    return X, y


def train_posture_model(
    output_dir: str | Path = "ml/models/pose",
    epochs: int = 40,
    batch_size: int = 32,
    lr: float = 0.003,
) -> dict[str, Any]:
    """Train posture classifier neural network, validate, and export checkpoints and metrics."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"Generating synthetic training dataset for {len(POSTURE_CLASSES)} posture classes...")
    X, y = generate_synthetic_pose_samples(num_samples_per_class=500, seed=42)

    # Train / Val Split (80% / 20%)
    indices = np.arange(len(X))
    np.random.seed(42)
    np.random.shuffle(indices)
    split_idx = int(0.8 * len(X))
    train_idx, val_idx = indices[:split_idx], indices[split_idx:]

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]

    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset

    input_dim = X.shape[1]
    num_classes = len(POSTURE_CLASSES)

    # Multi-Layer Perceptron architecture for fast, accurate posture inference
    class PostureNet(nn.Module):
        def __init__(self, in_features: int, out_classes: int) -> None:
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

    model = PostureNet(input_dim, num_classes)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    train_dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    val_x_tensor = torch.from_numpy(X_val)
    val_y_tensor = torch.from_numpy(y_val)

    print(f"Training PostureNet on {len(X_train)} samples across {epochs} epochs...")
    history: list[dict[str, float]] = []

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * len(batch_x)

        scheduler.step()
        epoch_train_loss = running_loss / len(X_train)

        # Validation evaluation
        model.eval()
        with torch.no_grad():
            val_outputs = model(val_x_tensor)
            val_loss = criterion(val_outputs, val_y_tensor).item()
            _, preds = torch.max(val_outputs, 1)
            val_acc = (preds == val_y_tensor).float().mean().item()

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {epoch_train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc * 100:.2f}%")

        history.append({
            "epoch": epoch,
            "train_loss": round(epoch_train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4),
        })

    # Detailed final metrics per class
    model.eval()
    with torch.no_grad():
        final_preds = model(val_x_tensor).argmax(dim=1).numpy()
        true_labels = y_val

    confusion = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(true_labels, final_preds):
        confusion[t, p] += 1

    per_class_metrics: dict[str, dict[str, float]] = {}
    for i, cname in enumerate(POSTURE_CLASSES):
        tp = confusion[i, i]
        fp = confusion[:, i].sum() - tp
        fn = confusion[i, :].sum() - tp
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        per_class_metrics[cname] = {
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "samples": int(confusion[i, :].sum()),
        }

    overall_accuracy = float((final_preds == true_labels).mean())
    print("\nTraining complete! Per-class evaluation:")
    for cname, m in per_class_metrics.items():
        print(f"  {cname:12s} - Precision: {m['precision']:.3f}, Recall: {m['recall']:.3f}, F1: {m['f1_score']:.3f}")
    print(f"\nFinal Overall Validation Accuracy: {overall_accuracy * 100:.2f}%")

    # 1. Save PyTorch checkpoint
    pt_path = out_path / "posture_classifier.pt"
    torch.save({
        "state_dict": model.state_dict(),
        "input_dim": input_dim,
        "num_classes": num_classes,
        "classes": POSTURE_CLASSES,
        "overall_accuracy": overall_accuracy,
    }, str(pt_path))
    print(f"Saved PyTorch model checkpoint: {pt_path}")

    # 2. Save portable JSON weights (for zero-heavy-dependency deployment)
    weights_json: dict[str, Any] = {
        "classes": POSTURE_CLASSES,
        "input_dim": input_dim,
        "layers": {},
    }
    for name, param in model.named_parameters():
        weights_json["layers"][name] = param.detach().cpu().numpy().tolist()

    json_weights_path = out_path / "posture_classifier_weights.json"
    with json_weights_path.open("w", encoding="utf-8") as f:
        json.dump(weights_json, f)
    print(f"Saved portable model weights: {json_weights_path}")

    # 3. Save training metrics report
    metrics_report = {
        "model_architecture": "PostureNet (128-64 MLP with BatchNorm & Dropout)",
        "input_features": input_dim,
        "classes": POSTURE_CLASSES,
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "epochs": epochs,
        "batch_size": batch_size,
        "final_train_loss": history[-1]["train_loss"],
        "final_val_loss": history[-1]["val_loss"],
        "overall_accuracy": round(overall_accuracy, 4),
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": confusion.tolist(),
    }

    metrics_path = out_path / "training_metrics.json"
    with metrics_path.open("w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)
    print(f"Saved verified training metrics: {metrics_path}")

    return metrics_report


if __name__ == "__main__":
    train_posture_model()
