# overleaf_client

Thin wrapper around [pyoverleaf](https://github.com/jkulhanek/pyoverleaf) for listing projects, walking `.tex` files, and returning parsed resumes.

## Authentication

1. **Manual cookies (Docker / reliable)** — set before starting the API:

   ```bash
   # Token value only (recommended)
   export RESUME_OVERLEAF_COOKIES='YOUR_TOKEN'
   ```

   Full Cookie header (`overleaf_session2=...; ...`) still works if you prefer.

2. **Browser cookies (local dev)** — if env vars are unset, tries Chrome, Firefox, Brave, etc.

See `auth.py` for formats (Cookie header, JSON, file via `RESUME_OVERLEAF_COOKIE_FILE`).

## Usage

```python
from overleaf_client import OverleafService

svc = OverleafService()
for p in svc.list_projects():
    print(p.id, p.name)

files = svc.list_resume_tex_files(project_id)
resume = svc.read_and_parse(project_id, files[0].path)
```

`svc.reset()` clears the cached session (used by `POST /refresh`).

## Files

- `client.py` — `OverleafService`, project file walk, parse on read
- `auth.py` — cookie parsing and browser fallback
