from typing import List, Tuple, TypeVar

T = TypeVar("T")

def paginar(resultados: List[T], limit: int) -> Tuple[List[T], bool]:
    has_more = len(resultados) > limit
    return resultados[:limit], has_more