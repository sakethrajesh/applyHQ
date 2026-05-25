from __future__ import annotations

import re
from pathlib import Path

from resume_parser.latex_utils import (
    extract_braced_args,
    find_all_commands,
    latex_to_plain,
    strip_comments,
)
from resume_parser.models import ParsedResume, ResumeEntry, ResumeSection

RESUME_MARKER = r"\resumeSubheading"


def parse_resume_tex(content: str, *, source_path: str = "") -> ParsedResume:
    text = strip_comments(content)
    doc_start = text.find(r"\begin{document}")
    if doc_start != -1:
        text = text[doc_start:]
    doc_end = text.find(r"\end{document}")
    if doc_end != -1:
        text = text[:doc_end]

    heading_name, heading_contact, heading_meta = _parse_heading(text)
    sections = _parse_sections(text)

    display = heading_name or (Path(source_path).stem if source_path else "Resume")
    return ParsedResume(
        source_path=source_path,
        display_name=display,
        heading_name=heading_name,
        heading_contact=heading_contact,
        heading_meta=heading_meta,
        sections=sections,
    )


def parse_resume_file(path: str | Path) -> ParsedResume:
    p = Path(path)
    return parse_resume_tex(p.read_text(encoding="utf-8"), source_path=str(p))


def _parse_heading(text: str) -> tuple[str, str, str]:
    match = re.search(r"\\begin\{center\}(.*?)\\end\{center\}", text, re.DOTALL)
    if not match:
        return "", "", ""
    block = match.group(1)
    lines = [latex_to_plain(part) for part in block.split(r"\\") if part.strip()]
    lines = [ln for ln in lines if ln]
    if not lines:
        return "", "", ""
    name = lines[0]
    contact = lines[1] if len(lines) > 1 else ""
    meta = lines[2] if len(lines) > 2 else ""
    return name, contact, meta


def _parse_sections(text: str) -> list[ResumeSection]:
    parts = re.split(r"\\section\{([^}]+)\}", text)
    sections: list[ResumeSection] = []
    # parts[0] is preamble/heading; then title, body, title, body, ...
    i = 1
    while i + 1 < len(parts):
        title = parts[i].strip()
        body = parts[i + 1]
        # Any section using \resumeSubheading (Experience, Organizations, Education, ...)
        if r"\resumeSubheading" in body:
            sections.append(ResumeSection(title=title, entries=_parse_subheadings(body)))
        else:
            sections.append(ResumeSection(title=title, lines=_parse_freeform_lines(body)))
        i += 2
    return sections


def _parse_subheadings(body: str) -> list[ResumeEntry]:
    entries: list[ResumeEntry] = []
    commands = find_all_commands(body, "resumeSubheading")
    for idx, (args, start, end) in enumerate(commands):
        if len(args) < 4:
            continue
        org, dates, role, location = (latex_to_plain(a) for a in args[:4])
        next_start = commands[idx + 1][1] if idx + 1 < len(commands) else len(body)
        chunk = body[end:next_start]
        bullets = _parse_resume_items(chunk)
        entries.append(
            ResumeEntry(
                organization=org,
                dates=dates,
                role=role,
                location=location,
                bullets=bullets,
            )
        )
    return entries


def _parse_resume_items(chunk: str) -> list[str]:
    bullets: list[str] = []
    for args, _, _ in find_all_commands(chunk, "resumeItem"):
        if args:
            bullets.append(latex_to_plain(args[0]))
    return bullets


def _parse_freeform_lines(body: str) -> list[str]:
    lines: list[str] = []
    for match in re.finditer(r"\\item\s*\{", body):
        parsed = extract_braced_args(body, match.start(), "item")
        if not parsed:
            continue
        args, _ = parsed
        if not args:
            continue
        raw = args[0]
        for segment in raw.split(r"\\"):
            plain = latex_to_plain(segment)
            if plain:
                lines.append(plain)
    return lines


def is_resume_tex(content: str) -> bool:
    return RESUME_MARKER in content and r"\begin{document}" in content
