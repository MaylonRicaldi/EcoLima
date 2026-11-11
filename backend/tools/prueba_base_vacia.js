import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_base_vacia', 'API con la base vacía (comprobaciones de lectura)')
