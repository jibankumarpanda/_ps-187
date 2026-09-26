"""Managed RTSP workers for the IBVAP ML service."""

from __future__ import annotations

import base64
from dataclasses import dataclass
import logging
import threading
import time
from typing import Any, Callable

import cv2

try:
	from ml.api.backend_client import event_requires_evidence
	from ml.src.intrusion import VirtualFence
except ModuleNotFoundError:
	from api.backend_client import event_requires_evidence
	from src.intrusion import VirtualFence


logger = logging.getLogger(__name__)
PipelineFactory = Callable[[str], Any]
StatusReporter = Callable[[str, str, str, float, str], None]


@dataclass(frozen=True)
class CameraStreamConfig:
    camera_id: str
    bop_id: str
    stream_url: str
    zones: list[dict[str, Any]]
    process_every_n_frames: int = 1
    event_cooldown_seconds: float = 10.0


class CameraStreamWorker:
    def __init__(self, config: CameraStreamConfig, pipeline_factory: PipelineFactory,
                 forward_events: Callable[..., list[dict[str, Any]]],
                 report_status: StatusReporter) -> None:
        self.config = config
        self.pipeline = pipeline_factory(config.camera_id)
        self.forward_events = forward_events
        self.report_status = report_status
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self._last_status: tuple[str, str, int, str] | None = None
        self._last_reported_at = 0.0
        self._last_events: dict[tuple[str, int | None, str], float] = {}
        self._fence_configured = False
        self.latest_frame: Any = None
        self.latest_annotated_frame: Any = None

    def start(self) -> None:
        self.thread = threading.Thread(
            target=self._run,
            name=f"ibvap-stream-{self.config.camera_id}",
            daemon=True,
        )
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)

    @property
    def is_running(self) -> bool:
        return bool(self.thread and self.thread.is_alive() and not self.stop_event.is_set())

    def _report(self, status: str, ai_status: str, fps: float, message: str) -> None:
        rounded_fps = max(0, int(round(fps)))
        current = (status, ai_status, rounded_fps, message)
        now = time.monotonic()
        if current == self._last_status and now - self._last_reported_at < 15:
            return
        self._last_status = current
        self._last_reported_at = now
        try:
            self.report_status(self.config.camera_id, status, ai_status, rounded_fps, message)
        except Exception as exc:
            logger.warning("Could not report status for %s: %s", self.config.camera_id, exc)

    def _configure_fence(self, frame: Any) -> None:
        if self._fence_configured:
            return
        height, width = frame.shape[:2]
        zones: dict[str, list[list[float]]] = {}
        for zone in self.config.zones:
            coordinates = zone.get("coordinates")
            if not isinstance(coordinates, list):
                continue
            points: list[list[float]] = []
            for point in coordinates:
                if not isinstance(point, (list, tuple)) or len(point) != 2:
                    continue
                x, y = float(point[0]), float(point[1])
                if 0 <= x <= 100 and 0 <= y <= 100:
                    points.append([x * width / 100, y * height / 100])
                else:
                    points.append([x, y])
            if len(points) >= 3:
                zones[str(zone.get("name", "RESTRICTED"))] = points
        self.pipeline.fence = VirtualFence(zones)
        self._fence_configured = True

    def _new_events(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        now = time.monotonic()
        fresh: list[dict[str, Any]] = []
        for event in events:
            metadata = event.get("metadata") or {}
            key = (
                str(event.get("event_type", "PERSON_DETECTED")),
                event.get("track_id"),
                str(metadata.get("plate") or metadata.get("zone", "UNKNOWN")),
            )
            if now - self._last_events.get(key, 0.0) < self.config.event_cooldown_seconds:
                continue
            self._last_events[key] = now
            fresh.append(event)
        return fresh

    @staticmethod
    def _snapshot(frame: Any) -> str | None:
        encoded, image = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not encoded:
            return None
        return base64.b64encode(image.tobytes()).decode("ascii")

    def _dispatch(self, frame: Any, events: list[dict[str, Any]], frame_number: int,
                  timestamp: str) -> list[dict[str, Any]]:
        """Forward one event batch, snapshotting the frame only when evidence is kept."""
        snapshot: str | None = None
        if any(event_requires_evidence(event) for event in events):
            try:
                snapshot = self._snapshot(frame)
            except Exception as exc:
                logger.warning("Could not snapshot frame %s for %s: %s", frame_number,
                               self.config.camera_id, exc)
        return self.forward_events(
            events,
            camera_id=self.config.camera_id,
            bop_id=self.config.bop_id,
            timestamp=timestamp,
            evidence_snapshot=snapshot,
            frame_number=frame_number,
        )

    def _run(self) -> None:
        self._report("DEGRADED", "ACTIVE", 0, "Connecting to camera stream")
        frame_number = 0

        try:
            while not self.stop_event.is_set():
                capture = cv2.VideoCapture(self.config.stream_url, cv2.CAP_FFMPEG)
                if not capture.isOpened():
                    capture.release()
                    self._report("DEGRADED", "ERROR", 0, "Camera stream is unavailable; retrying")
                    self.stop_event.wait(3)
                    continue

                source_fps = capture.get(cv2.CAP_PROP_FPS) or 0.0
                self._report("ONLINE", "ACTIVE", source_fps, "Camera stream connected")
                try:
                    while not self.stop_event.is_set():
                        ok, frame = capture.read()
                        if not ok:
                            self._report("DEGRADED", "ERROR", 0, "Camera stream interrupted; reconnecting")
                            break

                        if frame_number % self.config.process_every_n_frames == 0:
                            try:
                                self._configure_fence(frame)
                                result = self.pipeline.process_frame(frame, frame_number)

                                # Render stick figures and detections on annotated frame
                                annotated = frame.copy()
                                if getattr(self.pipeline, "pose_estimator", None) and result.get("stick_figures"):
                                    raw_figs = self.pipeline.pose_estimator.detect(frame, result.get("tracks"))
                                    annotated = self.pipeline.pose_estimator.draw(
                                        annotated,
                                        raw_figs,
                                        privacy_mode=getattr(self.pipeline, "privacy_mode", False),
                                    )
                                elif result.get("detections"):
                                    annotated = self.pipeline.detector.draw(annotated, result["detections"])

                                self.latest_annotated_frame = annotated
                                self.latest_frame = frame

                                events = self._new_events(result["events"])
                                if events:
                                    self._dispatch(annotated, events, frame_number, result["timestamp"])
                            except Exception as exc:
                                logger.exception("Inference failed for %s: %s", self.config.camera_id, exc)
                                self._report("DEGRADED", "ERROR", source_fps, "AI inference failed; continuing")
                        frame_number += 1
                        self._report("ONLINE", "ACTIVE", source_fps, "Camera stream connected")
                finally:
                    capture.release()

                if not self.stop_event.is_set():
                    self.stop_event.wait(1)
        finally:
            self._report("OFFLINE", "INACTIVE", 0, "Camera stream stopped")


class CameraStreamManager:
    def __init__(self, pipeline_factory: PipelineFactory,
                 forward_events: Callable[..., list[dict[str, Any]]],
                 report_status: StatusReporter) -> None:
        self.pipeline_factory = pipeline_factory
        self.forward_events = forward_events
        self.report_status = report_status
        self._workers: dict[str, CameraStreamWorker] = {}
        self._lock = threading.Lock()

    def start(self, config: CameraStreamConfig) -> dict[str, Any]:
        with self._lock:
            existing = self._workers.get(config.camera_id)
            if existing and existing.is_running:
                return {"accepted": True, "status": "STARTING", "message": "Camera stream is already running"}
            if existing:
                existing.stop()
            worker = CameraStreamWorker(config, self.pipeline_factory, self.forward_events, self.report_status)
            self._workers[config.camera_id] = worker
            worker.start()
        return {"accepted": True, "status": "STARTING", "message": "Camera stream worker started"}

    def stop(self, camera_id: str) -> dict[str, Any]:
        with self._lock:
            worker = self._workers.pop(camera_id, None)
        if worker:
            worker.stop()
            return {"accepted": True, "status": "OFFLINE", "message": "Camera stream worker stopped"}
        return {"accepted": True, "status": "OFFLINE", "message": "No active camera stream worker"}

    def status(self) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {"camera_id": camera_id, "running": worker.is_running}
                for camera_id, worker in self._workers.items()
            ]

    def stop_all(self) -> None:
        with self._lock:
            workers = list(self._workers.values())
            self._workers.clear()
        for worker in workers:
            worker.stop()

    @staticmethod
    def test(stream_url: str) -> dict[str, Any]:
        started = time.monotonic()
        capture = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
        try:
            if not capture.isOpened():
                return {"accepted": True, "status": "OFFLINE", "connected": False, "message": "Could not open camera stream"}
            ok, _frame = capture.read()
            fps = capture.get(cv2.CAP_PROP_FPS) or 0.0
            return {
                "accepted": True,
                "status": "ONLINE" if ok else "DEGRADED",
                "connected": bool(ok),
                "latency": int((time.monotonic() - started) * 1000),
                "fps": round(fps, 2),
                "message": "Camera stream read succeeded" if ok else "Camera opened but did not return a frame",
            }
        finally:
            capture.release()
