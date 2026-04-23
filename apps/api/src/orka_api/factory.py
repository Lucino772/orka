from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, TypedDict

from sqlalchemy.ext.asyncio import create_async_engine
from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from orka_api.errors import ApiHTTPException, exception_handler
from orka_api.workspaces import WorkspaceApi

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine
    from starlette.requests import Request


class AppState(TypedDict):
    engine: AsyncEngine


def _make_lifespan(database_url: str):

    @asynccontextmanager
    async def lifespan(app: Starlette):
        engine = create_async_engine(database_url, pool_pre_ping=True)
        try:
            yield {"engine": engine}
        finally:
            await engine.dispose()

    return lifespan


def index(request: Request):
    return JSONResponse({"status": "ok"})


def create_app():
    database_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/orka").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set before creating the API app.")

    workspace_api = WorkspaceApi()
    app = Starlette(
        debug=True,
        lifespan=_make_lifespan(database_url),
        exception_handlers={
            ApiHTTPException: exception_handler,
            HTTPException: exception_handler,
            Exception: exception_handler,
        },
        routes=[
            Mount("/api", routes=[Route("/", index), *workspace_api.routes()]),
        ],
        middleware=[],
    )

    return app
