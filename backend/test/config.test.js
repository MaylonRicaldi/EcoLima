import test from 'node:test'
import assert from 'node:assert/strict'
import { getConfig } from '../src/config/env.js'

const required = {
  DATABASE_URL: 'postgresql://user:pass@db.example.test/ecolima',
  JWT_SECRET_KEY: 'test-secret',
}

test('configuration accepts one or multiple explicit frontend origins', () => {
  assert.equal(getConfig(required).corsOrigin, 'http://localhost:5173')
  assert.deepEqual(
    getConfig({
      ...required,
      CORS_ORIGIN: ' https://ecolima.vercel.app , https://preview.vercel.app/ ',
    }).corsOrigin,
    ['https://ecolima.vercel.app', 'https://preview.vercel.app']
  )
})

test('configuration rejects empty CORS origins and invalid token expiry', () => {
  assert.throws(
    () => getConfig({ ...required, CORS_ORIGIN: ' , ' }),
    /CORS_ORIGIN/
  )
  assert.throws(
    () => getConfig({ ...required, JWT_ACCESS_TOKEN_EXPIRE_MINUTES: '0' }),
    /entero positivo/
  )
})
