import pytest
from pydantic import ValidationError
from uuid import uuid4

from schemas.lead_schema import CrearLead


def test_lead_exige_consentimiento():
    with pytest.raises(ValidationError):
        CrearLead(
            servicio_id=uuid4(), nombre="Ana", contacto="+34600111222",
            canal_contacto="whatsapp", mensaje="Necesito un profesor de matemáticas",
            consentimiento=False,
        )


def test_lead_exige_servicio_o_perfil():
    with pytest.raises(ValidationError):
        CrearLead(
            nombre="Ana", contacto="ana@example.com", canal_contacto="email",
            mensaje="Necesito un profesor de matemáticas", consentimiento=True,
        )


def test_lead_acepta_whatsapp_y_utm():
    lead = CrearLead(
        servicio_id=uuid4(), nombre="Ana", contacto="+34600111222",
        canal_contacto="whatsapp", mensaje="Necesito un profesor de matemáticas",
        consentimiento=True, utm_source="tiktok", utm_campaign="talavera-clases",
        ref="PROFE123",
    )
    assert lead.canal_contacto == "whatsapp"
    assert lead.utm_source == "tiktok"
    assert lead.ref == "PROFE123"


def test_modelos_tienen_columnas_nuevas():
    from models.perfil_proveedor import Perfil_Proveedor
    from models.servicio import Servicio
    from models.lead import Lead

    assert "perfil_publico" in Perfil_Proveedor.__table__.columns
    assert "consentimiento_marketing" in Perfil_Proveedor.__table__.columns
    assert "materias" in Servicio.__table__.columns
    assert "proveedor_id" in Lead.__table__.columns
    assert "ref" in Lead.__table__.columns
