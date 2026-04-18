from __future__ import annotations

from typing import TYPE_CHECKING

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

if TYPE_CHECKING:
    from starlette.requests import Request


def index(request: Request):
    return JSONResponse({"status": "ok"})


def create_app():
    app = Starlette(
        debug=True,
        routes=[
            Mount("/api", routes=[Route("/", index)]),
        ],
        middleware=[],
    )

    return app
