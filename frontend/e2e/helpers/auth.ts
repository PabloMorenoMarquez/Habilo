/**
 * Helpers de autenticación para los tests E2E de Playwright.
 *
 * La app usa OAuth (Google/Facebook) para login, por lo que no hay un formulario
 * de email+contraseña que Playwright pueda rellenar.
 *
 * Solución: inyectamos el JWT directamente en localStorage,
 * igual que lo hace loginWithToken() en el auth-context.
 * El token de test lo obtienes una vez manualmente:
 *   1. Inicia sesión en la app normalmente (Google/Facebook).
 *   2. Abre DevTools → Application → Local Storage → busca 'token'.
 *   3. Cópialo a e2e/.env como CLIENTE_TOKEN / PROVEEDOR_TOKEN.
 */

import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Cargar variables del fichero e2e/.env si existe
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const TEST_TOKENS = {
  cliente: process.env.CLIENTE_TOKEN ?? "",
  proveedor: process.env.PROVEEDOR_TOKEN ?? "",
};

export const TEST_SERVICIO_ID = process.env.TEST_SERVICIO_ID ?? "";
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * Inyecta el JWT en localStorage y el rol en serviclick_role,
 * luego navega a la URL destino ya autenticado.
 */
export async function loginAs(
  page: Page,
  role: "cliente" | "proveedor",
  redirectTo: string = role === "cliente" ? "/home" : "/dashboard"
): Promise<void> {
  const token = TEST_TOKENS[role];
  if (!token) {
    throw new Error(
      `No hay token para el rol "${role}". ` +
        `Rellena e2e/.env con ${role.toUpperCase()}_TOKEN.`
    );
  }

  // Primero necesitamos que la página esté abierta para poder acceder a localStorage
  await page.goto("/");

  await page.evaluate(
    ({ token, storageRole }) => {
      localStorage.setItem("token", token);
      localStorage.removeItem("serviclick_token");
      localStorage.setItem(
        "serviclick_role",
        storageRole === "proveedor" ? "profesional" : "cliente"
      );
    },
    { token, storageRole: role }
  );

  // Navegar a la página destino ya con la sesión inyectada
  await page.goto(redirectTo);
}

/**
 * Limpia el estado de autenticación (útil en afterEach/afterAll).
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("serviclick_role");
  });
}

/**
 * Hace una llamada directa al backend API con el token del rol indicado.
 * Útil para preparar el estado antes de un test (ej: crear solicitud vía API).
 */
export async function apiCall(
  page: Page,
  role: "cliente" | "proveedor",
  method: string,
  endpoint: string,
  body?: object
): Promise<unknown> {
  const token = TEST_TOKENS[role];
  return page.evaluate(
    async ({ apiUrl, endpoint, method, body, token }) => {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    },
    { apiUrl: API_URL, endpoint, method, body, token }
  );
}
