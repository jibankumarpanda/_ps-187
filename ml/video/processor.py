import os
import cv2
import time
import logging
import base64
from ultralytics import YOLO

logger = logging.getLogger(__name__)

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle", "bicycle"}
PERSON_CLASSES = {"person"}

class VideoProcessor:
    def __init__(self, model_path=None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "yolo11n.pt")
        logger.info(f"Loading YOLO model from {model_path}")
        self.model = YOLO(model_path)
    
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
        
        anonymous_vehicle_counter = 0
        anonymous_person_counter = 0

        track_frame_counts = {}
        reported_loitering = set()

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

            try:
                results = self.model.track(
                    source=frame,
                    tracker="bytetrack.yaml",
                    persist=True,
                    conf=0.28,
                    verbose=False
                )
            except Exception as track_err:
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

                        is_vehicle = cls_name in VEHICLE_CLASSES
                        is_person = cls_name in PERSON_CLASSES

                        if track_id is not None:
                            track_frame_counts[track_id] = track_frame_counts.get(track_id, 0) + 1

                        evidence_frame = None

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

                        elif is_person:
                            if track_id is not None:
                                is_new = track_id not in unique_person_ids
                                unique_person_ids.add(track_id)
                            else:
                                anonymous_person_counter += 1
                                is_new = True

                            # AI Rule: Intrusion Detection
                            # Assuming any person is an intrusion for this use case
                            if is_new:
                                _, buffer = cv2.imencode('.jpg', frame)
                                evidence_frame = base64.b64encode(buffer).decode('utf-8')
                                frame_events.append({
                                    "type": "INTRUSION_DETECTED",
                                    "objectType": "PERSON",
                                    "subType": cls_name,
                                    "confidence": conf,
                                    "trackId": track_id or anonymous_person_counter,
                                    "bbox": bbox,
                                    "frame": frame_idx,
                                    "severity": "CRITICAL",
                                    "threatScore": 90,
                                    "evidenceFrame": evidence_frame
                                })

                            # AI Rule: Loitering Detection
                            # If a person is tracked for more than 15 frames
                            if track_id is not None and track_frame_counts[track_id] > 15 and track_id not in reported_loitering:
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

            if frame_events:
                pending_events.extend(frame_events)

            total_vehicles = len(unique_vehicle_ids) + anonymous_vehicle_counter
            total_persons = len(unique_person_ids) + anonymous_person_counter

            now = time.time()
            is_last = (frame_idx >= total_frames)
            time_elapsed = (now - last_progress_time) >= 0.75

            if progress_callback and (time_elapsed or is_last):
                last_progress_time = now
                progress_pct = min(100, int((frame_idx / total_frames) * 100)) if total_frames > 0 else 0
                events_to_send = pending_events[-15:]
                pending_events = []
                progress_callback({
                    "frame": frame_idx,
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": duration,
                    "progress": progress_pct,
                    "vehicles_detected": total_vehicles,
                    "persons_detected": total_persons,
                    "events": events_to_send
                })

        cap.release()
        logger.info(f"Video processing completed: {frame_idx} frames processed. Vehicles: {len(unique_vehicle_ids) + anonymous_vehicle_counter}, Persons: {len(unique_person_ids) + anonymous_person_counter}")
