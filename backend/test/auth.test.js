import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'

const config = {
  jwtSecret: 'unit-test-only-secret',
  jwtAlgorithm: 'HS256',
  tokenMinutes: 30,
  corsOrigin: 'http://localhost:5173',
}

let server
let baseUrl

function createTestPool() {
  const passwordHash = bcrypt.hashSync('correct-password', 4)
  const user = {
    id_usuario: 7,
    id_rol: 1,
    nombre: 'Test Admin',
    email: 'admin@example.com',
    password_hash: passwordHash,
    estado: 'ACTIVO',
    intentos_fallidos: 0,
    bloqueado_hasta: null,
    rol: 'ADMIN',
  }
  const client = {
    async query(sql) {
      if (sql.includes('SELECT u.id_usuario')) return { rows: [user] }
      return { rows: [] }
    },
    release() {},
  }
  return {
    async query(sql) {
      if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }] }
      if (sql.includes('SELECT u.id_usuario')) {
        return { rows: [{
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          email: user.email,
          estado: user.estado,
          rol: user.rol,
        }] }
      }
      return { rows: [] }
    },
    async connect() {
      return client
    },
    async end() {},
  }
}

function createDisconnectedPool() {
  return {
    async query() {
      throw new Error('Database unavailable')
    },
  }
}

beforeEach(async () => {
  const app = createApp({ pool: createTestPool(), config })
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
})

test('health y raíz responden con el contrato existente', async () => {
  const health = await fetch(`${baseUrl}/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok', database: 'connected' })

  const root = await fetch(`${baseUrl}/`)
  assert.deepEqual(await root.json(), {
    message: 'EcoLogistica Lima API funcionando',
  })

  const missing = await fetch(`${baseUrl}/ruta-inexistente`)
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), { detail: 'Not Found' })

  const preflight = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: config.corsOrigin,
      'Access-Control-Request-Method': 'POST',
    },
  })
  assert.equal(preflight.headers.get('access-control-allow-origin'), config.corsOrigin)
})

test('health reports database outages as unavailable for hosting health checks', async () => {
  const app = createApp({ pool: createDisconnectedPool(), config })
  const healthServer = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    healthServer.once('listening', resolve)
    healthServer.once('error', reject)
  })

  try {
    const response = await fetch(`http://127.0.0.1:${healthServer.address().port}/health`)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      status: 'error',
      database: 'disconnected',
    })
  } finally {
    await new Promise((resolve, reject) => {
      healthServer.close((error) => error ? reject(error) : resolve())
    })
  }
})

test('la autenticación protege rutas privadas y permite al admin', async () => {
  const anonymous = await fetch(`${baseUrl}/auth/me`)
  assert.equal(anonymous.status, 401)
  assert.equal(anonymous.headers.get('www-authenticate'), 'Bearer')

  const token = jwt.sign(
    { rol: 'ADMIN' },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, subject: '7', expiresIn: '5m' }
  )
  const authorized = await fetch(`${baseUrl}/auth/admin-test`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(authorized.status, 200)
  assert.deepEqual(await authorized.json(), {
    message: 'Acceso autorizado',
    usuario: 'Test Admin',
    rol: 'ADMIN',
  })
})

test('migrated CRUD routers are mounted and require authentication', async () => {
  const token = jwt.sign(
    { rol: 'ADMIN' },
    config.jwtSecret,
    { algorithm: config.jwtAlgorithm, subject: '7', expiresIn: '5m' }
  )
  for (const resource of ['usuarios', 'vehiculos', 'clientes']) {
    const anonymous = await fetch(`${baseUrl}/${resource}`)
    assert.equal(anonymous.status, 401, `/${resource} must reject anonymous requests`)

    const response = await fetch(`${baseUrl}/${resource}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [])
  }
})

test('login valida credenciales y devuelve un token compatible', async () => {
  const malformed = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email":',
  })
  assert.equal(malformed.status, 400)

  const invalid = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'x' }),
  })
  assert.equal(invalid.status, 422)

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'correct-password',
    }),
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.token_type, 'bearer')
  assert.equal(body.usuario_id, 7)
  assert.equal(body.rol, 'ADMIN')
  assert.equal(jwt.verify(body.access_token, config.jwtSecret).sub, '7')
})
