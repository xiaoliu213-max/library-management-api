# 图书管理系统 API

基于 **FastAPI + MySQL** 的图书管理 REST API，支持书目管理、借阅记录、JWT 认证与权限分级。

---

## 功能特性

- **书目管理** —— 图书的增删改查，支持书名/作者模糊搜索、分类与价格区间过滤、多字段排序
- **借阅记录** —— 每本书的借阅与归还记录
- **分页** —— 列表接口统一分页，返回 `total` / `page` / `size` / `items`
- **JWT 认证** —— 密码以 Argon2id 哈希存储，登录签发 token，通过 `Bearer` 方式携带
- **权限分级** —— 读接口公开、写接口需登录、删除仅管理员
- **统一错误响应** —— 所有错误返回 `{code, message, detail}` 格式
- **API 版本化** —— 路径版本 `/v1`
- **数据库迁移** —— Alembic 管理表结构变更
- **测试** —— pytest + TestClient，**12 个用例**覆盖 CRUD、认证、权限与错误路径；测试库独立隔离、可重复运行
- **容器化** —— Docker 多阶段构建（非 root / HEALTHCHECK）+ Docker Compose 一键启动 API + MySQL
- **CORS 与中间件** —— 跨源白名单、请求耗时统计（`X-Process-Time` 响应头）

---

## 技术栈

| 组件 | 版本 | 说明 |
|---|---|---|
| Python | 3.10 | |
| FastAPI | 0.141.1 | Web 框架 |
| Uvicorn | 0.52.4 | ASGI 服务器 |
| Pydantic | 2.13.5 | 数据校验与序列化 |
| pydantic-settings | 2.15.0 | 配置集中管理 |
| SQLAlchemy | 2.0.54 | ORM（2.0 新 API） |
| MySQL | 8.x | 数据库 |
| PyMySQL | 1.2.3 | MySQL 驱动 |
| Alembic | 1.20.0 | 数据库迁移 |
| pwdlib[argon2] | 0.3.1 | 密码哈希（Argon2id） |
| PyJWT | 2.15.1 | JWT 签发与验签 |
| python-multipart | 0.0.32 | 表单解析（登录接口用） |
| pytest | 9.1.1 | 测试框架 |
| httpx | 0.28.1 | TestClient 依赖的 HTTP 客户端 |
| Docker / Compose | 29.8.2 / v5.5.1 | 容器化与编排 |

---

## 快速开始

### 方式 A：Docker 一键启动（推荐）

> 前提：已安装 Docker Desktop。**不需要**本机装 MySQL、不需要手动建库。

```bash
cp .env.example .env                          # 填入 DB_PASSWORD / SECRET_KEY
docker compose up -d                          # 起 MySQL + API（首次会拉取镜像）
docker compose exec api alembic upgrade head  # 建表（建议等 MySQL 就绪后再执行）
```

打开 <http://127.0.0.1:8000/docs> 即可使用。

> 💡 首次启动 MySQL 需要十几秒初始化。若 `api` 容器反复重启，等 MySQL 就绪即可（用 `docker compose ps` 看状态）。

> 📌 Compose 会起两个容器：`db`（MySQL）和 `api`（本应用）。MySQL 映射到宿主机 **3307**，避免与本机 3306 冲突。

---

### 方式 B：本地运行

**（不依赖 Docker，需要本机已装 MySQL）**

### 1. 准备数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 创建虚拟环境并安装依赖

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

### 3. 配置环境变量

复制模板并填入真实值：

```bash
cp .env.example .env
```

`.env` 各项说明：

| 变量 | 说明 |
|---|---|
| `DB_USER` / `DB_PASSWORD` | MySQL 账号与密码 |
| `DB_HOST` / `DB_PORT` | 数据库地址与端口（默认 `localhost` / `3306`） |
| `DB_NAME` | 数据库名（默认 `library`） |
| `SECRET_KEY` | JWT 签名密钥。生成方式：`python -c "import secrets; print(secrets.token_hex(32))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | token 有效期（分钟，默认 30） |

> ⚠️ `.env` 含密钥，已被 `.gitignore` 忽略，不会进入版本库。请勿提交。

### 4. 执行数据库迁移

```bash
python -m alembic upgrade head
```

### 5. 启动服务

```bash
python -m uvicorn main:app --reload --port 8080
```

打开交互式 API 文档：<http://127.0.0.1:8080/docs>

在文档页点击右上角 **Authorize** 填入账号密码，之后所有请求会自动携带 token。

---

## API 一览

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/v1/users` | 注册用户 | 公开 |
| POST | `/v1/login` | 登录，获取 JWT | 公开 |
| GET | `/v1/books` | 图书列表（分页 / 过滤 / 排序） | 公开 |
| GET | `/v1/books/{book_id}` | 图书详情 | 公开 |
| POST | `/v1/books` | 新增图书 | 需登录 |
| PUT | `/v1/books/{book_id}` | 全量更新图书 | 需登录 |
| PATCH | `/v1/books/{book_id}` | 部分更新图书 | 需登录 |
| DELETE | `/v1/books/{book_id}` | 删除图书 | **仅管理员** |
| GET | `/v1/books/{book_id}/records` | 该书的借阅记录 | 需登录 |
| POST | `/v1/books/{book_id}/records` | 新增借阅记录 | 需登录 |
| PATCH | `/v1/books/{book_id}/records/{record_id}` | 标记归还 | 需登录 |

### 列表接口查询参数

| 参数 | 说明 | 约束 |
|---|---|---|
| `page` / `size` | 页码 / 每页条数 | `page ≥ 1`，`1 ≤ size ≤ 100` |
| `keyword` | 按书名或作者模糊搜索 | |
| `author` | 按作者精确匹配 | |
| `category` | 按分类名筛选 | |
| `price_min` / `price_max` | 价格区间（含边界） | `≥ 0` |
| `sort` | 排序字段，逗号分隔，`-` 前缀表示降序 | 如 `-price,title` |

示例：

```
GET /v1/books?author=刘慈欣&price_min=30&sort=-price&page=1&size=10
```

### 认证方式

```bash
# 1. 登录获取 token（注意是 form-data，不是 JSON）
curl -X POST http://127.0.0.1:8080/v1/login \
     -d "username=alice&password=123456"

# 返回：{"access_token":"eyJ...","token_type":"bearer"}

# 2. 携带 token 访问受保护接口
curl http://127.0.0.1:8080/v1/books/1/records \
     -H "Authorization: Bearer <access_token>"
```

### 错误响应格式

所有错误统一为：

```json
{
  "code": 422,
  "message": "请求参数校验失败",
  "detail": [
    {"field": "page", "message": "Input should be greater than or equal to 1"}
  ]
}
```

| 字段 | 说明 |
|---|---|
| `code` | 与 HTTP 状态码一致 |
| `message` | 面向人的说明，前端可直接展示 |
| `detail` | 仅参数校验类错误返回结构化数组，其余为 `null` |

常见状态码：`401` 未认证 / `403` 无权限 / `404` 资源不存在 / `409` 资源冲突（如用户名已存在）/ `422` 参数校验失败。

---

## 测试

使用 **pytest + FastAPI TestClient** 编写了 **12 个测试用例**，覆盖正常路径与错误路径：

| 分类 | 用例 |
|---|---|
| 读取（免认证） | 空列表 200、资源不存在 404、路径参数类型错误 422 |
| 写入 + 认证 | 注册用户、带 token 创建图书 |
| 错误路径 | 无 token 401、假 token 401、普通用户删书 403、管理员删书 204、删不存在的书 404 |
| 隔离自检 | 确认测试连的是独立测试库（而非开发库） |

```bash
pytest -v
```

**测试隔离方案**（`tests/conftest.py`）：

1. **独立测试库** `library_test` —— 测试不碰开发库
2. **事务回滚** —— 每个测试跑在一个"永不提交"的事务里，结束时 `rollback`，所有改动一次撤销 → **测试可重复运行**
3. **依赖覆盖** —— `app.dependency_overrides[get_db]` 把数据库 session 换成测试库的

> 业务代码**一行都不用改** —— 因为 `Depends(get_db)` 已经把"session 从哪来"外置了。这是依赖注入在测试上的最大回报。

首次运行前需手动建测试库（`create_all` 只能建表，不能建库）：

```sql
CREATE DATABASE library_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 项目结构

```
my_first_api/
├── main.py             # 应用入口：挂载路由、注册全局异常处理器
├── config.py           # 配置集中管理（pydantic-settings，import 即校验）
├── database.py         # 数据库引擎、Session、Base、get_db 依赖
├── models_db.py        # ORM 模型（9 张表）
├── schemas.py          # Pydantic 模型：请求 / 响应契约
├── crud.py             # 数据访问层（不含任何 HTTP 逻辑）
├── dependencies.py     # 公共依赖：get_current_user / get_current_admin
├── security.py         # 密码哈希与 JWT 签发验签
├── exceptions.py       # 全局异常处理器（统一错误响应）
├── routers/            # 路由层
│   ├── auth.py         #   POST /login
│   ├── users.py        #   POST /users
│   ├── books.py        #   /books 书目管理
│   └── records.py      #   /books/{id}/records 借阅记录
├── tests/              # 测试
│   ├── conftest.py     #   公共 fixture（测试库 / 事务回滚 / 依赖覆盖）
│   ├── test_books.py   #   CRUD + 认证 + 权限用例
│   └── test_health.py  #   健康检查 + 隔离自检
├── migrations/         # Alembic 迁移脚本
├── Dockerfile          # 生产级镜像（多阶段 / 非 root / HEALTHCHECK）
├── .dockerignore       # 构建上下文裁剪（构建上下文 56 kB）
├── compose.yml         # API + MySQL 一键编排
├── pytest.ini          # pytest 配置（pythonpath / testpaths）
├── requirements.txt    # 直接依赖清单
├── alembic.ini         # Alembic 配置
└── .env.example        # 环境变量模板
```

### 数据模型

9 张表：`books`（图书）、`categories`（分类）、`publishers`（出版社）、`tags` + `book_tags`（标签，多对多）、`translators` + `book_translators`（译者，多对多）、`borrow_records`（借阅记录）、`users`（用户）。

---

## 设计要点

- **分层依据是"它知不知道 HTTP"**：`crud.py` 不 import FastAPI、不 raise HTTPException、**不 commit**（提交权留给调用方，保证多步写操作的事务原子性）；`dependencies.py` 则相反，它存在的意义就是做 HTTP 相关的判断。
- **关联过滤用 `.has()` / `.any()` 生成 `EXISTS` 子查询，不用 join** —— join 一对多会产生重复行，把 `COUNT(*)` 撑大导致分页 `total` 错误，前端分页器页数会全错。
- **排序末尾补 `id` 兜底** —— SQL 标准不保证 `ORDER BY` 相同值的行顺序稳定，而分页按 `OFFSET` 切分，顺序不稳会导致翻页出现重复或漏项。
- **过滤条件采用"累积模式"** —— 每个参数独立判断、往列表里塞条件，最后统一 `.where(*conds)`，避免 5 个参数 32 种组合的 if/else 分支。数值参数用 `is not None` 判断（否则 `price_min=0` 会被静默忽略）。
- **认证与授权拆成两个依赖**（`get_current_user` → `get_current_admin`），使 **401（未认证）与 403（已认证但无权限）自然分层**，业务代码里无需任何权限判断。
- **token 只用于证明身份，用户状态每次查库** —— `is_active` / `is_admin` 不在 token 内，封禁与降权需要即时生效。
- **登录失败统一返回同一句错误**，防止攻击者通过错误信息枚举出真实存在的用户名。
- **响应模型作为白名单**，保证 `hashed_password` 永远不会被序列化输出。
- **配置集中管理且启动即校验** —— `config.py` 的模块级 `Settings()` 在 import 时执行，配置缺失或类型错误会在启动瞬间报错，而不是等到某个接口被调用时才崩。
- **测试隔离靠"依赖覆盖"而非改代码** —— `app.dependency_overrides` 把 `get_db` 换成测试库的 session，业务代码零改动；测试跑在永不提交的事务里，结束即回滚，可重复运行。
- **容器不打包配置** —— `.env` 被 `.dockerignore` 排除，密钥通过 `env_file` 在运行时注入；配置与镜像分离，同一镜像可用于不同环境。

---

## 后续计划

- [ ] 借阅记录关联用户（支持"我的借阅记录"）
- [ ] CI（GitHub Actions）自动运行测试
