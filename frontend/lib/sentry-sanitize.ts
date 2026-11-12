import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs"

const URL_CON_PARAMETROS = /(https?:\/\/[^\s?#<>"']+)[?#][^\s<>"']*/gi
const RUTA_CON_PARAMETROS = /(^|[\s("'=:])(\/[^\s?#<>"']*)[?#][^\s<>"')]*/g
const PARAMETROS_SUELTOS = /[?&][^\s=&#]+=[^\s&#]*/g

/** Corta query y fragmento de una URL sin interpretarla. */
function sinParametros(valor: string): string {
  const corte = valor.search(/[?#]/)
  return corte === -1 ? valor : valor.slice(0, corte)
}

/** Limpia URLs con query incrustadas en textos libres (mensajes, excepciones). */
function sinParametrosEnTexto(texto: string): string {
  return texto
    .replace(URL_CON_PARAMETROS, "$1")
    .replace(RUTA_CON_PARAMETROS, "$1$2")
    .replace(PARAMETROS_SUELTOS, "")
}

/**
 * Quita la query y el fragmento de las URLs que Sentry adjunta a las migas
 * (peticiones, navegación de historial). Sin esto, una búsqueda como
 * `/home?q=...` viajaría en cada error de la sesión.
 *
 * Las migas de consola se descartan: su texto y argumentos pueden contener
 * cualquier URL con parámetros y no hay forma fiable de limpiarlas.
 */
export function sinParametrosEnBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null

  let cambiado = false
  const limpio: Breadcrumb = { ...breadcrumb }

  if (breadcrumb.data) {
    const datos = { ...breadcrumb.data }
    for (const clave of ["url", "from", "to"]) {
      const valor = datos[clave]
      if (typeof valor !== "string") continue
      const sinQuery = sinParametros(valor)
      if (sinQuery === valor) continue
      datos[clave] = sinQuery
      cambiado = true
    }
    if (cambiado) limpio.data = datos
  }

  if (typeof breadcrumb.message === "string") {
    const mensaje = sinParametrosEnTexto(breadcrumb.message)
    if (mensaje !== breadcrumb.message) {
      limpio.message = mensaje
      cambiado = true
    }
  }

  return cambiado ? limpio : breadcrumb
}

/**
 * La integración RequestData del servidor siempre envía `request.url` con la
 * query incluida, aunque `urlQueryParams` esté desactivado. `onRequestError`
 * añade además `contexts.nextjs.request_path` con la URL completa. Se limpia
 * todo antes de enviar el evento.
 */
export function sinParametrosEnEvento(evento: ErrorEvent): ErrorEvent {
  let limpio = evento
  const clonar = () => {
    limpio = { ...limpio }
  }

  if (limpio.request) {
    const peticion = limpio.request
    const url = typeof peticion.url === "string" ? sinParametros(peticion.url) : undefined
    if (url !== peticion.url || peticion.query_string !== undefined || peticion.data !== undefined) {
      clonar()
      limpio.request = {
        ...peticion,
        ...(url ? { url } : {}),
        query_string: undefined,
        data: undefined,
      }
    }
  }

  const nextjs = limpio.contexts?.nextjs
  const ruta = nextjs?.request_path
  if (typeof ruta === "string") {
    const sinQuery = sinParametros(ruta)
    if (sinQuery !== ruta) {
      clonar()
      limpio.contexts = { ...limpio.contexts, nextjs: { ...nextjs, request_path: sinQuery } }
    }
  }

  if (typeof limpio.message === "string") {
    const mensaje = sinParametrosEnTexto(limpio.message)
    if (mensaje !== limpio.message) {
      clonar()
      limpio.message = mensaje
    }
  }

  const excepciones = limpio.exception?.values
  if (excepciones?.length) {
    let cambiado = false
    const valores = excepciones.map((excepcion) => {
      if (typeof excepcion.value !== "string") return excepcion
      const valor = sinParametrosEnTexto(excepcion.value)
      if (valor === excepcion.value) return excepcion
      cambiado = true
      return { ...excepcion, value: valor }
    })
    if (cambiado) {
      clonar()
      limpio.exception = { ...limpio.exception, values: valores }
    }
  }

  return limpio
}
