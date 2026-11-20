"""Reseñas de alumnos por enlace: código por profesor, formulario y publicación."""
from unittest.mock import MagicMock, patch
from uuid import uuid4


# ── Código de reseñas al crear el perfil ─────────────────────────────────────

def test_crear_perfil_asigna_codigo_resenas():
    import repositories.proveedor_repository as modulo
    sesion = MagicMock()
    sesion.scalar.return_value = None  # ningún código choca con uno existente
    with patch.object(modulo, "SessionLocal", return_value=sesion):
        modulo.ProveedorRepository().crear_perfil(
            usuario_id=uuid4(), descripcion="Clases de matemáticas", radio_km_disponible=10)

    perfil = sesion.add.call_args.args[0]
    assert isinstance(perfil, modulo.Perfil_Proveedor)
    assert isinstance(perfil.codigo_resenas, str)
    assert len(perfil.codigo_resenas) == 8
