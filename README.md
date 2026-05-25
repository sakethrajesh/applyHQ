# Resume Overleaf Reader

Read Jake-style resume `.tex` files from an Overleaf project, parse them into sections, and copy bullets or blocks from a local web UI.

## Quick start

| Mode | Command | UI |
|------|---------|-----|
| **Docker** (recommended) | `docker compose up --build` → paste cookies in UI | http://localhost:8080 |
| **Docker prod** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` | http://localhost:8080 |
| **Local dev** | `pants run src/python/api:server` + `cd frontend && npm run dev` | http://localhost:5173 |

Overleaf auth: paste session cookies in the **web UI** (recommended). Optional: `export RESUME_OVERLEAF_COOKIES=...` or `.env` for Compose — see [src/python/overleaf_client/README.md](src/python/overleaf_client/README.md).

## Repository map

| Path | What it is |
|------|------------|
| [src/python/](src/python/README.md) | Python backend (Pants) |
| [frontend/](frontend/README.md) | React + Vite UI |
| [docker/](docker/README.md) | Production Docker images & Compose |
| [tests/](tests/README.md) | Parser tests |
| [fixtures/](fixtures/README.md) | Sample `.tex` resumes for tests |
| [3rdparty/python/](3rdparty/python/README.md) | Locked Python dependencies |

## Pants (local backend)

```bash
pants generate-lockfiles --resolve=python-default   # first time
pants test ::
pants run src/python/api:server                     # API :8765
pants run src/python/cli:bin -- projects            # CLI
```

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `RESUME_OVERLEAF_COOKIES` | API | Overleaf session (Cookie header or token) |
| `RESUME_OVERLEAF_PROJECT_ID` | API / UI | Default project id |
| `WEB_PORT` | Compose | Host port for web (default `8080`; set in shell or optional `.env`) |
| *(none required)* | UI | Paste cookies at runtime via `/api/auth/cookies` |

## Template requirement

Resumes must use the shared Jake-style macros: `\resumeSubheading`, `\resumeItem`, `\section{...}`. See [src/python/resume_parser/README.md](src/python/resume_parser/README.md).

## Notes

- **pyoverleaf** is unofficial and may break when Overleaf changes their site.
- Never commit `.env` or cookie values.
