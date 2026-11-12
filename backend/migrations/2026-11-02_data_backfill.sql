BEGIN;

INSERT INTO categorias (id, nombre, icono, descripcion)
SELECT gen_random_uuid(), 'clases_particulares', '📚',
       'Clases particulares de matemáticas, inglés, lengua, ciencias y apoyo escolar.'
WHERE NOT EXISTS (
  SELECT 1 FROM categorias WHERE nombre = 'clases_particulares'
);

-- Revisar el SELECT antes de ejecutar el UPDATE.
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

UPDATE servicios s
SET categoria_id = (
  SELECT id FROM categorias WHERE nombre = 'clases_particulares' LIMIT 1
)
WHERE s.categoria_id = (
  SELECT id FROM categorias WHERE nombre = 'otros' LIMIT 1
)
AND (
  s.titulo ILIKE '%clase%' OR s.titulo ILIKE '%profesor%'
  OR s.titulo ILIKE '%matem%' OR s.titulo ILIKE '%ingl%'
  OR s.titulo ILIKE '%lengua%' OR s.titulo ILIKE '%física%'
  OR s.titulo ILIKE '%química%' OR s.titulo ILIKE '%apoyo%'
);

-- Rellenar ciudad desde el usuario, sin tocar perfiles ya rellenados.
UPDATE perfiles_proveedor p
SET ciudad = u.ciudad
FROM usuarios u
WHERE p.usuario_id = u.id
  AND p.ciudad IS NULL
  AND u.ciudad IS NOT NULL
  AND btrim(u.ciudad) <> '';

UPDATE servicios s
SET ciudad = COALESCE(p.ciudad, u.ciudad)
FROM perfiles_proveedor p
JOIN usuarios u ON u.id = p.usuario_id
WHERE s.proveedor_id = p.id
  AND s.ciudad IS NULL
  AND COALESCE(p.ciudad, u.ciudad) IS NOT NULL
  AND btrim(COALESCE(p.ciudad, u.ciudad)) <> '';

COMMIT;
