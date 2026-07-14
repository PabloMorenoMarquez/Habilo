// Convierte un nombre de ciudad/localidad en coordenadas usando Nominatim
// (OpenStreetMap), gratuito y sin necesidad de API key.
export async function geocodeCiudad(nombre: string): Promise<{ lat: number; lng: number } | null> {
  if (!nombre.trim()) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(nombre)}`
    const res = await fetch(url, {
      headers: { "Accept-Language": "es" },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  } 
}

// Pide la ubicación GPS/IP al navegador (requiere permiso del usuario).
export function getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      console.warn("Geolocalización no disponible en este navegador")
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // Códigos: 1 = permiso denegado, 2 = posición no disponible, 3 = timeout
        console.error("Error de geolocalización:", err.code, err.message)
        resolve(null)
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: false }
    )
  })
}

// Convierte coordenadas en un nombre de lugar legible
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { "Accept-Language": "es" } })
    if (!res.ok) return null
    const data = await res.json()
    return data.address?.city || data.address?.town || data.address?.village || data.display_name || null
  } catch {
    return null
  }
}