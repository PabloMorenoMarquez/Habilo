def test_url_redirect_token_usa_login():
    from routers.auth import _url_redirect_token
    assert _url_redirect_token("abc123") == "http://localhost:3000/login?token=abc123"
