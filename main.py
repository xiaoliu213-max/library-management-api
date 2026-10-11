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