import { createToolsPool } from './shared.js'

const pool = createToolsPool()
try {
  for (const table of ['conductores', 'licencias']) {
    console.log(`\n--- ${table.toUpperCase()} ---`)
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1 ORDER BY ordinal_position
    `, [table])
    for (const row of rows) console.log(row)
  }
} finally {
  await pool.end()
}
