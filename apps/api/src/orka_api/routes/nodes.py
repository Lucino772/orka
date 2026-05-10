from __future__ import annotations

import datetime as dt
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
from orka_api.services.nodes import (
    NodeCreateResponse,
    NodeDetail,
    NodeRenameResponse,
    NodeService,
    NodeSummary,
    NodeTokenResponse,
)
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


class NodeRenamePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: NodeName


class Node(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str


class NodeApi:
    def __init__(
        self,
        engine: AsyncEngine,
        jwt_service: JwtService,
        node_service: NodeService,
    ) -> None:
        self._engine = engine
        self._jwt_service = jwt_service
        self._node_service = node_service

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
            Route(
                "/workspaces/{workspace_id:uuid}/nodes/{node_id:uuid}",
                self.get_endpoint,
                methods=["GET"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}/nodes/{node_id:uuid}",
                self.rename_endpoint,
                methods=["PATCH"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}/nodes/{node_id:uuid}",
                self.delete_endpoint,
                methods=["DELETE"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}/nodes/{node_id:uuid}/token",
                self.generate_token_endpoint,
                methods=["POST"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}/nodes/{node_id:uuid}/activity",
                self.activity_endpoint,
                methods=["GET"],
            ),
        ]

    async def list_endpoint(self, request: Request) -> JSONResponse:
        workspace_id = request.path_params["workspace_id"]
        async with self._engine.connect() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            nodes = await self._node_service.list_nodes(connection, workspace_id)
        return JSONResponse(
            TypeAdapter(list[NodeSummary]).dump_python(nodes, mode="json")
        )

    async def get_endpoint(self, request: Request) -> JSONResponse:
        workspace_id = request.path_params["workspace_id"]
        node_id = request.path_params["node_id"]
        async with self._engine.connect() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            node = await self._node_service.get_node(connection, workspace_id, node_id)
        if node is None:
            raise ApiHTTPException(404, title="Node not found")
        return JSONResponse(NodeDetail.model_validate(node).model_dump(mode="json"))

    async def activity_endpoint(self, request: Request) -> JSONResponse:
        workspace_id = request.path_params["workspace_id"]
        node_id = request.path_params["node_id"]
        async with self._engine.connect() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            activity = await self._node_service.list_activity(
                connection, workspace_id, node_id
            )
        if activity is None:
            raise ApiHTTPException(404, title="Node not found")
        return JSONResponse([entry.model_dump(mode="json") for entry in activity])

    async def rename_endpoint(self, request: Request) -> JSONResponse:
        try:
            payload = NodeRenamePayload.model_validate_json(await request.body())
        except ValidationError as exc:
            raise ApiHTTPException(
                400,
                title="Bad Request",
                errors=exc.errors(
                    include_url=False, include_context=False, include_input=False
                ),
            ) from exc

        workspace_id = request.path_params["workspace_id"]
        node_id = request.path_params["node_id"]
        async with self._engine.connect() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            existing = (
                await connection.execute(
                    select(node_table.c.id).where(
                        node_table.c.workspace_id == workspace_id,
                        node_table.c.name == payload.name,
                        node_table.c.id != node_id,
                    )
                )
            ).scalar_one_or_none()
            if existing is not None:
                raise ApiHTTPException(409, title="Node name already exists")

        try:
            async with self._engine.begin() as connection:
                renamed = await self._node_service.rename_node(
                    connection, workspace_id, node_id, name=payload.name
                )
        except IntegrityError as exc:
            async with self._engine.connect() as connection:
                if await self._node_name_exists(connection, workspace_id, payload.name):
                    raise ApiHTTPException(
                        409, title="Node name already exists"
                    ) from exc
            raise

        if renamed is None:
            raise ApiHTTPException(404, title="Node not found")

        return JSONResponse(
            NodeRenameResponse.model_validate(renamed).model_dump(mode="json")
        )

    async def delete_endpoint(self, request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        node_id = request.path_params["node_id"]
        async with self._engine.begin() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            deleted = await self._node_service.delete_node(
                connection, workspace_id, node_id
            )
        if not deleted:
            raise ApiHTTPException(404, title="Node not found")
        return Response(status_code=204)

    async def generate_token_endpoint(self, request: Request) -> JSONResponse:
        workspace_id = request.path_params["workspace_id"]
        node_id = request.path_params["node_id"]
        async with self._engine.begin() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            secret = secrets.token_urlsafe(32)
            secret_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
            updated = await self._node_service.set_secret_hash(
                connection, workspace_id, node_id, secret_hash=secret_hash
            )
        if not updated:
            raise ApiHTTPException(404, title="Node not found")

        token = self._jwt_service.encode(
            {"sub": str(node_id), "secret": secret, "typ": "orka.node-token"}
        )
        return JSONResponse(NodeTokenResponse(token=token).model_dump(mode="json"))

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
        try:
            async with self._engine.begin() as connection:
                await self._assert_workspace_exists(connection, workspace_id)
                if await self._node_name_exists(connection, workspace_id, payload.name):
                    raise ApiHTTPException(409, title="Node name already exists")

                now = dt.datetime.now(tz=dt.UTC)
                node_row = await connection.execute(
                    insert(node_table)
                    .values(
                        id=node_id,
                        workspace_id=workspace_id,
                        name=payload.name,
                        secret_hash=None,
                        status="offline",
                        health="unknown",
                        created_at=now,
                        updated_at=now,
                    )
                    .returning(
                        node_table.c.id,
                        node_table.c.workspace_id,
                        node_table.c.name,
                        node_table.c.status,
                        node_table.c.health,
                        node_table.c.secret_hash,
                    )
                )
                node = NodeSummary.model_validate(
                    {**node_row.mappings().one(), "has_secret": False}
                )
        except IntegrityError as exc:
            async with self._engine.connect() as connection:
                if await self._node_name_exists(connection, workspace_id, payload.name):
                    raise ApiHTTPException(
                        409, title="Node name already exists"
                    ) from exc
            raise

        provisioned = NodeCreateResponse(
            **node.model_dump(),
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
