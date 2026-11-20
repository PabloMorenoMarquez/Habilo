import html
import logging

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from models.resena_alumno import ResenaAlumno
from repositories.proveedor_repository import ProveedorRepository
from repositories.resena_alumno_repository import ResenaAlumnoRepository, normalizar_contacto
from schemas.resena_alumno_schema import CrearResenaAlumno
from services.notificacion_email_service import NotificacionEmailService

logger = logging.getLogger(__name__)

EMAIL_SOPORTE = "soporte@habilo.es"

_RELACIONES = {"alumno": "Alumno/a", "padre_madre": "Madre/padre de alumno"}
_ANTIGUEDADES = {
    "menos_3_meses": "Menos de 3 meses",
    "3_12_meses": "De 3 a 12 meses",
    "mas_1_ano": "Más de 1 año",
}


class ResenaAlumnoService:

    def __init__(self):
        self.resena_alumno_repository = ResenaAlumnoRepository()
        self.proveedor_repository = ProveedorRepository()
        self.notificacion_email_service = NotificacionEmailService()

    def formulario(self, codigo: str) -> dict | None:
        profesor = self._profesor(codigo)
        if profesor is None:
            return None
        perfil, nombre_completo = profesor
        return {"nombre_profesor": self._nombre_publico(perfil, nombre_completo)}

    def crear(self, codigo: str, datos: CrearResenaAlumno) -> ResenaAlumno | None:
        """Guarda la reseña como pendiente. Devuelve None si ese contacto ya
        había opinado sobre el profesor: no se guarda, pero la respuesta es la
        misma que la de un envío nuevo para no delatar quién ha opinado."""
        profesor = self._profesor(codigo)
        if profesor is None:
            raise HTTPException(status_code=404, detail="No existe el enlace de opiniones")
        perfil, nombre_completo = profesor

        datos_resena = datos.model_dump(exclude={"website"})
        try:
            if self.resena_alumno_repository.existe(perfil.id, normalizar_contacto(datos.contacto)):
                return None
            resena = self.resena_alumno_repository.crear(perfil.id, datos_resena)
        except IntegrityError:
            # Dos envíos a la vez: el índice único de la base frena el segundo.
            return None
        except SQLAlchemyError as error:
            # El texto del error lleva los parámetros SQL (el contacto): solo
            # se registra el tipo y el perfil, y no se encadena la excepción
            # para que Sentry no la recorra.
            logger.error("Error de base de datos al guardar una reseña del perfil %s: %s",
                         perfil.id, type(error).__name__)
            raise HTTPException(status_code=500, detail="Error interno del servidor") from None

        self._avisar_a_soporte(resena, datos, nombre_completo)
        return resena

    def _profesor(self, codigo: str):
        """(perfil, nombre completo del profesor) o None si el código no existe."""
        perfil = self.proveedor_repository.get_by_codigo_resenas(codigo)
        if not perfil:
            return None
        datos = self.proveedor_repository.get_publico(perfil.id) or {}
        return perfil, (datos.get("usuario_nombre") or "").strip()

    @staticmethod
    def _nombre_publico(perfil, nombre_completo: str) -> str:
        # Igual que la ficha: el nombre completo solo si el perfil es público.
        if perfil.perfil_publico is True:
            return nombre_completo
        partes = nombre_completo.split()
        return partes[0] if partes else ""

    def _avisar_a_soporte(self, resena: ResenaAlumno, datos: CrearResenaAlumno, nombre_profesor: str):
        # Best-effort: si el email falla, la reseña ya está guardada.
        try:
            asunto = f"Nueva reseña para {nombre_profesor}: {datos.puntuacion}★"
            self.notificacion_email_service.enviar_a_email(
                EMAIL_SOPORTE, asunto, self._cuerpo_email(resena, datos, nombre_profesor))
        except Exception:
            # Sin datos personales en el log: solo el id de la reseña.
            logger.warning("No se pudo avisar de la reseña de alumno %s", resena.id, exc_info=True)

    @staticmethod
    def _cuerpo_email(resena: ResenaAlumno, datos: CrearResenaAlumno, nombre_profesor: str) -> str:
        e = html.escape
        sql_aprobar = (
            f"UPDATE resenas_alumnos SET estado='aprobada', fecha_moderacion=now() WHERE id='{resena.id}';")
        sql_rechazar = (
            f"UPDATE resenas_alumnos SET estado='rechazada', fecha_moderacion=now() WHERE id='{resena.id}';")
        return (
            f"<h2>Nueva reseña de alumno para {e(nombre_profesor)}</h2>"
            f"<p><strong>Puntuación:</strong> {datos.puntuacion}★</p>"
            f"<p><strong>Opinión:</strong><br>{e(datos.comentario)}</p>"
            f"<p><strong>Firma:</strong> {e(datos.autor_nombre)}<br>"
            f"<strong>Relación:</strong> {e(_RELACIONES.get(datos.relacion, datos.relacion))}<br>"
            f"<strong>Antigüedad:</strong> {e(_ANTIGUEDADES.get(datos.antiguedad, datos.antiguedad))}<br>"
            f"<strong>Contacto (privado, para verificar):</strong> {e(datos.contacto)}</p>"
            f"<p>Aprobar:</p><pre>{sql_aprobar}</pre>"
            f"<p>Rechazar:</p><pre>{sql_rechazar}</pre>"
        )
