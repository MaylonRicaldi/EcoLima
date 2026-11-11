import test from 'node:test'
import assert from 'node:assert/strict'
import { hasPermission, rolesWithPermission, ROLES, OPERATIONS } from '../src/core/permissions.js'

test('preserva permisos de solo lectura y escritura por rol', () => {
  assert.equal(hasPermission(ROLES.CONDUCTOR, 'pedidos', OPERATIONS.READ), true)
  assert.equal(hasPermission(ROLES.CONDUCTOR, 'pedidos', OPERATIONS.WRITE), false)
  assert.equal(hasPermission(ROLES.CLIENTE, 'pedidos', OPERATIONS.READ), true)
  assert.equal(hasPermission(ROLES.CLIENTE, 'clientes', OPERATIONS.READ), false)
  assert.equal(hasPermission('ROL_DESCONOCIDO', 'pedidos', OPERATIONS.READ), false)
})

test('determina roles autorizados para una operación', () => {
  assert.deepEqual(
    rolesWithPermission('usuarios', OPERATIONS.WRITE),
    [ROLES.ADMIN]
  )
})
