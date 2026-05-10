from __future__ import annotations

import platform
from datetime import UTC, datetime
from importlib import metadata as importlib_metadata
from typing import TYPE_CHECKING, TypedDict

import psutil

from orka_agent.gpu import amd, nvidia

if TYPE_CHECKING:
    from orka_agent.gpu.types import GpuMetadata


def collect_metadata() -> MetadataPayload:
    nvidia_gpus = nvidia.get_gpu_devices()
    amd_gpus = amd.get_gpu_devices(index_offset=len(nvidia_gpus))

    try:
        agent_version = importlib_metadata.version("orka-agent")
    except importlib_metadata.PackageNotFoundError:
        agent_version = None

    return {
        "sent_at": datetime.now(tz=UTC).isoformat(),
        "agent_version": agent_version,
        "hostname": platform.node().strip() or None,
        "system": {
            "os_name": platform.system() or None,
            "os_version": platform.version() or platform.release() or None,
            "cpu_architecture": platform.machine() or None,
            "cpu_core_count": psutil.cpu_count(logical=True),
            "ram_bytes": psutil.virtual_memory().total,
        },
        "gpus": [*nvidia_gpus, *amd_gpus],
    }


class MetadataPayload(TypedDict):
    sent_at: str
    agent_version: str | None
    hostname: str | None
    system: _SystemMetadata
    gpus: list["GpuMetadata"]


class _SystemMetadata(TypedDict):
    os_name: str | None
    os_version: str | None
    cpu_architecture: str | None
    cpu_core_count: int | None
    ram_bytes: int | None
