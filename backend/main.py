from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
import os
from dotenv import load_dotenv

from routers.auth import router as auth_router
from utils.google_oauth import configure_oauth

load_dotenv()

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-me"),
)

configure_oauth(app)
app.include_router(auth_router)

