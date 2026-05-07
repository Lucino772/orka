from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Protocol, Sequence

if TYPE_CHECKING:
    from starlette.applications import Starlette


class Disposable(Protocol):
    async def dispose(self) -> None: ...


def make_lifespan(disposables: Sequence[Disposable]):

    @asynccontextmanager
    async def _lifespan(_: Starlette):
        try:
            yield
        finally:
            for disposable in disposables:
                await disposable.dispose()

    return _lifespan
