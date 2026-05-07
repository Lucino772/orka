from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from orka_agent import Event, HandlerFunc, Payload

if TYPE_CHECKING:
    from socketio import AsyncClient

logger = logging.getLogger(__name__)


class NodeDomain:
    def handlers(self) -> dict[Event, HandlerFunc[Any, None]]:
        return {
            Event("node:ready"): self.on_ready,
        }

    async def on_ready(
        self, client: AsyncClient, payload: Payload[dict[str, Any]]
    ) -> None:
        logger.info("Authenticated as node %s.", payload.data.get("node_id"))
        try:
            ack = await client.call(
                "node:message",
                {
                    "kind": "agent.started",
                    "payload": {},
                    "sent_at": _utc_now().isoformat(),
                },
                timeout=10,
            )
        except Exception:
            logger.exception(
                "Failed to send startup message for node %s.",
                payload.data.get("node_id"),
            )
            raise
        logger.info("Sent startup message: %s", ack)

    async def stop(self) -> None:
        return None


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)
