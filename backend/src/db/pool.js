import pg from 'pg'

const { Pool } = pg

export function createPool(connectionString) {
  return new Pool({
    connectionString,
    application_name: 'ecolima-backend',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}
