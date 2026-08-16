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


export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const isFormData = options.body instanceof FormData

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get("content-type")
  const hasJson = contentType?.includes("application/json")
  const data = hasJson ? await response.json() : null

  if (!response.ok) {
    const message = data?.detail || `Error ${response.status}`
    throw new ApiError(message, response.status)
  }

  return data as T
}

// --- Funciones específicas por recurso ---

export function getMe() {
  return apiFetch("/usuarios/me")
}

export function actualizarMe(datos: { ciudad?: string; telefono?: string; nombre?: string }) {
  return apiFetch("/usuarios/me", {
    method: "PATCH",
    body: JSON.stringify(datos),
  })
}

export function getMiPerfilProveedor() {
  return apiFetch("/proveedor/me")
}

export function iniciarVerificacionIdentidad() {
  return apiFetch("/proveedor/verificacion-identidad", {
    method: "POST",
  })
}

export function crearPerfilProveedor(datos: {
  descripcion: string
  radio_km_disponible: number
  experiencia_años?: number
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
  proveedor_valoracion_media: number | null
  proveedor_num_valoraciones: number | null
  categoria_nombre: string | null
  es_favorito: boolean
}

export function buscarServicios(params: {
  lat: number
  lng: number
  radio_km: number
  categoria_id?: string
  texto?: string
}) {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radio_km: String(params.radio_km),
  })
  if (params.categoria_id) query.set("categoria_id", params.categoria_id)
  if (params.texto) query.set("texto", params.texto)
  return apiFetch<ServicioBackend[]>(`/servicio/?${query.toString()}`)
}

export interface Categoria {
  id: string
  nombre: string
  icono: string
  descripcion: string
}

export function getCategorias() {
  return apiFetch<Categoria[]>("/categorias/")
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
  return apiFetch<ServicioDetalle[]>("/servicio/mios")
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
}

export function getConversaciones() {
  return apiFetch<Conversacion[]>("/solicitudes/conversaciones")
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
  return apiFetch<MensajeBackend[]>(`/solicitudes/${solicitudId}/mensajes`)
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
  return apiFetch<ReporteAdmin[]>(`/admin/reportes${query}`)
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
  return apiFetch<PerfilProveedorAdmin[]>("/admin/proveedores/pendientes")
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
  return apiFetch<UsuarioAdmin[]>(`/admin/usuarios/buscar?email=${encodeURIComponent(email)}`)
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

export function eliminarCuentaAdmin(usuarioId: string) {
  return apiFetch<UsuarioAdmin>(`/admin/usuarios/${usuarioId}/eliminar`, { method: "PATCH" })
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

export interface PerfilProveedorPublico {
  id: string
  usuario_id: string
  descripcion: string | null
  experiencia_años: number | null
  radio_km_disponible: number
  valoracion_media: string | null
  num_valoraciones: number
  verificado: boolean | null
  dias_disponibles: string | null
  hora_inicio: string | null
  hora_fin: string | null
}

export function getPerfilProveedorPublico(perfilId: string) {
  return apiFetch<PerfilProveedorPublico>(`/proveedor/${perfilId}`)
}

export function actualizarPerfilProveedor(datos: {
  descripcion?: string
  experiencia_años?: number
  radio_km_disponible?: number
  dias_disponibles?: string
  hora_inicio?: string
  hora_fin?: string
}) {
  return apiFetch(`/proveedor/`, {
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