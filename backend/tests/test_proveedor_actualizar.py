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
