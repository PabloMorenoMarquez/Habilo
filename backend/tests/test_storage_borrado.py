"""Storage: listar y borrar carpetas enteras (para el borrado de cuenta)."""
from unittest.mock import MagicMock, patch

import pytest


def _cliente(bucket):
    client = MagicMock()
    client.storage.from_.return_value = bucket
    return client


async def test_lista_recursiva_entra_en_subcarpetas():
    from utils.storage import listar_archivos
    bucket = MagicMock()
    contenido = {
        "p1": [{"name": "s1", "id": None}, {"name": "foto", "id": "a"}],
        "p1/s1": [{"name": "imagen", "id": "b"}],
    }
    bucket.list.side_effect = lambda path, opciones=None: contenido.get(path, [])

    with patch("utils.storage.get_supabase", return_value=_cliente(bucket)):
        rutas = await listar_archivos("servicios", "p1")

    assert sorted(rutas) == ["p1/foto", "p1/s1/imagen"]


async def test_carpeta_inexistente_devuelve_lista_vacia():
    from utils.storage import listar_archivos
    bucket = MagicMock()
    bucket.list.return_value = []

    with patch("utils.storage.get_supabase", return_value=_cliente(bucket)):
        assert await listar_archivos("servicios", "no-existe") == []


async def test_carpeta_vacia_no_llama_a_remove():
    from utils.storage import eliminar_archivos
    bucket = MagicMock()

    with patch("utils.storage.get_supabase", return_value=_cliente(bucket)):
        await eliminar_archivos("servicios", [])

    bucket.remove.assert_not_called()


async def test_eliminar_archivos_borra_las_rutas():
    from utils.storage import eliminar_archivos
    bucket = MagicMock()

    with patch("utils.storage.get_supabase", return_value=_cliente(bucket)):
        await eliminar_archivos("servicios", ["p1/s1/imagen", "p1/foto"])

    bucket.remove.assert_called_once_with(["p1/s1/imagen", "p1/foto"])


async def test_eliminar_archivos_relanza_el_error():
    from utils.storage import eliminar_archivos
    bucket = MagicMock()
    bucket.remove.side_effect = RuntimeError("caído")

    with patch("utils.storage.get_supabase", return_value=_cliente(bucket)):
        with pytest.raises(RuntimeError):
            await eliminar_archivos("servicios", ["p1/s1/imagen"])
