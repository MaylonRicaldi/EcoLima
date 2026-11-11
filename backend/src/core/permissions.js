export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  OPERADOR: 'OPERADOR',
  CONDUCTOR: 'CONDUCTOR',
  AUDITOR: 'AUDITOR',
  CLIENTE: 'CLIENTE',
})

export const OPERATIONS = Object.freeze({
  READ: 'leer',
  WRITE: 'escribir',
  DELETE: 'borrar',
})

const read = (...resources) => resources.map((resource) => [resource, OPERATIONS.READ])
const write = (...resources) => resources.map((resource) => [resource, OPERATIONS.WRITE])
const key = (resource, operation) => `${resource}:${operation}`

const adminResources = [
  'usuarios', 'vehiculos', 'conductores', 'licencias', 'clientes', 'pedidos',
  'rutas', 'asignaciones', 'trafico', 'incidentes', 'indicadores',
  'reportes', 'compensacion',
]
const operationResources = [
  'vehiculos', 'conductores', 'licencias', 'clientes', 'pedidos', 'rutas',
  'asignaciones', 'trafico', 'incidentes',
]

const permissions = new Map([
  [ROLES.ADMIN, new Set([...read(...adminResources), ...write(...adminResources)].map(([r, op]) => key(r, op)))],
  [ROLES.OPERADOR, new Set([
    ...read(...operationResources, 'indicadores', 'reportes', 'compensacion'),
    ...write(...operationResources),
  ].map(([r, op]) => key(r, op)))],
  [ROLES.CONDUCTOR, new Set([
    ...read('vehiculos', 'rutas', 'asignaciones', 'trafico', 'incidentes', 'pedidos'),
    ...write('incidentes'),
  ].map(([r, op]) => key(r, op)))],
  [ROLES.AUDITOR, new Set(read(
    'usuarios', 'vehiculos', 'conductores', 'licencias', 'clientes', 'pedidos',
    'rutas', 'asignaciones', 'trafico', 'incidentes', 'indicadores',
    'reportes', 'compensacion',
  ).map(([r, op]) => key(r, op)))],
  [ROLES.CLIENTE, new Set(read('pedidos').map(([r, op]) => key(r, op)))],
])

export function hasPermission(role, resource, operation) {
  return permissions.get(role)?.has(key(resource, operation)) ?? false
}

export function rolesWithPermission(resource, operation) {
  return [...permissions.entries()]
    .filter(([, grants]) => grants.has(key(resource, operation)))
    .map(([role]) => role)
}
