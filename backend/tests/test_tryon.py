import httpx
import pytest
from fastapi.testclient import TestClient

import main
import tryon_provider

PERSON = "data:image/jpeg;base64,AAAA"
GARMENT = "data:image/jpeg;base64,BBBB"


def fake_fashn(statuses):
    """MockTransport that answers /run once, then each /status poll from `statuses`."""
    seen = {"run": None, "polls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer test-key"
        if request.url.path == "/v1/run":
            seen["run"] = request.read()
            return httpx.Response(200, json={"id": "job-1", "error": None})
        if request.url.path == "/v1/status/job-1":
            body = statuses[min(seen["polls"], len(statuses) - 1)]
            seen["polls"] += 1
            return httpx.Response(200, json=body)
        return httpx.Response(404)

    return handler, seen


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "FASHN_API_KEY", "test-key")
    monkeypatch.setattr(tryon_provider, "POLL_INTERVAL_S", 0)
    main._requests.clear()

    def use(handler):
        async def override():
            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
                yield c

        main.app.dependency_overrides[main.http_client] = override
        return TestClient(main.app)

    yield use
    main.app.dependency_overrides.clear()


def post(c, **overrides):
    body = {"person_image": PERSON, "garment_image": GARMENT, "category": "tops", "garment_photo_type": "flat-lay"}
    body.update(overrides)
    return c.post("/tryon", json=body)


def test_returns_generated_image(client):
    handler, seen = fake_fashn(
        [{"status": "processing"}, {"status": "completed", "output": ["data:image/jpeg;base64,RESULT"], "error": None}]
    )
    res = post(client(handler))
    assert res.status_code == 200
    assert res.json()["image"] == "data:image/jpeg;base64,RESULT"
    assert b'"model_name":"tryon-v1.6"' in seen["run"]
    assert b'"return_base64":true' in seen["run"]
    assert seen["polls"] == 2


def test_pose_error_is_shown_to_shopper(client):
    handler, _ = fake_fashn([{"status": "failed", "error": {"name": "PoseError", "message": "no pose"}}])
    res = post(client(handler))
    assert res.status_code == 422
    assert "head to hips" in res.json()["detail"]


def test_provider_failure_is_hidden(client):
    handler, _ = fake_fashn([{"status": "failed", "error": {"name": "PipelineError", "message": "boom"}}])
    res = post(client(handler))
    assert res.status_code == 502
    assert "boom" not in res.json()["detail"]


def test_rejects_non_image(client):
    handler, _ = fake_fashn([])
    res = post(client(handler), person_image="https://example.com/me.jpg")
    assert res.status_code == 422


def test_rate_limit(client, monkeypatch):
    monkeypatch.setattr(main, "RATE_LIMIT_PER_HOUR", 2)
    handler, _ = fake_fashn([{"status": "completed", "output": ["data:image/jpeg;base64,R"]}])
    c = client(handler)
    assert post(c).status_code == 200
    assert post(c).status_code == 200
    assert post(c).status_code == 429


def test_not_configured(monkeypatch):
    monkeypatch.setattr(main, "FASHN_API_KEY", "")
    main._requests.clear()
    res = TestClient(main.app).post("/tryon", json={"person_image": PERSON, "garment_image": GARMENT})
    assert res.status_code == 503
