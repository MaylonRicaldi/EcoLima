import { createPool } from '../src/db/pool.js'
import jwt from 'jsonwebtoken'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function createToolsPool() {
  const { DATABASE_URL } = process.env
  if (!DATABASE_URL) {
    throw new Error('Define DATABASE_URL en el entorno antes de usar una herramienta.')
  }
  return createPool(DATABASE_URL)
}

export class Api {
  constructor(token = null, baseUrl = process.env.ECOLIMA_API ?? 'http://127.0.0.1:8000') {
    this.token = token
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  async request(method, path, body) {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    const response = await fetch(new URL(path, `${this.baseUrl}/`), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const raw = await response.text()
    let data = raw
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        // Keep plain-text API errors intact, as the Python helper did.
      }
    } else {
      data = null
    }
    return [response.status, data]
  }

  get(path) { return this.request('GET', path) }
  post(path, body) { return this.request('POST', path, body) }
  put(path, body) { return this.request('PUT', path, body) }
  patch(path, body) { return this.request('PATCH', path, body) }
  delete(path) { return this.request('DELETE', path) }
}

export async function tokenFor(userId, role) {
  const secret = process.env.JWT_SECRET_KEY
  if (!secret) throw new Error('Define JWT_SECRET_KEY en el entorno.')
  return jwt.sign({ rol: role }, secret, {
    algorithm: process.env.JWT_ALGORITHM ?? 'HS256',
    subject: String(userId),
    expiresIn: `${Number(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES ?? 30)}m`,
  })
}

export async function adminApi(pool) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.estado = 'ACTIVO' AND r.nombre = 'ADMIN'
     ORDER BY u.id_usuario LIMIT 1`
  )
  if (!rows[0]) throw new Error('No hay una cuenta ADMIN activa.')
  return new Api(await tokenFor(rows[0].id_usuario, rows[0].rol))
}

export class Resultado {
  constructor(titulo) {
    this.titulo = titulo
    this.items = []
    this.notas = []
  }

  check(nombre, condicion, detalle = '') {
    const passed = Boolean(condicion)
    this.items.push({ nombre, passed, detalle })
    console.log(`  [${passed ? 'OK  ' : 'FALLA'}] ${nombre}${detalle ? ` -> ${detalle}` : ''}`)
    return passed
  }

  nota(nombre, detalle = '') {
    this.notas.push({ nombre, detalle })
    console.log(`  [NOTA] ${nombre}${detalle ? ` -> ${detalle}` : ''}`)
  }

  resumen() {
    const passed = this.items.filter((item) => item.passed).length
    console.log(`\n${this.titulo}: ${passed}/${this.items.length} OK`)
    for (const item of this.items.filter((entry) => !entry.passed)) {
      console.log(`   FALLA: ${item.nombre} ${item.detalle}`)
    }
    for (const item of this.notas) {
      console.log(`   NOTA: ${item.nombre} ${item.detalle}`)
    }
    return passed === this.items.length
  }
}

export async function runReadOnlyProbe(titulo, checks) {
  const pool = createToolsPool()
  const result = new Resultado(titulo)
  try {
    const api = await adminApi(pool)
    for (const { nombre, ruta, status = 200 } of checks) {
      try {
        const [actual, body] = await api.get(ruta)
        result.check(nombre, actual === status, `status ${actual}${actual === status ? '' : `; esperado ${status}`}`)
        if (actual !== status && body != null) {
          console.log(`       ${JSON.stringify(body).slice(0, 180)}`)
        }
      } catch (error) {
        result.check(nombre, false, error.message)
      }
    }
    return result.resumen() ? 0 : 1
  } finally {
    await pool.end()
  }
}

export async function requireApply(action, argv = process.argv.slice(2)) {
  if (!argv.includes('--apply')) {
    console.log(`Modo de inspección: no se aplicó ningún cambio. Añade --apply para ${action}.`)
    return false
  }
  if (process.env.ECOLIMA_ALLOW_DATA_CHANGES !== 'YES') {
    throw new Error(
      'Cambio bloqueado. Define ECOLIMA_ALLOW_DATA_CHANGES=YES y vuelve a ejecutar.'
    )
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Define DATABASE_URL antes de confirmar.')
  const target = new URL(databaseUrl)
  const database = target.pathname.replace(/^\//, '')
  const expected = `APLICAR ${target.hostname}/${database} ${action}`
  if (!process.stdin.isTTY) {
    throw new Error(`Se requiere terminal interactiva. Escribe exactamente: ${expected}`)
  }

  const { createInterface } = await import('node:readline/promises')
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await readline.question(`Confirma el cambio escribiendo "${expected}": `)
    if (answer !== expected) {
      console.log('Cancelado; no se modificó la base.')
      return false
    }
  } finally {
    readline.close()
  }
  return true
}

export function isMain(metaUrl) {
  return process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(metaUrl)
}
