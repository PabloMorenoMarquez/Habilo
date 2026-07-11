from sqlalchemy import Column, Text, Boolean, DateTime,ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from geoalchemy2 import Geography

from database.base import base


class Servicio(base):
    __tablename__ = "servicios"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    proveedor_id = Column(UUID, ForeignKey("perfiles_proveedor.id"), nullable=False)
    categoria_id = Column(UUID, ForeignKey("categorias.id"), nullable=True)
    titulo = Column(Text, nullable=False)
    descripcion = Column(Text)
    precio = Column(Numeric(10,2), nullable=False)
    tipo_precio = Column(Text, nullable=False)
    ubicacion = Column(Geography(geometry_type='POINT', srid=4326))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, nullable=True, default=datetime.now)
    imagen_url = Column(Text, nullable=True)