from __future__ import annotations

from dataclasses import dataclass
from functools import wraps
from typing import Any, Awaitable, Callable, Generic, Mapping, TypeAlias, TypeVar

from socketio import AsyncClient

T = TypeVar("T")
P = TypeVar("P")


@dataclass(frozen=True)
class Event:
    name: str
    namespace: str | None = None


@dataclass(frozen=True)
class Payload(Generic[P]):
    event: str
    namespace: str | None
    data: P


HandlerFunc: TypeAlias = Callable[[AsyncClient, Payload[P]], Awaitable[T]]


def make_socketio_client(
    handlers: Mapping[Event, HandlerFunc[Any, Any]],
    **client_kwargs: Any,
) -> AsyncClient:
    # This builder intentionally supports a reduced AsyncClient callback
    # surface: zero-arg and one-arg event handlers only. Wildcard
    # event/namespace registration is supported only when the resolved
    # callback still fits that shape.
    client = AsyncClient(**client_kwargs)
    for event, handler in handlers.items():
        client.on(
            event.name,
            handler=_make_handler(client, event, handler),
            namespace=event.namespace,
        )
    return client


def _make_handler(client: AsyncClient, event: Event, handler: HandlerFunc[Any, Any]):
    @wraps(handler)
    async def _handler(*args):
        if event.name == "*" and event.namespace == "*":
            payload_event = Event(args[0], args[1])
            payload_args = args[2:]
        elif event.name != "*" and event.namespace == "*":
            payload_event = Event(event.name, args[0])
            payload_args = args[1:]
        elif event.name == "*" and event.namespace != "*":
            payload_event = Event(args[0], event.namespace)
            payload_args = args[1:]
        else:
            payload_event = event
            payload_args = args

        if len(payload_args) == 0:
            data = None
        elif len(payload_args) == 1:
            data = payload_args[0]
        else:
            raise TypeError(
                "This builder only supports Socket.IO client handlers with zero or one payload argument."
            )

        return await handler(
            client,
            Payload(
                event=payload_event.name,
                namespace=payload_event.namespace,
                data=data,
            ),
        )

    return _handler
