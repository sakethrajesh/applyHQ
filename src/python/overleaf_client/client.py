from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterator, Union

import pyoverleaf
from pyoverleaf import ProjectFile, ProjectFolder

from overleaf_client.auth import cookies_from_env, login_api, parse_manual_cookies
from resume_parser.models import ParsedResume
from resume_parser.parser import is_resume_tex, parse_resume_tex


@dataclass
class ProjectSummary:
    id: str
    name: str


@dataclass
class TexFileRef:
    path: str
    name: str


class OverleafService:
    def __init__(self, host: str | None = None) -> None:
        self._host = host or os.environ.get("PYOVERLEAF_HOST")
        self._api: pyoverleaf.Api | None = None
        self.auth_mode: str | None = None
        self._session_cookies: dict[str, str] | None = None

    def has_session_cookies(self) -> bool:
        return self._session_cookies is not None

    def cookie_source(self) -> str | None:
        if self._session_cookies is not None:
            return "session"
        if cookies_from_env() is not None:
            return "env"
        return None

    def set_cookies(self, raw: str | None) -> str:
        """
        Store UI-pasted cookies (in memory only). Validates by logging in.
        Pass None or empty string to clear session cookies.
        """
        if raw is None or not raw.strip():
            self._session_cookies = None
            self.reset()
            return "cleared"
        self._session_cookies = parse_manual_cookies(raw)
        self.reset()
        self._api_client()
        return self.auth_mode or "manual"

    def reset(self) -> None:
        """Drop cached API client so the next request re-authenticates."""
        self._api = None
        self.auth_mode = None

    def _manual_cookies(self) -> dict[str, str] | None:
        if self._session_cookies is not None:
            return self._session_cookies
        return cookies_from_env()

    def _api_client(self) -> pyoverleaf.Api:
        if self._api is None:
            api = pyoverleaf.Api(host=self._host) if self._host else pyoverleaf.Api()
            self.auth_mode = login_api(
                api,
                host=self._host or "www.overleaf.com",
                manual=self._manual_cookies(),
            )
            self._api = api
        return self._api

    def list_projects(self) -> list[ProjectSummary]:
        api = self._api_client()
        return [
            ProjectSummary(id=p.id, name=p.name)
            for p in api.get_projects()
            if not p.archived and not p.trashed
        ]

    def list_resume_tex_files(self, project_id: str) -> list[TexFileRef]:
        api = self._api_client()
        root = api.project_get_files(project_id)
        refs: list[TexFileRef] = []
        for path, name in _walk_folder(root, ""):
            try:
                file = _find_file(root, path)
                if file is None:
                    continue
                content = api.project_download_file(project_id, file).decode("utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            if is_resume_tex(content):
                refs.append(TexFileRef(path=path, name=name))
        return sorted(refs, key=lambda r: r.path)

    def read_and_parse(self, project_id: str, file_path: str) -> ParsedResume:
        api = self._api_client()
        root = api.project_get_files(project_id)
        file = _find_file(root, file_path)
        if file is None:
            raise FileNotFoundError(file_path)
        content = api.project_download_file(project_id, file).decode("utf-8")
        return parse_resume_tex(content, source_path=file_path)


def _walk_folder(
    folder: ProjectFolder, prefix: str
) -> Iterator[tuple[str, str]]:
    for child in folder.children:
        path = f"{prefix}/{child.name}" if prefix else child.name
        if isinstance(child, ProjectFolder):
            yield from _walk_folder(child, path)
        elif isinstance(child, ProjectFile) and child.name.endswith(".tex"):
            yield path, child.name


def _find_file(root: ProjectFolder, path: str) -> ProjectFile | None:
    entity: Union[ProjectFolder, ProjectFile, None] = root
    for part in path.split("/"):
        if not isinstance(entity, ProjectFolder):
            return None
        entity = next((c for c in entity.children if c.name == part), None)
    return entity if isinstance(entity, ProjectFile) else None
