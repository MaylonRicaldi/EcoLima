import { createToolsPool } from './shared.js'

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
    console.log(
      `${String(row.id_usuario).padStart(2)} | ${String(row.rol).padEnd(9)}`
      + ` | ${String(row.estado).padEnd(8)} | ${String(row.ficha).padStart(5)} | ${row.email}`
    )
  }
} finally {
  await pool.end()
}
