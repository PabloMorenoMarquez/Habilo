"""SQL del borrado de cuenta: borrado total o anonimización a fondo, cada uno en una transacción.

Ver docs/superpowers/specs/2026-11-22-borrado-cuenta-design.md.
"""
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, exists, or_, select, update

from database.session import SessionLocal
from models.bloqueo import Bloqueo
from models.favorito_proveedor import Favorito_Proveedor
from models.favorito_servicio import Favorito_Servicio
from models.feedback import Feedback
from models.imagen_servicio import Imagen_Servicio
from models.lead import Lead
from models.mensaje import Mensaje
from models.oferta import Oferta
from models.pago import Pago
from models.perfil_proveedor import Perfil_Proveedor
from models.referido import Referido
from models.reporte import Reporte
from models.resena_alumno import ResenaAlumno
from models.servicio import Servicio
from models.solicitud import Solicitud
from models.suscripcion_push import Suscripcion_Push
from models.usuario import Usuario
from models.valoracion import Valoracion


@dataclass(frozen=True)
class DatosCuenta:
    usuario_id: UUID
    es_admin: bool
    perfil_id: UUID | None
    servicio_ids: list[UUID] = field(default_factory=list)


class HistorialCompartidoError(Exception):
    """Apareció historial compartido entre la comprobación y el borrado: hay que anonimizar."""


def _alguna(*condiciones):
    """OR de las condiciones que existen (las de perfil o anuncios se omiten si no hay)."""
    presentes = [c for c in condiciones if c is not None]
    return or_(*presentes)


class BorradoCuentaRepository:

    def datos(self, usuario_id: UUID) -> DatosCuenta | None:
        session = SessionLocal()
        try:
            usuario = session.get(Usuario, usuario_id)
            if not usuario:
                return None
            perfil_id = session.scalars(
                select(Perfil_Proveedor.id).where(Perfil_Proveedor.usuario_id == usuario_id)
            ).first()
            servicio_ids = []
            if perfil_id:
                servicio_ids = list(session.scalars(select(Servicio.id).where(Servicio.proveedor_id == perfil_id)))
            return DatosCuenta(usuario_id=usuario.id, es_admin=bool(usuario.es_admin),
                               perfil_id=perfil_id, servicio_ids=servicio_ids)
        finally:
            session.close()

    def tiene_historial_compartido(self, d: DatosCuenta) -> bool:
        session = SessionLocal()
        try:
            return self._hay_historial(session, d)
        finally:
            session.close()

    @staticmethod
    def _hay_historial(session, d: DatosCuenta) -> bool:
        u, sids = d.usuario_id, d.servicio_ids
        consultas = [
            exists().where(_alguna(Solicitud.cliente_id == u,
                                   Solicitud.servicio_id.in_(sids) if sids else None)),
            exists().where(Mensaje.remitente_id == u),
            exists().where(Oferta.autor_id == u),
            exists().where(or_(Valoracion.autor_id == u, Valoracion.destinatario_id == u)),
            exists().where(or_(Reporte.autor_id == u, Reporte.usuario_reportado_id == u)),
            exists().where(or_(Pago.cliente_id == u, Pago.proveedor_id == u)),
        ]
        return any(session.scalar(select(c)) for c in consultas)

    def _borrar_datos_ligados(self, session, d: DatosCuenta) -> None:
        """Lo que se borra en las dos ramas: favoritos, leads, reseñas, imágenes y push."""
        u, pid, sids = d.usuario_id, d.perfil_id, d.servicio_ids
        session.execute(delete(Favorito_Servicio).where(_alguna(
            Favorito_Servicio.usuario_id == u,
            Favorito_Servicio.servicio_id.in_(sids) if sids else None)))
        session.execute(delete(Favorito_Proveedor).where(_alguna(
            Favorito_Proveedor.usuario_id == u,
            Favorito_Proveedor.perfil_proveedor_id == pid if pid else None)))
        if pid:
            session.execute(delete(Lead).where(_alguna(
                Lead.perfil_id == pid, Lead.proveedor_id == pid,
                Lead.servicio_id.in_(sids) if sids else None)))
            session.execute(delete(ResenaAlumno).where(ResenaAlumno.perfil_id == pid))
        if sids:
            session.execute(delete(Imagen_Servicio).where(Imagen_Servicio.servicio_id.in_(sids)))
        session.execute(delete(Suscripcion_Push).where(Suscripcion_Push.usuario_id == u))

    def borrar_todo(self, d: DatosCuenta) -> None:
        """Borra todo en una transacción. Bloquea usuario, perfil y anuncios y vuelve a
        comprobar el historial dentro de ella: en producción `solicitudes` tiene ON DELETE
        CASCADE, así que una solicitud llegada tras la primera comprobación se borraría sin
        avisar. Si aparece historial, lanza HistorialCompartidoError sin tocar nada."""
        session = SessionLocal()
        try:
            u, pid = d.usuario_id, d.perfil_id
            session.execute(select(Usuario.id).where(Usuario.id == u).with_for_update())
            sids = []
            if pid:
                session.execute(select(Perfil_Proveedor.id).where(Perfil_Proveedor.id == pid).with_for_update())
                sids = list(session.scalars(
                    select(Servicio.id).where(Servicio.proveedor_id == pid).with_for_update()))
            d = DatosCuenta(usuario_id=u, es_admin=d.es_admin, perfil_id=pid, servicio_ids=sids)
            if self._hay_historial(session, d):
                raise HistorialCompartidoError()
            self._borrar_datos_ligados(session, d)
            if pid:
                session.execute(delete(Referido).where(or_(
                    Referido.referidor_perfil_id == pid, Referido.referido_perfil_id == pid)))
            if sids:
                session.execute(delete(Servicio).where(Servicio.id.in_(sids)))
            session.execute(delete(Bloqueo).where(or_(Bloqueo.bloqueador_id == u, Bloqueo.bloqueado_id == u)))
            session.execute(delete(Feedback).where(Feedback.usuario_id == u))
            if pid:
                session.execute(delete(Perfil_Proveedor).where(Perfil_Proveedor.id == pid))
            session.execute(delete(Usuario).where(Usuario.id == u))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def anonimizar(self, d: DatosCuenta) -> None:
        u, pid, sids = d.usuario_id, d.perfil_id, d.servicio_ids
        session = SessionLocal()
        try:
            self._borrar_datos_ligados(session, d)
            if sids:
                session.execute(update(Servicio).where(Servicio.id.in_(sids)).values(
                    activo=False, imagen_url=None, ubicacion=None, ciudad=None, zona=None))
            if pid:
                session.execute(update(Perfil_Proveedor).where(Perfil_Proveedor.id == pid).values(
                    perfil_publico=False, consentimiento_marketing=False,
                    descripcion=None, ciudad=None, zona=None, url_documento=None,
                    dias_disponibles=None, hora_inicio=None, hora_fin=None, horario=None, destacado_hasta=None,
                    materias=[], niveles=[], codigo_resenas=None,
                    # NOT NULL UNIQUE: se cambia por uno aleatorio para que el enlace viejo deje de valer.
                    codigo_referido="X" + secrets.token_hex(8).upper()))
            session.execute(update(Usuario).where(Usuario.id == u).values(
                email=f"eliminado-{u}@habilo.invalid", nombre="Usuario eliminado",
                foto_url=None, telefono=None, ciudad=None, telefono_verificado=False,
                cuenta_eliminada=True, fecha_eliminacion=datetime.now(timezone.utc)))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
