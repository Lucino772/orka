from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict

from orka_api.broker import Event, HandlerFunc, Payload

if TYPE_CHECKING:
    from socketio import AsyncServer

    from orka_api.broker.auth import AuthBroker

logger = logging.getLogger(__name__)


class NodeMessagePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    payload: dict[str, Any]
    sent_at: str
    correlation_id: str | None = None


class MessageBroker:
    def __init__(self, auth_broker: AuthBroker) -> None:
        self._auth_broker = auth_broker

    def handlers(self) -> dict[Event, HandlerFunc[Any, dict[str, bool]]]:
        return {
            Event("node:message"): self.node_message,
        }

    async def node_message(
        self, server: AsyncServer, payload: Payload[Any]
    ) -> dict[str, bool]:
        session = await self._auth_broker.require_authenticated_node(
            server, payload.sid
        )
        message = NodeMessagePayload.model_validate(payload.data)
        logger.info(
            "Received node message from node %s: %s",
            session.node_id,
            message.kind,
        )
        return {"ok": True}
