import { createToolsPool, requireApply } from './shared.js'

const categories = ['A-I', 'A-IIA', 'A-IIB', 'A-IIIA', 'A-IIIB', 'A-IIIC', 'B-I', 'B-IIA', 'B-IIB', 'B-IIC']
const pool = createToolsPool()
try {
  const { rows: categoryRows } = await pool.query(`
    SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid = 'licencias'::regclass AND conname LIKE 'licencias_categoria%'
  `)
  const { rows: driverRows } = await pool.query(`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'conductores' AND column_name = 'id_usuario'
  `)
  const definition = categoryRows[0]?.definition ?? null
  const nullable = driverRows[0]?.is_nullable ?? null
  console.log('Estado actual:')
  console.log(`  licencias.categoria  ${definition}`)
  console.log(`  conductores.id_usuario  ${nullable === 'YES' ? 'nullable' : 'NOT NULL'}`)
  if (definition?.includes("'B-I'") && nullable === 'YES') {
    console.log('\nLa base ya está migrada.')
  } else if (await requireApply('migrar esquema de licencias/conductores')) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('ALTER TABLE licencias DROP CONSTRAINT IF EXISTS licencias_categoria_check')
      await client.query(`
        ALTER TABLE licencias ADD CONSTRAINT licencias_categoria_check
        CHECK (categoria IN (${categories.map((value) => `'${value}'`).join(', ')}))
      `)
      await client.query('ALTER TABLE conductores ALTER COLUMN id_usuario DROP NOT NULL')
      await client.query('ALTER TABLE conductores DROP CONSTRAINT IF EXISTS conductores_id_usuario_fkey')
      await client.query(`
        ALTER TABLE conductores ADD CONSTRAINT conductores_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      `)
      await client.query('COMMIT')
      console.log('\nMigración aplicada.')
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
