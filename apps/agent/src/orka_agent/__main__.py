from __future__ import annotations

import asyncio
import logging
import sys

from orka_agent.client import AgentClient
from orka_agent.config import AgentConfig


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
    asyncio.run(AgentClient(AgentConfig.from_env()).run())


if __name__ == "__main__":
    main()
