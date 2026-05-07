from __future__ import annotations

from typing import TYPE_CHECKING

from orka_agent import make_socketio_client
from orka_agent.domains.connection import ConnectionDomain
from orka_agent.domains.node import NodeDomain

if TYPE_CHECKING:
    from orka_agent.config import AgentConfig


class AgentClient:
    def __init__(self, config: AgentConfig) -> None:
        self._config = config
        self._node_domain = NodeDomain()
        self._connection_domain = ConnectionDomain(self._node_domain)

        handlers = {
            **self._connection_domain.handlers(),
            **self._node_domain.handlers(),
        }
        self._client = make_socketio_client(handlers, reconnection=True)

    async def run(self) -> None:
        await self._client.connect(
            self._config.api_url,
            auth={"token": self._config.node_token},
            socketio_path="ws/socket.io",
        )
        try:
            await self._client.wait()
        finally:
            await self._node_domain.stop()
