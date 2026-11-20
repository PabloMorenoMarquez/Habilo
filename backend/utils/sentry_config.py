"""Opciones de Sentry sin datos personales.

Los formularios públicos (reseñas de alumnos, leads) mandan emails y
teléfonos en el cuerpo de la petición. Con las opciones por defecto, Sentry
adjunta ese cuerpo a los errores y a las transacciones muestreadas, y guarda
las variables locales de cada frame. Aquí se apaga todo eso.
"""
import os


def _quitar_variables(contenedor: dict | None) -> None:
    for valor in (contenedor or {}).get("values") or []:
        for frame in ((valor.get("stacktrace") or {}).get("frames")) or []:
            frame.pop("vars", None)


def limpiar_evento(event: dict, hint: dict | None = None) -> dict:
    """Quita el cuerpo de la petición y las variables locales de un evento."""
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
    _quitar_variables(event.get("exception"))
    _quitar_variables(event.get("threads"))
    return event


def opciones_sentry() -> dict:
    return {
        "dsn": os.getenv("SENTRY_DSN"),
        "environment": os.getenv("ENVIRONMENT", "production"),
        "traces_sample_rate": 0.2,
        "send_default_pii": False,
        # Ni el cuerpo de las peticiones ni las variables locales de los frames.
        "max_request_body_size": "never",
        "include_local_variables": False,
        # Por si alguna integración los añade igualmente.
        "before_send": limpiar_evento,
        "before_send_transaction": limpiar_evento,
    }
