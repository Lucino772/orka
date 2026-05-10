from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from orka_agent.gpu.types import GpuMetadata

logger = logging.getLogger(__name__)

try:
    import pynvml
except Exception as exc:
    _IMPORT_ERROR = exc

    def get_gpu_devices(*, index_offset: int = 0) -> list["GpuMetadata"]:
        logger.warning("NVIDIA GPU metadata unavailable: %s", _IMPORT_ERROR)
        return []

else:

    def get_gpu_devices(*, index_offset: int = 0) -> list["GpuMetadata"]:
        try:
            pynvml.nvmlInit()
            gpus: list["GpuMetadata"] = []
            for index in range(pynvml.nvmlDeviceGetCount()):
                handle = pynvml.nvmlDeviceGetHandleByIndex(index)
                name = _decode_string(pynvml.nvmlDeviceGetName(handle))
                memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                pci = _get_optional_value(pynvml.nvmlDeviceGetPciInfo, handle)
                gpus.append(
                    {
                        "gpu_index": index_offset + index,
                        "vendor": "NVIDIA",
                        "model": name,
                        "vram_bytes": int(memory.total),
                        "device_name": name,
                        "serial_number": _normalize_string(
                            _decode_string(
                                _get_optional_value(pynvml.nvmlDeviceGetSerial, handle)
                            )
                        ),
                        "pci_bus_id": _normalize_string(
                            _decode_string(getattr(pci, "busId", None))
                        ),
                    }
                )
            return gpus
        except Exception as exc:
            logger.warning("NVIDIA GPU metadata unavailable: %s", exc)
            return []
        finally:
            try:
                pynvml.nvmlShutdown()
            except Exception:
                pass


def _get_optional_value(func, *args):
    try:
        return func(*args)
    except Exception:
        return None


def _decode_string(value: bytes | str | None) -> str | None:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _normalize_string(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
