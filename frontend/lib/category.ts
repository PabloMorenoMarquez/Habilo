const CATEGORY_LABELS: Record<string, string> = {
  albanileria: "Albañilería",
  antenas_y_telecomunicaciones: "Antenas y Telecomunicaciones",
  calefaccion: "Calefacción",
  ceramica_y_azulejos: "Cerámica y Azulejos",
  cerrajeria: "Cerrajería",
  climatizacion: "Climatización",
  construccion: "Construcción",
  control_de_plagas: "Control de Plagas",
  electricidad: "Electricidad",
  electrodomesticos: "Electrodomésticos",
  energia_solar: "Energía Solar",
  fontaneria: "Fontanería",
  jardineria: "Jardinería",
  limpieza: "Limpieza",
  montaje_de_muebles: "Montaje de Muebles",
  parquet_y_suelos: "Parquet y Suelos",
  persianas: "Persianas",
  reparacion_de_muebles: "Reparación de Muebles",
  tejados_y_cubiertas: "Tejados y Cubiertas",
  tapiceria: "Tapicería",
  yeseria_y_pladur: "Yesería y Pladur",
}

export function formatCategoryName(name: string | null | undefined) {
  if (!name) return "General"

  const normalizedName = name.trim().toLowerCase()
  if (CATEGORY_LABELS[normalizedName]) return CATEGORY_LABELS[normalizedName]

  return normalizedName
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((word, index) => (index > 0 && ["y", "de", "del"].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ")
}
