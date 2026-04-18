from __future__ import annotations

import asyncio

from hypercorn.asyncio import serve
from hypercorn.config import Config

from orka_api.factory import create_app


def main():
    config = Config()
    config.bind = ["localhost:5174"]
    config.use_reloader = True
    config.debug = True

    app = create_app()
    asyncio.run(serve(app, config))  # type: ignore


if __name__ == "__main__":
    main()
