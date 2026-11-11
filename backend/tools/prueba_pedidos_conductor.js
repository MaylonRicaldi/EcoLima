import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_pedidos_conductor', 'Pedidos del conductor (listado)')
