import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_sync_estado', 'Consistencia de estado de pedidos (listado)')
