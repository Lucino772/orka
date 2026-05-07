from __future__ import annotations

import re
import uuid
from typing import TYPE_CHECKING, Annotated, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    TypeAdapter,
    ValidationError,
    model_validator,
)
from pydantic_core import PydanticCustomError
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError, NoResultFound
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from orka_api.errors import ApiHTTPException
from orka_db.schema import workspace_table

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
    from starlette.requests import Request


_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

WorkspaceName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
WorkspaceSlug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
        pattern=_SLUG_PATTERN.pattern,
    ),
]


class WorkspaceCreatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: WorkspaceName
    slug: WorkspaceSlug


class WorkspaceUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: WorkspaceName | None = None
    slug: WorkspaceSlug | None = None

    @model_validator(mode="after")
    def validate_updates_present(self) -> Self:
        if self.name is None and self.slug is None:
            raise PydanticCustomError(
                "workspace_update_missing_fields",
                "Request body must include at least one of 'name' or 'slug'.",
            )
        return self


class Workspace(BaseModel):
    id: UUID
    name: str
    slug: str


class WorkspaceApi:
    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    def routes(self) -> list[Route]:
        return [
            Route("/workspaces", self.list_endpoint, methods=["GET"]),
            Route("/workspaces", self.create_endpoint, methods=["POST"]),
            Route(
                "/workspaces/{workspace_id:uuid}", self.get_endpoint, methods=["GET"]
            ),
            Route(
                "/workspaces/{workspace_id:uuid}",
                self.update_endpoint,
                methods=["PATCH"],
            ),
            Route(
                "/workspaces/{workspace_id:uuid}",
                self.delete_endpoint,
                methods=["DELETE"],
            ),
        ]

    async def list_endpoint(self, request: Request) -> JSONResponse:
        statement = select(workspace_table).order_by(workspace_table.c.slug.asc())
        async with self._engine.connect() as connection:
            workspaces = TypeAdapter(list[Workspace]).validate_python(
                (await connection.execute(statement)).mappings().all(),
                from_attributes=False,
            )

        return JSONResponse(
            TypeAdapter(list[Workspace]).dump_python(workspaces, mode="json")
        )

    async def create_endpoint(self, request: Request) -> Response:
        try:
            payload = WorkspaceCreatePayload.model_validate_json(await request.body())
        except ValidationError as exc:
            raise ApiHTTPException(
                400,
                title="Bad Request",
                errors=exc.errors(
                    include_url=False, include_context=False, include_input=False
                ),
            ) from exc

        try:
            async with self._engine.begin() as connection:
                if await self._workspace_slug_exists(connection, payload.slug):
                    raise ApiHTTPException(409, title="Workspace slug already exists")

                workspace = Workspace.model_validate(
                    (
                        await connection.execute(
                            insert(workspace_table)
                            .values(id=uuid.uuid4(), name=payload.name, slug=payload.slug)
                            .returning(workspace_table)
                        )
                    )
                    .mappings()
                    .one()
                )
        except IntegrityError as exc:
            async with self._engine.connect() as connection:
                if await self._workspace_slug_exists(connection, payload.slug):
                    raise ApiHTTPException(
                        409, title="Workspace slug already exists"
                    ) from exc
            raise

        return JSONResponse(workspace.model_dump(mode="json"), status_code=201)

    async def get_endpoint(self, request: Request) -> Response:
        statement = select(workspace_table).where(
            workspace_table.c.id == request.path_params["workspace_id"]
        )
        try:
            async with self._engine.connect() as connection:
                workspace = Workspace.model_validate(
                    (await connection.execute(statement)).mappings().one()
                )
        except NoResultFound as exc:
            raise ApiHTTPException(404, title="Workspace not found") from exc
        else:
            return JSONResponse(workspace.model_dump(mode="json"))

    async def update_endpoint(self, request: Request) -> Response:
        try:
            payload = WorkspaceUpdatePayload.model_validate_json(await request.body())
        except ValidationError as exc:
            raise ApiHTTPException(
                400,
                title="Bad Request",
                errors=exc.errors(
                    include_url=False, include_context=False, include_input=False
                ),
            ) from exc

        workspace_id = request.path_params["workspace_id"]
        values: dict[str, str] = {}
        if payload.name is not None:
            values["name"] = payload.name
        if payload.slug is not None:
            values["slug"] = payload.slug
        try:
            async with self._engine.begin() as connection:
                await self._assert_workspace_exists(connection, workspace_id)
                if payload.slug is not None and await self._workspace_slug_exists(
                    connection, payload.slug, exclude_id=workspace_id
                ):
                    raise ApiHTTPException(409, title="Workspace slug already exists")

                workspace = Workspace.model_validate(
                    (
                        await connection.execute(
                            update(workspace_table)
                            .where(workspace_table.c.id == workspace_id)
                            .values(**values)
                            .returning(workspace_table)
                        )
                    )
                    .mappings()
                    .one()
                )
        except IntegrityError as exc:
            if payload.slug is not None:
                async with self._engine.connect() as connection:
                    if await self._workspace_slug_exists(
                        connection, payload.slug, exclude_id=workspace_id
                    ):
                        raise ApiHTTPException(
                            409, title="Workspace slug already exists"
                        ) from exc
            raise

        return JSONResponse(workspace.model_dump(mode="json"))

    async def delete_endpoint(self, request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        async with self._engine.begin() as connection:
            await self._assert_workspace_exists(connection, workspace_id)
            if await self._workspace_has_nodes(connection, workspace_id):
                raise ApiHTTPException(409, title="Workspace has nodes")

            workspace = Workspace.model_validate(
                (
                    await connection.execute(
                        delete(workspace_table)
                        .where(workspace_table.c.id == workspace_id)
                        .returning(workspace_table)
                    )
                )
                .mappings()
                .one()
            )

        return JSONResponse(workspace.model_dump(mode="json"))

    async def _workspace_slug_exists(
        self,
        connection: AsyncConnection,
        slug: str,
        *,
        exclude_id: UUID | None = None,
    ) -> bool:
        statement = select(workspace_table.c.id).where(workspace_table.c.slug == slug)
        if exclude_id is not None:
            statement = statement.where(workspace_table.c.id != exclude_id)

        existing = (await connection.execute(statement)).scalar_one_or_none()
        return existing is not None

    async def _assert_workspace_exists(
        self, connection: AsyncConnection, workspace_id: UUID
    ) -> None:
        existing = (
            await connection.execute(
                select(workspace_table.c.id).where(workspace_table.c.id == workspace_id)
            )
        ).scalar_one_or_none()
        if existing is None:
            raise ApiHTTPException(404, title="Workspace not found")

    async def _workspace_has_nodes(
        self, connection: AsyncConnection, workspace_id: UUID
    ) -> bool:
        from orka_db.schema import node_table

        existing = (
            await connection.execute(
                select(node_table.c.id).where(node_table.c.workspace_id == workspace_id)
            )
        ).scalar_one_or_none()
        return existing is not None
