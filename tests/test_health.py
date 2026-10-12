from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    """健康检查接口应该返回 200 和 {"status": "ok"}"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
