import html

from fastapi import HTTPException

from models.lead import Lead
from repositories.lead_repository import LeadRepository
from repositories.proveedor_repository import ProveedorRepository
from repositories.servicio_repository import ServicioRepository
from repositories.user_repository import UserRepository
from schemas.lead_schema import CrearLead
from services.notificacion_email_service import NotificacionEmailService


def normalizar_whatsapp(contacto: str) -> str:
    """Devuelve el número en formato E.164 sin el signo +. Los móviles y fijos
    españoles de 9 dígitos necesitan el prefijo 34 para que wa.me funcione."""
    digitos = "".join(caracter for caracter in contacto if caracter.isdigit())
    if digitos.startswith("0034"):
        digitos = digitos[2:]
    if len(digitos) == 9 and digitos[0] in "6789":
        return "34" + digitos
    return digitos


class LeadService:

    def __init__(self):
        self.lead_repository = LeadRepository()
        self.servicio_repository = ServicioRepository()
        self.proveedor_repository = ProveedorRepository()
        self.user_repository = UserRepository()
        self.notificacion_email_service = NotificacionEmailService()

    def crear(self, datos: CrearLead, pagina_origen: str | None = None) -> Lead:
        titulo = None
        perfil = None

        if datos.servicio_id is not None:
            servicio = self.servicio_repository.get_by_id(datos.servicio_id)
            if not servicio:
                raise HTTPException(status_code=404, detail="No existe el servicio")
            if servicio.activo is False:
                raise HTTPException(status_code=400, detail="El servicio no está disponible")
            proveedor_id = servicio.proveedor_id
            titulo = servicio.titulo
        else:
            perfil = self.proveedor_repository.get_by_id(datos.perfil_id)
            if not perfil:
                raise HTTPException(status_code=404, detail="No existe el perfil")
            proveedor_id = perfil.id

        datos_lead = datos.model_dump()
        datos_lead["proveedor_id"] = proveedor_id
        datos_lead["pagina_origen"] = datos.pagina_origen or pagina_origen
        lead = self.lead_repository.crear(datos_lead)

        if perfil is None:
            perfil = self.proveedor_repository.get_by_id(proveedor_id)
        if perfil:
            usuario = self.user_repository.get_by_id(perfil.usuario_id)
            if usuario:
                asunto = f"Nuevo contacto para {titulo}" if titulo else "Nuevo contacto en Habilo"
                self.notificacion_email_service.enviar_a_email(
                    usuario.email,
                    asunto,
                    self._cuerpo_html(datos),
                )

        return lead

    def _cuerpo_html(self, datos: CrearLead) -> str:
        mensaje = html.escape(datos.mensaje).replace("\n", "<br>")
        lineas = [
            "<h2>Nuevo contacto en Habilo</h2>",
            f"<p><strong>Nombre:</strong> {html.escape(datos.nombre)}</p>",
            f"<p><strong>Contacto:</strong> {html.escape(datos.contacto)}</p>",
            f"<p><strong>Canal:</strong> {html.escape(datos.canal_contacto)}</p>",
            "<p><strong>Mensaje:</strong></p>",
            f"<p>{mensaje}</p>",
        ]

        utms = {
            "utm_source": datos.utm_source,
            "utm_medium": datos.utm_medium,
            "utm_campaign": datos.utm_campaign,
            "utm_content": datos.utm_content,
            "utm_term": datos.utm_term,
        }
        for nombre, valor in utms.items():
            if valor:
                lineas.append(f"<p><strong>{nombre}:</strong> {html.escape(valor)}</p>")

        if datos.ref:
            lineas.append(f"<p><strong>Ref:</strong> {html.escape(datos.ref)}</p>")

        if datos.canal_contacto == "whatsapp":
            enlace = f"https://wa.me/{normalizar_whatsapp(datos.contacto)}"
        else:
            enlace = f"mailto:{datos.contacto}"
        lineas.append(f'<p><a href="{html.escape(enlace)}">Responder</a></p>')

        return "\n".join(lineas)
