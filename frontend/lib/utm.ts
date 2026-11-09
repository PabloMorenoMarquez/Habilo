export interface UtmData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ref?: string
}

const UTM_KEY = "habilo_utm_v1"
const CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"] as const

export function storeUtmFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const datos: UtmData = {}
  for (const campo of CAMPOS) {
    const valor = params.get(campo)
    if (valor) datos[campo] = valor.slice(0, 100)
  }
  if (Object.keys(datos).length > 0) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(datos))
  }
}

export function getUtm(): UtmData {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") as UtmData
  } catch {
    return {}
  }
}
