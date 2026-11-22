from unittest.mock import MagicMock, patch
from uuid import uuid4

from schemas.proveedor_schema import ActualizarPerfilProveedor


def test_schema_distingue_campo_omitido_de_null():
    assert ActualizarPerfilProveedor(ciudad=None).model_dump(exclude_unset=True) == {
        "ciudad": None
    }
    assert ActualizarPerfilProveedor().model_dump(exclude_unset=True) == {}


def test_repositorio_permite_borrar_ciudad_y_zona():
    import repositories.proveedor_repository as modulo

    perfil = MagicMock()
    sesion = MagicMock()
    sesion.scalar.return_value = perfil
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        repo = modulo.ProveedorRepository()
        repo.actualizar(
            uuid4(),
            ciudad=None,
            zona=None,
            descripcion="Perfil actualizado",
        )

    assert perfil.ciudad is None
    assert perfil.zona is None
    assert perfil.descripcion == "Perfil actualizado"
    sesion.commit.assert_called_once()


def test_repositorio_sigue_ignorando_null_en_campos_no_borrables():
    import repositories.proveedor_repository as modulo

    perfil = MagicMock()
    perfil.descripcion = "Descripción anterior"
    sesion = MagicMock()
    sesion.scalar.return_value = perfil
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        repo = modulo.ProveedorRepository()
        repo.actualizar(uuid4(), descripcion=None)

    assert perfil.descripcion == "Descripción anterior"


def _t(inicio, fin):
    return {"inicio": inicio, "fin": fin}


def test_actualizar_acepta_horario_y_lo_normaliza():
    datos = ActualizarPerfilProveedor(horario={"1": [_t("15:00", "20:00"), _t("09:00", "13:00")]})
    assert datos.model_dump(exclude_unset=True)["horario"] == {"1": [_t("09:00", "13:00"), _t("15:00", "20:00")]}


def test_actualizar_rechaza_horario_solapado():
    from pydantic import ValidationError
    import pytest
    with pytest.raises(ValidationError):
        ActualizarPerfilProveedor(horario={"1": [_t("09:00", "13:00"), _t("12:00", "15:00")]})


def test_actualizar_horario_vacio_borra():
    assert ActualizarPerfilProveedor(horario={}).model_dump(exclude_unset=True) == {"horario": None}


def test_campos_viejos_ya_no_se_aceptan_en_salida():
    from schemas.proveedor_schema import PerfilProveedorPublicoOut, PerfilProveedorPublico
    for esquema in (PerfilProveedorPublicoOut, PerfilProveedorPublico, ActualizarPerfilProveedor):
        assert "horario" in esquema.model_fields
        assert not {"dias_disponibles", "hora_inicio", "hora_fin"} & set(esquema.model_fields)


def test_actualizar_rechaza_hora_mal_escrita_sin_avisos():
    import warnings
    from pydantic import ValidationError
    import pytest
    with pytest.raises(ValidationError):
        ActualizarPerfilProveedor(horario={"1": [_t("9:00", "13:00")]})
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        ActualizarPerfilProveedor(horario={"1": [_t("09:00", "13:00")]}).model_dump()
