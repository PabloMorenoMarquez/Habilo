# Horario del profesor por días y con tramos — diseño

Fecha: 2026-11-22. Estado: aprobado por el usuario el 2026-11-22. Origen: feedback de una profesora del 21/11.

## Por qué

Hoy el perfil tiene un único horario para todos los días: los días marcados (`dias_disponibles`, texto `"1,2,3"`) y un único tramo (`hora_inicio` y `hora_fin`). Quien da clases por la mañana y por la tarde, o con horas distintas según el día, no puede reflejarlo. El horario es solo informativo: no reserva ni bloquea nada.

## Objetivos

- Cada día de la semana tiene su propio horario: no disponible, o entre 1 y 3 tramos.
- Editarlo en el panel sin rellenar siete veces lo mismo.
- Mostrarlo de forma compacta en la ficha pública y en el detalle del anuncio.
- Conservar los 4 horarios que ya hay en producción.

## Fuera de alcance

- Filtrar el buscador por disponibilidad. El formato lo permite más adelante.
- Reservas, calendario o excepciones por fecha.
- Borrar las columnas antiguas: se dejan de usar y se borrarán más adelante.

## Enfoque elegido

Un campo nuevo, `perfiles_proveedor.horario` (`JSONB`, nulo si no hay horario). Las alternativas que se descartaron:

- **Tabla `tramos_horario`:** más SQL, más joins y más código de borrado de cuenta, sin ganar nada mientras no se filtre.
- **Ampliar los campos de texto actuales:** no admite varios tramos sin inventar un formato de texto.

### Formato

```json
{"1": [{"inicio": "09:00", "fin": "13:00"}, {"inicio": "15:00", "fin": "20:00"}], "2": [{"inicio": "17:00", "fin": "21:00"}]}
```

- Las claves van de `"1"` (lunes) a `"7"` (domingo). Solo aparecen los días disponibles.
- Un objeto vacío `{}` se guarda como `NULL`.
- Reglas, que aplica el backend (el frontend avisa antes):
  - las horas van en formato `HH:MM`, de 00:00 a 23:59;
  - `inicio < fin`;
  - un día tiene como mucho 3 tramos, y ninguno puede estar vacío;
  - los tramos de un mismo día no se solapan. Se guardan ordenados por `inicio`.

### Migración

`backend/migrations/2026-11-22_horario_por_dias.sql`:

1. Añade la columna.
2. Rellena `horario` en cada perfil con `dias_disponibles`, `hora_inicio` y `hora_fin` no vacíos: cada día marcado recibe el tramo `hora_inicio`–`hora_fin`.
3. No toca las columnas antiguas.

Se aplica a mano en Supabase, con el OK del usuario, antes de lanzar a mano el despliegue del backend: el despliegue automático se detiene cuando el push incluye `backend/migrations`.

### API

- Las salidas del perfil incluyen `horario` en lugar de `dias_disponibles`, `hora_inicio` y `hora_fin`. Son las del panel (`/proveedor/me`) y las públicas: la ficha y el perfil dentro del detalle del anuncio.
- `PATCH /proveedor/me` acepta `horario` validado y deja de aceptar los tres campos viejos.
- El borrado de cuenta (anonimización) también vacía `horario`.

### Panel (editor)

Sustituye a `components/horario-disponibilidad.tsx`. Tiene una fila por día, de lunes a domingo:

- **Interruptor de disponible.** Al activarlo, el día copia los tramos del último día disponible anterior. Si no hay ninguno, empieza con 17:00–21:00.
- **Tramos** con dos campos `time`, un botón para quitar cada tramo y «+ Añadir tramo» (hasta 3).
- **«Copiar a los demás días»**: copia los tramos de ese día a todos los demás días marcados como disponibles.
- **Errores** junto al día, por ejemplo «La hora de fin debe ser posterior a la de inicio» o «Los tramos se solapan». Mientras haya alguno, no se puede guardar.
- Al final, «Guardar horario» y la confirmación «Guardado», como hoy. Se mantiene el texto «Esto es solo informativo…».

### Ficha pública y detalle del anuncio

Un formato común, `formatearHorario(horario)`:

- Agrupa los días seguidos con los mismos tramos: `L–V: 17:00–21:00 · S: 10:00–13:00`.
- Si un día tiene varios tramos, se unen con « y »: `M: 09:00–13:00 y 15:00–20:00`.
- Sin horario, no se muestra la sección, como hoy.

### Después de publicar

Mandar a la profesora que lo pidió una sola línea avisando de que ya está, porque su correo de bienvenida lo prometía. Ver HANDOFF.

## Lo que queda al implementador

Los nombres internos de los componentes, el aspecto visual dentro del estilo actual del panel y cómo se organizan los tests, siguiendo los patrones existentes.
