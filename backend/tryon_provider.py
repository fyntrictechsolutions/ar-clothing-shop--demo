"""Talks to the AI try-on model.

The default provider is FASHN (https://docs.fashn.ai): submit a job, then poll its status.
To use another model (e.g. a self-hosted IDM-VTON or a Replicate deployment), write another
function with the same signature and select it in main.py.
"""

import asyncio
import time

import httpx

FASHN_BASE_URL = "https://api.fashn.ai/v1"
POLL_INTERVAL_S = 1.5
TIMEOUT_S = 90

# Friendlier messages for the errors a shopper can fix themselves.
FRIENDLY_ERRORS = {
    "PoseError": "We couldn't see your body clearly. Use a photo facing the camera with your head to hips in view.",
    "ImageLoadError": "That photo couldn't be read. Try a JPG or PNG.",
    "NSFWError": "That photo can't be used. Please try a different one.",
    "PhotoTypeError": "The product image couldn't be used for try-on.",
}


class TryOnFailed(Exception):
    def __init__(self, message: str, user_error: bool = False):
        super().__init__(message)
        self.user_error = user_error


async def fashn_tryon(
    client: httpx.AsyncClient,
    api_key: str,
    person_image: str,
    garment_image: str,
    category: str,
    garment_photo_type: str,
    mode: str,
) -> str:
    """Returns the generated image as a data URI."""
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "model_name": "tryon-v1.6",
        "inputs": {
            "model_image": person_image,
            "garment_image": garment_image,
            "category": category,
            "garment_photo_type": garment_photo_type,
            "mode": mode,
            "output_format": "jpeg",
            # Return the image inline so the provider only keeps it for an hour, not days.
            "return_base64": True,
        },
    }
    res = await client.post(f"{FASHN_BASE_URL}/run", json=payload, headers=headers)
    if res.status_code >= 400:
        raise TryOnFailed(f"Try-on service rejected the request ({res.status_code}): {res.text[:200]}")
    job = res.json()
    if job.get("error"):
        raise TryOnFailed(f"Try-on service error: {job['error']}")
    job_id = job["id"]

    deadline = time.monotonic() + TIMEOUT_S
    while time.monotonic() < deadline:
        await asyncio.sleep(POLL_INTERVAL_S)
        res = await client.get(f"{FASHN_BASE_URL}/status/{job_id}", headers=headers)
        if res.status_code >= 400:
            raise TryOnFailed(f"Status check failed ({res.status_code})")
        body = res.json()
        status = body.get("status")
        if status == "completed":
            return body["output"][0]
        if status in ("failed", "canceled"):
            err = body.get("error") or {}
            name = err.get("name", "")
            if name in FRIENDLY_ERRORS:
                raise TryOnFailed(FRIENDLY_ERRORS[name], user_error=True)
            raise TryOnFailed(f"Try-on failed: {name} {err.get('message', '')}".strip())
    raise TryOnFailed("Try-on timed out")
