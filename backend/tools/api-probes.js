import { runReadOnlyProbe } from './shared.js'

const commonLists = [
  ['/clientes', 'Listar clientes'],
  ['/vehiculos', 'Listar vehículos'],
  ['/conductores', 'Listar conductores'],
  ['/pedidos', 'Listar pedidos'],
  ['/rutas', 'Listar rutas'],
]

const checksByScript = {
  prueba_base_vacia: [
    ...['/pedidos', '/rutas', '/asignaciones', '/incidentes', '/conductores']
      .map((ruta) => ({ nombre: `${ruta} responde 200`, ruta })),
    ...['/dashboard', '/indicadores', '/vehiculos', '/clientes',
      '/clientes/ventanas-tiempo', '/clientes/ventanas-tiempo/disponibles',
      '/reportes', '/reportes/consolidado', '/sostenibilidad/impacto',
      '/sostenibilidad/compensacion', '/trafico']
      .map((ruta) => ({ nombre: `${ruta} responde 200`, ruta })),
  ],
  prueba_clientes: commonLists.slice(0, 2).concat([
    { nombre: 'GET /auth/me', ruta: '/auth/me' },
  ]),
  prueba_dashboards: [
    ...['/dashboard', '/usuarios', '/vehiculos', '/conductores', '/clientes',
      '/pedidos', '/rutas', '/reportes', '/auth/me']
      .map((ruta) => ({ nombre: `GET ${ruta}`, ruta })),
  ],
  prueba_encargar_orden: commonLists.filter(([ruta]) => ruta === '/pedidos' || ruta === '/rutas')
    .map(([ruta, nombre]) => ({ ruta, nombre })),
  prueba_entregas: commonLists.filter(([ruta]) => ruta === '/pedidos' || ruta === '/rutas')
    .map(([ruta, nombre]) => ({ ruta, nombre })),
  prueba_estado_consistente: [{ nombre: 'Listar pedidos', ruta: '/pedidos' }],
  prueba_hu08_hu11: [
    ...['/trafico', '/incidentes', '/rutas', '/dashboard', '/indicadores',
      '/reportes', '/reportes/consolidado', '/sostenibilidad/compensacion',
      '/sostenibilidad/impacto']
      .map((ruta) => ({ nombre: `GET ${ruta}`, ruta })),
  ],
  prueba_local_mapa: [
    { nombre: 'GET /local', ruta: '/local' },
    { nombre: 'GET /mapa/rutas', ruta: '/mapa/rutas' },
  ],
  prueba_modo_conductor: [
    ...['/asignaciones', '/rutas', '/incidentes', '/pedidos', '/usuarios',
      '/clientes', '/dashboard']
      .map((ruta) => ({ nombre: `GET ${ruta}`, ruta })),
  ],
  prueba_pedidos_conductor: [{ nombre: 'Listar pedidos', ruta: '/pedidos' }],
  prueba_permisos: [
    ...['/usuarios', '/vehiculos', '/conductores', '/clientes', '/pedidos',
      '/rutas', '/asignaciones', '/trafico', '/incidentes', '/dashboard',
      '/indicadores', '/reportes', '/sostenibilidad/impacto']
      .map((ruta) => ({ nombre: `ADMIN GET ${ruta}`, ruta })),
  ],
  prueba_reoptimizacion: [{ nombre: 'Listar rutas', ruta: '/rutas' }],
  prueba_rutas: [
    { nombre: 'Listar rutas', ruta: '/rutas' },
    { nombre: 'Listar pedidos', ruta: '/pedidos' },
  ],
  prueba_saturacion: [
    { nombre: 'GET /operacion/saturacion', ruta: `/operacion/saturacion?fecha=${new Date().toISOString().slice(0, 10)}&hora_inicio=08:00:00&hora_fin=12:00:00` },
    { nombre: 'GET /obstaculos', ruta: '/obstaculos' },
  ],
  prueba_sync_estado: [{ nombre: 'Listar pedidos', ruta: '/pedidos' }],
  prueba_ventanas: [
    { nombre: 'Listar ventanas', ruta: '/clientes/ventanas-tiempo' },
    { nombre: 'Listar ventanas disponibles', ruta: '/clientes/ventanas-tiempo/disponibles' },
  ],
}

export async function runNamedProbe(name, title = name) {
  const checks = checksByScript[name]
  if (!checks) throw new Error(`No hay comprobaciones HTTP de solo lectura para ${name}.`)
  return runReadOnlyProbe(title, checks)
}
