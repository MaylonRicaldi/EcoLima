import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_clientes', 'Clientes y autorización (comprobaciones de lectura)')
