from sqlalchemy import select, func
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from models.servicio import Servicio
from database.session import SessionLocal
from uuid import UUID
from decimal import Decimal


class ServicioRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, proveedor_id:UUID, categoria_id:UUID, titulo:str, descripcion:str,
              precio:Decimal, tipo_precio:str, latitud:float=None, longitud:float=None):
        session = SessionLocal()
        try:
            ubicacion = None
            if latitud is not None and longitud is not None:
                ubicacion = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)
            servicio = Servicio(
                proveedor_id=proveedor_id,
                categoria_id=categoria_id,
                titulo=titulo,
                descripcion=descripcion,
                precio=precio,
                tipo_precio=tipo_precio,
                ubicacion=ubicacion
            )
            session.add(servicio)
            session.commit()
            session.refresh(servicio)
            return servicio
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_id(self, servicio_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Servicio).where(Servicio.id == servicio_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def listar_por_proveedor(self, proveedor_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Servicio).where(
                Servicio.proveedor_id == proveedor_id,
                Servicio.activo == True
            )
            return list(session.scalars(stmt))
        finally:
            session.close()

    def actualizar(self, servicio_id:UUID, **campos):
        session = SessionLocal()
        try:
            stmt = select(Servicio).where(Servicio.id == servicio_id)
            servicio = session.scalar(stmt)
            if not servicio:
                return None
            for campo, valor in campos.items():
                if valor is not None:
                    setattr(servicio, campo, valor)
            session.commit()
            session.refresh(servicio)
            return servicio
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def eliminar(self, servicio_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Servicio).where(Servicio.id == servicio_id)
            servicio = session.scalar(stmt)
            if not servicio:
                return False
            servicio.activo = False
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def buscar_por_proximidad(self, lat:float, lng:float, radio_km:float,
                               categoria_id:UUID=None, texto:str=None):
        from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_SetSRID, ST_MakePoint
        from sqlalchemy import cast
        from geoalchemy2 import Geography
        session = SessionLocal()
        try:
            punto = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
            radio_m = radio_km * 1000
            stmt = select(Servicio).where(
                Servicio.activo == True,
                Servicio.ubicacion != None,
                ST_DWithin(Servicio.ubicacion, punto, radio_m)
            )
            if categoria_id:
                stmt = stmt.where(Servicio.categoria_id == categoria_id)
            if texto:
                stmt = stmt.where(Servicio.titulo.ilike(f"%{texto}%"))
            stmt = stmt.order_by(ST_Distance(Servicio.ubicacion, punto))
            return list(session.scalars(stmt))
        finally:
            session.close()