"""Frame-by-frame video extraction and Stick Figure human pose detection utility.

Cuts any surveillance video frame-by-frame, runs YOLO-Pose 17-keypoint
human pose estimation and posture threat classification, and exports:
1. Annotated stick-figure video (MP4)
2. Individual image-by-image frames with stick-figure skeletons (JPG)
3. JSON telemetry metadata of detected poses and timestamps

Usage:
    python process_video_stick_figure.py --input video.mp4 --output-dir runs/pose_frames
"""

import argparse
import json
import os
import sys
from pathlib import Path
import time

import cv2

# Add ml root to path
ML_ROOT = Path(__file__).resolve().parent
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

from src.pose import StickFigureDetector


def process_video_frame_by_frame(
    video_path: str,
    output_dir: str = "runs/stick_figure_output",
    save_images: bool = True,
    save_video: bool = True,
    sample_every_n_frames: int = 1,
    conf_threshold: float = 0.35,
    privacy_mode: bool = False,
):
    video_file = Path(video_path)
    if not video_file.is_file():
        # Check inside ml/video/ or workspace
        candidates = [
            ML_ROOT / video_file,
            ML_ROOT.parent / video_file,
            ML_ROOT / "video" / video_file.name,
        ]
        for c in candidates:
            if c.is_file():
                video_file = c
                break
        else:
            raise FileNotFoundError(f"Video file not found: {video_path}")

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    frames_dir = out_path / "frames"
    if save_images:
        frames_dir.mkdir(parents=True, exist_ok=True)

    print(f"[StickFigure] Initializing pose detector...")
    pose_model_path = ML_ROOT / "models" / "pose" / "yolo11n-pose.pt"
    classifier_path = ML_ROOT / "models" / "pose" / "posture_classifier.pt"

    detector = StickFigureDetector(
        model_path=str(pose_model_path),
        classifier_path=str(classifier_path) if classifier_path.is_file() else None,
        confidence_threshold=conf_threshold,
    )

    cap = cv2.VideoCapture(str(video_file))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_file}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"[StickFigure] Processing: {video_file.name}")
    print(f"  Resolution: {width}x{height} | Total Frames: {total_frames} | FPS: {fps:.1f}")

    writer = None
    if save_video:
        video_out_path = out_path / f"stick_figure_{video_file.stem}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(video_out_path), fourcc, fps / sample_every_n_frames, (width, height))

    frame_idx = 0
    saved_count = 0
    all_detections = []
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % sample_every_n_frames != 0:
            continue

        # Detect human stick figures on this image
        figures = detector.detect(frame)
        threats = detector.evaluate_threats(figures, frame_number=frame_idx)

        # Draw anatomical skeletal stick figure on image
        annotated = detector.draw(frame, figures, privacy_mode=privacy_mode)

        # Save individual cut image
        if save_images:
            frame_filename = frames_dir / f"frame_{frame_idx:05d}.jpg"
            cv2.imwrite(str(frame_filename), annotated)
            saved_count += 1

        if writer is not None:
            writer.write(annotated)

        if figures:
            all_detections.append({
                "frame": frame_idx,
                "timestamp_sec": round(frame_idx / fps, 2),
                "person_count": len(figures),
                "figures": [f.to_dict() for f in figures],
                "threats": threats,
            })

        if frame_idx % 20 == 0 or frame_idx == total_frames:
            pct = (frame_idx / total_frames) * 100
            print(f"  Progress: {frame_idx}/{total_frames} frames ({pct:.1f}%) — {len(figures)} stick figures in current frame")

    cap.release()
    if writer is not None:
        writer.release()

    elapsed = time.time() - start_time
    print(f"\n[StickFigure] Completed in {elapsed:.1f}s ({frame_idx / max(0.1, elapsed):.1f} FPS)")
    if save_images:
        print(f"  Saved {saved_count} frame images to: {frames_dir}")
    if save_video:
        print(f"  Saved annotated video to: {video_out_path}")

    # Save summary JSON
    json_path = out_path / "pose_telemetry.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "source_video": str(video_file),
            "total_frames_analyzed": frame_idx,
            "detections": all_detections,
        }, f, indent=2)
    print(f"  Saved pose telemetry log to: {json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract video image-by-image and detect bodies using stick figures.")
    parser.add_argument("--input", "-i", type=str, default="ml/video/sample.mp4", help="Path to input surveillance video")
    parser.add_argument("--output-dir", "-o", type=str, default="runs/stick_figures", help="Output directory for frames & video")
    parser.add_argument("--step", "-s", type=int, default=1, help="Process every Nth frame (default: 1 for every frame)")
    parser.add_argument("--privacy", action="store_true", help="PrivacyLens mode (render only stick figures on black background)")
    parser.add_argument("--conf", type=float, default=0.35, help="Pose confidence threshold")

    args = parser.parse_args()
    process_video_frame_by_frame(
        video_path=args.input,
        output_dir=args.output_dir,
        sample_every_n_frames=args.step,
        privacy_mode=args.privacy,
        conf_threshold=args.conf,
    )
