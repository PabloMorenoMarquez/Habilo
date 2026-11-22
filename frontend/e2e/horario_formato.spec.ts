import { test, expect } from "@playwright/test"
import {
  activarDia,
  copiarADemas,
  erroresHorario,
  formatearHorario,
  limpiarHorario,
  siguienteTramo,
  type Horario,
} from "../lib/horario"

// Funciones puras del horario por días (sin navegador).

const t = (inicio: string, fin: string) => ({ inicio, fin })
const tarde = [t("17:00", "21:00")]

test.describe("formatearHorario", () => {
  test("vacío", () => {
    expect(formatearHorario(null)).toBe("")
    expect(formatearHorario(undefined)).toBe("")
    expect(formatearHorario({})).toBe("")
  })

  test("agrupa días seguidos en un rango", () => {
    const h: Horario = { "1": tarde, "2": tarde, "3": tarde, "4": tarde, "5": tarde, "6": [t("10:00", "13:00")] }
    expect(formatearHorario(h)).toBe("L–V: 17:00–21:00 · S: 10:00–13:00")
  })

  test("varios tramos en un día", () => {
    expect(formatearHorario({ "2": [t("09:00", "13:00"), t("15:00", "20:00")] })).toBe(
      "M: 09:00–13:00 y 15:00–20:00",
    )
  })

  test("días no consecutivos con el mismo horario", () => {
    expect(formatearHorario({ "1": tarde, "3": tarde, "5": tarde })).toBe("L, X, V: 17:00–21:00")
  })

  test("dos días seguidos no forman rango", () => {
    const finde = [t("10:00", "14:00")]
    expect(formatearHorario({ "6": finde, "7": finde })).toBe("S, D: 10:00–14:00")
  })

  test("rango y día suelto en el mismo grupo; grupos por primer día", () => {
    const h: Horario = { "1": tarde, "2": tarde, "3": tarde, "5": tarde, "4": [t("09:00", "12:00")] }
    expect(formatearHorario(h)).toBe("L–X, V: 17:00–21:00 · J: 09:00–12:00")
  })
})

test.describe("erroresHorario", () => {
  test("hora vacía", () => {
    expect(erroresHorario({ "1": [t("", "13:00")] })).toEqual({ "1": "Rellena las dos horas" })
  })

  test("fin antes que inicio", () => {
    expect(erroresHorario({ "2": [t("14:00", "10:00")] })).toEqual({
      "2": "La hora de fin debe ser posterior a la de inicio",
    })
  })

  test("solapados", () => {
    expect(erroresHorario({ "3": [t("12:00", "15:00"), t("09:00", "13:00")] })).toEqual({
      "3": "Los tramos se solapan",
    })
  })

  test("contiguos son válidos", () => {
    expect(erroresHorario({ "1": [t("09:00", "13:00"), t("13:00", "15:00")] })).toEqual({})
  })
})

test.describe("edición", () => {
  test("activar un día copia el último día disponible anterior", () => {
    const h = activarDia({ "1": [t("09:00", "13:00")], "5": [t("18:00", "19:00")] }, "3")
    expect(h["3"]).toEqual([t("09:00", "13:00")])
  })

  test("activar sin ningún día anterior usa 17:00–21:00", () => {
    expect(activarDia({}, "4")["4"]).toEqual([t("17:00", "21:00")])
    expect(activarDia({ "6": [t("10:00", "12:00")] }, "2")["2"]).toEqual([t("17:00", "21:00")])
  })

  test("activar no comparte el array con el día de origen", () => {
    const h = activarDia({ "1": [t("09:00", "13:00")] }, "2")
    expect(h["2"]).not.toBe(h["1"])
  })

  test("copiar a los demás días disponibles", () => {
    const h = copiarADemas({ "1": [t("09:00", "13:00"), t("15:00", "20:00")], "2": tarde, "3": tarde }, "1")
    expect(h["2"]).toEqual(h["1"])
    expect(h["3"]).toEqual(h["1"])
    expect(h["4"]).toBeUndefined()
  })

  test("limpiar ordena y vacío es null", () => {
    expect(limpiarHorario({ "1": [t("15:00", "20:00"), t("09:00", "13:00")] })).toEqual({
      "1": [t("09:00", "13:00"), t("15:00", "20:00")],
    })
    expect(limpiarHorario({})).toBeNull()
  })
})

test.describe("siguienteTramo", () => {
  test("empieza donde acaba el último y dura 2 horas", () => {
    expect(siguienteTramo([t("09:00", "13:00")])).toEqual(t("13:00", "15:00"))
  })

  test("usa el último tramo aunque no estén ordenados", () => {
    expect(siguienteTramo([t("15:00", "17:00"), t("09:00", "13:00")])).toEqual(t("17:00", "19:00"))
  })

  test("no pasa de 23:59", () => {
    expect(siguienteTramo([t("20:00", "22:30")])).toEqual(t("22:30", "23:59"))
  })

  test("sin tramos, el de por defecto", () => {
    expect(siguienteTramo([])).toEqual(t("17:00", "21:00"))
  })

  test("al activar un día y añadir un tramo no hay solape", () => {
    const h = activarDia({}, "2")
    const conDos: Horario = { "2": [...h["2"]!, siguienteTramo(h["2"]!)] }
    expect(erroresHorario(conDos)).toEqual({})
  })
})
