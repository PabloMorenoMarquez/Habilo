"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { captureExceptionIfConsented } from "@/lib/analytics";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
    captureExceptionIfConsented(error);
  }, [error]);

  // El layout raíz no está disponible aquí; los estilos van en línea.
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fafafa",
          color: "#18181b",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Algo ha ido mal</h1>
          <p style={{ color: "#52525b", marginBottom: 24 }}>
            Ha ocurrido un error inesperado. Recarga la página o vuelve al inicio.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 8,
              background: "#18181b",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Volver al inicio
          </a>
        </main>
      </body>
    </html>
  );
}
