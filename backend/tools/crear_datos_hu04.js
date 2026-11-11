import { createToolsPool, requireApply } from './shared.js'

const approved = await requireApply('crear datos HU-04')
if (approved) {
  const pool = createToolsPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      INSERT INTO clientes (
        nombre, documento, telefono, email, direccion, referencia,
        latitud, longitud, ubicacion, horario_apertura, horario_cierre,
        restricciones_acceso, estado
      ) VALUES (
        'Cliente Prueba HU-04', '99999999', '999999999',
        'cliente.prueba@ecolima.com',
        'Av. Proceres de la Independencia 1234, San Juan de Lurigancho',
        'Datos de prueba HU-04', -12.0100, -77.0050,
        ST_SetSRID(ST_MakePoint(-77.0050, -12.0100), 4326),
        '08:00', '18:00', NULL, 'ACTIVO'
      )
    `)
    await client.query(`
      INSERT INTO ventanas_tiempo (
        hora_inicio, hora_fin, tolerancia_minutos, penalizacion_por_minuto
      ) VALUES ('08:00', '12:00', 15, 0.50)
    `)
    await client.query('COMMIT')
    console.log('Datos de prueba HU-04 creados.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
