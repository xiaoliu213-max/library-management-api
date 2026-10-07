#全局异常处理器
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException




def error_body(code:int,message:str,detail=None) -> dict:
    """统一错误响应体，所有handler都通过他生成相应，保证格式永远一致"""
    return {"code":code,"message":message,"detail":detail}


async def http_exception_handler(request:Request,exc:StarletteHTTPException):
    """接管所有httpexception(404,402,400...)"""
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code,str(exc.detail))
    )


async def validation_exception_handler(request:Request,exc:RequestValidationError):
    """接管 FastAPI 的参数校验失败（422）"""
    errors=[
        {"field":".".join(str(x) for x in e["loc"][1:]),"message":e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_body(422,"请求参数校验失败",errors),
    )


async def unhandled_exception_handler(request:Request,exc:Exception) -> JSONResponse:
    """兜底：任何没被接住的异常，也返回 JSON（而不是纯文本）"""
    return JSONResponse(
        status_code=500,
        content=error_body(500, "服务器内部错误，请稍后重试"),
    )