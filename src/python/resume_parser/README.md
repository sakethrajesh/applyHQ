# resume_parser

Template-specific parser for Jake-style Overleaf resumes (`\resumeSubheading`, `\resumeItem`, etc.).

## Input / output

- **In:** `.tex` file content (string or path)
- **Out:** `ParsedResume` Pydantic model — heading lines, sections, entries with bullets

## Supported structure

| LaTeX | Parsed as |
|-------|-----------|
| `\begin{center}...\end{center}` | Name, contact, meta lines |
| `\section{Experience}` + `\resumeSubheading` | `ResumeEntry` list + bullets |
| `\section{Organizations}` (same macros) | Same as Experience |
| `\section{Education}` | Same |
| `\section{Leadership...}` with `\item{...\\...}` | Plain `lines[]` |

Any section containing `\resumeSubheading` is treated as structured entries (not only Experience/Education).

## API

```python
from resume_parser import parse_resume_tex, parse_resume_file

resume = parse_resume_file("path/to/resume.tex")
print(resume.sections[0].entries[0].bullets_block)  # bullets only, no header
```

## Tests

```bash
pants test tests/python/resume_parser::
```

Fixtures: [fixtures/](../../../fixtures/README.md).

## Files

- `parser.py` — section splitting, subheading/item extraction
- `latex_utils.py` — brace-aware LaTeX parsing, plain-text cleanup
- `models.py` — `ParsedResume`, `ResumeEntry`, computed `bullets_block` / `full_block`
