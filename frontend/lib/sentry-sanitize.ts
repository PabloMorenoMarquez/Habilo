import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs"

/** Corta query y fragmento de una URL sin interpretarla. */
function sinParametros(valor: string): string {
  const corte = valor.search(/[?#]/)
  return corte === -1 ? valor : valor.slice(0, corte)
}

/**
 * Quita la query y el fragmento de las URLs que Sentry adjunta a las migas
 * (peticiones, navegación de historial). Sin esto, una búsqueda como
 * `/home?q=...` viajaría en cada error de la sesión.
 */
export function sinParametrosEnBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (!breadcrumb.data) return breadcrumb

  let cambiado = false
  const datos = { ...breadcrumb.data }
  for (const clave of ["url", "from", "to"]) {
    const valor = datos[clave]
    if (typeof valor !== "string") continue
    const limpio = sinParametros(valor)
    if (limpio === valor) continue
    datos[clave] = limpio
    cambiado = true
  }

  return cambiado ? { ...breadcrumb, data: datos } : breadcrumb
}

/**
 * La integración RequestData del servidor siempre envía `request.url` con la
 * query incluida, aunque `urlQueryParams` esté desactivado. Se limpia antes de
 * enviar el evento.
 */
export function sinParametrosEnEvento(evento: ErrorEvent): ErrorEvent {
  const peticion = evento.request
  if (!peticion) return evento

  const url = typeof peticion.url === "string" ? sinParametros(peticion.url) : undefined
  if (url === peticion.url && peticion.query_string === undefined) return evento

  return {
    ...evento,
    request: {
      ...peticion,
      ...(url ? { url } : {}),
      query_string: undefined,
    },
  }
}

