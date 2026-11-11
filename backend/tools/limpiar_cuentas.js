import { createToolsPool, requireApply } from './shared.js'

const demoAccounts = new Set([
  'admin@ecolima.com', 'operador@ecolima.com', 'conductor@ecolima.com',
  'auditor@ecolima.com', 'cliente@ecolima.com',
])
const removable = ['prueba.permisos@ecolima.com', 'carlos@ecolima.com']
const pool = createToolsPool()

try {
  const { rows } = await pool.query(`
    SELECT u.id_usuario, u.email, u.estado, r.nombre AS rol,
      (SELECT count(*) FROM conductores c WHERE c.id_usuario = u.id_usuario) AS ficha
    FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
    ORDER BY r.nombre, u.id_usuario
  `)
  console.log('id | rol       | estado   | ficha | email')
  console.log('---+-----------+----------+-------+-------------------------------')
  for (const row of rows) {
    const marker = demoAccounts.has(row.email) ? '  (demo)' : ''
    console.log(
      `${String(row.id_usuario).padStart(2)} | ${String(row.rol).padEnd(9)}`
      + ` | ${String(row.estado).padEnd(8)} | ${String(row.ficha).padStart(5)} | ${row.email}${marker}`
    )
  }

  if (process.argv[2] !== 'limpiar') {
    console.log('\nInventario solamente. Para eliminar las cuentas candidatas: limpiar --apply')
  } else if (await requireApply('eliminar cuentas de prueba')) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let total = 0
      for (const email of removable) {
        const result = await client.query(`
          DELETE FROM usuarios u WHERE u.email = $1
            AND NOT EXISTS (
              SELECT 1 FROM conductores c WHERE c.id_usuario = u.id_usuario
            )
        `, [email])
        total += result.rowCount
        console.log(result.rowCount ? `  borrada: ${email}` : `  se conserva: ${email} (no existe o tiene ficha)`)
      }
      await client.query('COMMIT')
      console.log(`\n${total} cuenta(s) eliminada(s).`)
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
