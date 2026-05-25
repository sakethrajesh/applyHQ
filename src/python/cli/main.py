from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from resume_parser.parser import parse_resume_file, parse_resume_tex


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Resume .tex parser CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    parse_cmd = sub.add_parser("parse", help="Parse a local .tex resume file")
    parse_cmd.add_argument("path", type=Path)
    parse_cmd.add_argument("--pretty", action="store_true")

    sub.add_parser("projects", help="List Overleaf projects (requires browser login)")

    list_cmd = sub.add_parser("files", help="List resume .tex files in an Overleaf project")
    list_cmd.add_argument("project_id")

    args = parser.parse_args(argv)

    if args.cmd == "parse":
        result = parse_resume_file(args.path)
        print(json.dumps(result.model_dump(), indent=2 if args.pretty else None))
        return 0

    from overleaf_client.client import OverleafService

    svc = OverleafService()

    if args.cmd == "projects":
        for p in svc.list_projects():
            print(f"{p.id}\t{p.name}")
        return 0

    if args.cmd == "files":
        for f in svc.list_resume_tex_files(args.project_id):
            print(f.path)
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
