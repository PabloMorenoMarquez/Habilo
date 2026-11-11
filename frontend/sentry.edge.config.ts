// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sinParametrosEnBreadcrumb, sinParametrosEnEvento } from "./lib/sentry-sanitize";

Sentry.init({
  dsn: "https://4afc0a0f384ca86508e2dc9326cdeb0a@o4511982693580800.ingest.de.sentry.io/4511982693974096",

  // Sin trazas: solo se registran errores. Se fija en 0 para que una variable
  // de entorno no active el envío de transacciones con URLs.
  tracesSampleRate: 0,
  beforeBreadcrumb: sinParametrosEnBreadcrumb,
  beforeSend: sinParametrosEnEvento,
  dataCollection: {
    // No enviar información personal, cuerpos, cookies, cabeceras, parámetros
    // de URL ni variables locales.
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    userInfo: false,
    httpBodies: [],
    cookies: false,
    httpHeaders: { request: false, response: false },
    urlQueryParams: false,
    stackFrameVariables: false,
  },
});
