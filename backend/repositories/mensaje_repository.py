from sqlalchemy import select
from models.mensaje import Mensaje
from database.session import SessionLocal
from uuid import UUID


class MensajeRepository:
    def __init__(self):
        pass

    def crear(self, solicitud_id:UUID, remitente_id:UUID, contenido:str):
        session = SessionLocal()
        try:
            mensaje = Mensaje(
                solicitud_id=solicitud_id,
                remitente_id=remitente_id,
                contenido=contenido
            )
            session.add(mensaje)
            session.commit()
            session.refresh(mensaje)
            return mensaje
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def listar_por_solicitud(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Mensaje).where(
                Mensaje.solicitud_id == solicitud_id
            ).order_by(Mensaje.fecha)
            return list(session.scalars(stmt))
        finally:
            session.close()
            
    def resumen_por_solicitudes(self, solicitud_ids: list, usuario_id: UUID):
        session = SessionLocal()
        try:
            stmt = (
                select(Mensaje)
                .where(Mensaje.solicitud_id.in_(solicitud_ids))
                .order_by(Mensaje.fecha)
            )
            mensajes = session.scalars(stmt).all()

            resumen = {}
            for m in mensajes:
                entry = resumen.setdefault(str(m.solicitud_id), {"ultimo_mensaje": None, "ultimo_mensaje_fecha": None, "no_leidos": 0})
                entry["ultimo_mensaje"] = m.contenido
                entry["ultimo_mensaje_fecha"] = m.fecha
                if str(m.remitente_id) != str(usuario_id) and not m.leido:
                    entry["no_leidos"] += 1
            return resumen
        finally:
            session.close()

    def marcar_leidos(self, solicitud_id: UUID, usuario_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Mensaje).where(
                Mensaje.solicitud_id == solicitud_id,
                Mensaje.remitente_id != usuario_id,
                Mensaje.leido == False,
            )
            mensajes = session.scalars(stmt).all()
            for m in mensajes:
                m.leido = True
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
