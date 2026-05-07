from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from hmac import compare_digest
from typing import TYPE_CHECKING, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, ValidationError
from socketio.exceptions import ConnectionRefusedError
from sqlalchemy import select

from orka_api.broker import Event, HandlerFunc, Payload
from orka_api.services.jwt import InvalidJwtError, JwtService
from orka_db.schema import node_table

if TYPE_CHECKING:
    from socketio import AsyncServer
    from sqlalchemy.ext.asyncio import AsyncEngine


@dataclass(frozen=True)
class AuthenticatedNode:
    node_id: UUID
    workspace_id: UUID


class ConnectAuthPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str


class NodeTokenClaims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sub: str
    secret: str
    typ: Literal["orka.node-token"]

    @property
    def node_id(self) -> UUID:
        return UUID(self.sub)


class NodeReadyPayload(BaseModel):
    node_id: UUID
    workspace_id: UUID


class AuthBroker:
    def __init__(self, engine: AsyncEngine, jwt_service: JwtService) -> None:
        self._engine = engine
        self._jwt_service = jwt_service

    def handlers(self) -> dict[Event, HandlerFunc[Any, Any]]:
        return {
            Event("connect"): self.connect,
        }

    async def connect(
        self, server: AsyncServer, payload: Payload[dict[str, Any]]
    ) -> None:
        sid = payload.sid
        auth = payload.data["auth"]
        try:
            auth_payload = ConnectAuthPayload.model_validate(auth)
            claims = NodeTokenClaims.model_validate(
                self._jwt_service.decode(auth_payload.token)
            )
            if claims.typ != "orka.node-token":
                raise ConnectionRefusedError("Invalid node token type.")

            node = await self._load_node(claims.node_id)
            if node is None:
                raise ConnectionRefusedError("Unknown node.")

            secret_hash = hashlib.sha256(claims.secret.encode("utf-8")).hexdigest()
            if not compare_digest(secret_hash, node["secret_hash"]):
                raise ConnectionRefusedError("Invalid node secret.")

            session = AuthenticatedNode(
                node_id=node["id"],
                workspace_id=node["workspace_id"],
            )
            await server.save_session(
                sid,
                {
                    "node_id": str(session.node_id),
                    "workspace_id": str(session.workspace_id),
                },
            )
            # Multiple sockets per logical node are allowed.
            # Future server-to-agent commands must target a
            # concrete sid/session, not a logical node room.
            await server.enter_room(sid, f"workspace:{session.workspace_id}")
            server.start_background_task(
                _emit_ready,
                server,
                sid,
                NodeReadyPayload(
                    node_id=session.node_id,
                    workspace_id=session.workspace_id,
                ),
            )
        except (InvalidJwtError, ValidationError) as exc:
            raise ConnectionRefusedError("Invalid node token.") from exc

    async def get_authenticated_node(
        self, server: AsyncServer, sid: str
    ) -> AuthenticatedNode | None:
        try:
            session = await server.get_session(sid)
        except KeyError:
            return None

        try:
            return AuthenticatedNode(
                node_id=UUID(session["node_id"]),
                workspace_id=UUID(session["workspace_id"]),
            )
        except (KeyError, TypeError, ValueError):
            return None

    async def require_authenticated_node(
        self, server: AsyncServer, sid: str
    ) -> AuthenticatedNode:
        session = await self.get_authenticated_node(server, sid)
        if session is None:
            raise ValueError("Unauthenticated socket.")
        return session

    async def _load_node(self, node_id: UUID):
        async with self._engine.connect() as connection:
            return (
                (
                    await connection.execute(
                        select(
                            node_table.c.id,
                            node_table.c.workspace_id,
                            node_table.c.secret_hash,
                        ).where(node_table.c.id == node_id)
                    )
                )
                .mappings()
                .one_or_none()
            )


async def _emit_ready(sio: AsyncServer, sid: str, payload: NodeReadyPayload) -> None:
    await asyncio.sleep(0)
    await sio.emit("node:ready", payload.model_dump(mode="json"), to=sid)
