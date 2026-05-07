from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import TYPE_CHECKING, Annotated
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    TypeAdapter,
    ValidationError,
)
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from orka_api.errors import ApiHTTPException
from orka_db.schema import node_table, workspace_table

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
    from starlette.requests import Request

    from orka_api.services.jwt import JwtService


NodeName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


class NodeCreatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: NodeName


class Node(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str


class NodeProvisioned(Node):
    token: str


class NodeApi:
    def __init__(self, engine: AsyncEngine, jwt_service: JwtService) -> None:
        self._engine = engine
        self._jwt_service = jwt_service

    def routes(self) -> list[Route]:
        return [
            Route(
                "/workspaces/{workspace_id:uuid}/nodes",
                self.list_endpoint,
                methods=["GET"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}/nodes",
                self.create_endpoint,
                methods=["POST"],
            ),
        ]

    async def list_endpoint(self, request: Request) -> JSONResponse:
        workspace_id = request.path_params["workspace_id"]
        async with self._engine.connect() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            nodes = TypeAdapter(list[Node]).validate_python(
                (
                    await connection.execute(
                        select(node_table)
                        .where(node_table.c.workspace_id == workspace_id)
                        .order_by(node_table.c.name.asc())
                    )
                )
                .mappings()
                .all(),
                from_attributes=False,
            )

        return JSONResponse(TypeAdapter(list[Node]).dump_python(nodes, mode="json"))

    async def create_endpoint(self, request: Request) -> Response:
        try:
            payload = NodeCreatePayload.model_validate_json(await request.body())
        except ValidationError as exc:
            raise ApiHTTPException(
                400,
                title="Bad Request",
                errors=exc.errors(
                    include_url=False, include_context=False, include_input=False
                ),
            ) from exc

        workspace_id = request.path_params["workspace_id"]
        node_id = uuid.uuid4()
        secret = secrets.token_urlsafe(32)
        secret_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
        try:
            async with self._engine.begin() as connection:
                await self._assert_workspace_exists(connection, workspace_id)
                if await self._node_name_exists(connection, workspace_id, payload.name):
                    raise ApiHTTPException(409, title="Node name already exists")

                node = Node.model_validate(
                    (
                        await connection.execute(
                            insert(node_table)
                            .values(
                                id=node_id,
                                workspace_id=workspace_id,
                                name=payload.name,
                                secret_hash=secret_hash,
                            )
                            .returning(
                                node_table.c.id,
                                node_table.c.workspace_id,
                                node_table.c.name,
                            )
                        )
                    )
                    .mappings()
                    .one()
                )
        except IntegrityError as exc:
            async with self._engine.connect() as connection:
                if await self._node_name_exists(connection, workspace_id, payload.name):
                    raise ApiHTTPException(409, title="Node name already exists") from exc
            raise

        provisioned = NodeProvisioned(
            **node.model_dump(),
            token=self._jwt_service.encode(
                {"sub": str(node.id), "secret": secret, "typ": "orka.node-token"}
            ),
        )
        return JSONResponse(provisioned.model_dump(mode="json"), status_code=201)

    async def _assert_workspace_exists(
        self, connection: AsyncConnection, workspace_id: UUID
    ) -> None:
        exists = (
            await connection.execute(
                select(workspace_table.c.id).where(workspace_table.c.id == workspace_id)
            )
        ).scalar_one_or_none()
        if exists is None:
            raise ApiHTTPException(404, title="Workspace not found")

    async def _node_name_exists(
        self, connection: AsyncConnection, workspace_id: UUID, name: str
    ) -> bool:
        existing = (
            await connection.execute(
                select(node_table.c.id).where(
                    node_table.c.workspace_id == workspace_id,
                    node_table.c.name == name,
                )
            )
        ).scalar_one_or_none()
        return existing is not None
