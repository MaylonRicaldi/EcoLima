[← Volver al README principal](../../../README.md)

# 01. Revisión del Sprint 4

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** 4  
**Versión:** 1.0.0  
**Fecha de corte documental:** 19 de noviembre de 2026  
**Metodología:** Scrum  
**Historias de usuario:** HU-09, HU-10 y HU-11

---

## 1. Objetivo de la revisión

El Sprint 4 tiene como objetivo consolidar las funciones de seguimiento de indicadores, generación de reportes de sostenibilidad y planificación de compensación de carbono. La revisión contrasta el alcance del sprint con el código fuente disponible en las ramas del repositorio al momento de elaborar este documento.

Este documento registra el estado técnico observado. No reemplaza la validación funcional en el entorno desplegado ni la aprobación de las historias en Jira.

## 2. Historias de usuario consideradas

| Código | Historia | Resultado funcional esperado |
|---|---|---|
| HU-09 | Dashboard de indicadores | Consultar indicadores operativos y ambientales agregados a partir de pedidos, rutas, flota, conductores e indicadores de ruta. |
| HU-10 | Reportes de sostenibilidad | Consultar el consolidado de rutas y registrar reportes por tipo, con información de sostenibilidad y trazabilidad del usuario generador. |
| HU-11 | Plan de compensación de carbono | Calcular las emisiones que se deben compensar, estimar árboles equivalentes y registrar el plan de compensación. |

## 3. Revisión técnica del incremento

### 3.1. HU-09 – Dashboard de indicadores

En el frontend, la vista `frontend/src/pages/Dashboard.jsx` consulta los servicios de operación para presentar indicadores agrupados en operación logística, desempeño de rutas, sostenibilidad y estado de pedidos.

En el backend, `backend/src/routes/indicadores.js` expone el recurso `GET /dashboard`. La respuesta agrupa conteos de pedidos, rutas, vehículos, conductores, clientes e incidentes; distancia, duración, combustible, costo y emisiones; ahorros y cumplimiento de ventanas; además de pedidos por estado y flota por combustible.

**Verificaciones técnicas identificadas:**

- El endpoint requiere autenticación y permiso de lectura del recurso `indicadores`.
- Las consultas excluyen rutas canceladas en los totales operativos.
- Los valores agregados nulos se convierten a cero y se redondean a dos decimales.
- El frontend presenta estados de carga, error y opción para reintentar la consulta.

**Validación pendiente:** ejecutar el flujo con usuarios de los roles autorizados y contrastar los valores mostrados con consultas directas a PostgreSQL en el entorno de pruebas o producción.

### 3.2. HU-10 – Reportes de sostenibilidad

El backend implementa rutas bajo `/reportes` para listar reportes, registrar la generación de un reporte, consultar el detalle de sostenibilidad de una ruta y obtener un consolidado de rutas.

Los tipos admitidos por el registro son `SOSTENIBILIDAD`, `TCO`, `COMPENSACION` y `AUDITORIA`. El frontend muestra las acciones para solicitar esos tipos y una tabla con el identificador, tipo, ruta, usuario, fecha y nombre de archivo registrado.

**Alcance que debe distinguirse:** el código revisado registra metadatos del reporte y un nombre de archivo en `ruta_archivo`. La implementación inspeccionada no demuestra que se genere y almacene físicamente un archivo CSV descargable. Por ello, la generación física, descarga y contenido final del archivo deben validarse o completarse antes de declarar terminada esa parte del requerimiento.

**Corrección aplicada:** se incorporó el servicio `backend/src/services/reportes.js`, que genera CSV con encabezados y datos reales de PostgreSQL, y el contenido se persiste en `contenido_csv` mediante la migración preparada de Sprint 04. El endpoint `GET /reportes/:id/descargar` entrega el archivo con `Content-Disposition`.

**Validación pendiente:** aplicar la migración en Neon de pruebas y ejecutar una generación real de cada tipo, una descarga y una comprobación de permisos con datos controlados.

### 3.3. HU-11 – Plan de compensación de carbono

El backend expone `GET /sostenibilidad/compensacion`, `POST /sostenibilidad/compensacion` y `GET /sostenibilidad/impacto`. La operación de cálculo obtiene las emisiones acumuladas de rutas no canceladas y registra un plan en `compensacion_carbono`.

El cálculo utiliza el parámetro del proyecto de **22 kg de CO₂ por árbol al año**, asociado al escenario de compensación del Parque Zonal Huáscar. La tabla contempla emisiones totales, emisiones a compensar, factor de captura, árboles necesarios, proyecto, ubicación, costo estimado y fecha de cálculo.

El frontend permite solicitar el cálculo, presenta el resultado y lista los planes registrados.

**Corrección aplicada:** el cálculo del backend utiliza redondeo hacia arriba y la migración cambia la columna generada a `CEIL(co2_a_compensar_kg / factor_captura_arbol_kg)`. El backend rechaza cantidades negativas, nulas, no numéricas y mayores que las emisiones totales.

**Validación pendiente:** aplicar la migración en Neon de pruebas y comprobar los ejemplos 22, 44, 50, 100, 220 y 500 kg en frontend, backend y base de datos.

## 4. Definition of Done (DoD)

| Criterio | Evidencia disponible en el repositorio | Estado al corte |
|---|---|---|
| Código integrado en frontend y backend | Dashboard.jsx, rutas de indicadores y montaje de routers en app.js | Implementación identificada |
| Persistencia de información | Consultas a indicadores_ruta, reportes y compensacion_carbono | Implementación identificada |
| Autenticación y permisos | Middleware authenticate y requirePermission en endpoints | Implementación identificada |
| Validación funcional en entorno desplegado | No se adjuntó un registro de ejecución completo de HU-09, HU-10 y HU-11 | Pendiente de evidencia |
| Pruebas E2E con Playwright | Configuración, Chromium, Firefox y WebKit declarados; dos pruebas locales ejecutadas | Parcial |
| Evidencias de aceptación en Jira | No se proporcionaron enlaces de PR o tickets cerrados para estas HU | Pendiente |
| Documentación del sprint | Documentos de Sprint 4 | Elaborada en este corte |

Una historia se considerará terminada cuando, además de estar implementada, sus criterios de aceptación hayan sido ejecutados, revisados y respaldados por evidencia.

## 5. Demostración del incremento

La demostración funcional debe realizarse con una cuenta autorizada y datos de prueba controlados. El recorrido propuesto es:

1. Iniciar sesión en EcoLima y abrir el Dashboard.
2. Revisar los indicadores de pedidos, rutas, flota, desempeño y sostenibilidad.
3. Comparar al menos un total mostrado con los datos de la API y la base de datos.
4. Consultar el consolidado de rutas y solicitar un reporte de sostenibilidad.
5. Revisar el registro creado y comprobar si el archivo indicado existe y puede consultarse.
6. Solicitar un plan de compensación y revisar el factor de captura, emisiones y árboles calculados.

La demostración debe registrarse con capturas o video, fecha, ambiente utilizado y resultado de cada paso. No se afirma que esta sesión haya sido realizada en la fecha de corte.

## 6. Pendientes para el cierre

- Completar y ejecutar pruebas automatizadas E2E con Playwright.
- Verificar la generación física y recuperación de los archivos de reportes; actualmente el código revisado registra metadatos y una ruta de archivo.
- Ejecutar pruebas con datos controlados para el cálculo de compensación.
- Aplicar la encuesta SUS a usuarios evaluadores y documentar respuestas reales.
- Adjuntar evidencias de ejecución, resultados y aceptación en Jira.
- Confirmar la ejecución satisfactoria de los workflows CI/CD solicitados por la consigna.

## 7. Conclusión

El repositorio ya contiene una implementación funcional identificable para el Dashboard, los servicios de reportes y el cálculo de compensación de carbono. Sin embargo, la existencia del código no acredita por sí sola el cierre de las historias. La aceptación final del Sprint 4 queda condicionada a la ejecución de pruebas, la comprobación del archivo de reporte, la evaluación de usabilidad y la incorporación de evidencias verificables.

---

**Versión del documento:** 1.0.0
