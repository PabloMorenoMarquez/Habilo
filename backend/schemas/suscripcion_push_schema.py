from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class CrearSuscripcionPush(BaseModel):
    endpoint:str
    p256dh:str
    auth:str