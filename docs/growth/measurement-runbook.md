# Runbook de medición y lanzamiento

Fecha: 2026-11-02
Ámbito: Habilo (`https://habilo.es`)

Este documento es la lista de comprobación para aplicar la migración de growth, activar la medición y lanzar el escaparate público sin romper datos ni prometer resultados falsos.

---

## 1. Migración en Supabase

Orden obligatorio:

1. Copia de seguridad de la base de datos desde Supabase (Database → Backups) o `pg_dump`.
2. Ejecutar `backend/migrations/2026-11-02_growth_foundation.sql`.
3. Ejecutar `backend/migrations/2026-11-02_data_backfill.sql`.

No hay Alembic. Los dos ficheros son SQL manual.

### 1.1 Revisar antes de tocar categorías

Antes de ejecutar el backfill completo, ejecuta solo el `SELECT` de `2026-11-02_data_backfill.sql` y revisa que la lista de servicios sea la esperada:

```sql
SELECT s.id, s.titulo, c.nombre AS categoria_actual
FROM servicios s
JOIN categorias c ON c.id = s.categoria_id
WHERE c.nombre = 'otros'
  AND (
    s.titulo ILIKE '%clase%' OR s.titulo ILIKE '%profesor%'
    OR s.titulo ILIKE '%matem%' OR s.titulo ILIKE '%ingl%'
    OR s.titulo ILIKE '%lengua%' OR s.titulo ILIKE '%física%'
    OR s.titulo ILIKE '%química%' OR s.titulo ILIKE '%apoyo%'
  );
```

Si algún servicio no es de clases, exclúyelo antes de ejecutar el `UPDATE`.

### 1.2 Verificar que la migración de growth está aplicada

Ejecuta en el SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'perfiles_proveedor'
  AND column_name IN ('ciudad', 'zona', 'materias', 'niveles', 'perfil_publico', 'consentimiento_marketing');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'servicios'
  AND column_name IN ('ciudad', 'zona');

SELECT to_regclass('public.leads');
SELECT to_regclass('public.referidos');

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('nombre', 'contacto', 'canal', 'mensaje', 'consentimiento', 'utm', 'ref');

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'perfiles_proveedor'
  AND column_name IN ('codigo_referido', 'destacado_hasta');
```

Si falta `leads`, `referidos`, `codigo_referido` o `destacado_hasta`, el feature de referidos baseline no está aplicado: no despliegues el backend hasta resolverlo.

### 1.3 Verificar datos

```sql
SELECT count(*) FROM servicios WHERE activo IS NOT FALSE;
SELECT count(*) FROM perfiles_proveedor WHERE perfil_publico;
SELECT count(*) FROM categorias WHERE nombre = 'clases_particulares';
```

Anota los tres números antes y después del backfill.

---

## 2. Variables de entorno

### 2.1 Vercel (frontend)

| Variable | Valor |
|---|---|
| `API_URL_INTERNAL` | `https://api.habilo.es` |
| `NEXT_PUBLIC_API_URL` | `https://api.habilo.es` |
| `NEXT_PUBLIC_SITE_URL` | `https://habilo.es` |

`API_URL_INTERNAL` se usa en SSR y sitemap. Si falta o apunta mal, el sitemap puede generarse vacío.

### 2.2 Backend

| Variable | Uso |
|---|---|
| `RESEND_API_KEY` | Envío de emails de leads y waitlist |
| `EMAIL_FROM` | Remitente verificado en Resend |

Sin estas variables, los leads se guardan pero no se notifica al profesor. Verifica el remitente en Resend antes de lanzar tráfico.

---

## 3. Opt-in de los 8 profesores

Enviar este mensaje por WhatsApp o email a cada profesor:

```text
Hola [nombre], estoy preparando el perfil público de Habilo para que las familias de Talavera te encuentren. ¿Me autorizas a publicar tu nombre, foto, ciudad y precio en tu perfil? Sin tu permiso aparecerás como “Profesional de Habilo” y el perfil no se indexará. Responde SÍ o NO.
```

Reglas:

- Solo activar `perfil_publico = true` con un SÍ explícito.
- El consentimiento de imagen o voz para redes es separado (`consentimiento_marketing`). No lo des por hecho.
- Sin SÍ: perfil anonimizado y `noindex`. No publicar nombre, foto ni ciudad.
- Guardar la respuesta (captura o email) como prueba.

---

## 4. Analítica

### 4.1 Vercel Analytics

1. Activar Analytics en el proyecto de Vercel.
2. Desplegar.
3. Verificar que el script responde `200`:

```text
https://habilo.es/_vercel/insights/script.js
```

Si devuelve `404`, revisar que Analytics esté activo en Vercel y que el despliegue sea el de producción.

PostHog se inicializa en modo opt-out: no captura eventos ni persiste identificadores hasta que aceptas la analítica. Vercel Analytics no se carga hasta aceptar. No ejecutes pruebas de humo aceptando analítica en producción con datos reales de menores.

### 4.2 Google Search Console y Bing Webmaster Tools

1. Añadir la propiedad `https://habilo.es` en Google Search Console.
2. Verificar por DNS o etiqueta HTML.
3. Enviar `https://habilo.es/sitemap.xml`.
4. Repetir en Bing Webmaster Tools (importa la verificación de GSC si está disponible).
5. Comprobar en 48-72 h que el sitemap está leído y que `/profesores/...` aparece en cobertura.

### 4.3 Embudo de PostHog

Crear un funnel con estos eventos, en este orden:

1. `$pageview`
2. `landing_cta_clicked`
3. `search_performed`
4. `service_viewed`
5. `referral_visit`
6. `signup_started`
7. `login_completed`
8. `service_request_created`
9. `lead_submitted`
10. `share_clicked`
11. `message_sent`

Comprobar que `lead_submitted` incluye `perfil_id` y `canal`, y que `share_clicked` incluye `provider_id` y `channel`.

---

## 5. UTMs y referidos

| Parámetro | Valores permitidos |
|---|---|
| `utm_source` | `tiktok`, `instagram`, `youtube`, `x`, `teacher`, `ampa`, `school`, `pr`, `blog`, `google` |
| `utm_medium` | `social`, `referral`, `email`, `organic`, `cpc` |
| `utm_campaign` | `talavera-clases`, `profes-mates`, `shorts-01` |

Reglas:

- `?ref=CODIGO` se guarda en `leads.ref` y no se mezcla con UTM.
- No reutilizar `utm_source` para referidos de profesor; usa `utm_source=teacher`.
- No meter datos personales en la URL.
- Revisar que `frontend` conserva `?ref=` al pasar por `/` y `/login`.

---

## 6. Checklist semanal

Cada lunes, 30 minutos:

- [ ] Visitas por fuente (Vercel Analytics y PostHog).
- [ ] Top páginas y consultas en Search Console.
- [ ] Leads recibidos y canal (`WhatsApp` / `email`).
- [ ] Solicitudes creadas y mensajes enviados.
- [ ] Profesores nuevos y perfiles públicos activados.
- [ ] Reseñas nuevas (mínimo 10 antes de ads).
- [ ] Revisar errores en Sentry.
- [ ] Revisar que no haya leads sin `consentimiento = true`.

---

## 7. Retención y limpieza de leads

- Conservar los leads durante 12 meses desde el último contacto.
- Revisar trimestralmente y borrar los antiguos:

```sql
SELECT count(*) FROM leads WHERE fecha_creacion < now() - interval '12 months';
DELETE FROM leads WHERE fecha_creacion < now() - interval '12 months';
```

Ejecuta primero el `SELECT`, revisa el número y después el `DELETE`. No borres leads con una reclamación abierta.

---

## 8. Gate de publicidad

No activar campañas de pago hasta cumplir:

- 20 profesores con perfil y servicio activo.
- 10 reseñas reales publicadas.
- Landing, perfiles y sitemap verificados en producción.
- Consentimiento y política de privacidad revisados.

Si no se cumple, el dinero se quema en una web con inventario insuficiente.

---

## 9. Orden de lanzamiento

1. Aplicar migraciones y verificar columnas.
2. Configurar variables de Vercel y backend.
3. Desplegar backend y frontend.
4. Verificar sitemap, robots, perfil público y 404.
5. Pedir opt-in a los 8 profesores.
6. Activar Vercel Analytics, GSC y Bing.
7. Crear el embudo de PostHog.
8. Empezar contenido orgánico con UTMs.
9. Revisar el checklist semanal.
10. Abrir ads solo al pasar el gate.
