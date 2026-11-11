import { createToolsPool, requireApply } from './shared.js'

const adminEmail = 'admin@ecolima.com'
const emptyTables = [
  'paradas_ruta', 'indicadores_ruta', 'ruta_pedidos', 'asignaciones',
  'rutas', 'pedidos', 'licencias', 'conductores', 'clientes', 'incidentes', 'trafico',
]
const preserveTables = [
  'roles', 'vehiculos', 'tipos_vehiculo', 'ventanas_tiempo',
  'ubicaciones', 'reportes', 'compensacion_carbono',
]
const pool = createToolsPool()

try {
  const { rows: adminRows } = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE email = $1', [adminEmail]
  )
  if (!adminRows[0]) {
    console.log(`No existe ${adminEmail}. No se toca la base.`)
    process.exitCode = 1
  } else {
    console.log('Conteos actuales (vista previa):\n')
    for (const table of emptyTables) {
      const { rows } = await pool.query(`SELECT count(*) FROM ${table}`)
      if (Number(rows[0].count)) console.log(`  ${table.padEnd(20)} ${rows[0].count} <- se borraría`)
    }
    const otherUsers = await pool.query(
      'SELECT count(*) FROM usuarios WHERE email <> $1', [adminEmail]
    )
    if (Number(otherUsers.rows[0].count)) {
      console.log(`  ${'usuarios (otros)'.padEnd(20)} ${otherUsers.rows[0].count} <- se borrarían`)
    }
    console.log('\nSe conservan:')
    for (const table of preserveTables) {
      const { rows } = await pool.query(`SELECT count(*) FROM ${table}`)
      console.log(`  ${table.padEnd(20)} ${rows[0].count}`)
    }
    if (await requireApply('vaciar la base de datos operativa')) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const table of emptyTables) {
          const { rowCount } = await client.query(`DELETE FROM ${table}`)
          if (rowCount) console.log(`  ${table.padEnd(20)} ${rowCount}`)
        }
        const { rowCount } = await client.query(
          'DELETE FROM usuarios WHERE email <> $1', [adminEmail]
        )
        if (rowCount) console.log(`  ${'usuarios'.padEnd(20)} ${rowCount}`)
        await client.query(`
          SELECT setval(
            'usuarios_id_usuario_seq',
            COALESCE((SELECT max(id_usuario) FROM usuarios), 0) + 1,
            false
          )
        `)
        await client.query('COMMIT')
        console.log('\nBase limpia.')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } else {
      console.log('\nNada se ha borrado.')
    }
  }
} finally {
  await pool.end()
}
