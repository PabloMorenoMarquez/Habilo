# Habilo — Diseño de crecimiento (A + B)

Fecha: 2026-11-02
Estado: aprobado
Ámbito: marketing, SEO, contenido, analítica y producto público

---

## 1. Resumen ejecutivo

Habilo tiene un problema de mercado antes que un problema de tráfico: 8 profesores, 6 servicios activos, 0 reseñas y una web que Google no puede leer. La portada `https://habilo.es/` es un muro de login. `/home` es pública, pero el HTML inicial muestra `0 servicios encontrados` y `Necesitamos tu ubicación`; el catálogo se carga solo en el navegador. El sitemap incluye 3 de los 6 servicios y 31 categorías con UUID. La búsqueda `site:habilo.es` no devolvió resultados.

Con ese escaparate, traer visitas masivas genera una mala primera impresión y boca a boca negativo. La estrategia elegida es **A + B**:

- **A. Dominio local en Talavera de la Reina**: arreglar el escaparate, SEO local, densidad de profesores, referidos y alianzas locales.
- **B. Motor de contenido automatizado**: vídeo corto diario sin cara en TikTok, Instagram, YouTube y X, más blog. La producción se automatiza; la publicación se semiautomatiza con revisión humana.

El objetivo no es “visitas” sin más. Es **visitas cualificadas que encuentren profesor y generen contactos**, más marca local y boca a boca. El tráfico sin inventario destruye la confianza.

**Decisión clave:** primero se arregla el escaparate y se llena Talavera de profesores; después se escala el contenido y, solo al final, la publicidad pagada.

---

## 2. Diagnóstico

### 2.1 Lo que existe hoy

| Elemento | Estado actual | Problema |
|---|---|---|
| Portada `/` | Login con Google/Facebook | Google ve un muro; no hay propuesta de valor ni catálogo |
| `/home` | Pública, cliente | HTML inicial vacío de servicios; Google no ve profesores |
| Servicios | 6 activos | 4 de 6 están en categoría `otros`; no hay ciudad visible |
| Profesores | 8 | Sin verificación, sin reseñas, sin perfil público indexable |
| Categorías | 32 | `clases_particulares` existe, pero mal usada; slugs con UUID en sitemap |
| Sitemap | 36 URLs | 3 servicios de 6; 31 categorías con `?categoria=UUID`; sin ciudades ni materias |
| Metadatos | Aceptables en home | Servicio sale como `Servicio — Habilo`; la API de servidor no responde en build |
| Analítica | PostHog activo; Vercel Analytics 404 | No hay embudo ni panel único; Umami no existe |
| SEO | `robots.txt` y sitemap | Sin Search Console, sin contenido, sin enlaces, sin indexación |
| Contenido | Ninguno | Sin blog, sin páginas de ciudad/materia, sin perfiles de profesor |
| Confianza | “Miles de profesionales verificados” | Falso; resta credibilidad |
| Contacto | Requiere OAuth | Un visitante de SEO o shorts no crea cuenta solo para preguntar |
| Pagos | Stripe desactivado (`pagos_habilitados: false`) | Reseñas y cierre dependen de un flujo manual/offline |
| Consentimiento | Sin CMP | PostHog y session replay sin base legal explícita |
| Datos de profesor | Sin materias, niveles ni ciudad estructurados | No se pueden generar páginas ciudad × materia ni medir “perfil completo” |
| Google Business Profile | No evaluado | Un marketplace online normalmente no cumple elegibilidad |

### 2.2 Competencia local

En Talavera compiten TusClasesParticulares, Superprof, Preply, Milanuncios y academias locales. No se gana por catálogo: se gana por **confianza local, disponibilidad real y facilidad de contacto**. Habilo puede diferenciarse con profesores de Talavera, precios claros, perfiles verificados y respuesta rápida.

### 2.3 Restricciones del fundador

- Sin dar la cara ni poner la voz personal.
- Se acepta voz sintética, texto en pantalla, grabación de pantalla, B-roll y contenido de profesores con consentimiento.
- Automatización prioritaria, pero con revisión humana donde la calidad o la ley lo exijan.
- Presupuesto inicial bajo; se asume 0-50 €/mes en herramientas y 150-300 €/mes solo cuando haya inventario.
- Tiempo estimado del fundador: 5-8 h/semana para revisar, aprobar, hablar con profesores y medir.

Si estos supuestos cambian, cambia el calendario, no la dirección.

---

## 3. Objetivos y métricas

### 3.1 Norte

**Contactos cualificados por semana** (solicitud creada o mensaje enviado a un profesor), no visitas brutas.

### 3.2 Métricas secundarias

- Visitas cualificadas: sesiones que llegan a una página de servicio, categoría o ciudad.
- Profesores activos con perfil completo.
- Servicios publicados y bien categorizados.
- Reseñas reales.
- Posición media y clics en Search Console para consultas locales.
- Reproducciones, retención y clics al sitio desde vídeo corto.
- Profesores captados por referido.

### 3.3 Objetivos a 90 días

| Métrica | Día 30 | Día 60 | Día 90 |
|---|---|---|---|
| Profesores activos | 15 | 22 | 30 |
| Servicios publicados | 25 | 35 | 50 |
| Reseñas reales | 5 | 10 | 10-20 |
| Vídeos cortos publicados | 30 | 85 | 140 |
| Artículos de blog | 8 | 20 | 32 |
| Visitas/mes (conservador) | 500 | 1.200 | 2.000 |
| Visitas/mes (base) | 1.000 | 2.500 | 4.000 |
| Visitas/mes (optimista) | 2.000 | 6.000 | 10.000 |
| Contactos/mes | 10 | 40 | 100 |

Los rangos son objetivos, no promesas. Dependen de la densidad de profesores, la calidad del contenido y el algoritmo de cada plataforma.

### 3.4 Anti-objetivos

- Tráfico masivo a un catálogo vacío.
- Contenido AI masivo sin revisar.
- Seguidores o reseñas compradas.
- Spam en grupos de Facebook o WhatsApp.
- Prometer “miles de profesionales” cuando hay 8.
- Anuncios pagados antes de tener 20 profesores y 10 reseñas.

---

## 4. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Analítica | PostHog + Vercel Analytics + Search Console | PostHog ya está integrado; permite embudo, cohorts y session replay. Umami añade otro silo y no aporta embudo. |
| Panel | PostHog + `/admin/growth` dentro de la app | Netlify es hosting estático; un panel separado duplica trabajo. La app ya vive en Vercel. |
| Landing | Portada pública con buscador y servicios reales | Sin esto, SEO y campañas gastan dinero en un muro. |
| SEO | Páginas ciudad × materia con inventario real | Evita contenido fino; ataca intención local. |
| Blog | 2 posts/semana, AI-assisted con revisión | Calidad y seguridad frente a Google; no spam automático. |
| Vídeo | 1/día, 3 plataformas, formato sin cara | Volumen y reconocimiento; producción automatizada. |
| Publicación | YouTube y X por API; TikTok/IG con Metricool o aprobación manual | Las APIs de TikTok/IG no permiten publicación 100% fiable sin revisión y permisos. |
| Fake-door Pro | Aplazado | Sin tráfico ni funciones pro, no recoge nada y quema confianza. |
| X | Incluido, pero no prioritario | Útil para profesores y build-in-public; no para padres de Talavera. |
| Ads | Fase 2, tras 20 profesores y 10 reseñas | Con 6 servicios, el dinero se quema. |
| Umami | Descartado | PostHog + Vercel + GSC cubren el 100% de lo necesario. |
| Contacto sin cuenta | Aprobado: formulario nombre + WhatsApp/email + mensaje + consentimiento | Es el mayor cuello de conversión para tráfico frío. |
| Reseñas | Aprobado: enlace manual tras clase; mínimo 10, objetivo 20 | Con pagos offline no se genera una solicitud completada automáticamente. |
| Google Business Profile | Descartado | Un marketplace online no suele cumplir los requisitos de elegibilidad. |
| Consentimiento | Banner CMP y política de privacidad actualizada | PostHog y session replay necesitan base legal explícita. |
| Email | Resend con doble opt-in solo para waitlist; WhatsApp como canal principal | Evita una newsletter sin base legal y sin volumen. |
| Verificación | Insignia solo con verificación manual; si no, quitarla | Evita un claim falso y protege la confianza. |
| Datos estructurados | Añadir `materias`, `niveles` y `ciudad` | Sin ellos no hay páginas ciudad × materia ni KPI de perfil completo. |
| Perfiles públicos | Aprobado con opt-in explícito; sin consentimiento, anonimizado y `noindex` | Protege datos personales y permite indexar inventario real. |
| Cadencia de contenido | 1 short/día y 2 posts/semana al inicio; 2 shorts/día y 3 posts/semana desde la semana 5 si la retención supera el 40% | El fundador no limita horas; la calidad y el algoritmo sí. |
| Revisión humana | 30-45 min/día para aprobar vídeos y posts | Evita contenido AI defectuoso y protege la marca. |

---

## 5. Estrategia A + B

### 5.1 Lógica

Tres bucles se refuerzan:

1. **Bucle de oferta**: reclutar profesor → perfil completo → comparte con sus alumnos → visitas cálidas → reseñas → más profesores.
2. **Bucle SEO local**: servicios reales → páginas ciudad/materia → rankings → visitas con intención → contactos → reseñas → más rankings.
3. **Bucle de contenido**: vídeo corto y blog → marca y alcance → búsquedas de marca → visitas → contactos.

La automatización acelera los bucles 1 y 3. No sustituye la densidad de oferta ni la confianza.

### 5.2 Fases

- **Fase 0 (semana 1): medición y limpieza.** Analítica, UTMs, Search Console, corregir datos falsos.
- **Fase 1 (semanas 1-2): escaparate.** Portada pública, SSR, perfiles, categorías, ciudades, schema.
- **Fase 2 (semanas 1-4): oferta.** 15-30 profesores, servicios completos, reseñas, referidos.
- **Fase 3 (semanas 2-6): SEO local.** 20-30 páginas ciudad/materia, blog, Google Business Profile, enlaces locales.
- **Fase 4 (semanas 2-12): contenido.** 90 shorts, 18 posts, X.
- **Fase 5 (semanas 3-8): alianzas y PR.** AMPAs, colegios, academias, medios locales.
- **Fase 6 (después del día 60): ads.** Solo con inventario y reseñas.

---

## 6. Líneas de trabajo

### 6.1 Medición y analítica

**Objetivo:** saber qué canal trae visitas, qué páginas convierten y dónde se pierde la gente.

Acciones:

- Activar Vercel Analytics en el proyecto o eliminar el script que devuelve 404.
- Crear un panel en PostHog con el embudo:
  `$pageview` → `search_performed` → `service_viewed` → `signup_started` → `signup_completed` → `service_request_created` → `message_sent`.
- Añadir eventos que hoy no existen:
  - `landing_cta_clicked` (buscar / soy profesor)
  - `search_performed` (con `query`, `category`, `city`)
  - `service_viewed` (con `service_id`, `category`, `city`)
  - `share_clicked` (con `channel`)
  - `referral_visit` (con `code`)
  - `waitlist_submitted` (con `city`, `subject`)
- Convención UTM:
  - `utm_source`: `tiktok`, `instagram`, `youtube`, `x`, `teacher`, `ampa`, `school`, `pr`, `blog`, `google`
  - `utm_medium`: `social`, `referral`, `email`, `organic`, `cpc`
  - `utm_campaign`: `talavera-clases`, `profes-mates`, `shorts-01`, etc.
- Etiquetar todos los enlaces de bio, QR, flyers y mensajes de profesores.
- Configurar Google Search Console y Bing Webmaster Tools; enviar `sitemap.xml`.
- Revisar semanalmente: visitas por fuente, páginas top, consultas, registros, solicitudes, mensajes, profesores nuevos, reseñas.

**Entregable:** panel de PostHog + informe semanal automático en Markdown generado por script.

### 6.2 Escaparate público y SEO técnico

**Objetivo:** que Google y una persona vean valor en menos de 5 segundos.

Acciones:

- Sustituir `/` por una landing pública:
  - H1: “Clases particulares en Talavera de la Reina, con profesores reales”.
  - Buscador por materia y ciudad.
  - 6 servicios reales visibles, con precio, profesor y valoración.
  - CTA “Buscar profesor” y “Soy profesor”.
  - Prueba social honesta: “8 profesores locales”, “Pago directo al profesor”, “Sin comisiones ocultas”.
  - Eliminar “Miles de profesionales verificados”. Si no hay verificación manual, quitar también “verificados”.
- Añadir contacto sin cuenta (aprobado):
  - Formulario con nombre, WhatsApp o email, mensaje y consentimiento.
  - Crea un lead, notifica al profesor y guarda atribución UTM.
  - Debe tener rate limit y antispam; no crea cuenta ni exige OAuth.
  - El profesor recibe el lead por email y puede responder por WhatsApp o desde el panel.
- Renderizar `/home` en servidor con servicios y categorías iniciales. El HTML debe contener profesores, no un estado vacío.
- Corregir `generateMetadata` de servicio: la API de servidor debe usar `API_URL` interno de producción, no `localhost`.
- Crear perfil público de profesor `/profesores/[id]`:
  - Bio, materias, precio, disponibilidad, radio, servicios, reseñas.
  - CTA “Contactar”.
  - `Person` + `Service` + `AggregateRating` schema cuando haya reseñas.
- Crear páginas públicas de servicio con contenido SSR y enlaces internos.
- Corregir categoría `clases_particulares`: migrar los 4 servicios de `otros`, añadir slug legible.
- Añadir campos estructurados al perfil y al servicio:
  - `materias` (matemáticas, inglés, lengua, física, química, etc.).
  - `niveles` (primaria, ESO, bachillerato, universidad, adultos).
  - `ciudad` y `zona`.
  - Sin estos campos no se pueden generar páginas ciudad × materia ni medir “perfil completo”.
- Añadir botón “Compartir por WhatsApp” en servicio y perfil.
- Corregir icono PWA 404 (`/icons/icon-192.png`).
- Añadir `FAQPage` y `BreadcrumbList` schema en páginas de ciudad/materia.
- Actualizar sitemap: incluir todos los servicios activos, perfiles y páginas ciudad/materia; excluir filtros con UUID.
- Revisar `robots.txt`: permitir blog, perfiles y páginas públicas.
- Añadir CMP y actualizar la política de privacidad antes de activar session replay o campañas.

**Rutas propuestas:**

```
/                                   landing pública
/home                               catálogo público SSR
/home/service/[id]                  servicio público
/profesores/[id]                    perfil público
/clases-particulares/[ciudad]       página de ciudad
/clases-particulares/[ciudad]/[materia]  página ciudad × materia
/blog                               índice
/blog/[slug]                        artículo
```

**Regla:** solo se indexan páginas ciudad × materia con al menos un profesor real que cubra esa combinación. Si no hay oferta, se puede publicar una página de waitlist con `noindex` y capturar WhatsApp/email, pero no cuenta para el objetivo SEO. Con 6 servicios, el arranque realista es de 8-12 páginas, no 30.

**Google Business Profile:** no asumirlo. Un marketplace online normalmente no cumple los requisitos. Antes de crearlo, verificar elegibilidad; si no, sustituirlo por citaciones locales, PR y páginas de partners.

### 6.3 Densidad de oferta y referidos

**Objetivo:** que cada visita encuentre profesor. Sin esto, el resto falla.

Acciones:

- Reclutar hasta 30 profesores en Talavera:
  - UCLM (magisterio, filología, ciencias).
  - Academias locales.
  - Grupos de Facebook de profesores de Talavera/Toledo.
  - LinkedIn e Instagram DM.
  - Flyers en bibliotecas, cafeterías y centros de estudio.
- Oferta de captación:
  - Perfil gratis.
  - Un mes destacado gratis.
  - Sin comisión durante el piloto.
  - Pago directo al profesor.
- Checklist de perfil completo:
  - Foto, bio, materias, niveles, precio, disponibilidad, radio, ciudad.
  - Al menos 1 servicio publicado.
  - Respuesta a mensajes en menos de 24 h.
- Consentimiento explícito:
  - Checkbox para publicar nombre, foto, ciudad, precio y disponibilidad en un perfil indexable.
  - Checkbox separado para usar su imagen o voz en marketing.
  - Sin consentimiento: perfil anonimizado, sin foto y `noindex`.
- Verificación manual:
  - Revisar identidad y titulación cuando el profesor la aporte.
  - Si no hay verificación, quitar “verificado” del copy y de la insignia.
- Reseñas con pagos offline:
  - El profesor recibe un enlace único tras la clase y lo envía por WhatsApp.
  - La reseña se vincula a una solicitud o a una confirmación manual del admin.
  - No inventar reseñas ni importar opiniones de terceros.
  - Mínimo 10 reseñas reales para activar ads y PR; objetivo 20 al día 90.
- Kit de referido para cada profesor:
  - Enlace `?ref=CODIGO`.
  - Mensaje listo para WhatsApp.
  - Story de Instagram con su perfil.
  - QR para imprimir.
- Incentivo:
  - Profesor referido: 1 mes destacado gratis.
  - Padre/alumno referido: clase de prueba o descuento coordinado offline.
- Pedir reseña tras cada clase con enlace directo de WhatsApp.
- Revisar cada semana: profesores nuevos, perfiles incompletos, servicios mal categorizados, reseñas.

**Meta:** 30 profesores, 50 servicios y 10-20 reseñas reales al día 90.

### 6.4 Motor de vídeo corto sin cara

**Objetivo:** alcance y reconocimiento de marca sin que el fundador aparezca.

**Formatos aprobados:**

1. **Grabación de pantalla**: “Busco profe de mates en Talavera” → filtros → perfil → contacto. 15-25 s.
2. **Texto en pantalla con B-roll**: “Mi hijo suspendió mates. Esto hice.” 20-30 s.
3. **Comparativa de precios**: “Clases de inglés en Talavera: 8 € vs 17 €/h”.
4. **Profesor destacado**: captura de perfil + bio + voz sintética, con consentimiento.
5. **3 errores al elegir profe particular**.
6. **Dato local**: “En Talavera hay X profes de matemáticas disponibles”.
7. **Mito vs realidad**.
8. **Antes/después ficticio y etiquetado** como ejemplo, nunca como testimonio falso.

**Reglas de formato:**

- 9:16, 1080×1920, menos de 30 s.
- Gancho en los primeros 2 s.
- Subtítulos siempre.
- CTA: “Link en bio” o “Busca tu profe en habilo.es”.
- Voz sintética solo si suena natural; alternativa: música + texto.
- Sin caras de stock haciendo pasar por profesores reales.
- Contenido de profesores solo con consentimiento escrito.
- Etiquetar contenido generado con IA cuando la plataforma lo exija.

**Pipeline de producción:**

```
banco de guiones (JSON/MD)
  → generador de guion (opencode)
  → TTS español (ElevenLabs/Azure) o solo texto
  → grabación de pantalla (Playwright, datos demo)
  → B-roll (Higgsfield/Pexels)
  → montaje y subtítulos (ffmpeg/Remotion + Whisper)
  → cola de revisión humana
  → publicación programada
```

**Publicación:**

- YouTube Shorts: API de YouTube.
- X: API de X (plan gratuito/basic) o programador.
- TikTok e Instagram: Metricool/Buffer en plan gratuito o publicación manual aprobada. La automatización total por API no es fiable sin revisión de plataforma.
- Cadencia: 1/día desde la semana 1. Desde la semana 5, 2/día si la retención media supera el 40% y hay clics.
- Reutilización: cada vídeo se publica en las 4 plataformas con copy adaptado.
- Medición: views, retención, clics UTM, seguidores, guardados y compartidos.
- Matar formatos con menos de 500 views tras 10 intentos.

**Herramientas:**

- Playwright ya está en el repo para grabar pantalla.
- ffmpeg para montaje.
- Whisper para subtítulos.
- ElevenLabs/Azure para voz.
- Higgsfield o Pexels para B-roll.
- Metricool/Buffer para programar.

### 6.5 Blog

**Objetivo:** capturar búsquedas de padres y dar contenido a los shorts.

Acciones:

- 2 posts/semana al inicio; 3 posts/semana desde la semana 5. 1.200-1.800 palabras.
- AI redacta borrador; una persona verifica datos locales, precios, nombres y enlaces.
- Cada post:
  - Keyword principal y intención.
  - Introducción con problema real.
  - Datos locales de Talavera.
  - Enlaces a páginas ciudad/materia y profesores.
  - CTA a buscar profesor.
  - Schema `Article`.
- Temas iniciales:
  - “Cuánto cuesta un profesor particular en Talavera en 2026”.
  - “Cómo elegir profesor de matemáticas para ESO”.
  - “Clases de inglés para niños en Talavera: presencial vs online”.
  - “Qué hacer si tu hijo suspende matemáticas”.
  - “Clases de apoyo para Bachillerato en Talavera”.
  - “Profesor particular a domicilio vs online”.
- Reutilizar cada post en 3 shorts y 1 hilo de X.
- No publicar 100% AI sin revisar. Google penaliza contenido masivo sin valor.
- Waitlist:
  - WhatsApp como canal principal: enlace `wa.me` con mensaje prellenado y UTM.
  - Email secundario con Resend, doble opt-in y baja visible.
  - No crear newsletter hasta tener 100 suscriptores.
  - La política de privacidad debe cubrir el uso comercial de estos datos.

### 6.6 X

**Objetivo:** atraer profesores, early adopters y backlinks. No es canal principal de padres.

Acciones:

- 2 posts/día, automatizados desde el mismo calendario.
- Contenido:
  - Short del día.
  - Dato local.
  - Build-in-public: “Habilo llegó a X profesores”.
  - Perfil de profesor destacado.
  - Hilo mensual de aprendizajes.
- Revisión semanal de 15 minutos.
- No usar DMs masivos ni automatizar seguimiento.

### 6.7 Alianzas locales y PR

**Objetivo:** confianza y boca a boca offline, sin dar la cara.

Acciones:

- Contactar 10 AMPAs, 10 colegios, 5 academias, 3 bibliotecas y 3 cafeterías/centros de estudio.
- Oferta:
  - Cartel con QR para familias.
  - “Taller para padres: cómo elegir profesor particular” (puede ser online o material descargable).
  - Código exclusivo.
- PR local:
  - Nota de prensa a La Tribuna de Talavera, Cadena SER Talavera, ABC Toledo, eldiario.es Toledo.
  - Ángulo: “Un vecino de Talavera crea Habilo para conectar profesores y alumnos”.
  - Entrevista por email, sin foto ni voz. Logo y capturas del producto.
- Citaciones locales: Páginas Amarillas, Cylex, Infoisinfo y directorios de Talavera. No asumir Google Business Profile.
- Medir con UTM `utm_source=ampa|school|pr`.
- Meta: 5 alianzas y 2 menciones en medios al día 90.

### 6.8 Publicidad pagada (fase 2)

No antes de 20 profesores y 10 reseñas.

- Google Ads:
  - “clases particulares Talavera”
  - “profesor particular matemáticas Talavera”
  - “clases de inglés Talavera”
  - Concordancia exacta/frase, 5-10 €/día.
- Meta/TikTok:
  - Radio 20 km de Talavera.
  - 5 €/día.
  - Retargeting de visitantes.
- Medir coste por solicitud. Pausar si supera 15 €.
- Presupuesto de prueba: 150-300 €/mes.

### 6.9 Panel de control

**Objetivo:** ver de un vistazo qué funciona.

- PostHog: embudo, fuentes, páginas, cohorts, session replay.
- Vercel Analytics: visitas y países.
- Search Console: consultas, clics, impresiones, posición media.
- `/admin/growth`: página protegida dentro de la app con:
  - Visitas últimos 7/30 días.
  - Fuente de tráfico.
  - Top páginas y búsquedas.
  - Registros, solicitudes, mensajes y leads sin cuenta.
  - Profesores y servicios activos.
  - Reseñas.
  - Vídeos y posts publicados.
- Informe semanal automático en Markdown generado por script con APIs de PostHog y GSC.

**No se construye un dashboard separado en Netlify.** La app ya está en Vercel; duplicar hosting y autenticación no aporta.

---

## 7. Arquitectura de automatización

### 7.1 Estructura propuesta

```
scripts/growth/
├── generate-scripts.ts        # guiones desde banco de ideas
├── generate-voice.ts          # TTS
├── record-demo.ts             # Playwright, flujo real con datos demo
├── render-video.ts            # ffmpeg/Remotion + subtítulos
├── generate-blog.ts           # borradores MDX
├── publish-youtube.ts         # YouTube API
├── publish-x.ts               # X API
├── schedule-metricool.ts      # TikTok/IG (si hay API/plan)
└── weekly-report.ts           # PostHog + GSC → Markdown
```

### 7.2 Flujo diario

1. `generate-scripts.ts` crea 1-3 guiones desde el banco.
2. `generate-voice.ts` genera voz o deja solo texto.
3. `record-demo.ts` graba pantalla con datos demo.
4. `render-video.ts` monta, subtitula y exporta.
5. El vídeo cae en `content/queue/`.
6. El fundador revisa 10-15 minutos y mueve a `content/approved/`.
7. `publish-*` publica o programa.
8. `weekly-report.ts` genera informe.

### 7.3 Reglas de automatización

- Ningún contenido se publica sin aprobación humana.
- Ninguna API key se commitea; usar `.env.local` y GitHub Secrets.
- Los vídeos no muestran datos personales reales sin consentimiento.
- Los datos demo no deben parecer testimonios reales.
- Si una plataforma bloquea la automatización, se usa programador oficial o subida manual.

### 7.4 Qué se automatiza y qué no

| Tarea | Automatización | Revisión humana |
|---|---|---|
| Guion | 90% | Sí, 2 min |
| Voz | 90% | Sí, calidad |
| Grabación de pantalla | 100% | No |
| Montaje/subtítulos | 95% | Sí, 2 min |
| Publicación YouTube/X | 90% | Programada |
| Publicación TikTok/IG | 50-70% | Sí, o Metricool |
| Blog | 70% | Sí, hechos y enlaces |
| SEO on-page | 80% | Sí, datos reales |
| Informe semanal | 100% | No |
| Respuesta a profesores | 0% | Sí |

---

## 8. Calendario 90 días

### Semanas 1-2

- Medición: Vercel Analytics, PostHog, GSC, UTMs.
- CMP y política de privacidad.
- Landing pública y SSR.
- Corregir categorías y metadatos.
- Campos estructurados: materias, niveles, ciudad.
- Perfil público de profesor.
- Contacto sin cuenta (aprobado).
- Reclutar 10 profesores.
- 14 shorts (1/día) y 4 posts (2/semana).

### Semanas 3-4

- 8-12 páginas ciudad/materia.
- Citaciones locales; verificar elegibilidad de Google Business Profile antes de crearlo.
- 15 profesores, 25 servicios.
- 28 shorts acumulados, 8 posts.
- Primeras 3 alianzas locales.
- Nota de prensa.

### Semanas 5-8

- 20-25 páginas SEO.
- 22 profesores, 35 servicios, 10 reseñas.
- 2 shorts/día (56 más; 84 acumulados).
- 3 posts/semana (12 más; 20 acumulados).
- 5 alianzas.
- Optimizar según datos.
- Evaluar ads.

### Semanas 9-12

- 30 profesores, 50 servicios, 10-20 reseñas.
- 2 shorts/día (56 más; 140 acumulados).
- 3 posts/semana (12 más; 32 acumulados).
- 2 menciones de prensa.
- 100 contactos/mes.
- Decidir fase 3: expansión a Toledo o ads.

---

## 9. Presupuesto y tiempo

### 9.1 Presupuesto mensual

| Concepto | Inicial | Con ads |
|---|---|---|
| Hosting/dominio | Ya existe | Ya existe |
| TTS | 5-22 € | 22 € |
| Higgsfield/B-roll | 0-30 € | 30 € |
| Programador social | 0-18 € | 18 € |
| CMP/email (Resend free) | 0-10 € | 10 € |
| Ads | 0 € | 150-300 € |
| **Total** | **5-80 €** | **230-380 €** |

### 9.2 Tiempo del fundador

- Revisión de contenido: 30-45 min/día.
- Profesores y alianzas: 2-3 h/semana.
- Analítica: 30 min/semana.
- Total: 5-7 h/semana. El fundador no pone límite de horas; la cadencia se ajusta por calidad y resultados.

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pocos profesores | Visitas sin resultado | No promocionar materias/ciudades sin inventario; captar demanda con waitlist |
| Contenido AI genérico | Bajo alcance y penalización | Gancho local, datos reales, revisión humana, rostros reales solo con permiso |
| APIs de TikTok/IG | Publicación no 100% automática | Metricool/Buffer o aprobación manual |
| SEO lento | Desánimo | PR local, referidos y shorts mientras madura |
| Reseñas falsas o escasez | Desconfianza | Reseñas verificadas tras clase; no inventar |
| Datos personales | Legal | Consentimiento de profesores; no mostrar caras/datos sin permiso |
| Saturación de contenido | Baja retención | Matar formatos malos; 3/semana antes de 1/día |
| Dependencia de una plataforma | Caída de tráfico | 4 plataformas + SEO + referidos + email |
| Contacto con fricción OAuth | La mayoría del tráfico frío no contacta | Formulario sin cuenta o WhatsApp; medir lead |
| Reseñas no verificables | No se llega al mínimo para ads/PR | Enlace manual tras clase; confirmación admin; no inventar |
| Sin CMP | Riesgo legal y pérdida de datos | Banner de consentimiento y política actualizada |
| Google Business Profile no elegible | Pierde un canal local | Verificar antes; sustituir por citaciones y PR |
| Perfiles sin consentimiento | Riesgo legal y mala imagen | Opt-in explícito; perfil anonimizado si falta |

---

## 11. Qué no haremos

- No fake-door de plan Pro.
- No 100+ páginas programáticas sin profesores.
- No blog masivo 100% AI sin revisar.
- No comprar seguidores, reseñas o engagement.
- No spam en grupos de Facebook/WhatsApp.
- No anuncios antes de tener inventario.
- No dashboard separado en Netlify.
- No usar Umami; PostHog + Vercel + GSC es suficiente.
- No mostrar la cara ni usar la voz del fundador.
- No prometer “miles de profesionales”.

---

## 12. Supuestos y decisiones pendientes

### Supuestos

- El piloto sigue en Talavera de la Reina y radio de 50 km.
- Los 8 profesores actuales son reales y se puede contactar con ellos.
- Hay acceso a Vercel, dominio, Google Search Console y PostHog.
- Se puede crear cuenta de TikTok/Instagram/YouTube/X de marca.
- Presupuesto inicial 0-80 €/mes.
- 5-7 h/semana del fundador, con margen para subir si hace falta.

### Decisiones aprobadas

1. **Contacto sin cuenta:** aprobado. Formulario con nombre, WhatsApp/email, mensaje y consentimiento; rate limit y antispam.
2. **Perfiles públicos:** aprobados con opt-in explícito. Sin consentimiento, perfil anonimizado y `noindex`.
3. **Vídeo con profesores:** empezar solo con capturas y texto; consentimiento aparte para imagen o voz.
4. **Reseñas:** flujo manual con enlace único tras clase y confirmación admin; mínimo 10.
5. **Canal principal:** WhatsApp para leads; Resend con doble opt-in solo para waitlist.
6. **Revisión de contenido:** el fundador revisa 30-45 min/día.
7. **Cadencia:** 1 short/día y 2 posts/semana al inicio; 2 shorts/día y 3 posts/semana desde la semana 5 si la retención supera el 40%.

### Decisión pendiente

- **¿Toledo al día 90 o profundizar Talavera?** Se decide con datos de demanda y densidad de profesores.

---

## 13. Criterios de éxito

Al día 90, el proyecto se considera viable si:

- 30 profesores activos y 50 servicios bien categorizados.
- 10-20 reseñas reales.
- 2.000-4.000 visitas/mes con al menos 40% de intención local.
- 100 contactos/mes, con contacto sin cuenta aprobado.
- 5 alianzas locales y 2 menciones de prensa.
- 140 shorts y 32 posts publicados.
- Panel de analítica funcionando y revisado semanalmente.

Si no se cumple, se ajusta el canal, no se añade otro.

---

## 14. Siguiente paso

Aprobado este diseño, se escribe el plan de implementación con tareas, dependencias, archivos y criterios de aceptación. La primera entrega será la Fase 0-1: medición, landing pública, SSR, categorías y perfiles.
