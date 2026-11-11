import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_encargar_orden', 'Pedidos y rutas (comprobaciones de lectura)')
