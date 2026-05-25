# cli

Small CLI for debugging Overleaf and local `.tex` parsing.

## Run

```bash
pants run src/python/cli:bin -- <command> [args]
```

## Commands

| Command | Description |
|---------|-------------|
| `projects` | List Overleaf projects (needs cookies / browser login) |
| `files <PROJECT_ID>` | List resume `.tex` files in a project |
| `parse <path.tex> [--pretty]` | Parse a local file to JSON |

## Examples

```bash
pants run src/python/cli:bin -- projects
pants run src/python/cli:bin -- files 64abc123def456
pants run src/python/cli:bin -- parse fixtures/sample_resume.tex --pretty
```

Requires the same Overleaf auth as the API — see [overleaf_client/README.md](../overleaf_client/README.md).
