from sqlalchemy import select, func, case, or_
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from models.servicio import Servicio
from models.valoracion import Valoracion
from database.session import SessionLocal
from uuid import UUID
from decimal import Decimal
from geoalchemy2.shape import to_shape


class ServicioRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, proveedor_id:UUID, categoria_id:UUID, titulo:str, descripcion:str,
              precio:Decimal, tipo_precio:str, latitud:float=None, longitud:float=None,
              ciudad:str=None, zona:str=None, materias:list[str]=[], niveles:list[str]=[]):
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
                ubicacion=ubicacion,
                ciudad=ciudad,
                zona=zona,
                materias=materias,
                niveles=niveles,
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

    def listar_por_proveedor(self, proveedor_id:UUID, limit:int = 20, offset:int = 0):
        session = SessionLocal()
        try:
            stmt = select(Servicio).where(
                Servicio.proveedor_id == proveedor_id,
                Servicio.activo == True
            )
            stmt = stmt.limit(limit+1).offset(offset)
            return list(session.scalars(stmt))
        finally:
            session.close()

    def listar_por_proveedor_publico(self, proveedor_id: UUID):
        from models.categoria import Categoria
        session = SessionLocal()
        try:
            stmt = (
                select(
                    Servicio.id,
                    Servicio.titulo,
                    Servicio.descripcion,
                    Servicio.precio,
                    Servicio.tipo_precio,
                    Servicio.imagen_url,
                    Categoria.nombre.label("categoria_nombre"),
                )
                .outerjoin(Categoria, Servicio.categoria_id == Categoria.id)
                .where(
                    Servicio.proveedor_id == proveedor_id,
                    Servicio.activo.isnot(False),
                )
                .order_by(Servicio.fecha_creacion.desc())
            )
            return [
                {
                    "id": row.id,
                    "titulo": row.titulo,
                    "descripcion": row.descripcion,
                    "precio": row.precio,
                    "tipo_precio": row.tipo_precio,
                    "imagen_url": row.imagen_url,
                    "categoria_nombre": row.categoria_nombre,
                }
                for row in session.execute(stmt).all()
            ]
        finally:
            session.close()

    def listar_para_sitemap(self):
        session = SessionLocal()
        try:
            stmt = (
                select(Servicio.id, Servicio.fecha_creacion)
                .where(Servicio.activo.isnot(False))
                .order_by(Servicio.fecha_creacion.desc())
            )
            return list(session.execute(stmt).all())
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
                               categoria_id:UUID=None, texto:str=None, ciudad:str=None,
                               usuario_id:UUID = None, limit:int = 20, offset:int = 0):
        from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_SetSRID, ST_MakePoint
        from models.usuario import Usuario
        from models.categoria import Categoria
        from models.perfil_proveedor import Perfil_Proveedor
        session = SessionLocal()
        try:
            punto = None
            if lat is not None and lng is not None:
                punto = ST_SetSRID(ST_MakePoint(lng, lat), 4326)

            columnas = [
                Servicio,
                Usuario.nombre.label("proveedor_nombre"),
                Usuario.foto_url.label("proveedor_avatar"),
                Perfil_Proveedor.ciudad.label("proveedor_ciudad"),
                Perfil_Proveedor.perfil_publico.label("proveedor_perfil_publico"),
                Perfil_Proveedor.valoracion_media.label("proveedor_valoracion_media"),
                Perfil_Proveedor.num_valoraciones.label("proveedor_num_valoraciones"),
                Categoria.nombre.label("categoria_nombre"),
                Perfil_Proveedor.destacado_hasta.label("proveedor_destacado_hasta"),
            ]
            if punto is not None:
                columnas.append((ST_Distance(Servicio.ubicacion, punto) / 1000).label("distancia_km"))

            stmt = (
                select(*columnas)
                .join(Perfil_Proveedor, Servicio.proveedor_id == Perfil_Proveedor.id)
                .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                .outerjoin(Categoria, Servicio.categoria_id == Categoria.id)
                .where(Servicio.activo.isnot(False))
            )
            if punto is not None:
                radio_m = radio_km * 1000
                stmt = stmt.where(
                    Servicio.ubicacion.isnot(None),
                    ST_DWithin(Servicio.ubicacion, punto, radio_m),
                )
            if categoria_id:
                stmt = stmt.where(Servicio.categoria_id == categoria_id)
            if texto:
                stmt = stmt.where(or_(
                    Servicio.titulo.ilike(f"%{texto}%"),
                    Servicio.descripcion.ilike(f"%{texto}%"),
                ))
            if ciudad:
                ciudad_expr = func.coalesce(
                    Servicio.ciudad,
                    case((Perfil_Proveedor.perfil_publico.is_(True), Perfil_Proveedor.ciudad)),
                    case((Perfil_Proveedor.perfil_publico.is_(True), Usuario.ciudad)),
                )
                stmt = stmt.where(ciudad_expr.ilike(f"%{ciudad}%"))
            if usuario_id:
                stmt = stmt.where(Usuario.id != usuario_id)
            if punto is not None:
                stmt = stmt.order_by(ST_Distance(Servicio.ubicacion, punto))
            else:
                stmt = stmt.order_by(Servicio.fecha_creacion.desc())

            stmt = stmt.limit(limit+1).offset(offset)

            rows = session.execute(stmt).all()

            resultado = []
            for row in rows:
                servicio = row[0]
                es_publico = bool(row.proveedor_perfil_publico)
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
                    "ciudad": servicio.ciudad,
                    "zona": servicio.zona,
                    "materias": servicio.materias or [],
                    "niveles": servicio.niveles or [],
                    "distancia_km": row.distancia_km if punto is not None else None,
                    "proveedor_nombre": row.proveedor_nombre if es_publico else "Profesional de Habilo",
                    "proveedor_avatar": row.proveedor_avatar if es_publico else None,
                    "proveedor_ciudad": row.proveedor_ciudad if es_publico else None,
                    "proveedor_perfil_publico": es_publico,
                    "proveedor_valoracion_media": row.proveedor_valoracion_media,
                    "proveedor_num_valoraciones": row.proveedor_num_valoraciones,
                    "categoria_nombre": row.categoria_nombre,
                    "proveedor_destacado_hasta": row.proveedor_destacado_hasta,
                })

            return resultado
        finally:
            session.close()

    def resumen(self):
        session = SessionLocal()
        try:
            stmt = (
                select(
                    func.count(Servicio.id).label("servicios_activos"),
                    func.count(func.distinct(Servicio.proveedor_id)).label("profesores_activos"),
                )
                .select_from(Servicio)
                .where(Servicio.activo.isnot(False))
            )
            row = session.execute(stmt).one()
            resenas = session.scalar(select(func.count(Valoracion.id))) or 0
            return {
                "servicios_activos": row.servicios_activos,
                "profesores_activos": row.profesores_activos,
                "resenas": resenas,
            }
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
                    Perfil_Proveedor.ciudad.label("proveedor_ciudad"),
                    Perfil_Proveedor.perfil_publico.label("proveedor_perfil_publico"),
                    Perfil_Proveedor.valoracion_media.label("proveedor_valoracion_media"),
                    Perfil_Proveedor.num_valoraciones.label("proveedor_num_valoraciones"),
                    Categoria.nombre.label("categoria_nombre"),
                    Perfil_Proveedor.destacado_hasta.label("proveedor_destacado_hasta"),
                )
                .join(Perfil_Proveedor, Servicio.proveedor_id == Perfil_Proveedor.id)
                .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                .outerjoin(Categoria, Servicio.categoria_id == Categoria.id)
                .where(Servicio.id == servicio_id, Servicio.activo.isnot(False))
            )
            row = session.execute(stmt).first()
            if not row:
                return None

            servicio = row[0]
            es_publico = bool(row.proveedor_perfil_publico)
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
                "ciudad": servicio.ciudad,
                "zona": servicio.zona,
                "materias": servicio.materias or [],
                "niveles": servicio.niveles or [],
                "latitud": to_shape(servicio.ubicacion).y if servicio.ubicacion is not None else None,
                "longitud": to_shape(servicio.ubicacion).x if servicio.ubicacion is not None else None,
                "distancia_km": None,
                "proveedor_nombre": row.proveedor_nombre if es_publico else "Profesional de Habilo",
                "proveedor_avatar": row.proveedor_avatar if es_publico else None,
                "proveedor_ciudad": row.proveedor_ciudad if es_publico else None,
                "proveedor_perfil_publico": es_publico,
                "proveedor_valoracion_media": row.proveedor_valoracion_media,
                "proveedor_num_valoraciones": row.proveedor_num_valoraciones,
                "categoria_nombre": row.categoria_nombre,
                "proveedor_destacado_hasta": row.proveedor_destacado_hasta,
            }
        finally:
            session.close()
            
    def contar_por_proveedor(self, proveedor_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(func.count(Servicio.id)).where(Servicio.proveedor_id == proveedor_id)
            return session.scalar(stmt)
        finally:
            session.close()