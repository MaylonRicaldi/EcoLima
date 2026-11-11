import { ROLES } from './permissions.js'

export const isDriver = (user) => user?.rol === ROLES.CONDUCTOR
export const isCustomer = (user) => user?.rol === ROLES.CLIENTE

export async function conductorIdFor(pool, user) {
  if (!isDriver(user)) return null
  const { rows } = await pool.query(
    'SELECT id_conductor FROM conductores WHERE id_usuario = $1',
    [Number(user.id_usuario)]
  )
  return rows[0]?.id_conductor ?? null
}

export async function customerIdFor(pool, user) {
  if (!isCustomer(user)) return null
  const { rows } = await pool.query(
    'SELECT id_cliente FROM clientes WHERE email = $1',
    [user.email]
  )
  return rows[0]?.id_cliente ?? null
}

export async function routeIdsForDriver(pool, user) {
  if (!isDriver(user)) return null
  const { rows } = await pool.query(
    `SELECT a.id_ruta
     FROM asignaciones a
     JOIN conductores c ON c.id_conductor = a.id_conductor
     WHERE c.id_usuario = $1`,
    [Number(user.id_usuario)]
  )
  return new Set(rows.map((row) => row.id_ruta))
}

export async function orderIdsForDriver(pool, user) {
  if (!isDriver(user)) return null
  const { rows } = await pool.query(
    `SELECT rp.id_pedido
     FROM ruta_pedidos rp
     JOIN asignaciones a ON a.id_ruta = rp.id_ruta
     JOIN conductores c ON c.id_conductor = a.id_conductor
     WHERE c.id_usuario = $1`,
    [Number(user.id_usuario)]
  )
  return new Set(rows.map((row) => row.id_pedido))
}

export async function authorizeRouteDelivery(pool, user, routeId) {
  if (user.rol === ROLES.ADMIN || user.rol === ROLES.OPERADOR) return true
  if (!isDriver(user)) return false
  const routeIds = await routeIdsForDriver(pool, user)
  return routeIds?.has(Number(routeId)) ?? false
}
