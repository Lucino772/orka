from __future__ import annotations

from typing import Any, Mapping

import jwt
from jwt import InvalidTokenError


class InvalidJwtError(ValueError):
    pass


class JwtService:
    def __init__(self, signing_key: str) -> None:
        self._signing_key = signing_key

    def encode(self, payload: Mapping[str, Any]) -> str:
        return jwt.encode(dict(payload), self._signing_key, algorithm="HS256")

    def decode(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(token, self._signing_key, algorithms=["HS256"])
        except InvalidTokenError as exc:
            raise InvalidJwtError("Invalid JWT.") from exc

        if not isinstance(payload, dict):
            raise InvalidJwtError("Invalid JWT payload.")
        return payload
