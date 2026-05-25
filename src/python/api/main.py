from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from overleaf_client.client import OverleafService, ProjectSummary, TexFileRef
from resume_parser.models import ParsedResume

app = FastAPI(title="Resume Overleaf Reader", version="0.1.0")

_cors_origins = os.environ.get(
    "RESUME_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProjectOut(BaseModel):
    id: str
    name: str


class TexFileOut(BaseModel):
    path: str
    name: str


class CookiesIn(BaseModel):
    cookies: str


_service = OverleafService()


def service() -> OverleafService:
    return _service


@app.post("/auth/cookies")
def set_auth_cookies(body: CookiesIn) -> dict[str, str]:
    """Accept Overleaf session cookies pasted in the UI (stored in API memory only)."""
    try:
        mode = service().set_cookies(body.cookies)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return {"status": "ok", "auth_mode": mode}


@app.delete("/auth/cookies")
def clear_auth_cookies() -> dict[str, str]:
    """Clear UI-pasted cookies; env / browser auth may still apply on next request."""
    service().set_cookies(None)
    return {"status": "ok"}


@app.post("/refresh")
def refresh_overleaf() -> dict[str, str]:
    """Clear cached Overleaf session; next request re-fetches from Overleaf."""
    _service.reset()
    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/projects", response_model=list[ProjectOut])
def list_projects() -> list[ProjectOut]:
    try:
        projects = service().list_projects()
    except Exception as exc:  # noqa: BLE001 — surface auth errors to UI
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return [ProjectOut(id=p.id, name=p.name) for p in projects]


@app.get("/projects/{project_id}/files", response_model=list[TexFileOut])
def list_resume_files(project_id: str) -> list[TexFileOut]:
    try:
        files = service().list_resume_tex_files(project_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return [TexFileOut(path=f.path, name=f.name) for f in files]


@app.get("/projects/{project_id}/parse", response_model=ParsedResume)
def parse_file(project_id: str, path: str) -> ParsedResume:
    try:
        return service().read_and_parse(project_id, path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/config/default-project")
def default_project() -> dict[str, str | None]:
    return {"project_id": os.environ.get("RESUME_OVERLEAF_PROJECT_ID")}


@app.get("/config/auth")
def auth_config() -> dict[str, str | bool | None]:
    from overleaf_client.auth import cookies_from_env

    source = service().cookie_source()
    has_env = cookies_from_env() is not None
    configured = source is not None
    return {
        "configured": configured,
        "source": source,
        "env_configured": has_env,
        "session_configured": service().has_session_cookies(),
        "manual_cookies_configured": configured,
        "hint": (
            "Paste your Overleaf session cookie in the app, or set RESUME_OVERLEAF_COOKIES"
            if not configured
            else (
                "Using cookies pasted in this app session"
                if source == "session"
                else "Using RESUME_OVERLEAF_COOKIES from the server environment"
            )
        ),
    }


def run() -> None:
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=int(os.environ.get("RESUME_API_PORT", "8765")),
        reload=True,
    )


if __name__ == "__main__":
    run()
