-- Sprint 04: reportes persistentes y redondeo hacia arriba.
-- Ejecutar primero en Neon de pruebas. No ejecutar en produccion sin aprobacion.

ALTER TABLE reportes
  ADD COLUMN IF NOT EXISTS contenido_csv TEXT;

ALTER TABLE compensacion_carbono
  DROP COLUMN arboles_necesarios;

ALTER TABLE compensacion_carbono
  ADD COLUMN arboles_necesarios BIGINT
  GENERATED ALWAYS AS (
    CEIL(co2_a_compensar_kg / NULLIF(factor_captura_arbol_kg, 0))
  ) STORED;

-- Rollback seguro:
-- ALTER TABLE compensacion_carbono DROP COLUMN arboles_necesarios;
-- ALTER TABLE compensacion_carbono ADD COLUMN arboles_necesarios NUMERIC(10,2)
--   GENERATED ALWAYS AS (ROUND(co2_a_compensar_kg / NULLIF(factor_captura_arbol_kg, 0), 2)) STORED;
-- ALTER TABLE reportes DROP COLUMN contenido_csv;
