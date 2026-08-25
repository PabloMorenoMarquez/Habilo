from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import datetime

class CrearSuscripcionPush(BaseModel):
    endpoint:str = Field(max_length=500)
    p256dh:str = Field(max_length=20)
    auth:str = Field(max_length=20)