from authlib.integrations.starlette_client import OAuth

oauth = OAuth()


def facebook_configure_oauth(app):
    # Configurar el cliente OAuth de Google
    from config import Config

    oauth.register(
        name="facebook",
        client_id=Config.FACEBOOK_APP_ID,
        client_secret=Config.FACEBOOK_APP_SECRET,
        authorize_url = "https://www.facebook.com/dialog/oauth",
        access_token_url = "https://graph.facebook.com/oauth/access_token",
        client_kwargs={
            "scope": " ".join(Config.OAUTH_FACEBOOK_SCOPES),
        },
    )

    return oauth


def get_facebook_oauth_client():
    return oauth.create_client("facebook")