import { createToolsPool } from './shared.js'

const pool = createToolsPool()
try {
  for (const table of ['pedidos', 'clientes', 'ventanas_tiempo']) {
    console.log(`\n--- ${table.toUpperCase()} ---`)
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 ORDER BY ordinal_position
    `, [table])
    for (const row of rows) console.log(row)
  }
} finally {
  await pool.end()
}
