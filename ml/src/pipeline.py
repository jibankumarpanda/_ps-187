"""Reusable frame and video inference pipeline for the prototype."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2

from .activity import ActivityMonitor
from .anpr import ANPRPipeline, anpr_result_to_raw_event
from .detector import YOLODetector
from .events import EventManager
from .face import FaceDetector
from .intrusion import VirtualFence
from .tracker import ObjectTracker


class VideoPipeline:
	def __init__(self, detector: YOLODetector, tracker: ObjectTracker | None = None,
				 fence: VirtualFence | None = None, activity: ActivityMonitor | None = None,
				 face_detector: FaceDetector | None = None, camera_id: str = "CAM_001",
				 process_every_n_frames: int = 1, anpr: ANPRPipeline | None = None,
				 watchlist_provider: Any = None) -> None:
		self.detector = detector
		self.tracker = tracker or ObjectTracker(detector)
		self.fence = fence or VirtualFence({})
		self.activity = activity or ActivityMonitor()
		self.face_detector = face_detector
		self.anpr = anpr
		self.watchlist_provider = watchlist_provider
		self.camera_id = camera_id
		self.process_every_n_frames = max(1, process_every_n_frames)

	def process_frame(self, frame: Any, frame_number: int = 0, timestamp: str | None = None) -> dict[str, Any]:
		timestamp = timestamp or datetime.now(timezone.utc).isoformat()
		detections = self.detector.predict(frame)
		tracks = self.tracker.track(frame, frame_number, timestamp)
		raw_events = self.fence.evaluate(tracks) + self.activity.evaluate(tracks, datetime.now(timezone.utc))
		faces = self.face_detector.detect(frame) if self.face_detector else []
		anpr_results = self.anpr.read(frame) if self.anpr else []
		watchlist = None
		if anpr_results and callable(self.watchlist_provider):
			try:
				watchlist = self.watchlist_provider()
			except Exception:
				watchlist = None
		elif anpr_results:
			watchlist = self.watchlist_provider
		for anpr_result in anpr_results or []:
			anpr_event = anpr_result_to_raw_event(anpr_result, frame_number,
													getattr(frame, "shape", None), watchlist,
													image=frame)
			if anpr_event is not None:
				raw_events.append(anpr_event)
		manager = EventManager(self.camera_id)
		events = manager.normalize(raw_events, timestamp)
		return {"camera_id": self.camera_id, "timestamp": timestamp, "detections": detections,
				"tracks": tracks, "events": events, "anpr": anpr_results, "faces": faces}

	def process_video(self, input_path: str | Path, output_path: str | Path) -> dict[str, Any]:
		capture = cv2.VideoCapture(str(input_path))
		if not capture.isOpened():
			raise FileNotFoundError(f"Could not open video: {input_path}")
		fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
		width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
		height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
		writer = cv2.VideoWriter(str(output_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
		frame_number = 0
		processed = 0
		event_count = 0
		try:
			while True:
				ok, frame = capture.read()
				if not ok:
					break
				if frame_number % self.process_every_n_frames == 0:
					result = self.process_frame(frame, frame_number)
					annotated = self.detector.draw(frame, result["detections"])
					if self.face_detector:
						annotated = self.face_detector.draw(annotated, result["faces"])
						for track in result["tracks"]:
							x1, y1, x2, y2 = [int(value) for value in track["bbox"]]
							cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 0, 0), 2)
							cv2.putText(annotated, f"ID {track['track_id']}", (x1, y2),
										cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1, cv2.LINE_AA)
						processed += 1
					event_count += len(result["events"])
				else:
					annotated = frame
				writer.write(annotated)
				frame_number += 1
		finally:
			capture.release()
			writer.release()
		return {"input_path": str(input_path), "output_path": str(output_path),
				"frames": frame_number, "processed_frames": processed, "events": event_count}