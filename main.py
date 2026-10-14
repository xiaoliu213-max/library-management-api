from fastapi import FastAPI
from routers import books
from routers import records
from routers import users
from routers import auth

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from exceptions import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)

import time
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

#将异常处理器注册到FAstAPI应用
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(books.router,prefix="/v1")
app.include_router(records.router,prefix="/v1")
app.include_router(users.router,prefix="/v1")
app.include_router(auth.router,prefix="/v1")

@app.get("/health",tags=["system"])
def health_check():
    return {"status": "ok"}

@app.middleware("http")
async def add_process_time(request: Request,call_next):
    start = time.perf_counter()  # ① 请求进来时：记下开始时间
    response = await call_next(request)  # ② 把请求交给下一站（最终到路由函数）
    elapsed = time.perf_counter() - start  # ③ 响应回来了：算出耗时
    response.headers["X-Process-Time"] = f"{elapsed:.4f}"
    return response  # ④ 把响应交出去

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # 开发环境
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)