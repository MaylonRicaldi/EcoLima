import { createToolsPool, requireApply } from './shared.js'

const localType = 'LOCAL_OPERATIVA'
const allowedTypes = ['PUNTO_ENTREGA', 'REFERENCIA', 'ZONA_RIESGO', 'RESERVA_ECOLOGICA', localType]
const depot = {
  direccion: 'Puerto de Callao, Av. San Martín, Callao',
  referencia: 'Local de la empresa. Punto de partida de los envíos.',
  latitud: -12.0550,
  longitud: -77.1430,
}
const pool = createToolsPool()
try {
  const { rows: constraintRows } = await pool.query(`
    SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid = 'ubicaciones'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  `)
  const { rows: localRows } = await pool.query(`
    SELECT id_ubicacion, direccion, latitud, longitud
    FROM ubicaciones WHERE tipo = $1 ORDER BY id_ubicacion
  `, [localType])
  const definition = constraintRows[0]?.definition ?? ''
  console.log(`  ubicaciones.tipo admite el local: ${definition.includes(localType) ? 'sí' : 'NO'}`)
  console.log(`  local registrado: ${localRows.length ? 'sí' : 'no'}`)
  if (localRows[0]) console.log(localRows[0])
  if (definition.includes(localType) && localRows.length) {
    console.log('La base ya está migrada.')
  } else if (await requireApply('registrar el local operativo')) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('ALTER TABLE ubicaciones DROP CONSTRAINT IF EXISTS ubicaciones_tipo_check')
      await client.query(`
        ALTER TABLE ubicaciones ADD CONSTRAINT ubicaciones_tipo_check
        CHECK (tipo IN (${allowedTypes.map((value) => `'${value}'`).join(', ')}))
      `)
      if (!localRows.length) {
        await client.query(`
          INSERT INTO ubicaciones (direccion, referencia, latitud, longitud, geom, tipo)
          VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326), $5)
        `, [depot.direccion, depot.referencia, depot.latitud, depot.longitud, localType])
      }
      await client.query('COMMIT')
      console.log('Migración aplicada. Ajusta la ubicación exacta desde el mapa.')
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
