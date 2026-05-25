# frontend

React + TypeScript + Vite UI for browsing parsed resumes and copying sections.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

UI uses [shadcn/ui](https://ui.shadcn.com) (Tailwind v4). Add components:

```bash
npx shadcn@latest add <component>
```

## API URL

| Environment | `VITE_API_BASE` |
|-------------|-----------------|
| Local dev | `http://127.0.0.1:8765` (see `.env.development`) |
| Docker | `/api` (nginx proxies to backend) |

## Main files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Project picker, file list, resume cards |
| `src/api.ts` | HTTP client |
| `src/LoadingPanel.tsx` | Loading steps + skeletons |
| `src/CopyButton.tsx` | Clipboard helper |

## Copy actions (per job block)

- **Copy bullets** — description lines only
- **Copy all** — header + bullets

## Backend

Must have [api](../src/python/api/README.md) running (or Docker Compose).
