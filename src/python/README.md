# Python backend

Pants-managed Python 3.12 packages. Source root: `src/python/`.

## Packages

| Package | README | Role |
|---------|--------|------|
| `resume_parser` | [README](resume_parser/README.md) | `.tex` → structured JSON |
| `overleaf_client` | [README](overleaf_client/README.md) | pyoverleaf + cookie auth |
| `api` | [README](api/README.md) | FastAPI server for the UI |
| `cli` | [README](cli/README.md) | Command-line helpers |

## Common commands

```bash
# From repo root
pants test ::
pants run src/python/api:server
pants run src/python/cli:bin -- parse fixtures/sample_resume.tex --pretty
```

## Layout

```
src/python/
├── resume_parser/    # parsing library
├── overleaf_client/  # Overleaf sync
├── api/              # HTTP API
└── cli/              # CLI entrypoints
```

Dependencies: [3rdparty/python/](../../3rdparty/python/README.md).
