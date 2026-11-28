// Horario semanal del profesor: por cada día (1 = lunes … 7 = domingo), de 1 a 3 tramos.
// Mismo formato que perfiles_proveedor.horario en el backend (schemas/horario_schema.py).
// Solo funciones puras y sin importaciones "@/": los tests de e2e/horario_formato.spec.ts las importan directamente.

export type Dia = "1" | "2" | "3" | "4" | "5" | "6" | "7"
export type Tramo = { inicio: string; fin: string }
export type Horario = Partial<Record<Dia, Tramo[]>>

export const DIAS: { dia: Dia; letra: string; nombre: string }[] = [
  { dia: "1", letra: "L", nombre: "Lunes" },
  { dia: "2", letra: "M", nombre: "Martes" },
  { dia: "3", letra: "X", nombre: "Miércoles" },
  { dia: "4", letra: "J", nombre: "Jueves" },
  { dia: "5", letra: "V", nombre: "Viernes" },
  { dia: "6", letra: "S", nombre: "Sábado" },
  { dia: "7", letra: "D", nombre: "Domingo" },
]

export const MAX_TRAMOS = 3
export const TRAMO_POR_DEFECTO: Tramo = { inicio: "17:00", fin: "21:00" }

const LETRA: Record<Dia, string> = Object.fromEntries(DIAS.map((d) => [d.dia, d.letra])) as Record<Dia, string>

// Días con tramos, en orden de la semana.
function diasDisponibles(h: Horario): Dia[] {
  return DIAS.map((d) => d.dia).filter((d) => (h[d]?.length ?? 0) > 0)
}

function ordenar(tramos: Tramo[]): Tramo[] {
  return [...tramos].sort((a, b) => a.inicio.localeCompare(b.inicio))
}

const textoTramos = (tramos: Tramo[]) => ordenar(tramos).map((t) => `${t.inicio}–${t.fin}`).join(" y ")

// "L–X, V": rachas de 3 o más días seguidos como rango; el resto, sueltos.
function textoDias(dias: Dia[]): string {
  const partes: string[] = []
  let i = 0
  while (i < dias.length) {
    let j = i
    while (j + 1 < dias.length && Number(dias[j + 1]) === Number(dias[j]) + 1) j++
    if (j - i >= 2) {
      partes.push(`${LETRA[dias[i]]}–${LETRA[dias[j]]}`)
    } else {
      for (let k = i; k <= j; k++) partes.push(LETRA[dias[k]])
    }
    i = j + 1
  }
  return partes.join(", ")
}

/** "L–V: 17:00–21:00 · S: 10:00–13:00". Cadena vacía si no hay horario. */
export function formatearHorario(h: Horario | null | undefined): string {
  if (!h) return ""
  const grupos = new Map<string, Dia[]>() // clave: texto de los tramos; orden de inserción = primer día
  for (const dia of diasDisponibles(h)) {
    const clave = textoTramos(h[dia]!)
    grupos.set(clave, [...(grupos.get(clave) ?? []), dia])
  }
  return Array.from(grupos, ([tramos, dias]) => `${textoDias(dias)}: ${tramos}`).join(" · ")
}

/** Primer error de cada día con tramos, con los mismos criterios que el backend. */
export function erroresHorario(h: Horario): Partial<Record<Dia, string>> {
  const errores: Partial<Record<Dia, string>> = {}
  for (const dia of diasDisponibles(h)) {
    const tramos = ordenar(h[dia]!)
    if (tramos.some((t) => !t.inicio || !t.fin)) {
      errores[dia] = "Rellena las dos horas"
    } else if (tramos.some((t) => t.fin <= t.inicio)) {
      errores[dia] = "La hora de fin debe ser posterior a la de inicio"
    } else if (tramos.some((t, i) => i > 0 && t.inicio < tramos[i - 1].fin)) {
      errores[dia] = "Los tramos se solapan"
    }
  }
  return errores
}

/**
 * Posiciones (en el orden de pantalla) de los tramos que causan el error que
 * muestra `erroresHorario` para ese día, con la misma prioridad: hora vacía,
 * fin no posterior al inicio y, por último, solapes.
 */
export function tramosConError(tramos: Tramo[]): number[] {
  const vacias = tramos.flatMap((t, i) => (!t.inicio || !t.fin ? [i] : []))
  if (vacias.length) return vacias
  const invertidos = tramos.flatMap((t, i) => (t.fin <= t.inicio ? [i] : []))
  if (invertidos.length) return invertidos
  const orden = tramos.map((_, i) => i).sort((a, b) => tramos[a].inicio.localeCompare(tramos[b].inicio))
  const solapados = new Set<number>()
  for (let k = 1; k < orden.length; k++) {
    if (tramos[orden[k]].inicio < tramos[orden[k - 1]].fin) {
      solapados.add(orden[k - 1])
      solapados.add(orden[k])
    }
  }
  return [...solapados].sort((a, b) => a - b)
}

const copia = (tramos: Tramo[]) => tramos.map((t) => ({ ...t }))

/** Marca el día como disponible con los tramos del último día disponible anterior, o 17:00–21:00. */
export function activarDia(h: Horario, dia: Dia): Horario {
  const anterior = diasDisponibles(h)
    .filter((d) => Number(d) < Number(dia))
    .pop()
  return { ...h, [dia]: anterior ? copia(h[anterior]!) : [{ ...TRAMO_POR_DEFECTO }] }
}

/** Copia los tramos de `dia` a los demás días disponibles. */
export function copiarADemas(h: Horario, dia: Dia): Horario {
  const origen = h[dia] ?? []
  const resultado: Horario = { ...h }
  for (const d of diasDisponibles(h)) {
    if (d !== dia) resultado[d] = copia(origen)
  }
  return resultado
}

/** Lo que se envía a la API: tramos ordenados, solo días con tramos; null si no queda ninguno. */
export function limpiarHorario(h: Horario): Horario | null {
  const dias = diasDisponibles(h)
  if (dias.length === 0) return null
  return Object.fromEntries(dias.map((d) => [d, ordenar(h[d]!)])) as Horario
}

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`

/** Tramo para «+ Añadir tramo»: empieza donde acaba el último (el más tardío) y dura 2 horas, sin pasar de 23:59. */
export function siguienteTramo(tramos: Tramo[]): Tramo {
  const ultimo = ordenar(tramos.filter((t) => t.inicio && t.fin)).pop()
  if (!ultimo) return { ...TRAMO_POR_DEFECTO }
  const fin = Math.min(aMinutos(ultimo.fin) + 120, 23 * 60 + 59)
  return { inicio: ultimo.fin, fin: aHora(fin) }
}
