#!/usr/bin/env python3
"""Diagnose Overleaf cookie + HTML meta tags. Run: pants run scripts/diagnose_overleaf.py"""
from __future__ import annotations

import browser_cookie3 as bc
import requests
from bs4 import BeautifulSoup

HOST = "www.overleaf.com"
DOT = ".overleaf.com"

def main() -> None:
    for browser in ("chrome", "firefox", "safari", "chromium", "brave", "arc"):
        try:
            loader = getattr(bc, browser, None)
            if loader is None:
                print(f"{browser}: not available")
                continue
            jar = loader(domain_name=DOT)
            names = sorted({c.name for c in jar if DOT in (c.domain or "")})
            print(f"{browser}: {len(names)} cookies -> {names[:12]}")
        except Exception as exc:
            print(f"{browser}: ERROR {exc}")

    print("\n--- fetch with chrome ---")
    jar = bc.chrome(domain_name=DOT)
    session = requests.Session()
    session.cookies = jar
    r = session.get(f"https://{HOST}/", timeout=30)
    print("status", r.status_code, "bytes", len(r.content))
    soup = BeautifulSoup(r.content, "html.parser")
    ol_metas = [
        m.get("name")
        for m in soup.find_all("meta")
        if (m.get("name") or "").startswith("ol-")
    ]
    print("ol-* meta:", ol_metas)
    blob = soup.find("meta", {"name": "ol-prefetchedProjectsBlob"})
    print("ol-prefetchedProjectsBlob:", "FOUND" if blob else "MISSING")
    if soup.title:
        print("title:", soup.title.string)


if __name__ == "__main__":
    main()
