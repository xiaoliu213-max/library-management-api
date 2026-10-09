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

---

## 快速开始

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
├── migrations/         # Alembic 迁移脚本
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

---

## 后续计划

- [ ] pytest 单元测试与集成测试（TestClient + 依赖覆盖）
- [ ] Docker Compose 一键启动（MySQL + API）
- [ ] 借阅记录关联用户（支持"我的借阅记录"）
