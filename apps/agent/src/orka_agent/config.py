from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AgentConfig:
    api_url: str
    node_token: str

    @classmethod
    def from_env(cls) -> "AgentConfig":
        api_url = os.environ.get("ORKA_API_URL", "").strip()
        if not api_url:
            raise RuntimeError("ORKA_API_URL must be set.")

        node_token = os.environ.get("ORKA_NODE_TOKEN", "").strip()
        if not node_token:
            raise RuntimeError("ORKA_NODE_TOKEN must be set.")

        return cls(api_url=api_url, node_token=node_token)
