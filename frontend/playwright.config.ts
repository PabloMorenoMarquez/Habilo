import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright config para ServiClick E2E.
 *
 * Tests:
 *   - e2e/happy_path.spec.ts  — flujo completo login→pagar→valorar
 *   - e2e/error_cases.spec.ts — login fallido, pago rechazado
 *
 * Variables de entorno necesarias (copiar de e2e/.env.example a e2e/.env):
 *   CLIENTE_EMAIL, CLIENTE_PASSWORD
 *   PROVEEDOR_EMAIL, PROVEEDOR_PASSWORD
 *   NEXT_PUBLIC_API_URL (por defecto http://localhost:8000)
 */
export default defineConfig({
  testDir: "./e2e",
  /* Timeout por test: 2 minutos (el happy path es largo) */
  timeout: 120_000,
  /* Timeout de expect (esperar a que aparezca un elemento) */
  expect: { timeout: 15_000 },
  /* No correr tests en paralelo: los tests comparten estado de BD */
  fullyParallel: false,
  /* Reintentos en CI para evitar flakiness por lentitud de red */
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    /* Guardar vídeo solo cuando falla */
    video: "retain-on-failure",
    /* Screenshot cuando falla */
    screenshot: "only-on-failure",
    /* Tracing cuando falla */
    trace: "retain-on-failure",
    /* Locale español para fechas */
    locale: "es-ES",
    /* Viewport estándar escritorio */
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Arrancar el servidor de Next.js automáticamente si no está ya corriendo */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,    // si ya está corriendo, lo reutiliza
    timeout: 60_000,
    cwd: path.resolve(__dirname), // directorio raíz del frontend
  },
});
