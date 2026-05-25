# fixtures

Sample LaTeX resumes for manual testing and documentation.

## Files

| File | Purpose |
|------|---------|
| `sample_resume.tex` | Short sample (Experience, Education, Leadership, Skills) |

Tests may use copies under `tests/python/resume_parser/fixtures/`.

## Try locally

```bash
pants run src/python/cli:bin -- parse fixtures/sample_resume.tex --pretty
```

## Template

Must match the Jake-style macros documented in [resume_parser/README.md](../src/python/resume_parser/README.md).
