import { test, expect } from "@playwright/test"
import { valoracionVisible } from "../lib/valoracion"

// Función pura de la tarjeta de anuncio (sin navegador).

test("sin valoraciones no se muestra nada (nada de «★ 0 (0)»)", () => {
  expect(valoracionVisible(0, 0)).toBeNull()
  expect(valoracionVisible(null, 0)).toBeNull()
  expect(valoracionVisible(undefined, undefined)).toBeNull()
  expect(valoracionVisible(4.5, 0)).toBeNull()
})

test("con valoraciones muestra la media con un decimal y el número", () => {
  expect(valoracionVisible(5, 1)).toEqual({ media: "5", total: 1 })
  expect(valoracionVisible(4.67, 3)).toEqual({ media: "4,7", total: 3 })
  expect(valoracionVisible("4.50", 2)).toEqual({ media: "4,5", total: 2 })
})

test("una media no numérica no rompe la tarjeta", () => {
  expect(valoracionVisible("abc", 2)).toBeNull()
})
