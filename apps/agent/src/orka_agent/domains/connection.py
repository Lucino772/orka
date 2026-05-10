from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Callable

from orka_agent import Event, HandlerFunc, Payload

if TYPE_CHECKING:
    from socketio import AsyncClient

    from orka_agent.metadata import MetadataPayload

logger = logging.getLogger(__name__)


class ConnectionDomain:
    def __init__(self, metadata_collector: Callable[[], "MetadataPayload"]) -> None:
        self._metadata_collector = metadata_collector

    def handlers(self) -> dict[Event, HandlerFunc[Any, None]]:
        return {
            Event("connect"): self.on_connect,
            Event("connect_error"): self.on_connect_error,
            Event("disconnect"): self.on_disconnect,
        }

    async def on_connect(self, client: AsyncClient, payload: Payload[None]) -> None:
        logger.info("Connected to backend.")
        payload_ = self._metadata_collector()
        try:
            ack = await client.call("node.metadata", payload_, timeout=10)
        except Exception:
            logger.exception("Failed to send node metadata.")
            raise
        logger.info("Sent node metadata: %s", ack)

    async def on_connect_error(
        self, client: AsyncClient, payload: Payload[Any]
    ) -> None:
        logger.error("Connection failed: %s", payload.data)

    async def on_disconnect(self, client: AsyncClient, payload: Payload[None]) -> None:
        logger.info("Disconnected from backend.")
