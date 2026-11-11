import { createToolsPool, requireApply } from './shared.js'

const pool = createToolsPool()
try {
  const { rows: tableRows } = await pool.query(`SELECT to_regclass('obstaculos') IS NOT NULL AS exists`)
  const { rows: columnRows } = await pool.query(`
    SELECT count(*) > 0 AS exists FROM information_schema.columns
    WHERE table_name = 'ventanas_tiempo' AND column_name = 'es_ocasional'
  `)
  const tableExists = tableRows[0].exists
  const columnExists = columnRows[0].exists
  console.log(`  obstaculos                  ${tableExists ? 'existe' : 'NO EXISTE'}`)
  console.log(`  ventanas_tiempo.es_ocasional ${columnExists ? 'existe' : 'NO EXISTE'}`)
  if (tableExists && columnExists) {
    console.log('La base ya está migrada.')
  } else if (await requireApply('crear obstáculos y marcar ventanas ocasionales')) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        CREATE TABLE IF NOT EXISTS obstaculos (
          id_obstaculo SERIAL PRIMARY KEY, tipo VARCHAR(30) NOT NULL,
          descripcion TEXT NOT NULL, latitud NUMERIC(9,6) NOT NULL,
          longitud NUMERIC(9,6) NOT NULL, ubicacion GEOGRAPHY(Point,4326) NOT NULL,
          nivel VARCHAR(10) NOT NULL DEFAULT 'MEDIO', id_usuario INTEGER,
          fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resuelto BOOLEAN NOT NULL DEFAULT FALSE,
          CONSTRAINT obstaculos_tipo_check CHECK (
            tipo IN ('CONO','OBRA','ARBOL','BACHE','BLOQUEO_CALLE','OTRO')
          ),
          CONSTRAINT obstaculos_nivel_check CHECK (nivel IN ('ALTO','MEDIO','BAJO')),
          CONSTRAINT obstaculos_latitud_check CHECK (latitud BETWEEN -13 AND -11),
          CONSTRAINT obstaculos_longitud_check CHECK (longitud BETWEEN -78 AND -76),
          CONSTRAINT obstaculos_id_usuario_fkey FOREIGN KEY (id_usuario)
            REFERENCES usuarios(id_usuario) ON DELETE SET NULL
        )
      `)
      await client.query('CREATE INDEX IF NOT EXISTS obstaculos_ubicacion_idx ON obstaculos USING GIST (ubicacion)')
      await client.query('CREATE INDEX IF NOT EXISTS obstaculos_activos_idx ON obstaculos (resuelto, fecha_registro)')
      await client.query(`
        ALTER TABLE ventanas_tiempo
        ADD COLUMN IF NOT EXISTS es_ocasional BOOLEAN NOT NULL DEFAULT FALSE
      `)
      await client.query('COMMIT')
      console.log('Migración aplicada.')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
} finally {
  await pool.end()
}
