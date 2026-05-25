from __future__ import annotations

import http.cookiejar as cookielib
import json
import os
from pathlib import Path

import browser_cookie3 as browsercookie

BROWSERS: tuple[str, ...] = ("chrome", "firefox", "chromium", "brave", "edge", "safari")

# Modern Overleaf session cookie (DevTools → Application → Cookies → overleaf.com)
DEFAULT_SESSION_COOKIE = "overleaf_session2"

# If paste starts with name= for one of these, treat as Cookie header fragment.
_KNOWN_COOKIE_PREFIXES = (
    "overleaf_session2=",
    "overleaf_session=",
    "sharelatex.sid=",
)


def _looks_like_cookie_header(raw: str) -> bool:
    if ";" in raw:
        return True
    lower = raw.lower()
    return any(lower.startswith(p) for p in _KNOWN_COOKIE_PREFIXES)


def parse_manual_cookies(raw: str) -> dict[str, str]:
    """
    Parse cookies pasted from browser DevTools.

    Preferred: paste the **Value** only (no ``overleaf_session2=`` prefix).
    Tokens may contain ``=`` (e.g. base64); those are still treated as raw values.

    Also accepted:
      - Full Cookie header: overleaf_session2=abc; GCLB=xyz
      - Single pair: overleaf_session2=abc
      - JSON object: {"overleaf_session2": "abc"}
    """
    raw = raw.strip().strip('"').strip("'")
    if not raw:
        raise ValueError("Cookie string is empty")

    if raw.startswith("{"):
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("JSON cookies must be an object of name → value")
        return {str(k): str(v) for k, v in data.items()}

    if not _looks_like_cookie_header(raw):
        return {DEFAULT_SESSION_COOKIE: raw}

    cookies: dict[str, str] = {}
    for part in raw.split(";"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        name, value = part.split("=", 1)
        cookies[name.strip()] = value.strip()
    if not cookies:
        raise ValueError("Could not parse any cookies from input")
    return cookies


def cookies_from_env() -> dict[str, str] | None:
    """Read manual cookies from env or cookie file."""
    raw = os.environ.get("RESUME_OVERLEAF_COOKIES", "").strip()
    if not raw:
        raw = os.environ.get("RESUME_OVERLEAF_COOKIE", "").strip()
    if not raw:
        path = os.environ.get("RESUME_OVERLEAF_COOKIE_FILE", "").strip()
        if path and Path(path).is_file():
            raw = Path(path).read_text(encoding="utf-8").strip()
    if not raw:
        return None
    return parse_manual_cookies(raw)


def login_api(
    api: object,
    *,
    host: str | None = None,
    manual: dict[str, str] | None = None,
) -> str:
    """
    Authenticate pyoverleaf Api. Returns auth mode: 'manual' or 'browser'.

    ``manual`` takes precedence over environment cookies when provided.
    """
    if manual is None:
        manual = cookies_from_env()
    if manual:
        api.login_from_cookies(manual)  # type: ignore[attr-defined]
        return "manual"

    dot_host = _dot_host(host or "www.overleaf.com")
    preferred = os.environ.get("RESUME_OVERLEAF_BROWSER", "").strip().lower()
    browsers = (preferred,) if preferred in BROWSERS else BROWSERS
    errors: list[str] = []

    for browser in browsers:
        loader = getattr(browsercookie, browser, None)
        if loader is None:
            continue
        try:
            jar = loader(domain_name=dot_host)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{browser}: {exc}")
            continue
        if _has_overleaf_session(jar, dot_host):
            api.login_from_cookies(jar)  # type: ignore[attr-defined]
            return f"browser:{browser}"

    raise RuntimeError(
        "Overleaf login failed. Paste cookies from DevTools:\n"
        "  1. Open overleaf.com (logged in) → DevTools → Network → refresh\n"
        "  2. Click any request → Headers → copy the Cookie: value\n"
        "  3. Paste the session token value in the app (or RESUME_OVERLEAF_COOKIES=token)\n"
        "  4. Restart the API server\n"
        f"Browser attempts: {'; '.join(errors[:4])}"
    )


def _dot_host(host: str) -> str:
    return f".{host.removeprefix('www.')}"


def _has_overleaf_session(jar: cookielib.CookieJar, dot_host: str) -> bool:
    names = {c.name for c in jar if c.domain.endswith(dot_host)}
    session_markers = {"overleaf_session2", "overleaf_session", "sharelatex.sid"}
    return bool(names & session_markers) or len(names) >= 2
