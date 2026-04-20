"""In-memory buffer for request telemetry.

The old path wrote one INSERT per request via `asyncio.create_task`. Under
load that saturated the single-worker SSH tunnel and a bare `except: pass`
hid the damage. This buffer absorbs samples cheaply and flushes them in bulk
every `flush_interval` seconds, so N requests become 1 multi-row INSERT.

Tradeoff: up to `flush_interval` seconds of samples are lost if the process
crashes. Acceptable for operational telemetry; if metrics become
business-critical, move the buffer to Redis.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime

import structlog

logger = structlog.get_logger(__name__)


@dataclass(slots=True)
class MetricSample:
    timestamp: datetime
    endpoint: str
    method: str
    status_code: int
    duration_ms: float


class RequestMetricsBuffer:
    def __init__(self, flush_interval: float = 10.0, max_buffered: int = 10_000) -> None:
        self._buffer: list[MetricSample] = []
        self._flush_interval = flush_interval
        self._max_buffered = max_buffered
        self._task: asyncio.Task | None = None
        self._stopping = False

    def push(self, sample: MetricSample) -> None:
        # list.append is atomic under the GIL, so no lock needed; the check
        # + append race is acceptable (load shedding is already best-effort).
        if len(self._buffer) >= self._max_buffered:
            logger.warning("metrics_buffer_full", max_buffered=self._max_buffered)
            return
        self._buffer.append(sample)

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stopping = False
        self._task = asyncio.create_task(self._run(), name="request-metrics-flush")

    async def stop(self) -> None:
        self._stopping = True
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        # Drain whatever's left so we don't lose the tail on shutdown.
        await self._flush_once()

    async def _run(self) -> None:
        while not self._stopping:
            try:
                await asyncio.sleep(self._flush_interval)
                await self._flush_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Don't let an unexpected error kill the loop.
                logger.error("metrics_flush_loop_error", error=str(exc))

    async def _flush_once(self) -> None:
        if not self._buffer:
            return
        batch, self._buffer = self._buffer, []

        # Imports defer-ed to avoid a circular import with app.main.
        from app.db.session import AsyncSessionLocal
        from app.models.request_metric import RequestMetric

        try:
            async with AsyncSessionLocal() as session:
                session.add_all(
                    RequestMetric(
                        request_timestamp=m.timestamp,
                        endpoint=m.endpoint,
                        method=m.method,
                        status_code=m.status_code,
                        duration_ms=m.duration_ms,
                    )
                    for m in batch
                )
                await session.commit()
        except Exception as exc:
            logger.error("metrics_flush_failed", error=str(exc), batch_size=len(batch))


metrics_buffer = RequestMetricsBuffer()
