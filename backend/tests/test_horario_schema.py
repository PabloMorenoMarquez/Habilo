"""Validación del horario por días: formato, orden, solapes y límites."""
import pytest
from pydantic import TypeAdapter, ValidationError


def _norm(h):
    from schemas.horario_schema import HorarioEntrada, normalizar_horario
    return normalizar_horario(TypeAdapter(HorarioEntrada).validate_python(h) if h is not None else None)


def t(inicio, fin):
    return {"inicio": inicio, "fin": fin}


def test_horario_valido_se_ordena():
    assert _norm({"2": [t("15:00", "20:00"), t("09:00", "13:00")]}) == {
        "2": [t("09:00", "13:00"), t("15:00", "20:00")]
    }


def test_horario_vacio_es_none():
    assert _norm({}) is None
    assert _norm(None) is None


def test_tramo_al_reves_es_invalido():
    with pytest.raises(ValueError, match="La hora de fin debe ser posterior a la de inicio"):
        _norm({"1": [t("14:00", "10:00")]})


def test_tramo_de_duracion_cero_es_invalido():
    with pytest.raises(ValueError, match="La hora de fin debe ser posterior a la de inicio"):
        _norm({"1": [t("10:00", "10:00")]})


def test_tramos_solapados_son_invalidos():
    with pytest.raises(ValueError, match="Los tramos se solapan"):
        _norm({"1": [t("09:00", "13:00"), t("12:00", "15:00")]})


def test_tramos_contiguos_son_validos():
    assert _norm({"1": [t("13:00", "15:00"), t("09:00", "13:00")]}) == {
        "1": [t("09:00", "13:00"), t("13:00", "15:00")]
    }


def test_cuatro_tramos_es_invalido():
    with pytest.raises(ValueError, match="Como mucho 3 tramos por día"):
        _norm({"1": [t("08:00", "09:00"), t("10:00", "11:00"), t("12:00", "13:00"), t("14:00", "15:00")]})


def test_dia_sin_tramos_es_invalido():
    with pytest.raises(ValueError, match="Un día disponible necesita al menos un tramo"):
        _norm({"1": []})


@pytest.mark.parametrize("hora", ["25:00", "9:00", "12:60", "", "12-00"])
def test_hora_mal_formada_es_invalida(hora):
    from schemas.horario_schema import HorarioEntrada
    with pytest.raises(ValidationError):
        TypeAdapter(HorarioEntrada).validate_python({"1": [t(hora, "23:00")]})


def test_dia_fuera_de_rango_es_invalido():
    from schemas.horario_schema import HorarioEntrada
    with pytest.raises(ValidationError):
        TypeAdapter(HorarioEntrada).validate_python({"8": [t("09:00", "10:00")]})
