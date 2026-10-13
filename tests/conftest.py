"""测试的公共前置装置（fixture）。

pytest 会自动加载本文件，里面的 fixture 在整个 tests/ 目录都能直接用。
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from config import settings
from database import Base, get_db
import models_db          # noqa: F401  ← 唯一作用：把模型注册进 Base.metadata，别删
from main import app

from types import SimpleNamespace
from dependencies import get_current_user

@pytest.fixture(scope="session")
def test_engine():
    """整个测试会话只跑一次：连测试库 → 建表；全部跑完 → 拆表。"""
    url = make_url(settings.database_url).set(database="library_test")
    engine = create_engine(url)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine):
    """每个测试函数一个：开事务 → 交出 session；测试结束 → 回滚，数据全部撤销。"""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """每个测试函数一个：把 app 的 get_db 换成测试版 → 交出假浏览器；结束 → 拔掉插头。"""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()



@pytest.fixture
def auth_headers(client):
    """注册一个测试用户并登录，返回可以直接用的请求头。"""
    # ① 注册
    client.post("/v1/users", json={"username": "tester", "password": "Test1234"})

    # ② 登录（注意：data= 不是 json=）
    response = client.post(
        "/v1/login",
        data={"username": "tester", "password": "Test1234"},
    )

    # ③ 取出 token，拼成请求头
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_client(client):
    """让 client 以"管理员"身份发请求（覆盖 get_current_user）"""

    def fake_admin():
        return SimpleNamespace(id=1, username="admin", is_admin=True)

    app.dependency_overrides[get_current_user] = fake_admin
    yield client

    app.dependency_overrides.pop(get_current_user,None)