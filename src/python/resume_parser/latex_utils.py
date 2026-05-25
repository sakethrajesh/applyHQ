from __future__ import annotations

import re


def strip_comments(text: str) -> str:
    lines: list[str] = []
    for line in text.splitlines():
        if line.lstrip().startswith("%"):
            continue
        # Remove inline comments (naive: % not preceded by \)
        cleaned = re.sub(r"(?<!\\)%.*$", "", line)
        lines.append(cleaned)
    return "\n".join(lines)


def extract_braced_args(text: str, start: int, command: str) -> tuple[list[str], int] | None:
    """Parse \\command{arg1}{arg2}... starting at index of backslash."""
    prefix = f"\\{command}"
    if not text.startswith(prefix, start):
        return None
    pos = start + len(prefix)
    while pos < len(text) and text[pos] in " \t\n\r":
        pos += 1
    args: list[str] = []
    while pos < len(text):
        while pos < len(text) and text[pos] in " \t\n\r":
            pos += 1
        if pos >= len(text) or text[pos] != "{":
            break
        depth = 0
        begin = pos
        pos += 1
        while pos < len(text):
            ch = text[pos]
            if ch == "{":
                depth += 1
            elif ch == "}":
                if depth == 0:
                    args.append(text[begin + 1 : pos])
                    pos += 1
                    break
                depth -= 1
            pos += 1
        else:
            return None
    return args, pos


def find_all_commands(text: str, command: str) -> list[tuple[list[str], int, int]]:
    """Find \\command usages, excluding \\newcommand{\\command...} definitions."""
    results: list[tuple[list[str], int, int]] = []
    needle = f"\\{command}"
    pos = 0
    while True:
        idx = text.find(needle, pos)
        if idx == -1:
            break
        if idx > 0 and text[idx - 1] == "{":
            pos = idx + len(needle)
            continue
        parsed = extract_braced_args(text, idx, command)
        if parsed is None:
            pos = idx + len(needle)
            continue
        args, end = parsed
        results.append((args, idx, end))
        pos = end
    return results


def latex_to_plain(text: str) -> str:
    s = text.strip()
    s = s.replace(r"\$", "$")
    s = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\href\{([^}]*)\}\{[^}]*\}", r"\1", s)
    s = re.sub(r"\\underline\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\textbf\{([^}]*)\}\s*\{:\s*([^}]*)\}", r"\1: \2", s)
    s = re.sub(r"\\textbf\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\textit\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\textbullet\b", "•", s)
    s = re.sub(r"\\scshape\b", "", s)
    s = re.sub(r"\\Huge\b", "", s)
    s = re.sub(r"\\small\b", "", s)
    s = re.sub(r"\\vspace\{[^}]*\}", "", s)
    s = re.sub(r"\\\$", "$", s)
    s = s.replace(r"\sim", "~")
    s = s.replace(r"\%", "%")
    s = s.replace(r"\&", "&")
    s = s.replace(r"\\", "\n")
    s = s.replace("--", "–")
    s = re.sub(r"\$([^$]+)\$", r"\1", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()
