from overleaf_client.auth import DEFAULT_SESSION_COOKIE, parse_manual_cookies


def test_raw_token_only() -> None:
    assert parse_manual_cookies("s%3Aabc.defghij") == {
        DEFAULT_SESSION_COOKIE: "s%3Aabc.defghij"
    }


def test_raw_token_with_equals_padding() -> None:
    token = "eyJhbGciOiJIUzI1NiJ9.abc123=="
    assert parse_manual_cookies(token) == {DEFAULT_SESSION_COOKIE: token}


def test_single_named_pair_still_works() -> None:
    assert parse_manual_cookies("overleaf_session2=mytoken") == {
        "overleaf_session2": "mytoken"
    }


def test_cookie_header_with_semicolons() -> None:
    raw = "overleaf_session2=tok; GCLB=lb"
    assert parse_manual_cookies(raw) == {
        "overleaf_session2": "tok",
        "GCLB": "lb",
    }
