import { createToolsPool } from './shared.js'

const pool = createToolsPool()
try {
  const { rows } = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.email, r.nombre AS rol, u.estado
    FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
    ORDER BY u.id_usuario
  `)
  for (const row of rows) console.log(row)
} finally {
  await pool.end()
}
