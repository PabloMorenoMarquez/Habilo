from sqlalchemy import select, and_
from models.bloqueo import Bloqueo
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException

class BloqueoRepository:
    
    def crear(self, bloqueador_id:UUID, bloqueado_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Bloqueo).where(Bloqueo.bloqueador_id == bloqueador_id, Bloqueo.bloqueado_id == bloqueado_id)
            existente = session.scalar(stmt)
            if existente:
                raise HTTPException(status_code=400, detail="Ya existe un bloqueo sobre esta persona")
            bloqueo = Bloqueo(bloqueador_id = bloqueador_id, bloqueado_id = bloqueado_id)
            session.add(bloqueo)
            session.commit()
            session.refresh(bloqueo)
            return bloqueo
        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def eliminar(self, bloqueador_id: UUID, bloqueado_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Bloqueo).where(Bloqueo.bloqueador_id == bloqueador_id, Bloqueo.bloqueado_id == bloqueado_id)
            bloqueo = session.scalar(stmt)
            if bloqueo:
                session.delete(bloqueo)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def existe_bloqueo_entre(self, usuario_a: UUID, usuario_b: UUID) -> bool:
        session = SessionLocal()
        try:
            stmt = select(Bloqueo).where(and_(Bloqueo.bloqueador_id == usuario_a, Bloqueo.bloqueado_id == usuario_b) | and_(Bloqueo.bloqueador_id == usuario_b, Bloqueo.bloqueado_id == usuario_a))
            bloqueo = session.scalar(stmt)
            if bloqueo:
                return True
            return False
        finally:
            session.close()
            
    def listar_bloqueados(self, bloqueador_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Bloqueo).where(Bloqueo.bloqueador_id == bloqueador_id)
            return list(session.scalars(stmt))
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def listar_bloqueados_enriquecido(self, bloqueador_id: UUID):
        from models.usuario import Usuario
        session = SessionLocal()
        try:
            stmt = (
                select(Bloqueo.id, Bloqueo.bloqueado_id, Bloqueo.fecha,
                    Usuario.nombre, Usuario.foto_url)
                .join(Usuario, Bloqueo.bloqueado_id == Usuario.id)
                .where(Bloqueo.bloqueador_id == bloqueador_id)
            )
            rows = session.execute(stmt).all()
            return [
                {"id": r.id, "usuario_id": r.bloqueado_id, "nombre": r.nombre, "avatar": r.foto_url, "fecha": r.fecha}
                for r in rows
            ]
        finally:
            session.close()