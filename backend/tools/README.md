# Herramientas auxiliares de backend

Se ejecutan desde la raíz con `node backend/tools/<nombre>.js`. Requieren que
el entorno del proceso incluya `DATABASE_URL`; las pruebas HTTP aceptan
`ECOLIMA_API`. No se carga ni se imprime `.env`.

Las herramientas que escriben o alteran datos (incluido `probar_cuentas.js`,
que cambia contadores de acceso al iniciar sesión) requieren `--apply`,
`ECOLIMA_ALLOW_DATA_CHANGES=YES` y confirmación interactiva con el host, nombre
de base y acción. `seed-e2e.js` es la excepción: el runner E2E puede invocarlo
sin interacción; requiere `CYPRESS_E2E_PASSWORD` y solo crea datos semilla.

## Alcance de equivalencia

Se crearon contrapartes `.js` para los 35 nombres de `backend/tests/`, los 7
nombres de nivel raíz de `backend/` y `tests/seed-e2e.py` (`seed-e2e.js`). No se
ejecutó ningún script. Las siguientes contrapartes no reproducen íntegramente
el flujo de sus orígenes:

- `prueba_base_vacia.js`, `prueba_clientes.js`, `prueba_dashboards.js`,
  `prueba_encargar_orden.js`, `prueba_entregas.js`,
  `prueba_estado_consistente.js`, `prueba_hu08_hu11.js`,
  `prueba_local_mapa.js`, `prueba_modo_conductor.js`,
  `prueba_pedidos_conductor.js`, `prueba_permisos.js`,
  `prueba_reoptimizacion.js`, `prueba_rutas.js`, `prueba_saturacion.js`,
  `prueba_sync_estado.js` y `prueba_ventanas.js` son sondeos GET de solo
  lectura. No crean fixtures ni ejercitan los flujos originales de CRUD,
  permisos por cada rol, cambios de estado, reoptimización, entregas o limpieza.
- `prueba_dashboards.js` y `prueba_permisos.js` consultan como ADMIN; no
  verifican la matriz de permisos de todos los roles. `prueba_base_vacia.js`
  no vacía la base ni comprueba condiciones de una base vacía.
- `prueba_optimizador.js` conserva comprobaciones seleccionadas de cálculos,
  MTC y capacidad, no toda la batería de restricciones del origen.
  `prueba_licencias.js` prueba las funciones del módulo JavaScript, pero omite
  las inserciones PostgreSQL y el ensayo HTTP de vehículos compatibles.
- `prueba_calles.js` usa un OSRM simulado para matriz y caché; no repite
  consultas al servicio público, pruebas de geometría ni la comparación
  completa con el optimizador del origen.
- `prueba_fijar_secuencia.js` valida la API actual de secuencias; no puede
  comparar contra la implementación anterior que el ensayo original incluía.
  `prueba_movimientos.js` cubre restaurar un movimiento y costo; no repite
  todas las permutaciones ni la búsqueda simulada completa.
  `prueba_vuelta_noche.js` verifica el umbral/origen del modelo, no el escenario
  completo de rutas reales y varios conductores.
- `generar_datos_masivos.js` conserva generación reproducible aproximada de
  clientes, vehículos y pedidos, pero no crea automáticamente ventanas cuando
  faltan y su secuencia pseudoaleatoria no coincide con la semilla de Python.
- `cuentas_conductores.js` implementa la reorganización con PostgreSQL y
  confirmación reforzada; la asignación de fichas depende del orden actual de
  los registros y puede diferir en sus detalles de la ejecución Python.

Las herramientas de inventario, inspección de esquema, creación HU-04,
migraciones, cuentas demo, limpieza/vaciado, flota demo y sembrado E2E están
portadas a JavaScript con `pg`. Las herramientas de limpieza/migración y carga
de datos están protegidas por confirmación explícita.
