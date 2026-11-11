import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

const frontendOrigin = 'http://localhost:5173'
const previewOrigin = 'https://ecolima-preview.vercel.app'
const endpoints = [
  ['GET', '/clientes'],
  ['GET', '/clientes/1'],
  ['POST', '/clientes'],
  ['PUT', '/clientes/1'],
  ['PATCH', '/clientes/1/estado'],
  ['GET', '/clientes/ventanas-tiempo'],
  ['GET', '/clientes/ventanas-tiempo/disponibles'],
  ['GET', '/clientes/ventanas-tiempo/1'],
  ['POST', '/clientes/ventanas-tiempo'],
  ['PUT', '/clientes/ventanas-tiempo/1'],
  ['DELETE', '/clientes/ventanas-tiempo/1'],
  ['GET', '/conductores'],
  ['GET', '/conductores/1'],
  ['POST', '/conductores'],
  ['PUT', '/conductores/1'],
  ['PATCH', '/conductores/1/estado'],
  ['GET', '/conductores/1/vehiculos-compatibles'],
  ['GET', '/conductores/1/licencias'],
  ['POST', '/conductores/1/licencias'],
  ['PUT', '/conductores/1/licencias/1'],
  ['PATCH', '/conductores/1/licencias/1/estado'],
  ['GET', '/pedidos'],
  ['GET', '/pedidos/1'],
  ['POST', '/pedidos'],
  ['PUT', '/pedidos/1'],
  ['PATCH', '/pedidos/1/estado'],
  ['GET', '/vehiculos'],
  ['GET', '/vehiculos/1'],
  ['POST', '/vehiculos'],
  ['PUT', '/vehiculos/1'],
  ['PATCH', '/vehiculos/1/estado'],
  ['GET', '/local'],
  ['PUT', '/local'],
  ['GET', '/mapa/rutas'],
  ['GET', '/operacion/saturacion?fecha=2026-11-11&hora_inicio=08%3A00&hora_fin=12%3A00'],
  ['POST', '/operacion/ventana-sugerida'],
  ['GET', '/obstaculos?incluir_resueltos=false'],
  ['POST', '/obstaculos'],
  ['DELETE', '/obstaculos/1'],
  ['POST', '/obstaculos/1/optimizar-ruta'],
  ['GET', '/rutas'],
  ['GET', '/rutas/1'],
  ['POST', '/rutas/optimizar'],
  ['POST', '/rutas/1/reoptimizar'],
  ['PATCH', '/rutas/1/estado'],
  ['PATCH', '/rutas/1/pedidos/1/estado'],
  ['POST', '/rutas/1/pedidos'],
  ['GET', '/rutas/1/pedidos/1/orden-sugerido'],
  ['POST', '/rutas/1/pedidos/1/anticipar'],
  ['GET', '/rutas/1/evaluar-reoptimizacion'],
  ['GET', '/rutas/pendientes-reoptimizacion'],
  ['GET', '/asignaciones'],
  ['POST', '/asignaciones'],
  ['PATCH', '/asignaciones/1/estado'],
  ['GET', '/trafico'],
  ['POST', '/trafico'],
  ['GET', '/incidentes'],
  ['POST', '/incidentes'],
  ['PATCH', '/incidentes/1/estado'],
  ['GET', '/dashboard'],
  ['GET', '/indicadores'],
  ['GET', '/sostenibilidad/compensacion'],
  ['POST', '/sostenibilidad/compensacion'],
  ['GET', '/sostenibilidad/impacto'],
  ['GET', '/reportes'],
  ['POST', '/reportes?tipo=operacion'],
  ['GET', '/reportes/sostenibilidad?id_ruta=1'],
  ['GET', '/reportes/consolidado'],
]

let server
let baseUrl

before(async () => {
  const pool = {
    async query() {
      throw new Error('Las solicitudes sin autenticación no deben consultar la base')
    },
    async connect() {
      throw new Error('La prueba de compatibilidad no conecta a PostgreSQL')
    },
  }
  const app = createApp({
    pool,
    config: {
      jwtSecret: 'frontend-compatibility-test',
      jwtAlgorithm: 'HS256',
      tokenMinutes: 30,
      corsOrigin: [frontendOrigin, previewOrigin],
    },
  })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (!server) return
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

test('frontend API endpoints are mounted and protected by authentication', async () => {
  const missing = []
  for (const [method, path] of endpoints) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: method === 'GET' || method === 'DELETE'
        ? {}
        : { 'Content-Type': 'application/json' },
      body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
    })
    if (response.status !== 401) {
      missing.push(`${method} ${path}: expected 401, received ${response.status}`)
    }
  }
  assert.deepEqual(missing, [], missing.join('\n'))
})

test('login and frontend CORS preflight use compatible HTTP contracts', async () => {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  assert.equal(login.status, 422)

  const preflight = await fetch(`${baseUrl}/clientes`, {
    method: 'OPTIONS',
    headers: {
      Origin: frontendOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), frontendOrigin)
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i)

  const previewPreflight = await fetch(`${baseUrl}/clientes`, {
    method: 'OPTIONS',
    headers: {
      Origin: previewOrigin,
      'Access-Control-Request-Method': 'GET',
    },
  })
  assert.equal(previewPreflight.headers.get('access-control-allow-origin'), previewOrigin)
})
