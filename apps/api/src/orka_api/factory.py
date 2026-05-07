from __future__ import annotations

import os
from typing import TYPE_CHECKING

from socketio import ASGIApp
from sqlalchemy.ext.asyncio import create_async_engine
from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from orka_api.broker import make_socketio_server
from orka_api.broker.auth import AuthBroker
from orka_api.broker.message import MessageBroker
from orka_api.errors import ApiHTTPException, exception_handler
from orka_api.lifespan import make_lifespan
from orka_api.routes.nodes import NodeApi
from orka_api.routes.workspaces import WorkspaceApi
from orka_api.services.jwt import JwtService

if TYPE_CHECKING:
    from starlette.requests import Request


def index(request: Request):
    return JSONResponse({"status": "ok"})


def create_app(
    database_url: str | None = None,
    node_jwt_signing_key: str | None = None,
):
    database_url = (
        database_url
        or os.environ.get(
            "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/orka"
        )
    ).strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set before creating the API app.")

    node_jwt_signing_key = (
        node_jwt_signing_key or os.environ.get("ORKA_NODE_JWT_SIGNING_KEY", "")
    ).strip()
    if not node_jwt_signing_key:
        raise RuntimeError(
            "ORKA_NODE_JWT_SIGNING_KEY must be set before creating the API app."
        )

    engine = create_async_engine(database_url, pool_pre_ping=True)
    jwt_service = JwtService(node_jwt_signing_key)

    auth_broker = AuthBroker(engine, jwt_service)
    message_broker = MessageBroker(auth_broker)
    sio_server = make_socketio_server(
        handlers={
            **auth_broker.handlers(),
            **message_broker.handlers(),
        }
    )

    workspace_api = WorkspaceApi(engine)
    node_api = NodeApi(engine, jwt_service)

    http_app = Starlette(
        debug=False,
        lifespan=make_lifespan([engine]),
        exception_handlers={
            ApiHTTPException: exception_handler,
            HTTPException: exception_handler,
            Exception: exception_handler,
        },
        routes=[
            Mount(
                "/api",
                routes=[Route("/", index), *workspace_api.routes(), *node_api.routes()],
            ),
        ],
        middleware=[],
    )
    return ASGIApp(sio_server, other_asgi_app=http_app, socketio_path="ws/socket.io")
