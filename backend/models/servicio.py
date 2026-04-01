from sqlalchemy import Column, Text, Boolean, DateTime,ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from geoalchemy2 import Geography

from database.base import base


class Servicio(base):
    __tablename__ = "Servicios"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    proveedor_id = Column(UUID, ForeignKey("Perfiles_Proveedor.id"), nullable=False)
    categoria_id = Column(UUID, ForeignKey("Categoria.id"), nullable=True)
    titulo = Column(Text, nullable=False)
    descripcion = Column(Text)
    precio = Column(Numeric, nullable=False)
    tipo_precio = Column(Text, nullable=False)
    ubicacion = Column(Geography(geometry_type='POINT', srid=4326))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, nullable=True, default=datetime.now)