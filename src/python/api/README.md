# api

FastAPI app exposing Overleaf projects and parsed resumes to the frontend. Runs on **127.0.0.1:8765** by default (no auth).

## Run

```bash
pants run src/python/api:server
# or
pants package src/python/api:server   # PEX in dist/
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `POST` | `/auth/cookies` | Store session cookies pasted in the UI (memory only) |
| `DELETE` | `/auth/cookies` | Clear UI-pasted cookies |
| `POST` | `/refresh` | Clear cached Overleaf client |
| `GET` | `/projects` | List Overleaf projects |
| `GET` | `/projects/{id}/files` | Resume `.tex` paths in project |
| `GET` | `/projects/{id}/parse?path=` | Parsed resume JSON |
| `GET` | `/config/default-project` | `RESUME_OVERLEAF_PROJECT_ID` |
| `GET` | `/config/auth` | Auth source: `env`, `session`, or unset |

## CORS

Allowed origins: localhost Vite (`5173`) and Docker web (`8080`). Override with `RESUME_CORS_ORIGINS` (comma-separated).

## Module

`main.py` — app definition and `run()` for uvicorn with reload (local only).
