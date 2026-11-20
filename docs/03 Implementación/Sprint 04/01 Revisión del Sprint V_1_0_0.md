[← Volver al README principal](../../../README.md)

# Revisión del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Scrum Master del equipo EcoLima. El nombre y apellidos del responsable no están consignados en los archivos del repositorio consultados; debe mantenerse el nombre registrado en Jira.

**Sprint:** 4  
**Fecha de revisión documental:** 19 de noviembre de 2026  
**Versión:** 1.0.0  
**Pull Request de integración:** [PR #6 – Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6)  
**Commit de integración:** [4bb9b86935312c7b48693b720f92661d9177d924](https://github.com/MaylonRicaldi/EcoLima/commit/4bb9b86935312c7b48693b720f92661d9177d924)

## Historias de Usuario completadas en este Sprint

Durante el Sprint 4 se trabajó en las historias HU-09, HU-10 y HU-11. Sus cambios de código fueron integrados a la rama `main` mediante el PR #6, que figura como cerrado y fusionado. La revisión del repositorio permite confirmar la implementación técnica descrita a continuación. La aceptación funcional definitiva debe contrastarse con Jira y con las evidencias de ejecución del entorno desplegado; por ese motivo, no se confunde la integración del código con la validación completa de la Definition of Done.

| Código y título | Criterios de aceptación revisados | Resultado y trazabilidad |
|---|---|---|
| **HU-09 – Dashboard de indicadores** | El dashboard consulta indicadores operativos y ambientales; presenta conteos de pedidos, rutas, vehículos, conductores, clientes e incidentes; muestra datos agregados de distancia, duración, combustible, costos, emisiones y ahorros; contempla estados de carga, error y reintento. El endpoint requiere autenticación y permiso de lectura. | Implementación identificada en `frontend/src/pages/Dashboard.jsx` y `backend/src/routes/indicadores.js`. Integración: [PR #6](https://github.com/MaylonRicaldi/EcoLima/pull/6), commit [4bb9b86](https://github.com/MaylonRicaldi/EcoLima/commit/4bb9b86935312c7b48693b720f92661d9177d924). La comparación de indicadores con datos reales y la validación de roles en producción requieren evidencia de ejecución. |
| **HU-10 – Reportes de sostenibilidad** | Se admiten los tipos SOSTENIBILIDAD, TCO, COMPENSACION y AUDITORIA; el backend prepara el contenido CSV a partir de las rutas; registra el reporte con el usuario generador y ofrece un endpoint de descarga; valida el tipo de reporte y el identificador de ruta cuando se proporciona. | Implementación identificada en `backend/src/services/reportes.js` y `backend/src/routes/indicadores.js`. La descarga se atiende mediante `GET /reportes/:id/descargar`. Integración: [PR #6](https://github.com/MaylonRicaldi/EcoLima/pull/6). La migración que incorpora `contenido_csv` debe verificarse en Neon antes de confirmar la persistencia y descarga en el entorno desplegado. |
| **HU-11 – Plan de compensación de carbono** | El cálculo utiliza el factor de 22 kg de CO₂ por árbol al año; redondea hacia arriba el número de árboles; rechaza cantidades no numéricas, no positivas o superiores a las emisiones totales; permite consultar el impacto y los planes registrados. | Implementación identificada en `backend/src/services/calculations.js` y `backend/src/routes/indicadores.js`. Se incorporaron pruebas unitarias para los valores 22, 44, 50, 100, 220 y 500 kg. Integración: [PR #6](https://github.com/MaylonRicaldi/EcoLima/pull/6). La migración de la columna generada y la comprobación del resultado en Neon deben quedar respaldadas por evidencia. |

**Estado de la Definition of Done:** las tres historias cuentan con cambios integrados en GitHub. Para declarar su cierre funcional completo todavía deben adjuntarse evidencias de validación en el sistema desplegado, confirmarse las migraciones de base de datos que correspondan y actualizarse los estados de aceptación en Jira. El PR acredita la integración del incremento, pero no sustituye esas comprobaciones.

## Demostración del trabajo completado

El incremento del Sprint 4 se encuentra integrado en la rama `main`. El entorno de producción utilizado por el proyecto está compuesto por el frontend publicado en Vercel, el backend publicado en Render y la base de datos PostgreSQL/PostGIS alojada en Neon. La integración del PR #6 y el código fuente permiten preparar el siguiente recorrido de demostración:

1. **Dashboard (HU-09):** iniciar sesión con un usuario autorizado, abrir el Dashboard y mostrar los indicadores de operación, rutas, pedidos, flota y sostenibilidad. Se debe contrastar al menos un indicador con la respuesta del servicio o con una consulta de base de datos.
2. **Reportes (HU-10):** ingresar al módulo de reportes, generar un reporte de sostenibilidad consolidado, comprobar que se registre y descargar el CSV. Se debe abrir el archivo para verificar sus encabezados y contenido.
3. **Compensación de carbono (HU-11):** abrir el módulo de sostenibilidad, ejecutar el cálculo, mostrar el factor de 22 kg de CO₂ por árbol/año y comprobar que el número de árboles se redondee hacia arriba.

**Registro de la demostración:** en los archivos versionados consultados no se encontró un acta ni un registro multimedia que permita afirmar que la sesión con stakeholders ya se realizó, ni comentarios atribuibles a ellos. Por tanto, la demostración queda documentada mediante el recorrido anterior y las evidencias siguientes deben incorporarse después de ejecutarla.

**Evidencias que deben agregarse a este documento y al repositorio:**

- **Captura 1 – Dashboard:** pantalla completa del módulo Dashboard con los indicadores visibles. Guardar como `docs/03 Implementación/Sprint 04/evidencias/01-dashboard-indicadores.png`.
- **Captura 2 – Reportes:** módulo de reportes mostrando el registro generado y, de ser posible, la descarga del CSV completada. Guardar como `docs/03 Implementación/Sprint 04/evidencias/02-reporte-csv.png`.
- **Captura 3 – Compensación:** resultado del cálculo de CO₂ con el factor de 22 kg y los árboles necesarios visibles. Guardar como `docs/03 Implementación/Sprint 04/evidencias/03-compensacion-carbono.png`.
- **Acta o evidencia de stakeholders:** incorporar el acta de revisión o una captura/video de la demostración donde consten la fecha, participantes, observaciones y acuerdos. Guardar como `docs/03 Implementación/Sprint 04/evidencias/04-acta-demo-sprint-04.pdf` o `04-demo-sprint-04.mp4`.

Las rutas anteriores indican los nombres y la ubicación esperada; las imágenes y el acta todavía deben ser proporcionadas por el equipo. No se incluyen capturas simuladas.

## Pendientes

| Pendiente | Justificación | Tratamiento posterior |
|---|---|---|
| Validar HU-09 con datos del entorno desplegado y roles autorizados. | La revisión del código confirma el endpoint y la vista, pero no se encontró evidencia adjunta de la comparación de indicadores ni de la prueba por rol. | Ejecutar el recorrido del Dashboard, contrastar un conjunto de valores con la API/Neon y adjuntar la captura correspondiente. |
| Aplicar y verificar la migración de HU-10 en Neon. | La funcionalidad de persistencia del CSV utiliza la columna `reportes.contenido_csv`; el repositorio incluye una migración, pero no se encontró evidencia que confirme su ejecución en la base de datos desplegada. | Ejecutar primero en la base de pruebas, verificar generación y descarga, y documentar el resultado antes de cualquier aplicación en producción. |
| Validar HU-11 en la base de datos desplegada. | El código y las pruebas unitarias contemplan el redondeo hacia arriba; falta evidencia de que la estructura de Neon y la aplicación desplegada reflejen la migración y el resultado esperado. | Probar valores representativos, comprobar el registro persistido y adjuntar la captura del resultado. |
| Registrar la aceptación de las historias en Jira. | El PR confirma la integración técnica, pero no acredita por sí solo el cambio de estado ni la aprobación de cada historia en el tablero. | Actualizar cada HU con su estado real, criterios comprobados y enlaces al PR/commit y evidencias. |
| Incorporar acta y retroalimentación de stakeholders. | No se encontró un acta ni comentarios verificables de la sesión de revisión. | Registrar fecha, participantes, observaciones y acuerdos después de realizar la demostración. |

**Deuda técnica identificada:** la ejecución de las migraciones de base de datos debe controlarse por ambiente; las pruebas funcionales deben cubrir permisos, ausencia de datos, errores de validación y descarga de CSV; y las evidencias de aceptación deben quedar vinculadas tanto en Jira como en el repositorio.

