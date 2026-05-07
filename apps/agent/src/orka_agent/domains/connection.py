from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from orka_agent import Event, HandlerFunc, Payload

if TYPE_CHECKING:
    from socketio import AsyncClient

    from orka_agent.domains.node import NodeDomain

logger = logging.getLogger(__name__)


class ConnectionDomain:
    def __init__(self, node_domain: NodeDomain) -> None:
        self._node_domain = node_domain

    def handlers(self) -> dict[Event, HandlerFunc[Any, None]]:
        return {
            Event("connect"): self.on_connect,
            Event("connect_error"): self.on_connect_error,
            Event("disconnect"): self.on_disconnect,
        }

    async def on_connect(self, client: AsyncClient, payload: Payload[None]) -> None:
        logger.info("Connected to backend.")

    async def on_connect_error(
        self, client: AsyncClient, payload: Payload[Any]
    ) -> None:
        logger.error("Connection failed: %s", payload.data)

    async def on_disconnect(self, client: AsyncClient, payload: Payload[None]) -> None:
        logger.info("Disconnected from backend.")
        await self._node_domain.stop()
