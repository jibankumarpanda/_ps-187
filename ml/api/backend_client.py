"""Forward ML detections to the Node.js IBVAP backend."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
AI_API_KEY = os.getenv("AI_API_KEY", "ibvap-ai-dev-key-change-in-production")


def _normalize_event(
	event: dict[str, Any], camera_id: str, bop_id: str | None, timestamp: str,
	evidence_snapshot: str | None = None,
) -> dict[str, Any]:
	"""Map ML event format to the IBVAP backend contract."""
	bbox = event.get("bounding_box") or event.get("bbox")
	zone = (
		event.get("zone")
		or event.get("zone_id")
		or (event.get("metadata") or {}).get("zone")
		or "UNKNOWN"
	)
	raw_type = str(event.get("event_type", "PERSON_DETECTED")).upper()
	normalized_type = "SUSPICIOUS_ACTIVITY" if raw_type in {"GATHERING", "CROWD_GATHERING"} else raw_type

	payload: dict[str, Any] = {
		"cameraId": camera_id,
		"timestamp": timestamp,
		"eventType": normalized_type,
		"objectType": str(event.get("object_type", "PERSON")).upper(),
		"confidence": float(event.get("confidence") or 0.5),
		"zone": str(zone),
	}
	if bop_id:
		payload["bopId"] = bop_id
	if event.get("track_id") is not None:
		payload["trackId"] = int(event["track_id"])
	if bbox and len(bbox) == 4:
		payload["bbox"] = [float(v) for v in bbox]
	if event.get("metadata"):
		payload["metadata"] = event["metadata"]
	is_notable = (
		payload["eventType"] in {"INTRUSION", "FACE_MATCH", "ANPR_MATCH", "SUSPICIOUS_ACTIVITY", "LOITERING"}
		or raw_type in {"GATHERING", "CROWD_GATHERING"}
		or event.get("severity") in {"CRITICAL", "HIGH", "MEDIUM"}
	)
	if evidence_snapshot and is_notable:
		payload["evidence"] = {"contentBase64": evidence_snapshot, "mimeType": "image/jpeg"}
	return payload


def forward_events(
	events: list[dict[str, Any]],
	camera_id: str,
	bop_id: str | None = None,
	timestamp: str | None = None,
	evidence_snapshot: str | None = None,
) -> list[dict[str, Any]]:
	"""POST each detection event to POST /api/ai/events."""
	if not events:
		return []

	ts = timestamp or events[0].get("timestamp") or ""
	results: list[dict[str, Any]] = []
	headers = {"Content-Type": "application/json", "X-AI-API-Key": AI_API_KEY}

	with httpx.Client(timeout=10.0) as client:
		for raw in events:
			payload = _normalize_event(raw, camera_id, bop_id, ts or raw.get("timestamp", ""), evidence_snapshot)
			try:
				response = client.post(f"{BACKEND_URL.rstrip('/')}/api/ai/events", json=payload, headers=headers)
				response.raise_for_status()
				body = response.json()
				results.append(body.get("data", body))
				logger.info("Forwarded %s -> event %s", payload["eventType"], body.get("data", {}).get("event", {}).get("eventId"))
			except httpx.HTTPError as exc:
				logger.error("Failed to forward event to backend: %s", exc)
				results.append({"error": str(exc), "payload": payload})
	return results


def report_camera_status(camera_id: str, status: str, ai_status: str, fps: float, message: str) -> None:
	"""Report an RTSP worker heartbeat to the Node.js backend."""
	payload = {
		"cameraId": camera_id,
		"status": status,
		"aiStatus": ai_status,
		"fps": max(0, round(fps)),
		"message": message,
	}
	headers = {"Content-Type": "application/json", "X-AI-API-Key": AI_API_KEY}
	with httpx.Client(timeout=10.0) as client:
		try:
			response = client.post(f"{BACKEND_URL.rstrip('/')}/api/ai/cameras/status", json=payload, headers=headers)
			response.raise_for_status()
		except httpx.HTTPError as exc:
			logger.warning("Failed to report status for %s: %s", camera_id, exc)
