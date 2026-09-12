import asyncio
import os
import sys
import logging
import requests

# Ensure ml directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from bullmq import Worker, Job
from video.processor import VideoProcessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4000/api')

async def process_video(job: Job, job_token: str):
    logger.info(f"Processing job {job.id} for video {job.data.get('videoId')}")
    video_id = job.data.get('videoId')
    camera_id = job.data.get('cameraId')
    video_path = job.data.get('videoPath')
    
    if not all([video_id, camera_id, video_path]):
        logger.error("Missing required job data")
        return "Failed: Missing data"

    if not os.path.exists(video_path):
        logger.error(f"Video file not found at: {video_path}")
        return f"Failed: File not found {video_path}"

    processor = VideoProcessor()
    final_stats = {"vehicles": 0, "persons": 0}
    
    def on_progress(data):
        progress = data["progress"]
        frame_idx = data["frame"]
        total_frames = data["total_frames"]
        vehicles = data.get("vehicles_detected", 0)
        persons = data.get("persons_detected", 0)
        events = data.get("events", [])
        
        final_stats["vehicles"] = vehicles
        final_stats["persons"] = persons
        
        try:
            requests.post(f"{BACKEND_URL}/videos/{video_id}/progress", json={
                "progress": progress,
                "frame": frame_idx,
                "totalFrames": total_frames,
                "status": "PROCESSING",
                "fps": data.get("fps"),
                "duration": data.get("duration"),
                "vehiclesDetected": vehicles,
                "personsDetected": persons,
                "events": events
            }, timeout=30)
        except Exception as e:
            logger.error(f"Failed to update progress to backend: {e}")

    # Process video with adaptive frame skip in a background thread so asyncio event loop stays responsive
    await asyncio.to_thread(processor.process_video, video_path, on_progress)

    # Final completion update
    try:
        requests.post(f"{BACKEND_URL}/videos/{video_id}/progress", json={
            "progress": 100,
            "status": "COMPLETED",
            "vehiclesDetected": final_stats["vehicles"],
            "personsDetected": final_stats["persons"]
        }, timeout=30)
    except Exception as e:
        logger.error(f"Failed to finalize progress to backend: {e}")

    logger.info(f"Finished processing job {job.id}. Detected {final_stats['vehicles']} vehicles, {final_stats['persons']} persons.")
    return "Success"

async def main():
    logger.info("Starting Video Processing Worker connecting to Redis...")
    
    redis_opts = {
        "host": REDIS_HOST,
        "port": REDIS_PORT,
    }
    
    worker = Worker("videoAnalysisQueue", process_video, {"connection": redis_opts})
    logger.info("Video Processing Worker is listening for jobs on 'videoAnalysisQueue'...")
    
    # Run indefinitely
    try:
        while True:
            await asyncio.sleep(1)
    except (asyncio.CancelledError, KeyboardInterrupt):
        logger.info("Worker stopped")
        await worker.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

