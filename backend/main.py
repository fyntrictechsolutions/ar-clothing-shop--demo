"""Thira AI try-on backend.

One endpoint, POST /tryon, takes the shopper's photo and the garment image from the store
and returns a photorealistic try-on image. It exists so the try-on API key stays on the
server, and so we can rate-limit a public demo.

Run locally:  uvicorn main:app --reload --port 8000
"""

import os
import time
from collections import defaultdict, deque
from typing import Literal

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tryon_provider import TryOnFailed, fashn_tryon

FASHN_API_KEY = os.environ.get("FASHN_API_KEY", "")
FASHN_MODE = os.environ.get("FASHN_MODE", "balanced")  # performance | balanced | quality
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
RATE_LIMIT_PER_HOUR = int(os.environ.get("RATE_LIMIT_PER_HOUR", "20"))
MAX_IMAGE_CHARS = 8_000_000  # about 6 MB of base64

app = FastAPI(title="Thira AI try-on")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TryOnRequest(BaseModel):
    person_image: str = Field(description="Shopper's photo as a data URI")
    garment_image: str = Field(description="Garment image as a data URI or https URL")
    category: Literal["auto", "tops", "bottoms", "one-pieces"] = "auto"
    garment_photo_type: Literal["auto", "flat-lay", "model"] = "auto"


class TryOnResponse(BaseModel):
    image: str
    seconds: float


# Simple in-memory limiter: enough for one demo server, use Redis for several.
_requests: dict[str, deque[float]] = defaultdict(deque)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request) -> None:
    now = time.time()
    hits = _requests[client_ip(request)]
    while hits and hits[0] < now - 3600:
        hits.popleft()
    if len(hits) >= RATE_LIMIT_PER_HOUR:
        raise HTTPException(429, "You've tried on a lot this hour. Please try again a little later.")
    hits.append(now)


async def http_client():
    async with httpx.AsyncClient(timeout=30) as client:
        yield client


def check_image(value: str, name: str, allow_url: bool = False) -> None:
    if len(value) > MAX_IMAGE_CHARS:
        raise HTTPException(413, f"The {name} is too large. Use an image under 6 MB.")
    if value.startswith("data:image/"):
        return
    if allow_url and value.startswith("https://"):
        return
    raise HTTPException(422, f"The {name} must be an image.")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "provider_configured": bool(FASHN_API_KEY)}


@app.post("/tryon", response_model=TryOnResponse)
async def tryon(
    body: TryOnRequest,
    _: None = Depends(rate_limit),
    client: httpx.AsyncClient = Depends(http_client),
) -> TryOnResponse:
    if not FASHN_API_KEY:
        raise HTTPException(503, "AI try-on isn't configured on this server yet.")
    check_image(body.person_image, "photo")
    check_image(body.garment_image, "garment image", allow_url=True)

    started = time.monotonic()
    try:
        image = await fashn_tryon(
            client,
            FASHN_API_KEY,
            body.person_image,
            body.garment_image,
            body.category,
            body.garment_photo_type,
            FASHN_MODE,
        )
    except TryOnFailed as e:
        if e.user_error:
            raise HTTPException(422, str(e))
        print(f"tryon failed: {e}")  # visible in the host's logs
        raise HTTPException(502, "The try-on service didn't respond properly. Please try again.")
    except httpx.HTTPError as e:
        print(f"tryon network error: {e!r}")
        raise HTTPException(502, "Couldn't reach the try-on service. Please try again.")
    return TryOnResponse(image=image, seconds=round(time.monotonic() - started, 1))
