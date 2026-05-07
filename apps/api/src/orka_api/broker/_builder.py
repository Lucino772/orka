from __future__ import annotations

from dataclasses import dataclass
from functools import wraps
from typing import Any, Awaitable, Callable, Generic, Mapping, TypeAlias, TypeVar

from socketio import AsyncServer

T = TypeVar("T")
P = TypeVar("P")


@dataclass(frozen=True)
class Event:
    name: str
    namespace: str | None = None


@dataclass(frozen=True)
class Payload(Generic[P]):
    sid: str
    event: str
    namespace: str | None
    data: P


HandlerFunc: TypeAlias = Callable[[AsyncServer, Payload[P]], Awaitable[T]]


def make_socketio_server(
    handlers: Mapping[Event, HandlerFunc[Any, Any]],
) -> AsyncServer:
    # This builder intentionally supports a narrow subset of AsyncServer
    # callback shapes: connect(sid, environ[, auth]), disconnect(sid), and
    # event handlers shaped as (sid, data). Wildcard event/namespace
    # registration is supported only when the resolved callback still
    # reduces to one of those shapes.
    server = AsyncServer(async_mode="asgi")
    for event, handler in handlers.items():
        server.on(
            event.name, _make_handler(server, event, handler), namespace=event.namespace
        )
    return server


def _make_handler(server: AsyncServer, event: Event, handler: HandlerFunc[Any, Any]):
    @wraps(handler)
    async def _handler(*args):
        if event.name == "*" and event.namespace == "*":
            _event = Event(args[0], args[1])
            _args = args[2:]
        elif event.name != "*" and event.namespace == "*":
            _event = Event(event.name, args[0])
            _args = args[1:]
        elif event.name == "*" and event.namespace != "*":
            _event = Event(args[0], event.namespace)
            _args = args[1:]
        else:
            _event = event
            _args = args

        if _event.name == "connect":
            if len(_args) not in (2, 3):
                raise TypeError(
                    "Socket.IO connect handlers must receive sid, environ, and optional auth."
                )
            payload = Payload(
                _args[0],
                _event.name,
                _event.namespace,
                {"environ": _args[1], "auth": _args[2] if len(_args) == 3 else None},
            )
        elif _event.name == "disconnect":
            if len(_args) != 1:
                raise TypeError("Socket.IO disconnect handlers must receive only sid.")
            payload = Payload(_args[0], _event.name, _event.namespace, {})
        else:
            if len(_args) != 2:
                raise TypeError(
                    "This builder only supports Socket.IO event handlers with sid and one payload argument."
                )
            payload = Payload(_args[0], _event.name, _event.namespace, _args[1])

        return await handler(server, payload)

    return _handler
