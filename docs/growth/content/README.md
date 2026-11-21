# Contenido de growth

Los posts publicados viven en `frontend/content/blog/`. Esta carpeta conserva el índice, la cadencia y los guiones de shorts.

## Cadencia

- 1 short al día.
- 2 posts por semana.
- Subir frecuencia desde la semana 5 solo si la retención media supera el 40 %.

## Convención de nombres

`AAAA-MM-DD-post-N-slug.md` y `AAAA-MM-DD-shorts-NN-MM.md`.

## UTMs

- Blog: `utm_source=blog`, `utm_medium=organic`, `utm_campaign=post-<slug>`.
- Shorts: `utm_source=tiktok|instagram|youtube|x`, `utm_medium=social`, `utm_campaign=shorts-NN`.

El `campaign` identifica el contenido. El `source` identifica la plataforma. No mezclar ambos.

## Estado

| Archivo | Tipo | Estado |
| --- | --- | --- |
| `frontend/content/blog/como-elegir-profesor-particular-talavera.md` | Post | Publicado |
| `frontend/content/blog/precio-clases-particulares-talavera.md` | Post | Publicado |
| `2026-11-12-shorts-01-03.md` | 3 shorts | Publicado (14-18 nov) |
| `2026-11-21-shorts-04-06.md` | 3 shorts (2 profesores, 1 familias) | Exportado, sin publicar |

## Antes de publicar

1. Revisar que los datos sigan vigentes: precios y número de servicios cambian.
2. No publicar testimonios ni reseñas inventadas.
3. Enlazar solo a páginas públicas e indexables.
4. Añadir el canonical correcto cuando exista `/blog`.
