from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from orka_api.broker import Event, HandlerFunc, Payload
from orka_api.services.nodes import (
    NodeMetadataAck,
    NodeMetadataPayload,
    NodeService,
)

if TYPE_CHECKING:
    from socketio import AsyncServer
    from sqlalchemy.ext.asyncio import AsyncEngine

    from orka_api.broker.auth import AuthBroker

logger = logging.getLogger(__name__)


class MessageBroker:
    def __init__(
        self,
        engine: AsyncEngine,
        auth_broker: AuthBroker,
        node_service: NodeService,
    ) -> None:
        self._engine = engine
        self._auth_broker = auth_broker
        self._node_service = node_service

    def handlers(self) -> dict[Event, HandlerFunc[Any, dict[str, Any]]]:
        return {
            Event("node.metadata"): self.node_metadata,
        }

    async def node_metadata(
        self, server: AsyncServer, payload: Payload[Any]
    ) -> dict[str, Any]:
        session = await self._auth_broker.require_authenticated_node(
            server, payload.sid
        )
        try:
            metadata = NodeMetadataPayload.model_validate(payload.data)
        except ValidationError:
            async with self._engine.begin() as connection:
                await self._metadata_error(
                    connection,
                    node_id=session.node_id,
                    code="node_metadata_invalid",
                    message="Node metadata validation failed.",
                )
            return NodeMetadataAck(ok=False, error="node_metadata_invalid").model_dump(
                mode="json"
            )

        try:
            async with self._engine.begin() as connection:
                await self._node_service.ingest(
                    connection,
                    node_id=session.node_id,
                    payload=metadata,
                )
        except Exception:
            logger.exception(
                "Failed to persist node metadata for node %s.", session.node_id
            )
            async with self._engine.begin() as connection:
                await self._metadata_error(
                    connection,
                    node_id=session.node_id,
                    code="node_metadata_persist_failed",
                    message="Node metadata persistence failed.",
                )
            return NodeMetadataAck(
                ok=False, error="node_metadata_persist_failed"
            ).model_dump(mode="json")

        logger.info("Persisted node metadata for node %s.", session.node_id)
        return NodeMetadataAck(ok=True).model_dump(mode="json")

    async def _metadata_error(
        self,
        connection,
        *,
        node_id,
        code: str,
        message: str,
    ) -> None:
        await self._node_service.set_health(
            connection,
            node_id=node_id,
            health="error",
            reason=code,
            message=message,
            payload={"code": code},
        )
        await self._node_service.append(
            connection,
            node_id=node_id,
            event_type="node.error",
            severity="error",
            payload={"code": code},
            message=message,
        )
