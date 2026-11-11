// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4afc0a0f384ca86508e2dc9326cdeb0a@o4511982693580800.ingest.de.sentry.io/4511982693974096",

  // Sin trazas: el aviso legal describe Sentry solo como registro de errores.
  tracesSampleRate: 0,

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
