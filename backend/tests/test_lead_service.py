from unittest.mock import MagicMock, patch
from uuid import uuid4
from fastapi import HTTPException
import pytest


def _make_service():
    from services.lead_service import LeadService
    svc = LeadService.__new__(LeadService)
    svc.lead_repository = MagicMock()
    svc.servicio_repository = MagicMock()
    svc.proveedor_repository = MagicMock()
    svc.user_repository = MagicMock()
    svc.notificacion_email_service = MagicMock()
    return svc


def _datos(servicio_id=None, perfil_id=None, contacto="+34600111222"):
    from schemas.lead_schema import CrearLead
    return CrearLead(
        servicio_id=servicio_id, perfil_id=perfil_id,
        nombre="Ana", contacto=contacto, canal_contacto="whatsapp",
        mensaje="Necesito un profesor de matemáticas", consentimiento=True,
        utm_source="tiktok",
    )


def test_lead_de_servicio_activo_guarda_y_notifica():
    svc = _make_service()
    servicio = MagicMock()
    servicio.proveedor_id = uuid4()
    servicio.activo = True
    servicio.titulo = "Clases de matemáticas"
    svc.servicio_repository.get_by_id.return_value = servicio
    perfil = MagicMock()
    perfil.usuario_id = uuid4()
    svc.proveedor_repository.get_by_id.return_value = perfil
    usuario = MagicMock()
    usuario.email = "profe@example.com"
    svc.user_repository.get_by_id.return_value = usuario
    svc.lead_repository.crear.return_value = MagicMock(id=uuid4())

    svc.crear(_datos(servicio_id=uuid4()))

    svc.lead_repository.crear.assert_called_once()
    svc.notificacion_email_service.enviar_a_email.assert_called_once()


def test_lead_de_servicio_inactivo_devuelve_400():
    svc = _make_service()
    servicio = MagicMock()
    servicio.activo = False
    svc.servicio_repository.get_by_id.return_value = servicio

    with pytest.raises(HTTPException) as exc:
        svc.crear(_datos(servicio_id=uuid4()))

    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("600 111 222", "34600111222"),
        ("+34 600 111 222", "34600111222"),
        ("0034 600 111 222", "34600111222"),
        ("+44 7700 900123", "447700900123"),
    ],
)
def test_normalizar_whatsapp_a_formato_internacional(entrada, esperado):
    from services.lead_service import normalizar_whatsapp

    assert normalizar_whatsapp(entrada) == esperado


def test_cuerpo_whatsapp_usa_enlace_wa_me_con_prefijo_34():
    svc = _make_service()
    cuerpo = svc._cuerpo_html(_datos(servicio_id=uuid4(), contacto="600 111 222"))

    assert 'href="https://wa.me/34600111222"' in cuerpo
    assert "https://wa.me/600111222" not in cuerpo
