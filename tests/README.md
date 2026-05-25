# tests

Python tests run via Pants.

## Run

```bash
pants test ::                              # all tests
pants test tests/python/resume_parser::   # parser only
```

## Layout

```
tests/python/
└── resume_parser/
    ├── parser_test.py
    └── fixtures/          # copies used in sandbox
```

Parser tests depend on [fixtures/](../fixtures/README.md) and `src/python/resume_parser`.

## Adding tests

1. Add `.tex` under `tests/python/resume_parser/fixtures/` or [fixtures/](../fixtures/)
2. Register file assets in `tests/python/resume_parser/BUILD` if needed
3. Extend `parser_test.py`
