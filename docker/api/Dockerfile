# syntax=docker/dockerfile:1
# Multi-stage build: smaller image, no compiler toolchain in runtime.

FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY 3rdparty/python/requirements.prod.txt .
RUN pip install --prefix=/install -r requirements.prod.txt

# --- runtime ---
FROM python:3.12-slim-bookworm AS runtime

WORKDIR /app

ENV PYTHONPATH=/app/src/python \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Fewer malloc arenas → lower idle RSS on small containers
    MALLOC_ARENA_MAX=2

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY src/python/ ./src/python/

RUN chown -R app:app /app

USER app

EXPOSE 8765

# Single worker keeps memory flat for a personal/local tool
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "1", "--log-level", "warning"]
