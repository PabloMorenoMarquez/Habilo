from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select, update

from database.session import SessionLocal
from models.resena_alumno import ResenaAlumno


def normalizar_contacto(contacto: str) -> str:
    """Igual que el índice único de la base: lower(btrim(contacto))."""
    return (contacto or "").strip().lower()


class ResenaAlumnoRepository:

    def crear(self, perfil_id: UUID, datos: dict) -> ResenaAlumno:
        session = SessionLocal()
        try:
            resena = ResenaAlumno(perfil_id=perfil_id, **datos)
            session.add(resena)
            session.commit()
            session.refresh(resena)
            return resena
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def existe(self, perfil_id: UUID, contacto: str) -> bool:
        session = SessionLocal()
        try:
            stmt = select(ResenaAlumno.id).where(
                ResenaAlumno.perfil_id == perfil_id,
                func.lower(func.btrim(ResenaAlumno.contacto)) == normalizar_contacto(contacto),
            ).limit(1)
            return session.scalar(stmt) is not None
        finally:
            session.close()

    def listar_aprobadas(self, perfil_id: UUID, limit: int = 20) -> list[dict]:
        # Sin `contacto`: esta lista acaba en la ficha pública.
        session = SessionLocal()
        try:
            stmt = (
                select(
                    ResenaAlumno.puntuacion,
                    ResenaAlumno.comentario,
                    ResenaAlumno.fecha,
                    ResenaAlumno.autor_nombre,
                    ResenaAlumno.relacion,
                    ResenaAlumno.antiguedad,
                )
                .where(ResenaAlumno.perfil_id == perfil_id, ResenaAlumno.estado == "aprobada")
                .order_by(ResenaAlumno.fecha.desc())
                .limit(limit)
            )
            return [
                {
                    "puntuacion": row.puntuacion,
                    "comentario": row.comentario,
                    "fecha": row.fecha,
                    "autor_nombre": row.autor_nombre,
                    "relacion": row.relacion,
                    "antiguedad": row.antiguedad,
                }
                for row in session.execute(stmt).all()
            ]
        finally:
            session.close()

    def borrar_contactos_caducados(self, dias: int = 90) -> int:
        """Pone `contacto = NULL` en las reseñas moderadas hace más de `dias` días."""
        limite = datetime.now(timezone.utc) - timedelta(days=dias)
        session = SessionLocal()
        try:
            stmt = (
                update(ResenaAlumno)
                .where(
                    ResenaAlumno.contacto.is_not(None),
                    ResenaAlumno.estado != "pendiente",
                    ResenaAlumno.fecha_moderacion.is_not(None),
                    ResenaAlumno.fecha_moderacion < limite,
                )
                .values(contacto=None)
            )
            resultado = session.execute(stmt)
            session.commit()
            return resultado.rowcount or 0
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
