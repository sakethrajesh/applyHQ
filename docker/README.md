# docker

Production-oriented Compose stack: small images, low idle RAM, API not exposed on the host.

## Quick start

```bash
cp .env.example .env
# Set RESUME_OVERLEAF_COOKIES in .env
docker compose up --build
```

Open http://localhost:8080

## Services

| Service | Dockerfile | Host port | Notes |
|---------|------------|-----------|-------|
| **api** | [api/Dockerfile](api/Dockerfile) | *(internal only)* | FastAPI + pyoverleaf |
| **web** | [web/Dockerfile](web/Dockerfile) | `${WEB_PORT:-8080}` | nginx + static UI |

## Subfolders

- [api/](api/README.md) — Python multi-stage image
- [web/](web/README.md) — Node build + nginx alpine

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Default local run, resource limits |
| `docker-compose.prod.yml` | Tighter CPU/RAM overlay |

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Auth in Docker

Browser cookie import does **not** work inside containers. Always set `RESUME_OVERLEAF_COOKIES` in `.env`.
