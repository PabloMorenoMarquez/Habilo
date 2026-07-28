from sqlalchemy import select, func
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from models.servicio import Servicio
from database.session import SessionLocal
from uuid import UUID
from decimal import Decimal
from geoalchemy2.shape import to_shape


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

            # latitud/longitud no son columnas reales — son propiedades calculadas
            # a partir de 'ubicacion', así que no se puede hacer setattr directo
            latitud = campos.pop("latitud", None)
            longitud = campos.pop("longitud", None)
            if latitud is not None and longitud is not None:
                servicio.ubicacion = ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)

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
                               categoria_id:UUID=None, texto:str=None, usuario_id:UUID = None):
        from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_SetSRID, ST_MakePoint
        from sqlalchemy import cast
        from geoalchemy2 import Geography
        from models.usuario import Usuario
        from models.categoria import Categoria
        from models.perfil_proveedor import Perfil_Proveedor
        session = SessionLocal()
        try:
            punto = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
            radio_m = radio_km * 1000
            stmt = (select(Servicio, 
                          Usuario.nombre.label("proveedor_nombre"),
                          Usuario.foto_url.label("proveedor_avatar"),
                          Perfil_Proveedor.valoracion_media.label("proveedor_valoracion_media"),
                          Perfil_Proveedor.num_valoraciones.label("proveedor_num_valoraciones"),
                          Categoria.nombre.label("categoria_nombre"),
                          (ST_Distance(Servicio.ubicacion, punto) / 1000).label("distancia_km"))
                    .join(Perfil_Proveedor, Servicio.proveedor_id == Perfil_Proveedor.id)
                    .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id).
                    outerjoin(Categoria, Servicio.categoria_id == Categoria.id)
                    .where(
                        Servicio.activo == True,
                        Servicio.ubicacion != None,
                        ST_DWithin(Servicio.ubicacion, punto, radio_m),
                    )   
                )
            if categoria_id:
                stmt = stmt.where(Servicio.categoria_id == categoria_id)
            if texto:
                stmt = stmt.where(Servicio.titulo.ilike(f"%{texto}%"))
            if usuario_id:
                stmt = stmt.where(Usuario.id != usuario_id)
            stmt = stmt.order_by(ST_Distance(Servicio.ubicacion, punto))
            
            rows = session.execute(stmt).all()
            
            resultado = []
            for row in rows:
                servicio = row[0]
                resultado.append({
                    "id": servicio.id,
                    "proveedor_id": servicio.proveedor_id,
                    "categoria_id": servicio.categoria_id,
                    "titulo": servicio.titulo,
                    "descripcion": servicio.descripcion,
                    "precio": servicio.precio,
                    "tipo_precio": servicio.tipo_precio,
                    "activo": servicio.activo,
                    "fecha_creacion": servicio.fecha_creacion,
                    "imagen_url": servicio.imagen_url,
                    "distancia_km": row.distancia_km,
                    "proveedor_nombre": row.proveedor_nombre,
                    "proveedor_avatar": row.proveedor_avatar,
                    "proveedor_valoracion_media": row.proveedor_valoracion_media,
                    "proveedor_num_valoraciones": row.proveedor_num_valoraciones,
                    "categoria_nombre": row.categoria_nombre
                })
                
            return resultado
        finally:
            session.close()
    
    def obtener_detalle_publico(self, servicio_id: UUID):
        from models.perfil_proveedor import Perfil_Proveedor
        from models.usuario import Usuario
        from models.categoria import Categoria

        session = SessionLocal()
        try:
            stmt = (
                select(
                    Servicio,
                    Usuario.nombre.label("proveedor_nombre"),
                    Usuario.foto_url.label("proveedor_avatar"),
                    Perfil_Proveedor.valoracion_media.label("proveedor_valoracion_media"),
                    Perfil_Proveedor.num_valoraciones.label("proveedor_num_valoraciones"),
                    Categoria.nombre.label("categoria_nombre"),
                )
                .join(Perfil_Proveedor, Servicio.proveedor_id == Perfil_Proveedor.id)
                .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                .outerjoin(Categoria, Servicio.categoria_id == Categoria.id)
                .where(Servicio.id == servicio_id)
            )
            row = session.execute(stmt).first()
            if not row:
                return None

            servicio = row[0]
            return {
                "id": servicio.id,
                "proveedor_id": servicio.proveedor_id,
                "categoria_id": servicio.categoria_id,
                "titulo": servicio.titulo,
                "descripcion": servicio.descripcion,
                "precio": servicio.precio,
                "tipo_precio": servicio.tipo_precio,
                "activo": servicio.activo,
                "fecha_creacion": servicio.fecha_creacion,
                "imagen_url": servicio.imagen_url,
                "latitud": to_shape(servicio.ubicacion).y if servicio.ubicacion is not None else None,
                "longitud": to_shape(servicio.ubicacion).x if servicio.ubicacion is not None else None,
                "distancia_km": None,
                "proveedor_nombre": row.proveedor_nombre,
                "proveedor_avatar": row.proveedor_avatar,
                "proveedor_valoracion_media": row.proveedor_valoracion_media,
                "proveedor_num_valoraciones": row.proveedor_num_valoraciones,
                "categoria_nombre": row.categoria_nombre,
            }
        finally:
            session.close()