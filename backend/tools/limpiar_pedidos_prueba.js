import { createToolsPool, requireApply } from './shared.js'

const pool = createToolsPool()
const routeIds = `
  SELECT DISTINCT r.id_ruta
  FROM rutas r LEFT JOIN ruta_pedidos rp ON rp.id_ruta = r.id_ruta
  WHERE rp.id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_pedido > 1)
     OR r.fecha > (SELECT MAX(fecha) FROM rutas)
`
const steps = [
  ['paradas', `DELETE FROM paradas_ruta WHERE id_ruta IN (${routeIds})`],
  ['indicadores', `DELETE FROM indicadores_ruta WHERE id_ruta IN (${routeIds})`],
  ['ruta_pedidos', 'DELETE FROM ruta_pedidos WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_pedido > 1)'],
  ['asignaciones', `DELETE FROM asignaciones WHERE id_ruta IN (${routeIds})`],
  ['rutas', `DELETE FROM rutas WHERE id_ruta IN (${routeIds})`],
  ['pedidos', 'DELETE FROM pedidos WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_pedido > 1)'],
]

try {
  console.log('Modo de inspección: no se borrará ningún registro.')
  for (const [label, sql] of steps) {
    const table = label === 'paradas' ? 'paradas_ruta' : label === 'indicadores' ? 'indicadores_ruta' : label
    const countQuery = label === 'ruta_pedidos' || label === 'pedidos'
      ? 'SELECT count(*) FROM ' + table + ' WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_pedido > 1)'
      : `SELECT count(*) FROM ${table} WHERE id_ruta IN (${routeIds})`
    const { rows } = await pool.query(countQuery)
    console.log(`  ${label}: ${rows[0].count} candidato(s)`)
    void sql
  }
  if (await requireApply('eliminar pedidos y rutas de prueba')) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const [name, sql] of steps) {
        const { rowCount } = await client.query(sql)
        if (rowCount) console.log(`  ${name}: ${rowCount}`)
      }
      const { rows: remainingOrders } = await client.query(
        'SELECT id_pedido FROM pedidos ORDER BY id_pedido'
      )
      const { rows: remainingRoutes } = await client.query('SELECT count(*) FROM rutas')
      await client.query('COMMIT')
      console.log('\npedidos restantes:', remainingOrders.map((row) => row.id_pedido))
      console.log('rutas restantes:', remainingRoutes[0].count)
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
