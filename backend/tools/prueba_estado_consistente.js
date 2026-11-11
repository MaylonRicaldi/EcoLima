import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_estado_consistente', 'Consistencia de pedidos (listado)')
