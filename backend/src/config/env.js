import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const backendEnv = fileURLToPath(
  new URL('../../../backend/.env', import.meta.url)
)

dotenv.config({ path: backendEnv })

export function getConfig(env = process.env) {
  const databaseUrl = env.DATABASE_URL
  const jwtSecret = env.JWT_SECRET_KEY
  const jwtAlgorithm = env.JWT_ALGORITHM ?? 'HS256'
  const tokenMinutes = Number(env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES ?? 30)

  if (!databaseUrl) {
    throw new Error('Falta configurar DATABASE_URL.')
  }
  if (!jwtSecret) {
    throw new Error('Falta configurar JWT_SECRET_KEY.')
  }
  if (!Number.isInteger(tokenMinutes) || tokenMinutes < 1) {
    throw new Error('JWT_ACCESS_TOKEN_EXPIRE_MINUTES debe ser un entero positivo.')
  }
  if (jwtAlgorithm !== 'HS256') {
    throw new Error('El backend admite actualmente JWT_ALGORITHM=HS256.')
  }

  const corsOrigins = (env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  if (!corsOrigins.length) {
    throw new Error('CORS_ORIGIN debe incluir al menos un origen permitido.')
  }

  return {
    databaseUrl,
    jwtSecret,
    jwtAlgorithm,
    tokenMinutes,
    port: Number(env.PORT ?? 8000),
    corsOrigin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  }
}
