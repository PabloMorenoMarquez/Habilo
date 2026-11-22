-- Horario por días y con tramos (spec: docs/superpowers/specs/2026-11-22-horario-por-dias-design.md).
-- Idempotente. No borra dias_disponibles, hora_inicio ni hora_fin (se dejan de usar).

alter table perfiles_proveedor add column if not exists horario jsonb;

-- Cada día marcado en dias_disponibles recibe el tramo hora_inicio–hora_fin.
update perfiles_proveedor p
   set horario = (
     select jsonb_object_agg(trim(d), jsonb_build_array(jsonb_build_object('inicio', p.hora_inicio, 'fin', p.hora_fin)))
       from unnest(string_to_array(p.dias_disponibles, ',')) as d
      where trim(d) ~ '^[1-7]$')
 where p.horario is null
   and coalesce(p.dias_disponibles, '') <> ''
   and coalesce(p.hora_inicio, '') <> ''
   and coalesce(p.hora_fin, '') <> '';
