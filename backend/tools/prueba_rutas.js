import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_rutas', 'Rutas y pedidos (comprobaciones de lectura)')
