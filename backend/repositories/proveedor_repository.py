from sqlalchemy import select
from models.perfil_proveedor import Perfil_Proveedor
from database.session import SessionLocal
from uuid import UUID

class ProveedorRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear_perfil(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None):
        session = SessionLocal()
        try:
            perfil = Perfil_Proveedor(
                usuario_id=usuario_id,
                descripcion=descripcion,
                radio_km_disponible=radio_km_disponible,
                experiencia_años=experiencia_años
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
            
    def actualizar(self, perfil_id: UUID, **campos):
        session = SessionLocal()
        try:
            stmt = select(Perfil_Proveedor).where(Perfil_Proveedor.id == perfil_id)
            perfil = session.scalar(stmt)
            if not perfil:
                return None
            for campo, valor in campos.items():
                if valor is not None:
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
            
    def listar_pendientes_verificacion(self):
        from models.usuario import Usuario
        session = SessionLocal()
        try:
            stmt = (select(Perfil_Proveedor, Usuario.nombre.label("usuario_nombre"), Usuario.email.label("usuario_email"))
                    .join(Usuario, Perfil_Proveedor.usuario_id == Usuario.id)
                    .where(Perfil_Proveedor.url_documento.isnot(None), Perfil_Proveedor.verificado == False))
            
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