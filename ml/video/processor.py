import os
import cv2
import time
import math
import logging
import base64
from ultralytics import YOLO

logger = logging.getLogger(__name__)

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "motorbike", "bicycle", "van"}
PERSON_CLASSES = {"person"}

class VideoProcessor:
    def __init__(self, model_path=None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            # Prioritize the friend's newly trained merged detection model
            candidates = [
                os.path.join(base_dir, "runs", "merged_det_yolo", "weights", "best.pt"),
                os.path.join(base_dir, "runs", "merged_det_yolo", "weights", "last.pt"),
                os.path.join(os.path.dirname(base_dir), "runs", "detect", "ml", "runs", "merged_det_yolo", "weights", "last.pt"),
                os.path.join(base_dir, "runs", "ibvap_yolo-3", "weights", "best.pt"),
                os.path.join(base_dir, "yolo11n.pt")
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    model_path = candidate
                    break
            if not model_path:
                model_path = os.path.join(base_dir, "yolo11n.pt")

        logger.info(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)
        self.model_path = model_path
    
    def process_video(self, video_path: str, progress_callback=None, frame_skip: int = None):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video: {video_path}")
            return
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        duration = total_frames / fps if fps else 0

        if frame_skip is None or frame_skip <= 2:
            if total_frames > 2000:
                frame_skip = max(4, min(30, total_frames // 400))
            else:
                frame_skip = 2
        
        logger.info(f"Processing video: {video_path}, Total Frames: {total_frames}, FPS: {fps:.2f}, Frame Skip: {frame_skip}")
        
        unique_vehicle_ids = set()
        unique_person_ids = set()
        intrusion_ids = set()
        reported_loitering = set()
        reported_night = set()
        reported_suspicious = set()

        anonymous_vehicle_counter = 0
        anonymous_person_counter = 0

        track_frame_counts = {}
        track_initial_centers = {}
        track_last_centers = {}

        frame_idx = 0
        pending_events = []
        last_progress_time = 0.0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            if frame_skip > 1 and (frame_idx % frame_skip != 0) and (frame_idx != total_frames):
                continue

            # Activity Assessment 1: Nocturnal Lighting / Night Activity Check
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            avg_luminosity = float(gray.mean())
            is_night_frame = avg_luminosity < 65.0

            try:
                results = self.model.track(
                    source=frame,
                    tracker="bytetrack.yaml",
                    persist=True,
                    conf=0.28,
                    verbose=False
                )
            except Exception:
                results = self.model.predict(source=frame, conf=0.28, verbose=False)

            frame_events = []
            if results and len(results) > 0:
                res = results[0]
                boxes = res.boxes
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        cls_name = res.names[cls_id] if res.names and cls_id in res.names else str(cls_id)
                        conf = float(box.conf[0].item())
                        
                        track_id = None
                        if box.id is not None:
                            try:
                                track_id = int(box.id[0].item())
                            except Exception:
                                track_id = None

                        bbox = [round(float(v), 1) for v in box.xyxy[0].tolist()]
                        cx = (bbox[0] + bbox[2]) / 2.0
                        cy = (bbox[1] + bbox[3]) / 2.0

                        is_vehicle = cls_name in VEHICLE_CLASSES
                        is_person = cls_name in PERSON_CLASSES

                        if track_id is not None:
                            track_frame_counts[track_id] = track_frame_counts.get(track_id, 0) + 1
                            if track_id not in track_initial_centers:
                                track_initial_centers[track_id] = (cx, cy)
                            
                            # Speed / displacement check for Suspicious Activity
                            prev_center = track_last_centers.get(track_id, (cx, cy))
                            step_disp = math.hypot(cx - prev_center[0], cy - prev_center[1])
                            track_last_centers[track_id] = (cx, cy)

                            # Activity: Suspicious Fast Movement (Evasive sprint or sudden acceleration)
                            if step_disp > 70.0 and track_id not in reported_suspicious:
                                reported_suspicious.add(track_id)
                                _, buffer = cv2.imencode('.jpg', frame)
                                ev_frame = base64.b64encode(buffer).decode('utf-8')
                                frame_events.append({
                                    "type": "SUSPICIOUS_ACTIVITY",
                                    "objectType": "PERSON" if is_person else "VEHICLE",
                                    "subType": f"Rapid Movement ({cls_name})",
                                    "confidence": conf,
                                    "trackId": track_id,
                                    "bbox": bbox,
                                    "frame": frame_idx,
                                    "severity": "WARNING",
                                    "threatScore": 82,
                                    "evidenceFrame": ev_frame
                                })

                        evidence_frame = None

                        # Activity: Vehicle Detection & Classification
                        if is_vehicle:
                            if track_id is not None:
                                is_new = track_id not in unique_vehicle_ids
                                unique_vehicle_ids.add(track_id)
                            else:
                                anonymous_vehicle_counter += 1
                                is_new = True

                            if is_new:
                                frame_events.append({
                                    "type": "VEHICLE_DETECTED",
                                    "objectType": "VEHICLE",
                                    "subType": cls_name,
                                    "confidence": conf,
                                    "trackId": track_id or anonymous_vehicle_counter,
                                    "bbox": bbox,
                                    "frame": frame_idx,
                                    "severity": "INFO"
                                })

                        # Activity: Person Detection & Perimeter Intrusion
                        elif is_person:
                            if track_id is not None:
                                is_new = track_id not in unique_person_ids
                                unique_person_ids.add(track_id)
                            else:
                                anonymous_person_counter += 1
                                is_new = True

                            eff_id = track_id or anonymous_person_counter
                            if is_new and eff_id not in intrusion_ids:
                                intrusion_ids.add(eff_id)
                                _, buffer = cv2.imencode('.jpg', frame)
                                evidence_frame = base64.b64encode(buffer).decode('utf-8')
                                frame_events.append({
                                    "type": "INTRUSION_DETECTED",
                                    "objectType": "PERSON",
                                    "subType": cls_name,
                                    "confidence": conf,
                                    "trackId": eff_id,
                                    "bbox": bbox,
                                    "frame": frame_idx,
                                    "severity": "CRITICAL",
                                    "threatScore": 90,
                                    "evidenceFrame": evidence_frame
                                })

                            # Activity: Loitering Detection (Tracked for >=12 frames with little spatial displacement)
                            if track_id is not None and track_frame_counts[track_id] >= 12 and track_id not in reported_loitering:
                                init_c = track_initial_centers.get(track_id, (cx, cy))
                                total_drift = math.hypot(cx - init_c[0], cy - init_c[1])
                                if total_drift < 45.0:  # Persistent in same sector
                                    reported_loitering.add(track_id)
                                    if not evidence_frame:
                                        _, buffer = cv2.imencode('.jpg', frame)
                                        evidence_frame = base64.b64encode(buffer).decode('utf-8')
                                    frame_events.append({
                                        "type": "LOITERING_DETECTED",
                                        "objectType": "PERSON",
                                        "subType": cls_name,
                                        "confidence": conf,
                                        "trackId": track_id,
                                        "bbox": bbox,
                                        "frame": frame_idx,
                                        "severity": "WARNING",
                                        "threatScore": 75,
                                        "evidenceFrame": evidence_frame
                                    })

                        # Activity: Night Movement / Nocturnal Activity
                        eff_id = track_id or (anonymous_person_counter if is_person else anonymous_vehicle_counter)
                        if is_night_frame and eff_id not in reported_night:
                            reported_night.add(eff_id)
                            if not evidence_frame:
                                _, buffer = cv2.imencode('.jpg', frame)
                                evidence_frame = base64.b64encode(buffer).decode('utf-8')
                            frame_events.append({
                                "type": "NIGHT_ACTIVITY_DETECTED",
                                "objectType": "PERSON" if is_person else "VEHICLE",
                                "subType": f"Low-Light Activity ({cls_name})",
                                "confidence": conf,
                                "trackId": eff_id,
                                "bbox": bbox,
                                "frame": frame_idx,
                                "severity": "WARNING",
                                "threatScore": 85,
                                "evidenceFrame": evidence_frame
                            })

            if frame_events:
                pending_events.extend(frame_events)

            total_vehicles = len(unique_vehicle_ids) + anonymous_vehicle_counter
            total_persons = len(unique_person_ids) + anonymous_person_counter
            total_intrusions = len(intrusion_ids) + anonymous_person_counter
            total_loitering = len(reported_loitering)
            total_night = len(reported_night)
            total_suspicious = len(reported_suspicious)

            now = time.time()
            is_last = (frame_idx >= total_frames)
            time_elapsed = (now - last_progress_time) >= 0.75

            if progress_callback and (time_elapsed or is_last):
                last_progress_time = now
                progress_pct = min(100, int((frame_idx / total_frames) * 100)) if total_frames > 0 else 0
                events_to_send = pending_events[-20:]
                pending_events = []
                progress_callback({
                    "frame": frame_idx,
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": duration,
                    "progress": progress_pct,
                    "vehicles_detected": total_vehicles,
                    "persons_detected": total_persons,
                    "intrusions_detected": total_intrusions,
                    "loitering_detected": total_loitering,
                    "night_detected": total_night,
                    "suspicious_detected": total_suspicious,
                    "events": events_to_send
                })

        cap.release()
        logger.info(
            f"Video processing completed: {frame_idx} frames processed. "
            f"Vehicles: {len(unique_vehicle_ids) + anonymous_vehicle_counter}, "
            f"Persons: {len(unique_person_ids) + anonymous_person_counter}, "
            f"Intrusions: {len(intrusion_ids)}, Loitering: {len(reported_loitering)}, "
            f"Night: {len(reported_night)}, Suspicious: {len(reported_suspicious)}"
        )
