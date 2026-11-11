import express from 'express'
import cors from 'cors'
import { createAuthMiddleware } from './middleware/auth.js'
import { createAuthRouter } from './routes/auth.js'
import { createClientesRouter } from './routes/clientes.js'
import { createConductoresRouter } from './routes/conductores.js'
import { createIndicadoresRouters } from './routes/indicadores.js'
import { createMapaRouters } from './routes/mapa.js'
import { createOperacionRouters } from './routes/operacion.js'
import { createPedidosRouter } from './routes/pedidos.js'
import {
  createAsignacionesRouter,
  createObstaculosRutasRouter,
  createRutasRouter,
} from './routes/rutas.js'
import { createUsuariosRouter } from './routes/usuarios.js'
import { createVehiculosRouter } from './routes/vehiculos.js'
import { createRoadsService } from './services/roads.js'

export function createApp({ pool, config }) {
  const app = express()
  const { authenticate, requireRoles, requirePermission } = createAuthMiddleware({
    pool,
    jwtSecret: config.jwtSecret,
    jwtAlgorithm: config.jwtAlgorithm,
  })

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use('/auth', createAuthRouter({
    pool,
    config,
    authenticate,
    requireRoles,
  }))
  const routerDependencies = { pool, authenticate, requirePermission }
  const roads = createRoadsService()
  const serviceDependencies = { ...routerDependencies, roads }
  app.use('/usuarios', createUsuariosRouter(routerDependencies))
  app.use('/vehiculos', createVehiculosRouter(routerDependencies))
  app.use('/conductores', createConductoresRouter(routerDependencies))
  app.use('/clientes', createClientesRouter(routerDependencies))
  app.use('/pedidos', createPedidosRouter(routerDependencies))

  const operationRouters = createOperacionRouters(routerDependencies)
  app.use('/trafico', operationRouters.traficoRouter)
  app.use('/incidentes', operationRouters.incidentesRouter)
  app.use('/obstaculos', operationRouters.obstaculosRouter)
  app.use('/operacion', operationRouters.operacionRouter)
  app.use('/rutas', operationRouters.evaluacionRouter)

  const routeDependencies = { ...serviceDependencies }
  app.use('/rutas', createRutasRouter(routeDependencies))
  app.use('/asignaciones', createAsignacionesRouter(routeDependencies))
  app.use('/obstaculos', createObstaculosRutasRouter(routeDependencies))

  const indicatorRouters = createIndicadoresRouters(routerDependencies)
  app.use('/', indicatorRouters.indicadoresRouter)
  app.use('/sostenibilidad', indicatorRouters.sostenibilidadRouter)
  app.use('/reportes', indicatorRouters.reportesRouter)

  const mapRouters = createMapaRouters(routerDependencies)
  app.use('/local', mapRouters.localRouter)
  app.use('/mapa', mapRouters.mapaRouter)

  app.get('/', (_req, res) => res.json({
    message: 'EcoLogistica Lima API funcionando',
  }))
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      return res.json({ status: 'ok', database: 'connected' })
    } catch (error) {
      console.error('Health check could not reach PostgreSQL:', error)
      return res.status(503).json({ status: 'error', database: 'disconnected' })
    }
  })

  app.use((_req, res) => res.status(404).json({ detail: 'Not Found' }))

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ detail: 'There was an error parsing the body' })
    }
    console.error('Error no controlado en backend:', error)
    return res.status(500).json({ detail: 'Error interno del servidor' })
  })

  return app
}
