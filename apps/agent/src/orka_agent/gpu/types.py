from __future__ import annotations

from typing import TypedDict


class GpuMetadata(TypedDict):
    gpu_index: int
    vendor: str | None
    model: str | None
    vram_bytes: int | None
    device_name: str | None
    serial_number: str | None
    pci_bus_id: str | None
