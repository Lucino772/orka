from __future__ import annotations

import io
import logging
from contextlib import redirect_stderr, redirect_stdout
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from orka_agent.gpu.types import GpuMetadata

logger = logging.getLogger(__name__)

try:
    with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
        import amdsmi
except Exception as exc:
    _IMPORT_ERROR = exc

    def get_gpu_devices(*, index_offset: int = 0) -> list["GpuMetadata"]:
        logger.warning("AMD GPU metadata unavailable: %s", _IMPORT_ERROR)
        return []

else:

    def get_gpu_devices(*, index_offset: int = 0) -> list["GpuMetadata"]:
        try:
            amdsmi.amdsmi_init()
            gpus: list["GpuMetadata"] = []
            for index, handle in enumerate(amdsmi.amdsmi_get_processor_handles()):
                asic_info = amdsmi.amdsmi_get_gpu_asic_info(handle)
                vram_info = amdsmi.amdsmi_get_gpu_vram_info(handle)
                vram_bytes = amdsmi.amdsmi_get_gpu_memory_total(
                    handle, amdsmi.AmdSmiMemoryType.VRAM
                )
                model = _normalize_value(asic_info.get("market_name"))
                serial_number = _normalize_value(asic_info.get("asic_serial"))
                vendor = _normalize_value(asic_info.get("vendor_name")) or "AMD"
                gpus.append(
                    {
                        "gpu_index": index_offset + index,
                        "vendor": vendor,
                        "model": model,
                        "vram_bytes": int(vram_bytes or vram_info.get("vram_size") or 0)
                        or None,
                        "device_name": model,
                        "serial_number": serial_number,
                        "pci_bus_id": _normalize_value(
                            amdsmi.amdsmi_get_gpu_device_bdf(handle)
                        ),
                    }
                )
            return gpus
        except Exception as exc:
            logger.warning("AMD GPU metadata unavailable: %s", exc)
            return []
        finally:
            try:
                amdsmi.amdsmi_shut_down()
            except Exception:
                pass


def _normalize_value(value: Any) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    if not stripped or stripped == "N/A":
        return None
    return stripped
