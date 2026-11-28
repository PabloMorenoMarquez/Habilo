/**
 * Qué valoración enseña una tarjeta de anuncio. Sin valoraciones no se enseña nada:
 * un «★ 0 (0)» parece una mala nota y no una ficha nueva.
 */
export function valoracionVisible(
  media: number | string | null | undefined,
  total: number | null | undefined,
): { media: string; total: number } | null {
  const n = Number(media)
  if (!total || total <= 0 || !Number.isFinite(n) || n <= 0) return null
  return {
    media: n.toLocaleString("es-ES", { maximumFractionDigits: 1 }),
    total,
  }
}
