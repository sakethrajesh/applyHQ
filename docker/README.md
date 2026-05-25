# docker

Production-oriented Compose stack: small images, low idle RAM, API not exposed on the host.

## Quick start

```bash
docker compose up --build
```

Open http://localhost:8080 and paste your Overleaf session cookie in the UI.

Optional: copy `.env.example` → `.env` to set `WEB_PORT` or pre-seed `RESUME_OVERLEAF_COOKIES`.

## Services

| Service | Dockerfile | Host port | Notes |
|---------|------------|-----------|-------|
| **api** | [api/Dockerfile](api/Dockerfile) | *(not on host)* | FastAPI; `expose` 8765 on internal network only |
| **web** | [web/Dockerfile](web/Dockerfile) | `${WEB_PORT:-8080}` → container `8080` | nginx + static UI; proxies `/api/` to `api:8765` |

## Subfolders

- [api/](api/README.md) — Python multi-stage image
- [web/](web/README.md) — Node build + nginx alpine

## Compose files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Default local run, resource limits |
| `docker-compose.prod.yml` | Tighter CPU/RAM overlay |
| `docker-compose.coolify.yml` | No host port bind (use with Coolify proxy) |

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Coolify

Coolify's dashboard often listens on **port 3000**. If you set `WEB_PORT=3000`, deploy fails with `port is already allocated`.

1. **Remove** `WEB_PORT=3000` from Coolify environment variables (or set `WEB_PORT=8080` only if you need a host bind).
2. Add **`docker-compose.coolify.yml`** as an additional Compose file (or `-f docker-compose.yml -f docker-compose.coolify.yml`).
3. In Coolify, set the app **container port** to **8080** (not 3000).
4. Point your domain at the `web` service; traffic still flows `browser → Coolify proxy → nginx:8080 → /api → api`.

Paste cookies in the UI after start, or optionally `export RESUME_OVERLEAF_COOKIES=...` before `up`.

## Auth in Docker

Browser cookie import does **not** work inside containers. Paste cookies in the **web UI** (recommended). Optionally set `RESUME_OVERLEAF_COOKIES` in the shell or `.env` before `up`.
