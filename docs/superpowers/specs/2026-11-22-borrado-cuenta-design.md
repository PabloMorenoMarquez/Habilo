# Borrado completo de cuenta — diseño

Fecha: 2026-11-22. Estado: aprobado por el usuario el 2026-11-21 (ajustes del 22/11 marcados con *).

## Problema

La política de privacidad (`/legal/privacidad#borrar-datos`) promete borrar «tu cuenta, junto con tu perfil y tus anuncios». Hoy no se cumple:

- `UserService.eliminar_cuenta` (panel de admin, `PATCH /admin/usuarios/{id}/eliminar`) solo anonimiza nombre, foto, teléfono y ciudad (`UserRepository.eliminar`). Conserva el correo, el perfil de profesor completo y los archivos de Storage, y solo desactiva los anuncios.
- El usuario no tiene forma de borrar su cuenta. Hubo que hacerlo a mano el 21/11.

## Solución

Un único servicio de borrado, `BorradoCuentaService.borrar`, usado por:

- `DELETE /usuarios/me`: el propio usuario.
- `PATCH /admin/usuarios/{id}/eliminar`: el admin. Deja de usar la anonimización vieja, que se elimina.

Ninguno de los dos puede borrar a un administrador. Un admin tampoco puede borrarse a sí mismo desde el panel.

### Qué es «historial compartido»

Hay historial compartido si existe al menos una fila de:

- `solicitudes`: el usuario es el cliente, o la solicitud es de uno de sus anuncios;
- `mensajes` (remitente), `ofertas` (autor), `valoraciones` (autor o destinatario), `reportes` (autor o reportado) y `pagos` (cliente o proveedor).

### Caso normal, sin historial compartido: borrado total

1. Se borran los archivos de Storage. Si falla, se aborta y la BD no se toca:
   - bucket `servicios`: carpeta `{perfil_id}/` (fotos de anuncios) y `avatares/{usuario_id}/` (foto subida);
   - bucket `documentos`: carpeta `{usuario_id}/` (documento de identidad).*
2. En una sola transacción, y en este orden: `favoritos_servicio` (los suyos y los que apuntan a sus anuncios), `favoritos_proveedor` (los suyos y los que apuntan a su perfil), `leads` (de su perfil o de sus anuncios), `resenas_alumnos` de su perfil, `referidos` en los dos sentidos, `imagenes_servicio`, `servicios`, `suscripcion_push`, `bloqueos` en los dos sentidos, `feedback`, `perfiles_proveedor` y `usuarios`.

### Con historial compartido: anonimización a fondo

1. Se cancelan sus solicitudes activas (`SolicitudService.cancelar_por_sistema`, motivo «cuenta eliminada»), como hacía el código viejo.
2. Se borran los mismos archivos de Storage que en el borrado total.
3. En una sola transacción:
   - **Usuario:** correo `eliminado-<id>@habilo.invalid`, nombre «Usuario eliminado»; `foto_url`, `telefono` y `ciudad` a NULL; `telefono_verificado=false`, `cuenta_eliminada=true` y `fecha_eliminacion=now()`.
   - **Perfil:** `perfil_publico=false` y `consentimiento_marketing=false`. Se vacían `descripcion`, `ciudad`, `zona`, `url_documento`, `dias_disponibles`, `hora_inicio`, `hora_fin` y `destacado_hasta` (a NULL), y también `materias` y `niveles` (a `{}`). `codigo_resenas` pasa a NULL. *`codigo_referido` es `NOT NULL UNIQUE`: no se puede poner a NULL, así que se cambia por un código aleatorio nuevo, y el enlace viejo deja de funcionar.
   - **Anuncios:** `activo=false`; `imagen_url`, `ubicacion`, `ciudad` y `zona` a NULL. Se conservan las filas, porque las solicitudes apuntan a ellas.
   - **Se borran:** `imagenes_servicio` de sus anuncios, `leads`, `resenas_alumnos`, favoritos (en los dos sentidos) y `suscripcion_push`.
   - **Se conservan:** solicitudes, mensajes, ofertas, valoraciones, reportes, `pagos` (obligación fiscal), referidos, bloqueos y feedback.

Que se cambie el correo hace que, si la persona vuelve a entrar con Google, se le cree una cuenta nueva y limpia (lo mismo ocurre tras el borrado total).

### Web

- **«Mi perfil»** (`/profile`): una tarjeta «Eliminar mi cuenta» al final, con un diálogo de confirmación. Al confirmar se llama a `DELETE /usuarios/me`, se cierra la sesión (`logout`) y se lleva a la portada con `?cuenta=eliminada`, que muestra un aviso.
- El diálogo avisa de que volver a entrar con Google crea una cuenta nueva (caso real del 21/11).
- **Panel de admin:** el texto de confirmación pasa a explicar las dos ramas.

### Fuera de alcance

- Borrar la cuenta conectada de Stripe: los pagos están desactivados en producción.
- Cambiar el 403 «Tu cuenta ha sido suspendida» que devuelve `get_current_user` cuando el usuario ya no existe. La web cierra la sesión justo después de borrar, así que no se llega a ver.

## Pruebas

- **Backend unitario** (patrón `__new__` + `MagicMock`, como `tests/test_referidos.py`): las dos ramas, el rechazo a admins, el 404, Storage antes que la BD y el aborto si Storage falla.
- **Backend de integración** (PostGIS en Docker, `tests/integration`): el SQL real de las dos ramas, contra el esquema de los modelos.
- **e2e** con la API simulada (patrón `e2e/login_token.spec.ts`): el diálogo, la llamada, el cierre de sesión y el aviso en la portada.
