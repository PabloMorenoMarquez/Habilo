import type { Horario } from "./horario"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const TOKEN_KEY = "token"

/** Guarda el token JWT en el navegador. */
export function setToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

/** Lee el token JWT guardado, o null si no hay sesión. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

/** Borra el token (logout). */
export function clearToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type ErrorValidacion = { loc?: unknown[]; msg?: unknown; type?: unknown }

// Un error de validación de FastAPI/Pydantic ({loc, msg, type}) en una frase en español.
function fraseDeValidacion(e: ErrorValidacion): string | null {
  const msg = typeof e?.msg === "string" ? e.msg : ""
  // Los ValueError de nuestros validadores ya traen el texto en español.
  if (msg.startsWith("Value error, ")) return msg.slice("Value error, ".length)
  const loc = Array.isArray(e?.loc) ? e.loc.filter((p) => p !== "body" && typeof p === "string") : []
  const campo = loc.at(-1) as string | undefined
  if (!campo) return null
  return e.type === "missing" ? `Falta el campo «${campo}»` : `El campo «${campo}» no es válido`
}

/** Convierte el cuerpo de un error de la API en un mensaje legible (nunca «[object Object]»). */
export function mensajeDeError(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail
  if (typeof detail === "string" && detail) return detail
  if (Array.isArray(detail)) {
    const frases = detail.map((e) => (typeof e === "string" ? e : fraseDeValidacion(e as ErrorValidacion))).filter((f): f is string => !!f)
    const unicas = [...new Set(frases)]
    return unicas.length ? unicas.join(". ") : "Revisa los datos del formulario"
  }
  return `Error ${status}`
}


export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<T> {
  const token = getToken()
  const isFormData = options.body instanceof FormData

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo de nuevo.", 408)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  const contentType = response.headers.get("content-type")
  const hasJson = contentType?.includes("application/json")
  const data = hasJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(mensajeDeError(data, response.status), response.status)
  }

  return data as T
}

// --- Funciones específicas por recurso ---

export function getMe() {
  return apiFetch("/usuarios/me")
}

export function actualizarMe(datos: { ciudad?: string; telefono?: string; nombre?: string; foto_url?: string }) {
  return apiFetch("/usuarios/me", {
    method: "PATCH",
    body: JSON.stringify(datos),
  })
}

export function getMiPerfilProveedor() {
  return apiFetch<MiPerfilProveedor>("/proveedor/me")
}

export function iniciarVerificacionIdentidad() {
  return apiFetch("/proveedor/verificacion-identidad", {
    method: "POST",
  })
}

export function getSignedUrlDocumento() {
  return apiFetch<{ signed_url: string; path: string; token: string }>(
    "/proveedor/documento/signed-url",
    { method: "POST" }
  )
}

export function confirmarDocumento(path: string) {
  return apiFetch<{ path: string }>("/proveedor/documento/confirmar", {
    method: "PATCH",
    body: JSON.stringify({ path }),
  })
}

export function getMiDocumentoUrl() {
  return apiFetch<{ url: string }>("/proveedor/documento")
}

export function crearPerfilProveedor(datos: {
  descripcion: string
  radio_km_disponible: number
  experiencia_años?: number
  codigo_referido?: string
  ciudad?: string
  materias?: string[]
  niveles?: string[]
  perfil_publico?: boolean
}) {
  return apiFetch("/proveedor/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

export interface ServicioBackend {
  id: string
  proveedor_id: string
  categoria_id: string | null
  titulo: string
  descripcion: string | null
  precio: string
  tipo_precio: string
  activo: boolean
  fecha_creacion: string
  imagen_url: string | null
  latitud: number | null
  longitud: number | null
  distancia_km: number | null
  proveedor_nombre: string | null
  proveedor_avatar: string | null
  proveedor_ciudad?: string | null
  proveedor_perfil_publico?: boolean
  proveedor_valoracion_media: number | null
  proveedor_num_valoraciones: number | null
  categoria_nombre: string | null
  es_favorito: boolean
  proveedor_destacado_hasta: string | null
}

let busquedaServiciosCache: { key: string; data: ServicioBackend[]; timestamp: number } | null = null
const BUSQUEDA_TTL_MS = 30 * 1000

function claveBusqueda(params: {
  lat?: number
  lng?: number
  radio_km?: number
  categoria_id?: string
  texto?: string
  ciudad?: string
}) {
  // Redondeamos lat/lng a 4 decimales (~11m de precisión) para que
  // micro-variaciones del GPS no invaliden el caché sin necesidad.
  return JSON.stringify({
    lat: params.lat?.toFixed(4) ?? null,
    lng: params.lng?.toFixed(4) ?? null,
    radio_km: params.radio_km ?? null,
    categoria_id: params.categoria_id || null,
    texto: params.texto || null,
    ciudad: params.ciudad || null,
  })
}

// Por si en algún punto quieres forzar un dato fresco (ej. tras marcar
// un favorito) sin esperar a que expire el TTL.
export function invalidarCacheBusquedaServicios() {
  busquedaServiciosCache = null
}

export async function buscarServicios(params: {
  lat?: number
  lng?: number
  radio_km?: number
  ciudad?: string
  categoria_id?: string
  texto?: string
  limit?: number
  offset?: number
}): Promise<Paginado<ServicioBackend>> {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0

  // El caché de 30s solo tiene sentido para la primera página (offset 0);
  // páginas siguientes son "cargar más" y no deben servirse desde caché.
  const key = claveBusqueda(params)
  const ahora = Date.now()
  if (
    offset === 0 &&
    busquedaServiciosCache &&
    busquedaServiciosCache.key === key &&
    ahora - busquedaServiciosCache.timestamp < BUSQUEDA_TTL_MS
  ) {
    return busquedaServiciosCache.data as unknown as Paginado<ServicioBackend>
  }

  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (params.lat != null && params.lng != null) {
    query.set("lat", String(params.lat))
    query.set("lng", String(params.lng))
    if (params.radio_km != null) query.set("radio_km", String(params.radio_km))
  }
  if (params.ciudad) query.set("ciudad", params.ciudad)
  if (params.categoria_id) query.set("categoria_id", params.categoria_id)
  if (params.texto) query.set("texto", params.texto)

  const data = await apiFetch<Paginado<ServicioBackend>>(`/servicio/?${query.toString()}`)
  if (offset === 0) {
    busquedaServiciosCache = { key, data: data as any, timestamp: ahora }
  }
  return data
}

export interface Categoria {
  id: string
  nombre: string
  icono: string
  descripcion: string
}

let categoriasCache: { data: Categoria[]; timestamp: number } | null = null
const CATEGORIAS_TTL_MS = 5 * 60 * 1000 // 5 minutos

export async function getCategorias(): Promise<Categoria[]> {
  const ahora = Date.now()
  if (categoriasCache && ahora - categoriasCache.timestamp < CATEGORIAS_TTL_MS) {
    return categoriasCache.data
  }
  const data = await apiFetch<Categoria[]>("/categorias/")
  categoriasCache = { data, timestamp: ahora }
  return data
}

export interface CrearServicioInput {
  categoria_id: string
  titulo: string
  descripcion?: string
  precio: number
  tipo_precio: "fijo" | "hora"
  latitud?: number
  longitud?: number
}

export function getServicioDetalle(id: string) {
  return apiFetch<ServicioBackend>(`/servicio/${id}`)
}

export function crearSolicitud(servicio_id: string) {
  return apiFetch("/solicitudes/", {
    method: "POST",
    body: JSON.stringify({ servicio_id }),
  })
}

export interface ServicioDetalle extends ServicioBackend {
  imagen_url: string | null
}

export function crearServicio(datos: {
  categoria_id: string
  titulo: string
  descripcion?: string
  precio: number
  tipo_precio: string
  latitud?: number
  longitud?: number
}) {
  return apiFetch<ServicioDetalle>("/servicio/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

export function getMisServicios() {
  return apiFetch<Paginado<ServicioDetalle>>("/servicio/mios").then(data => data.items)
}

export function actualizarServicio(
  id: string,
  datos: Partial<{
    categoria_id: string
    titulo: string
    descripcion: string
    precio: number
    tipo_precio: string
    activo: boolean
    imagen_url: string
    latitud: number
    longitud: number
  }>
) {
  return apiFetch<ServicioDetalle>(`/servicio/${id}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  })
}

export function eliminarServicio(id: string) {
  return apiFetch(`/servicio/${id}`, { method: "DELETE" })
}

export function getSignedUploadUrl(servicioId: string) {
  return apiFetch<{ signed_url: string; path: string; token: string }>(
    `/servicio/${servicioId}/imagen/signed-url`,
    { method: "POST" }
  )
}

export interface ImagenServicio {
  id: string
  url: string
  orden: number
}

export function getSignedUploadUrlGaleria(servicioId: string) {
  return apiFetch<{ signed_url: string; path: string; token: string }>(
    `/servicio/${servicioId}/imagenes/signed-url`,
    { method: "POST" }
  )
}

export function listarImagenesServicio(servicioId: string) {
  return apiFetch<ImagenServicio[]>(`/servicio/${servicioId}/imagenes`)
}

export function confirmarImagenServicio(servicioId: string, url: string) {
  return apiFetch<ImagenServicio>(`/servicio/${servicioId}/imagenes`, {
    method: "POST",
    body: JSON.stringify({ url }),
  })
}

export function eliminarImagenServicio(servicioId: string, imagenId: string) {
  return apiFetch(`/servicio/${servicioId}/imagenes/${imagenId}`, {
    method: "DELETE",
  })
}

export function reordenarImagenesServicio(servicioId: string, orden: string[]) {
  return apiFetch<ImagenServicio[]>(`/servicio/${servicioId}/imagenes/orden`, {
    method: "PATCH",
    body: JSON.stringify({ orden }),
  })
}

export interface Conversacion {
  id: string
  servicio_id: string
  servicio_titulo: string
  servicio_tipo_precio: "fijo" | "hora"
  servicio_precio: string
  estado: string
  fecha: string | null
  cliente_id: string
  otro_usuario_id: string
  otro_usuario_nombre: string
  otro_usuario_avatar: string | null
  ultimo_mensaje: string | null
  ultimo_mensaje_fecha: string | null
  no_leidos: number
  ya_valorada: boolean
  motivo_cancelacion: string | null
  pago_estado: string | null
  tiene_notificacion: boolean
}

export function getConversaciones(limit = 20, offset = 0) {
  return apiFetch<Paginado<Conversacion>>(
    `/solicitudes/conversaciones?limit=${limit}&offset=${offset}`
  )
}

export interface MensajeBackend {
  id: string
  solicitud_id: string
  remitente_id: string
  contenido: string
  fecha: string | null
  leido: boolean
}

export function getHistorialMensajes(solicitudId: string) {
  return apiFetch<Paginado<MensajeBackend>>(`/solicitudes/${solicitudId}/mensajes`)
    .then((data) => data.items)
}

export function marcarMensajesLeidos(solicitudId: string) {
  return apiFetch(`/solicitudes/${solicitudId}/mensajes/leer`, { method: "PATCH" })
}

export function getWebSocketUrl(solicitudId: string): string {
  const wsBase = API_URL.replace("http://", "ws://").replace("https://", "wss://")
  return `${wsBase}/ws/solicitudes/${solicitudId}?token=${getToken()}`
}

export function cambiarEstadoSolicitud(
    id: string,
    estado: "aceptada" | "rechazada" | "completada" | "cancelada",
    motivo?: string
  ) {
    return apiFetch(`/solicitudes/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify(motivo ? { estado, motivo } : { estado }),
    })
  }

export function crearValoracion(datos: {
  solicitud_id: string
  puntuacion: number
  comentario?: string
}) {
  return apiFetch("/valoraciones/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

export function bloquearUsuario(usuario_id: string) {
  return apiFetch("/usuarios/bloquear", {
    method: "POST",
    body: JSON.stringify({ usuario_id }),
  })
}

export function desbloquearUsuario(usuario_id: string) {
  return apiFetch(`/usuarios/bloquear/${usuario_id}`, { method: "DELETE" })
}

export interface UsuarioBloqueado {
  id: string
  usuario_id: string
  nombre: string
  avatar: string | null
  fecha: string | null
}

export function getBloqueados() {
  return apiFetch<UsuarioBloqueado[]>("/usuarios/bloqueados")
}

export function crearReporte(datos: {
  usuario_reportado_id: string
  motivo: string
  descripcion?: string
  solicitud_id?: string
}) {
  return apiFetch("/reportes/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

// --- Admin: Reportes ---

export interface ReporteAdmin {
  id: string
  autor_id: string
  autor_nombre: string
  autor_email: string
  usuario_reportado_id: string
  reportado_nombre: string
  reportado_email: string
  motivo: string
  descripcion: string | null
  solicitud_id: string | null
  estado: string
  fecha: string | null
}

export function getReportesAdmin(estado?: string) {
  const query = estado ? `?estado=${estado}` : ""
  return apiFetch<Paginado<ReporteAdmin>>(`/admin/reportes${query}`)
    .then((data) => data.items)
}

export function cambiarEstadoReporte(id: string, estado: "resuelto" | "descartado") {
  return apiFetch<ReporteAdmin>(`/admin/reportes/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  })
}

// --- Admin: Verificación de proveedores ---

export interface PerfilProveedorAdmin {
  id: string
  usuario_id: string
  descripcion: string | null
  experiencia_años: number | null
  radio_km_disponible: number
  valoracion_media: string | null
  num_valoraciones: number
  verificado: boolean | null
  url_documento: string | null
  fecha_creacion: string | null
  motivo_rechazo: string | null
  usuario_nombre: string
  usuario_email: string
}

export function getProveedoresPendientes() {
  return apiFetch<Paginado<PerfilProveedorAdmin>>("/admin/proveedores/pendientes")
    .then((data) => data.items)
}

export function verificarProveedor(perfilId: string) {
  return apiFetch(`/admin/proveedores/${perfilId}/verificar`, { method: "PATCH" })
}

export function rechazarProveedor(perfilId: string, motivo: string) {
  return apiFetch(`/admin/proveedores/${perfilId}/rechazar`, {
    method: "PATCH",
    body: JSON.stringify({ motivo }),
  })
}

export function getUrlDocumentoProveedor(perfilId: string) {
  return apiFetch<{ url: string }>(`/admin/proveedores/${perfilId}/documento`)
}

// --- Admin: Usuarios (baneos) ---

export interface UsuarioAdmin {
  id: string
  email: string
  nombre: string
  foto_url: string | null
  telefono: string | null
  telefono_verificado: boolean | null
  fecha_registro: string | null
  ciudad: string | null
  baneado: boolean
  motivo_baneo: string | null
  cuenta_eliminada: boolean
  fecha_eliminacion: string | null
  es_admin: boolean
}

export function buscarUsuariosAdmin(email: string) {
  return apiFetch<Paginado<UsuarioAdmin>>(`/admin/usuarios/buscar?email=${encodeURIComponent(email)}`)
    .then((data) => data.items)
}

export function getUsuariosBaneados() {
  return apiFetch<UsuarioAdmin[]>("/admin/usuarios/baneados")
}

export function banearUsuario(usuarioId: string, motivo: string) {
  return apiFetch<UsuarioAdmin>(`/admin/usuarios/${usuarioId}/banear`, {
    method: "PATCH",
    body: JSON.stringify({ motivo }),
  })
}

export function desbanearUsuario(usuarioId: string) {
  return apiFetch<UsuarioAdmin>(`/admin/usuarios/${usuarioId}/desbanear`, { method: "PATCH" })
}

export type ResultadoBorradoCuenta = { resultado: "borrada" | "anonimizada" }

export function eliminarCuentaAdmin(usuarioId: string) {
  return apiFetch<ResultadoBorradoCuenta>(`/admin/usuarios/${usuarioId}/eliminar`, { method: "PATCH" })
}

/** Borra la cuenta del usuario con sesión (perfil, anuncios y archivos incluidos). */
export function borrarMiCuenta() {
  // Más margen que el de 15 s: borra archivos de Storage y puede cancelar solicitudes.
  return apiFetch<ResultadoBorradoCuenta>("/usuarios/me", { method: "DELETE" }, 60_000)
}

// --- Ofertas ---

export interface Oferta {
  id: string
  solicitud_id: string
  autor_id: string
  precio: string
  horas: string | null
  descripcion: string | null
  fecha_hora_propuesta: string | null
  estado: "pendiente" | "aceptada" | "rechazada" | "reemplazada"
  fecha_creacion: string | null
}

export function crearOferta(solicitudId: string, precio: number, descripcion?: string, fechaHoraPropuesta?: string) {
  return apiFetch<Oferta>(`/solicitudes/${solicitudId}/ofertas`, {
    method: "POST",
    body: JSON.stringify({ precio, descripcion: descripcion || null, fecha_hora_propuesta: fechaHoraPropuesta || null }),
  })
}

export function confirmarPrecioPublicado(solicitudId: string) {
  return apiFetch<Oferta>(`/solicitudes/${solicitudId}/ofertas/confirmar-precio-publicado`, {
    method: "POST",
  })
}

export function listarOfertas(solicitudId: string) {
  return apiFetch<Oferta[]>(`/solicitudes/${solicitudId}/ofertas`)
}

export function aceptarOferta(ofertaId: string) {
  return apiFetch<Oferta>(`/ofertas/${ofertaId}/aceptar`, { method: "PATCH" })
}

export function rechazarOferta(ofertaId: string) {
  return apiFetch<Oferta>(`/ofertas/${ofertaId}/rechazar`, { method: "PATCH" })
}

// --- Pagos ---

export interface Pago {
  id: string
  solicitud_id: string
  cliente_id: string
  proveedor_id: string
  monto_total: string
  comision_plataforma: string
  monto_proveedor: string
  moneda: string
  estado: string
  stripe_payment_intent_id: string
}

export interface PagoConClientSecret {
  pago: Pago
  client_secret: string
}

export function crearPago(ofertaId: string) {
  return apiFetch<PagoConClientSecret>(`/ofertas/${ofertaId}/pago`, { method: "POST" })
}

export function crearOfertaPorHoras(solicitudId: string, horas: number, descripcion?: string, fechaHoraPropuesta?: string) {
  return apiFetch<Oferta>(`/solicitudes/${solicitudId}/ofertas/por-horas`, {
    method: "POST",
    body: JSON.stringify({ horas, descripcion: descripcion || null, fecha_hora_propuesta: fechaHoraPropuesta || null }),
  })
}

export function getPerfilProveedorPublico(perfilId: string) {
  return apiFetch<PerfilPublicoCompleto>(`/proveedor/${perfilId}`)
}

export interface CrearLeadInput {
  servicio_id?: string
  perfil_id?: string
  nombre: string
  contacto: string
  canal_contacto: "whatsapp" | "email"
  mensaje: string
  consentimiento: boolean
  website?: string
  ref?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  pagina_origen?: string
}

export function crearLead(datos: CrearLeadInput) {
  return apiFetch<{ ok: true }>("/leads/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

// --- Reseñas de alumnos por enlace (/opina/[codigo]) ---

export interface CrearResenaAlumnoInput {
  puntuacion: number
  comentario: string
  autor_nombre: string
  relacion: "alumno" | "padre_madre"
  antiguedad: "menos_3_meses" | "3_12_meses" | "mas_1_ano"
  // Email o teléfono. Privado: solo lo ve Habilo para comprobar la reseña.
  contacto: string
  consentimiento: true
  website?: string
}

export function getFormularioResena(codigo: string) {
  return apiFetch<{ nombre_profesor: string }>(`/resenas/${encodeURIComponent(codigo)}`)
}

export function crearResenaAlumno(codigo: string, datos: CrearResenaAlumnoInput) {
  return apiFetch<{ ok: true }>(`/resenas/${encodeURIComponent(codigo)}`, {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

// Enlace del profesor para pedir opiniones (habilo.es/opina/{codigo}).
export function getMiCodigoResenas() {
  return apiFetch<{ codigo: string }>("/proveedor/me/codigo-resenas")
}

export interface ResenaPublica {
  puntuacion: number
  comentario: string | null
  fecha: string | null
  autor_nombre: string
  // "habilo": valoración de una clase reservada en Habilo; "alumno": reseña por enlace.
  origen?: "habilo" | "alumno"
  relacion?: string | null
  antiguedad?: string | null
}

export interface ServicioResumen {
  id: string
  titulo: string
  descripcion: string | null
  precio: string
  tipo_precio: string
  imagen_url: string | null
  categoria_nombre: string | null
}

export interface PerfilPublicoCompleto {
  id: string
  nombre_publico: string
  avatar_publico: string | null
  descripcion: string | null
  experiencia_años: number | null
  radio_km_disponible: number
  ciudad: string | null
  zona: string | null
  materias: string[]
  niveles: string[]
  valoracion_media: string | null
  num_valoraciones: number
  verificado: boolean | null
  horario: Horario | null
  perfil_publico: boolean
  servicios: ServicioResumen[]
  resenas: ResenaPublica[]
}

export interface SitemapItem {
  id: string
  fecha_creacion: string | null
}

export interface MiPerfilProveedor {
  id: string
  usuario_id: string
  descripcion: string | null
  experiencia_años: number | null
  radio_km_disponible: number
  valoracion_media: string | null
  num_valoraciones: number
  verificado: boolean | null
  fecha_creacion: string | null
  horario: Horario | null
  destacado_hasta: string | null
  url_documento: string | null
  motivo_rechazo: string | null
  codigo_referido: string | null
  ciudad: string | null
  zona: string | null
  materias: string[]
  niveles: string[]
  perfil_publico: boolean
  consentimiento_marketing: boolean
}

export function actualizarPerfilProveedor(datos: {
  descripcion?: string
  experiencia_años?: number
  radio_km_disponible?: number
  horario?: Horario | null
  ciudad?: string | null
  zona?: string | null
  materias?: string[]
  niveles?: string[]
  perfil_publico?: boolean
  consentimiento_marketing?: boolean
}) {
  return apiFetch<MiPerfilProveedor>(`/proveedor/`, {
    method: "PATCH",
    body: JSON.stringify(datos),
  })
}

export function confirmarEntrega(solicitudId: string) {
  return apiFetch(`/solicitudes/${solicitudId}/confirmar-entrega`, { method: "POST" })
}

// --- Favoritos ---

export function marcarServicioFavorito(servicioId: string) {
  return apiFetch(`/favoritos/servicios/${servicioId}`, { method: "POST" })
}

export function desmarcarServicioFavorito(servicioId: string) {
  return apiFetch(`/favoritos/servicios/${servicioId}`, { method: "DELETE" })
}

export function listarServiciosFavoritos() {
  return apiFetch<ServicioBackend[]>("/favoritos/servicios")
}

export interface ProveedorFavorito {
  id: string
  nombre: string | null
  foto_url: string | null
  descripcion: string | null
  valoracion_media: number | string | null
  num_valoraciones: number
  verificado: boolean | null
}

export function marcarProveedorFavorito(perfilId: string) {
  return apiFetch(`/favoritos/proveedores/${perfilId}`, { method: "POST" })
}

export function desmarcarProveedorFavorito(perfilId: string) {
  return apiFetch(`/favoritos/proveedores/${perfilId}`, { method: "DELETE" })
}

export function listarProveedoresFavoritos() {
  return apiFetch<ProveedorFavorito[]>("/favoritos/proveedores")
}

// Tipo genérico para cualquier respuesta paginada del backend
export interface Paginado<T> {
  items: T[]
  has_more: boolean
  limit: number
  offset: number
}

export function enviarFeedback(datos: { tipo: "sugerencia" | "bug" | "otro"; mensaje: string; pagina?: string }) {
  return apiFetch("/feedback/", {
    method: "POST",
    body: JSON.stringify(datos),
  })
}

export function esDestacado(destacadoHasta: string | null | undefined): boolean {
  if (!destacadoHasta) return false
  return new Date(destacadoHasta) > new Date()
}

export function getSignedUrlAvatar() {
  return apiFetch<{ signed_url: string; path: string; token: string }>(
    "/usuarios/me/foto/signed-url",
    { method: "POST" }
  )
}