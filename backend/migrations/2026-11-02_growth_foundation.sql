-- Crecimiento: campos de catálogo en perfiles/servicios y modelo de leads.
BEGIN;

ALTER TABLE perfiles_proveedor
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS materias text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perfil_publico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimiento_marketing boolean NOT NULL DEFAULT false;

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS materias text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niveles text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY,
  servicio_id uuid REFERENCES servicios(id),
  perfil_id uuid REFERENCES perfiles_proveedor(id),
  proveedor_id uuid NOT NULL REFERENCES perfiles_proveedor(id),
  nombre text NOT NULL,
  contacto text NOT NULL,
  canal_contacto text NOT NULL,
  mensaje text NOT NULL,
  consentimiento boolean NOT NULL,
  ref text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  pagina_origen text,
  estado text NOT NULL DEFAULT 'nuevo',
  fecha_creacion timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_proveedor_fecha
  ON leads (proveedor_id, fecha_creacion DESC);

COMMIT;
