from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import asyncio

scheduler = BackgroundScheduler()


def _run_async(coro_func, *args, **kwargs):
    asyncio.run(coro_func(*args, **kwargs))


def iniciar_jobs():
    from services.solicitud_service import SolicitudService
    from services.pago_service import PagoService

    scheduler.add_job(
        lambda: _run_async(SolicitudService().autocancelar_negociaciones_inactivas),
        "interval",
        hours=1,
        next_run_time=datetime.now(),
        id="autocancelar_negociaciones",
    )
    scheduler.add_job(
        lambda: _run_async(PagoService().auto_liberar_pagos_sin_confirmar),
        "interval",
        hours=1,
        next_run_time=datetime.now(),
        id="auto_liberar_pagos",
    )
    scheduler.start()
    return scheduler