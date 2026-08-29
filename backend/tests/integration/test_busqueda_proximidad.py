"""
Tests de integración para la búsqueda geoespacial por proximidad (ST_DWithin).

Usa un PostgreSQL+PostGIS real levantado con docker-compose.test.yml.

Coordenadas de referencia usadas en el seed:
  · Madrid centro:     40.4168° N, -3.7038° W
  · Madrid periferia:  40.5560° N, -3.6851° W  ≈ 15.6 km del centro
  · Barcelona:         41.3851° N,  2.1734° E   ≈ 505 km del centro

Los tests se marcan con @pytest.mark.integration para poder ejecutarlos
de forma independiente:
    pytest tests/integration/ -m integration -v
"""
import pytest
from uuid import uuid4


pytestmark = pytest.mark.integration

# Coordenadas de origen para la búsqueda (Madrid centro)
MADRID_LAT = 40.4168
MADRID_LNG = -3.7038


def test_encuentra_servicio_en_radio(seed_data):
    """
    Radio 10 km desde Madrid centro → debe encontrar el servicio de Madrid centro
    y NO el de Madrid periferia (≈15.6 km) ni Barcelona.
    """
    from repositories.servicio_repository import ServicioRepository

    repo = ServicioRepository()
    resultados = repo.buscar_por_proximidad(
        lat=MADRID_LAT,
        lng=MADRID_LNG,
        radio_km=10,
    )

    ids = [str(r["id"]) for r in resultados]
    assert str(seed_data["s_madrid_centro_id"]) in ids, (
        "El servicio de Madrid centro debería estar dentro del radio de 10 km"
    )
    assert str(seed_data["s_madrid_periferia_id"]) not in ids, (
        "El servicio de periferia (≈15.6 km) no debería aparecer con radio 10 km"
    )
    assert str(seed_data["s_barcelona_id"]) not in ids, (
        "Barcelona no debería aparecer en la búsqueda desde Madrid con radio 10 km"
    )


def test_radio_mayor_incluye_periferia(seed_data):
    """
    Radio 20 km desde Madrid centro → debe incluir también Madrid periferia.
    """
    from repositories.servicio_repository import ServicioRepository

    repo = ServicioRepository()
    resultados = repo.buscar_por_proximidad(
        lat=MADRID_LAT,
        lng=MADRID_LNG,
        radio_km=20,
    )

    ids = [str(r["id"]) for r in resultados]
    assert str(seed_data["s_madrid_centro_id"]) in ids
    assert str(seed_data["s_madrid_periferia_id"]) in ids, (
        "Con radio 20 km, Madrid periferia (≈15.6 km) debería aparecer"
    )
    assert str(seed_data["s_barcelona_id"]) not in ids


def test_filtra_por_categoria(seed_data):
    """
    Misma ubicación y radio 20 km, filtrando solo por 'Fontanería' →
    no debe aparecer el servicio de 'Pintura' (que está en Barcelona de todos modos).
    Con categoría Pintura y radio amplio tampoco aparecen los de Fontanería.
    """
    from repositories.servicio_repository import ServicioRepository

    repo = ServicioRepository()

    # Solo fontanería en radio 20 km
    resultados_font = repo.buscar_por_proximidad(
        lat=MADRID_LAT,
        lng=MADRID_LNG,
        radio_km=20,
        categoria_id=seed_data["cat_fontaneria_id"],
    )
    ids = [str(r["id"]) for r in resultados_font]
    assert str(seed_data["s_madrid_centro_id"]) in ids
    assert str(seed_data["s_madrid_periferia_id"]) in ids
    # Comprobamos que ningún resultado es de categoría pintura
    for r in resultados_font:
        assert str(r.get("categoria_id", "")) != str(seed_data["cat_pintura_id"]), (
            "No debe aparecer ningún servicio de Pintura al filtrar por Fontanería"
        )


def test_ordena_por_distancia(seed_data):
    """
    Con radio 20 km desde Madrid centro, el primer resultado debe ser el más cercano
    (Madrid centro antes que Madrid periferia).
    """
    from repositories.servicio_repository import ServicioRepository

    repo = ServicioRepository()
    resultados = repo.buscar_por_proximidad(
        lat=MADRID_LAT,
        lng=MADRID_LNG,
        radio_km=20,
    )

    ids_orden = [str(r["id"]) for r in resultados]
    idx_centro = ids_orden.index(str(seed_data["s_madrid_centro_id"]))
    idx_periferia = ids_orden.index(str(seed_data["s_madrid_periferia_id"]))

    assert idx_centro < idx_periferia, (
        "Madrid centro (más cercano) debe aparecer antes que Madrid periferia"
    )
    # Comprobamos también que las distancias tienen sentido
    dist_centro = next(r["distancia_km"] for r in resultados if str(r["id"]) == str(seed_data["s_madrid_centro_id"]))
    dist_periferia = next(r["distancia_km"] for r in resultados if str(r["id"]) == str(seed_data["s_madrid_periferia_id"]))
    assert dist_centro < dist_periferia
    assert dist_centro < 1.0, f"El servicio de Madrid centro debería estar a <1 km del origen, está a {dist_centro:.2f} km"
    assert 14 < dist_periferia < 17, f"Madrid periferia debería estar ≈15.6 km, está a {dist_periferia:.2f} km"
