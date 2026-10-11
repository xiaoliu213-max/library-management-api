# ================= 阶段 1：builder（装依赖，用完就丢） =================
FROM python:3.13-slim AS builder

ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple

RUN pip install --no-cache-dir uv==0.13.0

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt


# ================= 阶段 2：runtime（最终镜像） =================
FROM python:3.13-slim AS runtime

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

RUN useradd --create-home --uid 1000 app

COPY --chown=app:app . .

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
