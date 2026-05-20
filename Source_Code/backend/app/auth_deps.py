import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException

EXPECTED = os.environ.get("API_BEARER_TOKEN", "cmp600-demo-token")


async def verify_bearer(authorization: Annotated[str | None, Header()] = None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": {"code": 401, "message": "Unauthorized"}})
    token = authorization.removeprefix("Bearer ").strip()
    if token != EXPECTED:
        raise HTTPException(status_code=401, detail={"error": {"code": 401, "message": "Invalid token"}})
    return token


BearerDep = Annotated[str, Depends(verify_bearer)]
