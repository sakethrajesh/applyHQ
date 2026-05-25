python_sources(
    dependencies=[
        "src/python/overleaf_client:overleaf_client",
        "src/python/resume_parser:resume_parser",
        "3rdparty/python:reqs",
    ],
)

pex_binary(
    name="server",
    entry_point="api.main:run",
    dependencies=[":api"],
)
