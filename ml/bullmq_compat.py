"""
bullmq_compat.py – Compatibility shim for bullmq Python API changes.

bullmq >=2.20 changed its Python API:
  OLD (< 2.20)                          NEW (>= 2.20)
  ──────────────────────────────────    ──────────────────────────────────
  queue.get_job(job_id)                 queue.getJob(job_id)
  job.state                             await job.getState()
  job.update_progress(n)                await job.updateProgress(n)
  job.return_value                      job.returnvalue

This module wraps the divergent calls so the rest of the codebase does not
need version-conditional imports.
"""

from __future__ import annotations

import logging
import urllib.parse as _up
from typing import Any

logger = logging.getLogger(__name__)


def _parse_redis_url(redis_url: str) -> dict:
    """Convert a redis:// URL into a {host, port, db, password} dict."""
    parsed = _up.urlparse(redis_url)
    conn: dict[str, Any] = {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 6379,
        "db": int(parsed.path.lstrip("/") or 0),
    }
    if parsed.password:
        conn["password"] = parsed.password
    return conn


# ── Queue ─────────────────────────────────────────────────────────────────────

def create_queue(name: str, redis_url: str) -> Any:
    from bullmq import Queue  # type: ignore[import-untyped]
    return Queue(name, {"connection": _parse_redis_url(redis_url)})


async def add_job(queue: Any, name: str, data: dict, opts: dict | None = None) -> Any:
    return await queue.add(name, data, opts or {})


async def fetch_job(queue: Any, job_id: str) -> Any | None:
    getter = getattr(queue, "getJob", None) or getattr(queue, "get_job", None)
    if getter is None:
        raise AttributeError("Queue has no getJob / get_job method")
    return await getter(job_id)


# ── Job ───────────────────────────────────────────────────────────────────────

async def get_job_state(job: Any) -> str:
    if hasattr(job, "getState"):
        return await job.getState()
    return getattr(job, "state", "unknown")


async def update_progress(job: Any, progress: int | float) -> None:
    if hasattr(job, "updateProgress"):
        await job.updateProgress(progress)
    elif hasattr(job, "update_progress"):
        await job.update_progress(progress)


def get_return_value(job: Any) -> Any:
    return getattr(job, "returnvalue", None) or getattr(job, "return_value", None)


# ── Worker ────────────────────────────────────────────────────────────────────

def create_worker(name: str, redis_url: str, processor: Any, concurrency: int = 1) -> Any:
    from bullmq import Worker  # type: ignore[import-untyped]
    return Worker(name, processor, {
        "connection": _parse_redis_url(redis_url),
        "concurrency": concurrency,
    })
