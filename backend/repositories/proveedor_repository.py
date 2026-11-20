from sqlalchemy import select
from models.perfil_proveedor import Perfil_Proveedor
from database.session import SessionLocal
from uuid import UUID
import secrets
from datetime import datetime, timezone, timedelta

class ProveedorRepository:

    def crear_perfil(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None,
                     ciudad:str=None, zona:str=None, materias:list[str]=[], niveles:list[str]=[],
                     perfil_publico:bool=False, consentimiento_marketing:bool=False):
        session = SessionLocal()
        try:
            codigo = self._generar_codigo_referido(session)
            codigo_resenas = self._generar_codigo_resenas(session)
            perfil = Perfil_Proveedor(
                usuario_id=usuario_id,
                descripcion=descripcion,
                radio_km_disponible=radio_km_disponible,
                experiencia_años=experiencia_años,
                codigo_referido=codigo,
                codigo_resenas=codigo_resenas,
                ciudad=ciudad,
                zona=zona,
                materias=materias,
                niveles=niveles,
                perfil_publico=perfil_publico,
                consentimiento_marketing=consentimiento_marketing,
            )
            session.add(perfil)
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def _generar_codigo_referido(self, session) -> str:
        # 8 caracteres alfanuméricos en mayúsculas; comprueba colisión y reintenta
        while True:
            codigo = secrets.token_urlsafe(6).replace("_", "").replace("-", "").upper()[:8]
            existe = session.scalar(select(Perfil_Proveedor).where(Perfil_Proveedor.codigo_referido == codigo))
            if not existe:
                return codigo

    def _generar_codigo_resenas(self, session) -> str:
        # Código del enlace habilo.es/opina/<código>: 8 caracteres URL-safe
        # (6 bytes aleatorios en base64); comprueba colisión y reintenta
        while True:
            codigo = secrets.token_urlsafe(6)
            existe = session.scalar(select(Perfil_Proveedor).where(Perfil_Proveedor.codigo_resenas == codigo))
            if not existe:
                return codigo

    def asignar_codigo_resenas(self, perfil_id: UUID) -> str | None:
        # Para perfiles que no tienen código de reseñas: lo genera y lo guarda.
        # Si ya tenía uno, lo devuelve sin cambiarlo (el enlace no caduca).
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            if perfil.codigo_resenas:
                return perfil.codigo_resenas
            perfil.codigo_resenas = self._generar_codigo_resenas(session)
            session.commit()
            return perfil.codigo_resenas
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def actualizar(self, perfil_id: UUID, **campos):
        # `ciudad` y `zona` se pueden borrar con un null explícito. El resto de
        # campos conserva la semántica anterior: null significa "no cambiar".
        campos_borrables = {"ciudad", "zona"}
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            for campo, valor in campos.items():
                if valor is not None or campo in campos_borrables:
                    setattr(perfil, campo, valor)
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_usuario_id(self, usuario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.usuario_id == usuario_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def get_by_id(self, perfil_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def get_publico(self, perfil_id: UUID):
        from models.usuario import Usuario
        session = SessionLocal()
        try:
            stmt = (
                select(
                    Perfil_Proveedor,
                    Usuario.nombre.label("usuario_nombre"),
                    Usuario.foto_url.label("usuario_avatar"),
                )
                .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                .where(Perfil_Proveedor.id == perfil_id)
            )
            row = session.execute(stmt).first()
            if not row:
                return None
            perfil = row[0]
            return {
                "perfil": perfil,
                "usuario_nombre": row.usuario_nombre,
                "usuario_avatar": row.usuario_avatar,
                "fecha_creacion": perfil.fecha_creacion,
            }
        finally:
            session.close()

    def listar_para_sitemap(self):
        session = SessionLocal()
        try:
            stmt = (
                select(Perfil_Proveedor.id, Perfil_Proveedor.fecha_creacion)
                .where(Perfil_Proveedor.perfil_publico.is_(True))
                .order_by(Perfil_Proveedor.fecha_creacion.desc())
            )
            return [
                {"id": row.id, "fecha_creacion": row.fecha_creacion}
                for row in session.execute(stmt).all()
            ]
        finally:
            session.close()

    def actualizar_documento(self, perfil_id:UUID, url_documento:str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.url_documento = url_documento
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar_pendientes_verificacion(self, limit: int = 20, offset: int = 0):
        from models.usuario import Usuario
        session = SessionLocal()
        try:
            stmt = (select(Perfil_Proveedor, Usuario.nombre.label("usuario_nombre"), Usuario.email.label("usuario_email"))
                    .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                    .where(Perfil_Proveedor.url_documento.isnot(None), Perfil_Proveedor.verificado == False))
            
            stmt = stmt.limit(limit+1).offset(offset)
            
            rows = session.execute(stmt).all()
            resultado = []
            for row in rows:
                perfil_proveedor = row[0]
                resultado.append({
                    "id": perfil_proveedor.id,
                    "usuario_id": perfil_proveedor.usuario_id,
                    "descripcion": perfil_proveedor.descripcion,
                    "experiencia_años": perfil_proveedor.experiencia_años,
                    "radio_km_disponible": perfil_proveedor.radio_km_disponible,
                    "valoracion_media": perfil_proveedor.valoracion_media,
                    "num_valoraciones": perfil_proveedor.num_valoraciones,
                    "verificado": perfil_proveedor.verificado,
                    "url_documento": perfil_proveedor.url_documento,
                    "fecha_creacion": perfil_proveedor.fecha_creacion,
                    "motivo_rechazo": perfil_proveedor.motivo_rechazo,
                    "usuario_nombre": row.usuario_nombre,
                    "usuario_email": row.usuario_email
                })
            return resultado
        finally:
            session.close()
        
    def verificar(self, perfil_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.verificado = True
            perfil.motivo_rechazo = None
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def rechazar(self, perfil_id: UUID, motivo: str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.verificado = False
            perfil.url_documento = None
            perfil.motivo_rechazo = motivo
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def guardar_stripe_account_id(self, perfil_id: UUID, stripe_account_id: str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.stripe_account_id = stripe_account_id
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def marcar_onboarding_por_stripe_account_id(self, stripe_account_id: str, completado: bool):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.stripe_account_id == stripe_account_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.stripe_onboarding_completado = completado
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close() 
    
    def guardar_stripe_identity_session_id(self, perfil_id: UUID, stripe_identity_session_id: str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.stripe_identity_session_id = stripe_identity_session_id
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def resolver_verificacion_identidad(self, stripe_identity_session_id: str, verificado: bool, motivo_rechazo: str = None):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.stripe_identity_session_id == stripe_identity_session_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            perfil.verificado = verificado
            perfil.motivo_rechazo = motivo_rechazo
            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_by_codigo_referido(self, codigo: str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.codigo_referido == codigo)
            return session.scalar(stmt)
        finally:
            session.close()

    def get_by_codigo_resenas(self, codigo: str):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.codigo_resenas == codigo)
            return session.scalar(stmt)
        finally:
            session.close()
    
    def aplicar_destacado(self, perfil_id: UUID, dias: int):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None

            ahora = datetime.now(timezone.utc)
            base_fecha = perfil.destacado_hasta
            if base_fecha and base_fecha.tzinfo is None:
                base_fecha = base_fecha.replace(tzinfo=timezone.utc)

            # Si ya tenía destacado vigente, suma desde ahí; si no, suma desde ahora
            punto_partida = base_fecha if base_fecha and base_fecha > ahora else ahora
            perfil.destacado_hasta = punto_partida + timedelta(days=dias)

            session.commit()
            session.refresh(perfil)
            return perfil
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()