"""灵书阁 3D 前端启动器（vibe-coding 专用）

不修改后端任何文件：只是 import 现有的 FastAPI 实例，
把 frontend/ 目录挂载到 "/" 兜底（/v1/* 仍然走原来的接口）。

用法:
    .venv/Scripts/python.exe vibe_server.py
然后浏览器打开 http://127.0.0.1:8080
"""
from pathlib import Path

import uvicorn
from fastapi.staticfiles import StaticFiles

from main import app  # 复用后端现有的 app，一行都不改

FRONTEND_DIR = Path(__file__).parent / "frontend"

# mount 加在所有路由之后注册，所以 /v1 的接口优先匹配，剩下的路径交给前端静态文件
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="lingshuge")


@app.middleware("http")
async def no_cache_for_frontend(request, call_next):
    """开发期禁用前端静态资源缓存：改完代码刷新即生效，避免浏览器用旧 JS"""
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".js", ".css", ".html")):
        response.headers["Cache-Control"] = "no-cache"
    return response


if __name__ == "__main__":
    # 8000 端口在这台机器上被占用，固定用 8080
    uvicorn.run(app, host="127.0.0.1", port=8080)
