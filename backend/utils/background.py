from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="notificaciones")


def ejecutar_en_segundo_plano(func, *args, **kwargs):
    return _executor.submit(func, *args, **kwargs)