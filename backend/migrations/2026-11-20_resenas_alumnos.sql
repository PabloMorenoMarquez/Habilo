-- Reseñas de alumnos por enlace (habilo.es/opina/<código>).
-- Ejecutar en Supabase ANTES de desplegar el backend que lee `codigo_resenas`.
BEGIN;

-- 1. Código del enlace de reseñas de cada profesor.
ALTER TABLE perfiles_proveedor
  ADD COLUMN IF NOT EXISTS codigo_resenas text UNIQUE;

-- Perfiles existentes: 10 caracteres URL-safe sacados de gen_random_uuid()
-- (azar criptográfico, ~56 bits; incluido en Postgres 13+, sin pgcrypto).
-- Los perfiles nuevos reciben un código desde el backend al crearse.
UPDATE perfiles_proveedor
   SET codigo_resenas = substr(
         translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/', '-_'),
         1, 10)
 WHERE codigo_resenas IS NULL;

-- 2. Reseñas de alumnos (separadas de `valoraciones`).
CREATE TABLE IF NOT EXISTS resenas_alumnos (
  id uuid PRIMARY KEY,
  perfil_id uuid NOT NULL REFERENCES perfiles_proveedor(id),
  puntuacion integer NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario text NOT NULL CHECK (char_length(comentario) BETWEEN 20 AND 1000),
  autor_nombre text NOT NULL CHECK (char_length(autor_nombre) BETWEEN 1 AND 40),
  relacion text NOT NULL CHECK (relacion IN ('alumno', 'padre_madre')),
  antiguedad text NOT NULL CHECK (antiguedad IN ('menos_3_meses', '3_12_meses', 'mas_1_ano')),
  -- Email o teléfono de quien reseña. Privado: nunca sale en la API pública.
  -- Se borra (NULL) 90 días después de moderar.
  contacto text CHECK (char_length(contacto) <= 120),
  consentimiento boolean NOT NULL CHECK (consentimiento),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  fecha timestamptz NOT NULL DEFAULT now(),
  fecha_moderacion timestamptz,
  CHECK (estado <> 'pendiente' OR contacto IS NOT NULL)
);

-- Una opinión por contacto y profesor (sin distinguir mayúsculas ni espacios).
-- Al borrar el contacto la fila deja de contar.
CREATE UNIQUE INDEX IF NOT EXISTS uq_resenas_alumnos_perfil_contacto
  ON resenas_alumnos (perfil_id, lower(btrim(contacto)))
  WHERE contacto IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resenas_alumnos_perfil_estado
  ON resenas_alumnos (perfil_id, estado);

-- Como `leads`: RLS activo y sin políticas, así anon/authenticated no leen el
-- contacto por la API de Supabase. El backend entra como `postgres` y la salta.
ALTER TABLE resenas_alumnos ENABLE ROW LEVEL SECURITY;

-- 3. Media y número de valoraciones: valoraciones + reseñas de alumnos aprobadas.
CREATE OR REPLACE FUNCTION recalcular_valoracion(p_perfil uuid) RETURNS void AS $$
BEGIN
  -- Bloquear el perfil antes de leer. Si dos transacciones recalculan el mismo
  -- perfil a la vez (moderar una reseña y entrar una valoración), la segunda
  -- espera aquí; como en plpgsql cada sentencia toma una foto nueva, la cuenta
  -- de abajo ya incluye lo que confirmó la primera y no pisa su resultado.
  PERFORM 1 FROM perfiles_proveedor WHERE id = p_perfil FOR UPDATE;

  WITH notas AS (
    SELECT v.puntuacion FROM valoraciones v
      JOIN perfiles_proveedor p ON p.usuario_id = v.destinatario_id
     WHERE p.id = p_perfil
    UNION ALL
    SELECT r.puntuacion FROM resenas_alumnos r
     WHERE r.perfil_id = p_perfil AND r.estado = 'aprobada'
  )
  UPDATE perfiles_proveedor
     SET num_valoraciones = (SELECT count(*) FROM notas),
         valoracion_media = COALESCE((SELECT round(avg(puntuacion)::numeric, 2) FROM notas), 0)
   WHERE id = p_perfil;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_resenas_alumnos_recalcular() RETURNS trigger AS $$
BEGIN
  PERFORM recalcular_valoracion(COALESCE(NEW.perfil_id, OLD.perfil_id));
  -- Si una reseña cambia de profesor, recalcular también el anterior.
  IF TG_OP = 'UPDATE' AND NEW.perfil_id IS DISTINCT FROM OLD.perfil_id THEN
    PERFORM recalcular_valoracion(OLD.perfil_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resenas_alumnos_recalcular ON resenas_alumnos;
CREATE TRIGGER resenas_alumnos_recalcular
  AFTER INSERT OR UPDATE OR DELETE ON resenas_alumnos
  FOR EACH ROW EXECUTE FUNCTION trg_resenas_alumnos_recalcular();

-- 4. `valoraciones` también recalcula con las dos fuentes.
-- En Supabase hay un trigger (fuera del repositorio) que calcula la media solo
-- con `valoraciones`; si siguiera activo, cada valoración nueva borraría de la
-- media las reseñas de alumnos aprobadas. Se borra cualquier trigger de
-- `valoraciones` cuya función escriba la media o el recuento.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tg.tgname
      FROM pg_trigger tg
      JOIN pg_proc p ON p.oid = tg.tgfoid
     WHERE tg.tgrelid = 'valoraciones'::regclass
       AND NOT tg.tgisinternal
       AND tg.tgname <> 'valoraciones_recalcular'
       AND (p.prosrc ILIKE '%valoracion_media%' OR p.prosrc ILIKE '%num_valoraciones%')
  LOOP
    RAISE NOTICE 'Se sustituye el trigger % de valoraciones', t.tgname;
    EXECUTE format('DROP TRIGGER %I ON valoraciones', t.tgname);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trg_valoraciones_recalcular() RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalcular_valoracion(p.id)
       FROM perfiles_proveedor p
      WHERE p.usuario_id = NEW.destinatario_id;
  END IF;
  -- Al borrar, o si la valoración cambia de destinatario, el perfil anterior.
  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE' AND NEW.destinatario_id IS DISTINCT FROM OLD.destinatario_id) THEN
    PERFORM recalcular_valoracion(p.id)
       FROM perfiles_proveedor p
      WHERE p.usuario_id = OLD.destinatario_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS valoraciones_recalcular ON valoraciones;
CREATE TRIGGER valoraciones_recalcular
  AFTER INSERT OR UPDATE OR DELETE ON valoraciones
  FOR EACH ROW EXECUTE FUNCTION trg_valoraciones_recalcular();

-- 5. Todos los perfiles parten de la fórmula nueva.
SELECT recalcular_valoracion(id) FROM perfiles_proveedor;

COMMIT;

-- Comprobación después de ejecutar: en `valoraciones` solo debe quedar
-- `valoraciones_recalcular` (más los internos de las claves foráneas).
--
-- SELECT tgname, pg_get_triggerdef(oid)
--   FROM pg_trigger
--  WHERE tgrelid = 'valoraciones'::regclass AND NOT tgisinternal;
--
-- Si aparece otro que escriba `valoracion_media` a través de otra función
-- (el DO de arriba solo mira la función que llama el trigger), borrarlo con
-- DROP TRIGGER <nombre> ON valoraciones; y repetir el SELECT del paso 5.
