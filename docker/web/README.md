# docker/web

Two-stage image: **Node 22 alpine** (build) → **nginx 1.27 alpine** (serve).

## Build

```bash
docker build -f docker/web/Dockerfile --build-arg VITE_API_BASE=/api -t resume-overleaf-web:local .
```

## Build stage

- `npm ci` + `npm run build`
- `node_modules` removed after build (not in final image)

## Runtime

- [nginx.conf](nginx.conf) — `worker_processes 1`, gzip, SPA fallback
- Listens on **8080** (non-root `nginx` user)
- Proxies `/api/` → `http://api:8765/`

## Size

Final image is nginx + static `dist/` only (no Node runtime).
