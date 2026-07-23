from sqlalchemy import select
from models.usuario import Usuario
from database.session import SessionLocal
from uuid import UUID

class UserRepository:

    def create_or_update(self, email:str, nombre:str, foto_url:str):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.email == email)
            user = session.scalar(stmt)

            if not user:
                user = Usuario(email=email, nombre=nombre, foto_url=foto_url)
                session.add(user)
            else:
                user.nombre = nombre
                user.foto_url = foto_url

            session.commit()
            session.refresh(user)
            return user
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_id(self, usuario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.id == usuario_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def actualizar(self, usuario_id:UUID, **campos):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.id == usuario_id)
            usuario = session.scalar(stmt)
            if not usuario:
                return None
            for campo, valor in campos.items():
                if valor is not None:
                    setattr(usuario, campo, valor)
            session.commit()
            session.refresh(usuario)
            return usuario
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def buscar_por_email(self, email:str):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.email.ilike(f"%{email}%"))
            return session.scalars(stmt).all()
        finally:
            session.close()
            
    def listar_baneados(self):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.baneado == True)
            return session.scalars(stmt).all()
        finally:
            session.close()
    
    def banear(self, usuario_id:UUID, motivo:str):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.id == usuario_id)
            usuario = session.scalar(stmt)
            if not usuario:
                return None
            usuario.baneado = True
            usuario.motivo_baneo = motivo
            session.commit()
            session.refresh(usuario)
            return usuario
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def desbanear(self, usuario_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Usuario).where(Usuario.id == usuario_id)
            usuario = session.scalar(stmt)
            if not usuario:
                return None
            usuario.baneado = False
            usuario.motivo_baneo = None
            session.commit()
            session.refresh(usuario)
            return usuario
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
