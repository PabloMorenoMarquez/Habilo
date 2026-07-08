from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid

from database.base import base


class Categoria(base):
    __tablename__ = "categorias"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    nombre = Column(Text, nullable=False)
    icono = Column(Text)
    descripcion = Column(Text)
    