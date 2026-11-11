// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sinParametrosEnBreadcrumb, sinParametrosEnEvento } from "./lib/sentry-sanitize";

Sentry.init({
  dsn: "https://4afc0a0f384ca86508e2dc9326cdeb0a@o4511982693580800.ingest.de.sentry.io/4511982693974096",

  // La integración HttpContext añadía la URL completa y cabeceras sin respetar
  // dataCollection; se excluye. Los eventos y migas tampoco llevan query strings.
  integrations: (integraciones) =>
    integraciones.filter((integracion) => integracion.name !== "HttpContext"),
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
