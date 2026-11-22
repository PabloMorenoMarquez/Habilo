"""BorradoCuentaService: decide la rama, borra Storage antes que la BD y protege a los admins."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from config import Config


def _datos(perfil=True, es_admin=False, uid=None):
    from repositories.borrado_cuenta_repository import DatosCuenta
    return DatosCuenta(usuario_id=uid or uuid4(), es_admin=es_admin,
                       perfil_id=uuid4() if perfil else None,
                       servicio_ids=[uuid4()] if perfil else [])


def _svc(datos, compartido=False):
    from services.borrado_cuenta_service import BorradoCuentaService
    svc = BorradoCuentaService.__new__(BorradoCuentaService)
    svc.repo = MagicMock()
    svc.repo.datos.return_value = datos
    svc.repo.tiene_historial_compartido.return_value = compartido
    return svc


@pytest.fixture
def storage():
    with patch("services.borrado_cuenta_service.listar_archivos", new=AsyncMock(return_value=["x/1"])) as listar, \
         patch("services.borrado_cuenta_service.eliminar_archivos", new=AsyncMock()) as eliminar:
        yield SimpleNamespace(listar=listar, eliminar=eliminar)


async def test_sin_historial_borra_todo(storage):
    d = _datos()
    svc = _svc(d)

    assert await svc.borrar(d.usuario_id) == "borrada"

    svc.repo.borrar_todo.assert_called_once_with(d)
    svc.repo.anonimizar.assert_not_called()


async def test_con_historial_anonimiza_y_cancela_solicitudes(storage):
    d = _datos()
    svc = _svc(d, compartido=True)
    activas = [SimpleNamespace(id=uuid4()), SimpleNamespace(id=uuid4())]

    with patch("services.borrado_cuenta_service.SolicitudRepository") as repo_sol, \
         patch("services.borrado_cuenta_service.SolicitudService") as sol_svc:
        repo_sol.return_value.listar_activas_de_usuario.return_value = activas
        sol_svc.return_value.cancelar_por_sistema = AsyncMock()
        assert await svc.borrar(d.usuario_id) == "anonimizada"

    assert [c.args[0] for c in sol_svc.return_value.cancelar_por_sistema.call_args_list] == [a.id for a in activas]
    assert all(c.kwargs == {"motivo": "cuenta eliminada"} for c in sol_svc.return_value.cancelar_por_sistema.call_args_list)
    svc.repo.anonimizar.assert_called_once_with(d)
    svc.repo.borrar_todo.assert_not_called()


async def test_no_borra_admin(storage):
    d = _datos(es_admin=True)
    svc = _svc(d)

    with pytest.raises(HTTPException) as e:
        await svc.borrar(d.usuario_id)

    assert e.value.status_code == 400
    storage.listar.assert_not_called()
    svc.repo.borrar_todo.assert_not_called()
    svc.repo.anonimizar.assert_not_called()


async def test_admin_no_se_borra_a_si_mismo(storage):
    d = _datos()
    svc = _svc(d)

    with pytest.raises(HTTPException) as e:
        await svc.borrar(d.usuario_id, admin_id=d.usuario_id)

    assert e.value.status_code == 400
    svc.repo.borrar_todo.assert_not_called()


async def test_usuario_inexistente_404(storage):
    svc = _svc(None)

    with pytest.raises(HTTPException) as e:
        await svc.borrar(uuid4())

    assert e.value.status_code == 404


async def test_borra_las_tres_carpetas(storage):
    d = _datos()
    svc = _svc(d)

    await svc.borrar(d.usuario_id)

    listadas = {c.args for c in storage.listar.call_args_list}
    assert listadas == {
        (Config.STORAGE_BUCKET_SERVICIOS, str(d.perfil_id)),
        (Config.STORAGE_BUCKET_SERVICIOS, f"avatares/{d.usuario_id}"),
        (Config.STORAGE_BUCKET_DOCUMENTOS, str(d.usuario_id)),
    }
    assert {c.args[0] for c in storage.eliminar.call_args_list} == {
        Config.STORAGE_BUCKET_SERVICIOS, Config.STORAGE_BUCKET_DOCUMENTOS}


async def test_sin_perfil_no_lista_carpeta_de_perfil(storage):
    d = _datos(perfil=False)
    svc = _svc(d)

    await svc.borrar(d.usuario_id)

    assert {c.args for c in storage.listar.call_args_list} == {
        (Config.STORAGE_BUCKET_SERVICIOS, f"avatares/{d.usuario_id}"),
        (Config.STORAGE_BUCKET_DOCUMENTOS, str(d.usuario_id)),
    }


async def test_si_storage_falla_no_toca_la_bd(storage):
    d = _datos()
    svc = _svc(d)
    storage.eliminar.side_effect = RuntimeError("caído")

    with pytest.raises(HTTPException) as e:
        await svc.borrar(d.usuario_id)

    assert e.value.status_code == 502
    svc.repo.borrar_todo.assert_not_called()
    svc.repo.anonimizar.assert_not_called()
