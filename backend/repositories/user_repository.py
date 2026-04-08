from sqlalchemy import select, func
from models.usuario import Usuario
from database.session import SessionLocal

class UserRepository:
    def __init__(self):
        self.session = SessionLocal()

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
    