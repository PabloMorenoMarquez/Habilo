from sqlalchemy import select
from models.categoria import Categoria
from database.session import SessionLocal
from uuid import UUID


class CategoriaRepository:
    def __init__(self):
        self.session = SessionLocal()

    def listar(self):
        session = SessionLocal()
        try:
            stmt = select(Categoria)
            return list(session.scalars(stmt))
        finally:
            session.close()

    def get_by_id(self, categoria_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Categoria).where(Categoria.id == categoria_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def crear(self, nombre:str, icono:str=None, descripcion:str=None):
        session = SessionLocal()
        try:
            categoria = Categoria(nombre=nombre, icono=icono, descripcion=descripcion)
            session.add(categoria)
            session.commit()
            session.refresh(categoria)
            return categoria
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
