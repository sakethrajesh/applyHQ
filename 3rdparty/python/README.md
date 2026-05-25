# 3rdparty/python

Python dependency definitions for Pants and Docker.

## Files

| File | Used by |
|------|---------|
| `requirements.txt` | Pants lockfile / local dev (`uvicorn[standard]`, full tooling) |
| `requirements.prod.txt` | [Docker API image](../../docker/api/README.md) — minimal runtime deps |
| `default.lock` | Pants resolve `python-default` (generated) |
| `BUILD` | `python_requirements` target `reqs` |

## Regenerate lockfile

```bash
pants generate-lockfiles --resolve=python-default
```

## Main dependencies

- **pyoverleaf** — unofficial Overleaf access
- **fastapi** + **uvicorn** — HTTP API
- **pydantic** — JSON models
