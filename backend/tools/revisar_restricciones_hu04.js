import { createToolsPool } from './shared.js'

const pool = createToolsPool()
try {
  for (const table of ['pedidos', 'clientes', 'ventanas_tiempo']) {
    console.log(`\n--- RESTRICCIONES ${table.toUpperCase()} ---`)
    const { rows } = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definicion
      FROM pg_constraint WHERE conrelid = $1::regclass ORDER BY conname
    `, [table])
    for (const row of rows) console.log(row)
  }
} finally {
  await pool.end()
}
