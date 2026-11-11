import bcrypt from 'bcryptjs'
import { createToolsPool } from './shared.js'

const password = process.env.CYPRESS_E2E_PASSWORD
if (!password) throw new Error('CYPRESS_E2E_PASSWORD no está configurada.')

const pool = createToolsPool()
const client = await pool.connect()
try {
  await client.query('BEGIN')
  const { rows: roleRows } = await client.query('SELECT nombre, id_rol FROM roles')
  const roles = Object.fromEntries(roleRows.map((row) => [row.nombre, row.id_rol]))
  const passwordHash = await bcrypt.hash(password, 12)
  const accountIds = {}

  for (const role of ['ADMIN', 'OPERADOR', 'CONDUCTOR', 'AUDITOR', 'CLIENTE']) {
    if (!roles[role]) throw new Error(`No existe el rol ${role}.`)
    const email = role === 'ADMIN' ? 'admin@ecolima.com' : `${role.toLowerCase()}@ecolima.com`
    const { rows } = await client.query(`
      INSERT INTO usuarios (id_rol, nombre, email, password_hash, estado)
      VALUES ($1, $2, $3, $4, 'ACTIVO') RETURNING id_usuario
    `, [roles[role], `Cuenta E2E ${role}`, email, passwordHash])
    accountIds[role] = rows[0].id_usuario
  }

  const { rows: clientRows } = await client.query(`
    INSERT INTO clientes (nombre, email, direccion, latitud, longitud, ubicacion, estado)
    VALUES ('Cliente semilla E2E', 'semilla@ecolima.com', 'Av. Base E2E 100, Lima',
      -12.015, -77.005, ST_SetSRID(ST_MakePoint(-77.005, -12.015), 4326), 'ACTIVO')
    RETURNING id_cliente
  `)
  const { rows: windowRows } = await client.query(`
    INSERT INTO ventanas_tiempo (hora_inicio, hora_fin, tolerancia_minutos, penalizacion_por_minuto)
    VALUES ('08:00', '12:00', 15, 0.50) RETURNING id_ventana
  `)
  const { rows: vehicleRows } = await client.query(`
    INSERT INTO vehiculos (
      id_tipo_vehiculo, placa, marca, modelo, capacidad_kg, capacidad_m3,
      consumo_km_l, factor_co2_kg_km, tipo_combustible
    ) VALUES (1, 'E2E-123', 'EcoLima', 'Vehículo de prueba', 800, 5, 10, 0.9, 'DIESEL')
    RETURNING id_vehiculo
  `)
  const { rows: driverRows } = await client.query(`
    INSERT INTO conductores (
      id_usuario, dni, nombre, apellido, hora_disponibilidad_inicio,
      hora_disponibilidad_fin, horas_max_conduccion, ubicacion_inicio, estado
    ) VALUES (
      $1, '00000001', 'Conductor', 'E2E', '05:00', '22:00', 8,
      ST_SetSRID(ST_MakePoint(-77.005, -12.015), 4326), 'DISPONIBLE'
    ) RETURNING id_conductor
  `, [accountIds.CONDUCTOR])
  await client.query(`
    INSERT INTO licencias (id_conductor, numero, categoria, fecha_emision, fecha_vencimiento, estado)
    VALUES ($1, 'E2E-0001', 'A-I', CURRENT_DATE - 30, CURRENT_DATE + 365, 'VIGENTE')
  `, [driverRows[0].id_conductor])

  await client.query('COMMIT')
  console.log(
    `Semillas E2E creadas: cliente=${clientRows[0].id_cliente}, `
    + `ventana=${windowRows[0].id_ventana}, vehiculo=${vehicleRows[0].id_vehiculo}, `
    + `conductor=${driverRows[0].id_conductor}`
  )
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
