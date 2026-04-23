from __future__ import annotations

from typing import TYPE_CHECKING, Any, Mapping

from pydantic import BaseModel, ConfigDict
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse, Response

if TYPE_CHECKING:
    from starlette.requests import Request


class ApiHTTPException(Exception):
    __slots__ = (
        "details",
        "extras",
        "headers",
        "instance",
        "status_code",
        "title",
        "type_",
    )

    def __init__(
        self,
        code: int,
        /,
        *,
        type_: str = "about:blank",
        title: str = "Unknown Error",
        details: str | None = None,
        instance: str | None = None,
        headers: Mapping[str, str] | None = None,
        **kwargs: Any,
    ) -> None:
        self.type_ = type_
        self.status_code = code

        # NOTE: We make sure to exclude content-type headers
        self.headers = None
        if headers is not None:
            self.headers = {
                key: value
                for key, value in headers.items()
                if key.lower() != "content-type"
            }

        self.title = title
        self.details = details
        self.instance = instance
        self.extras = kwargs


class _ApiErrorResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    title: str
    status: int
    instance: str
    details: str | None = None


async def exception_handler(request: Request[Any], exc: Exception) -> Response:
    if isinstance(exc, ApiHTTPException):
        api_exc = exc
    elif isinstance(exc, HTTPException):
        api_exc = ApiHTTPException(
            exc.status_code,
            title=exc.detail,
            details=exc.detail,
            instance=request.url.path,
            headers=exc.headers,
        )
    else:
        api_exc = ApiHTTPException(500, details=str(exc), instance=request.url.path)

    data: dict[str, Any] = {
        "type": api_exc.type_,
        "status": api_exc.status_code,
        "title": api_exc.title,
        "instance": api_exc.instance or request.url.path,
    }
    if api_exc.details is not None:
        data["details"] = api_exc.details

    data.update(
        {
            key: value
            for key, value in api_exc.extras.items()
            if key not in {"type", "status", "title", "details", "instance"}
        }
    )

    return JSONResponse(
        _ApiErrorResponse.model_validate(data, from_attributes=False).model_dump(
            exclude_unset=True
        ),
        status_code=api_exc.status_code,
        headers=api_exc.headers,
        media_type="application/problem+json",
    )
