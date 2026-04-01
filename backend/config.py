import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    # Auth Configurations
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

    GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
    OAUTH_SCOPES = ["openid", "email", "profile"]
    
    FRONTEND_URL = os.getenv("FRONTEND_URL")
    BACKEND_URL = os.getenv("BACKEND_URL")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITH = os.getenv("JWT_ALGORITH", "HS256")
    JWT_EXPIRATION_HOURS = os.getenv("JWT_EXPIRATION_HOURS", 24)