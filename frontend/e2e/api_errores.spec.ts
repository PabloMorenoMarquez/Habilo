import { test, expect } from "@playwright/test"
import { mensajeDeError } from "../lib/api"

// Cómo se convierte el "detail" de un error de la API en un mensaje legible (sin navegador).

test.describe("mensajeDeError", () => {
  test("detail de texto: tal cual", () => {
    expect(mensajeDeError({ detail: "Credenciales incorrectas" }, 401)).toBe("Credenciales incorrectas")
  })

  test("sin detail: error genérico con el código", () => {
    expect(mensajeDeError(null, 500)).toBe("Error 500")
    expect(mensajeDeError({}, 404)).toBe("Error 404")
  })

  test("422 con mensaje propio del backend: se usa sin el prefijo de Pydantic", () => {
    const data = {
      detail: [
        {
          loc: ["body", "horario", "1"],
          msg: "Value error, La hora de fin debe ser posterior a la de inicio",
          type: "value_error",
        },
      ],
    }
    expect(mensajeDeError(data, 422)).toBe("La hora de fin debe ser posterior a la de inicio")
  })

  test("422 con varios errores: se unen y no salen repetidos", () => {
    const data = {
      detail: [
        { loc: ["body", "email"], msg: "Value error, El email no es válido", type: "value_error" },
        { loc: ["body", "consentimiento"], msg: "Value error, El consentimiento es obligatorio", type: "value_error" },
        { loc: ["body", "email"], msg: "Value error, El email no es válido", type: "value_error" },
      ],
    }
    expect(mensajeDeError(data, 422)).toBe("El email no es válido. El consentimiento es obligatorio")
  })

  test("422 con errores genéricos en inglés: texto en español con el campo", () => {
    const data = {
      detail: [
        { loc: ["body", "nombre"], msg: "Field required", type: "missing" },
        { loc: ["body", "precio"], msg: "Input should be a valid number", type: "float_parsing" },
      ],
    }
    const msg = mensajeDeError(data, 422)
    expect(msg).not.toContain("[object Object]")
    expect(msg).toBe("Falta el campo «nombre». El campo «precio» no es válido")
  })

  test("nunca devuelve [object Object]", () => {
    expect(mensajeDeError({ detail: [{}] }, 422)).toBe("Revisa los datos del formulario")
    expect(mensajeDeError({ detail: { raro: true } }, 400)).toBe("Error 400")
  })
})
