

def test_health(client):
    """健康检查接口应该返回 200 和 {"status": "ok"}"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}




def test_conftest_works(client):
    """判别实验：连的是测试库还是真库？

    测试库是空的 → total 应为 0
    真库有 2 本书  → total 会是 2
    """
    response = client.get("/v1/books")

    assert response.status_code == 200
    assert response.json()["total"] == 0

