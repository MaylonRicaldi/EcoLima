# Logistics routes (JavaScript)

The logistics routers are factories so the caller can share the existing
PostgreSQL pool and authentication middleware. `createRutasRouter` exposes
relative paths for `/rutas`, `createAsignacionesRouter` for `/asignaciones`,
and `createObstaculosRutasRouter` for the obstacle optimization action at
`/obstaculos/:id_obstaculo/optimizar-ruta`.

```js
import { createAuthMiddleware } from './middleware/auth.js'
import { createRoadsService } from './services/roads.js'
import {
  createAsignacionesRouter,
  createRutasRouter,
} from './routes/rutas.js'

const auth = createAuthMiddleware({ pool, jwtSecret, jwtAlgorithm })
const shared = {
  pool,
  authenticate: auth.authenticate,
  requirePermission: auth.requirePermission,
  roads: createRoadsService(), // optional; a service is created if omitted
}

app.use('/rutas', createRutasRouter(shared))
app.use('/asignaciones', createAsignacionesRouter(shared))
```

The route factories receive an existing `pg.Pool`; reads use `pool.query`,
and persistence opens a client and wraps multi-table updates in `BEGIN` /
`COMMIT` with rollback on failure. `optimizer.js`, `optimizationData.js`,
`routePersistence.js`, and `ordenSuggested.js` are the service counterparts
to the optimizer, database loaders, persistence layer, and suggested
order evaluator. The obstacle-optimization router factory is exported but
not mounted because that router is not part of the active API configuration.

The main application mounts the route and assignment factories. The Node.js
server also mounts obstacle optimization at the path used by the frontend.
The Node.js server is the official backend; run integration and E2E checks
with `tests/run-e2e.ps1` against an isolated database.
