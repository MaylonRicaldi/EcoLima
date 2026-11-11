import { createApp } from './app.js'
import { getConfig } from './config/env.js'
import { createPool } from './db/pool.js'

const config = getConfig()
const pool = createPool(config.databaseUrl)
const app = createApp({ pool, config })
const onListening = () => {
  console.log(`EcoLima Node API escuchando en el puerto ${config.port}`)
}
const host = process.env.RENDER ? '0.0.0.0' : '127.0.0.1'
const server = app.listen(config.port, host, onListening)

export default app

async function shutdown(signal) {
  console.log(`Recibida señal ${signal}; cerrando backend Node.js.`)
  server.close(async (error) => {
    await pool.end()
    if (error) {
      console.error('Error al cerrar el servidor:', error)
      process.exitCode = 1
    }
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
