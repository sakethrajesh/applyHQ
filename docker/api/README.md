# docker/api

Multi-stage **Python 3.12-slim** image for the FastAPI backend.

## Build

```bash
docker build -f docker/api/Dockerfile -t resume-overleaf-api:local .
```

## Optimizations

- Builder stage installs [requirements.prod.txt](../../3rdparty/python/requirements.prod.txt) (no `uvicorn[standard]`)
- Runtime: non-root `app` user, read-only root in Compose
- Single uvicorn worker, `--log-level warning`
- `MALLOC_ARENA_MAX=2` for lower idle RSS

## Runtime

- Listens on `0.0.0.0:8765`
- `PYTHONPATH=/app/src/python`
- Env: `RESUME_OVERLEAF_*`, `PYOVERLEAF_HOST`

See [overleaf_client README](../../src/python/overleaf_client/README.md) for cookie setup.
