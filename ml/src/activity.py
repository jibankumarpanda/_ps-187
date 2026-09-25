"""Configurable, rule-based activity events."""

from datetime import datetime, time
from math import hypot
from typing import Any


class ActivityMonitor:
	def __init__(self, loitering_seconds: float = 60, night_hours: tuple[int, int] = (22, 6),
				 movement_pixels: float = 5, gathering_threshold: int = 2,
				 gathering_proximity_pixels: float = 400.0) -> None:
		self.loitering_seconds = loitering_seconds
		self.night_hours = night_hours
		self.movement_pixels = movement_pixels
		self.gathering_threshold = gathering_threshold
		self.gathering_proximity_pixels = gathering_proximity_pixels
		self._first_seen: dict[int, float] = {}
		self._last_center: dict[int, tuple[float, float]] = {}
		self._loitering_emitted: set[int] = set()
		self._last_gathering_time: float = 0.0

	def evaluate(self, tracks: list[dict[str, Any]], timestamp: datetime | None = None) -> list[dict[str, Any]]:
		now = timestamp or datetime.now()
		events = []

		# ── 1. Evaluate Gathering / Crowd Formation ──
		person_tracks = [t for t in tracks if str(t.get("class_name", "")).lower() == "person"]
		if len(person_tracks) >= self.gathering_threshold:
			# Check pairwise proximity between detected individuals
			is_gathering = False
			cluster_boxes = [t["bbox"] for t in person_tracks]
			if len(person_tracks) >= 3:
				is_gathering = True
			else:
				# 2 persons: check Euclidean distance between centroids
				p1, p2 = person_tracks[0]["bbox"], person_tracks[1]["bbox"]
				c1 = ((p1[0] + p1[2]) / 2, (p1[1] + p1[3]) / 2)
				c2 = ((p2[0] + p2[2]) / 2, (p2[1] + p2[3]) / 2)
				dist = hypot(c1[0] - c2[0], c1[1] - c2[1])
				if dist <= self.gathering_proximity_pixels:
					is_gathering = True

			if is_gathering:
				# Throttle duplicate gathering event emission to every 10 seconds
				if now.timestamp() - self._last_gathering_time >= 10.0:
					self._last_gathering_time = now.timestamp()
					count = len(person_tracks)
					min_x = min(b[0] for b in cluster_boxes)
					min_y = min(b[1] for b in cluster_boxes)
					max_x = max(b[2] for b in cluster_boxes)
					max_y = max(b[3] for b in cluster_boxes)
					cluster_bbox = [min_x, min_y, max_x, max_y]

					lead = person_tracks[0]
					events.append({
						"event_type": "GATHERING",
						"severity": "HIGH" if count >= 4 else "MEDIUM",
						"track_id": int(lead.get("track_id", 1)),
						"object_type": "PERSON",
						"confidence": float(lead.get("confidence", 0.9)),
						"bbox": cluster_bbox,
						"metadata": {
							"people_count": count,
							"cluster_bbox": cluster_bbox,
							"description": f"Gathering of {count} people detected in camera sector",
							"alert": "CROWD_GATHERING"
						}
					})

		# ── 2. Individual Track Behaviors (Loitering, Night Movement) ──
		for track in tracks:
			track_id = int(track["track_id"])
			bbox = track["bbox"]
			center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
			first_seen = self._first_seen.setdefault(track_id, now.timestamp())
			elapsed = now.timestamp() - first_seen
			movement = hypot(center[0] - self._last_center.get(track_id, center)[0],
							 center[1] - self._last_center.get(track_id, center)[1])
			if (elapsed >= self.loitering_seconds and movement <= self.movement_pixels
					and track_id not in self._loitering_emitted):
				events.append(self._event("LOITERING", "MEDIUM", track, {"duration_seconds": elapsed}))
				self._loitering_emitted.add(track_id)
			if self._is_night(now.time()) and movement > self.movement_pixels:
				events.append(self._event("NIGHT_MOVEMENT", "MEDIUM", track, {}))
			self._last_center[track_id] = center
		return events

	def _is_night(self, value: time) -> bool:
		start, end = self.night_hours
		return value.hour >= start or value.hour < end if start > end else start <= value.hour < end

	@staticmethod
	def _event(event_type: str, severity: str, track: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
		return {"event_type": event_type, "severity": severity, "track_id": int(track["track_id"]),
				"object_type": track["class_name"], "confidence": track["confidence"],
				"bbox": track["bbox"], "metadata": metadata}
