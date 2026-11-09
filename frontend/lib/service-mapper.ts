import { esDestacado, type ServicioBackend } from "@/lib/api"
import { formatCategoryName } from "@/lib/category"

// Convierte el servicio tal y como lo devuelve el backend a la forma que espera ServiceCard
export function mapServicioParaTarjeta(s: ServicioBackend) {
  return {
    id: s.id,
    title: s.titulo,
    category: formatCategoryName(s.categoria_nombre),
    description: s.descripcion || "",
    price: parseFloat(s.precio),
    priceType: s.tipo_precio,
    rating: s.proveedor_valoracion_media ?? 0,
    reviewCount: s.proveedor_num_valoraciones ?? 0,
    deliveryDays: null,
    image: s.imagen_url || "/placeholder.jpg",
    favorito: s.es_favorito,
    professional: {
      id: s.proveedor_id,
      name: s.proveedor_nombre || "Profesional",
      avatar: s.proveedor_avatar || "/placeholder-user.jpg",
      location: s.distancia_km != null ? `a ${s.distancia_km.toFixed(1)} km` : "",
    },
    tags: [] as string[],
    featured: esDestacado(s.proveedor_destacado_hasta),
  }
}
