from authlib.integrations.starlette_client import OAuth

oauth = OAuth()


def configure_oauth(app):
    # Configurar el cliente OAuth de Google
    from config import Config

    oauth.register(
        name="google",
        client_id=Config.GOOGLE_CLIENT_ID,
        client_secret=Config.GOOGLE_CLIENT_SECRET,
        server_metadata_url=Config.GOOGLE_DISCOVERY_URL,
        client_kwargs={
            "scope": " ".join(Config.OAUTH_SCOPES),
        },
    )

    return oauth


def get_google_oauth_client():
    return oauth.create_client("google")