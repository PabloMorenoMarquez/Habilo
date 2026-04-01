from sqlalchemy import Column, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from database.base import base


class Usuario(base):
    __tablename__ = "Usuarios"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    nombre = Column(Text, nullable=False)
    foto_url = Column(Text, nullable=True)
    telefono = Column(Text, nullable=True)
    telefono_verificado = Column(Boolean, nullable=True, default=False)
    fecha_registro = Column(DateTime, nullable=True, default=datetime.now)
    ciudad = Column(Text, nullable=False)
