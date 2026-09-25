"""
worker.py – BullMQ job worker for IBVAP ML inference.

Reuses the app.py ModelRegistry so models are loaded once and shared.
Concurrency is set to 1: YOLO + PaddleOCR + ORT are multi-GB resident
and a second concurrent job would OOM a 16 GB Space.

Gracefully drains on SIGTERM so HF restarts don't orphan in-flight jobs.
"""

import asyncio
import base64
import logging
import os
import signal
import sys

import cv2
import numpy as np

# Ensure the ml/ root is on sys.path so `from src.*` imports work.
_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)

from app import registry, CONFIG, _guard_and_decode, _yolo_detections_to_list  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)
logger = logging.getLogger("ibvap.worker")

REDIS_URL = CONFIG.get("redis_url") or os.environ.get("REDIS_URL", "")
QUEUE_NAME = CONFIG.get("queue_name", "ibvap-inference")
BACKEND_URL = CONFIG.get("backend_url") or os.environ.get("BACKEND_URL", "")


async def process_job(job, job_token: str):
    """Process a single inference job submitted via POST /jobs."""
    logger.info("Processing job %s", job.id)

    from bullmq_compat import update_progress

    data = job.data or {}
    b64 = data.get("image_b64")
    if not b64:
        return {"error": "No image_b64 in job data"}

    try:
        raw = base64.b64decode(b64)
    except Exception:
        return {"error": "Invalid base64"}

    img = _guard_and_decode(raw)

    # Wait for YOLO to be ready (may still be warming up)
    det = registry.get("yolo")
    retries = 0
    while det is None and retries < 30:
        await asyncio.sleep(2)
        det = registry.get("yolo")
        retries += 1

    if det is None:
        return {"error": "YOLO model failed to load"}

    await update_progress(job, 10)

    detections = det.predict(img)
    result = {
        "detections": _yolo_detections_to_list(detections),
        "image_shape": list(img.shape[:2]),
    }

    await update_progress(job, 100)
    logger.info("Job %s complete – %d detections", job.id, len(result["detections"]))
    return result


async def main():
    if not REDIS_URL:
        logger.error("REDIS_URL is not set – worker cannot start.")
        sys.exit(1)

    # Warm models (blocking) before accepting jobs
    logger.info("Warming models …")
    registry.warm_all()

    from bullmq_compat import create_worker

    worker = create_worker(QUEUE_NAME, REDIS_URL, process_job, concurrency=1)
    logger.info("Worker listening on queue '%s'", QUEUE_NAME)

    # Graceful drain on SIGTERM
    stop = asyncio.Event()

    def _signal_handler():
        logger.info("SIGTERM received – draining …")
        stop.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    try:
        await stop.wait()
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        logger.info("Closing worker …")
        await worker.close()
        logger.info("Worker stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
