# Revisión del Sprint

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Versión del documento:** 2.0.0  
**Fecha de actualización:** 09/10/2026  
**Sprints considerados:** Sprint 1 y Sprint 2  
**Versión del producto planificada:** EcoLima MVP 1.0.0

---

## 1. Objetivo de la revisión

La revisión del sprint permite evaluar las historias de usuario planificadas, mostrar el trabajo completado, identificar lo que continúa pendiente y verificar si los resultados cumplen los criterios de aceptación.

Este documento conserva la información del Sprint 1 incluida en la versión anterior e incorpora la planificación proporcionada para el Sprint 2. Se distingue entre los estados registrados previamente y el escenario supuesto de cierre descrito en la actualización del proyecto. Los resultados del Sprint 2 deben confirmarse con Jira y con las evidencias de la aplicación antes de presentarlos como finalizados.

## 2. Revisión del Sprint 1 – Configuración y gestión básica

**Periodo planificado:** 14/09/2026 – 27/09/2026

### 2.1. Historias de usuario planificadas

Según la planificación actualizada, el Sprint 1 comprende tres historias de usuario con un total de 15 Story Points.

| ID | Historia de usuario | Puntos | Prioridad | Estado que debe verificarse |
|---|---|---:|---|---|
| HU-01 | Login con bloqueo y expiración de sesión | 5 | Highest | La versión anterior la registra como FINALIZADO |
| HU-02 | Gestión de flota | 5 | Medium | Pendiente de confirmar con Jira |
| HU-03 | Gestión de conductores | 5 | Medium | Pendiente de confirmar con Jira |
| | **Total planificado** | **15** | | |

**Nota sobre la actualización:** la revisión anterior indicaba seis historias en el Sprint 1, con HU-01, HU-02, HU-04, HU-05, HU-07 y HU-09. La planificación nueva del proyecto distribuye HU-01, HU-02 y HU-03 en el Sprint 1, y HU-04 y HU-05 en el Sprint 2. Por ello, se adopta la distribución nueva como planificación propuesta, pero se debe verificar y alinear con Jira antes de considerar corregidos los registros históricos.

### 2.2. Trabajo completado según el registro anterior

La versión anterior de este documento identificaba la siguiente historia como finalizada:

| ID | Historia de usuario | Puntos | Estado registrado en la versión anterior |
|---|---|---:|---|
| HU-01 | Login con bloqueo y expiración de sesión | 5 | FINALIZADO |

La funcionalidad contempla el acceso al sistema mediante autenticación, con bloqueo y expiración de sesión de acuerdo con las reglas definidas para el proyecto.

Para aceptar la historia se debe comprobar:
- Inicio de sesión con credenciales válidas.
- Rechazo de credenciales incorrectas.
- Aplicación del bloqueo configurado después de los intentos fallidos definidos.
- Expiración de la sesión según la regla de inactividad.
- Acceso únicamente a las funciones autorizadas para el rol correspondiente.

La historia HU-01 fue registrada como finalizada en la versión anterior; las pruebas y evidencias actuales deben revisarse para confirmar que sigue cumpliendo la definición de terminado.

### 2.3. Historias restantes del Sprint 1

| ID | Historia de usuario | Puntos | Estado actual verificado |
|---|---|---:|---|
| HU-02 | Gestión de flota | 5 | No verificado en la información nueva |
| HU-03 | Gestión de conductores | 5 | No verificado en la información nueva |

Se debe revisar Jira para confirmar el estado real de HU-02 y HU-03. La planificación nueva las ubica en el Sprint 1, pero no incluye evidencia suficiente para afirmar que fueron terminadas.

### 2.4. Criterio de cierre del Sprint 1

El Sprint 1 puede considerarse completado cuando las historias incluidas en el alcance final hayan cumplido sus criterios de aceptación y la definición de terminado del equipo. Se recomienda adjuntar el registro del sprint en Jira, los resultados de las pruebas y las evidencias de las funcionalidades.

## 3. Revisión del Sprint 2 – Pedidos y clientes

**Periodo planificado en la actualización:** 28/09/2026 – 04/10/2026  
**Estado descrito en el archivo de actualización:** ACTIVO

### 3.1. Historias de usuario del Sprint 2

| ID | Historia de usuario | Puntos | Prioridad | Épica | Estado indicado en la actualización |
|---|---|---:|---|---|---|
| HU-04 | Gestión de pedidos | 8 | Highest | EP-03 – Gestión de pedidos | EN CURSO |
| HU-05 | Gestión de clientes | 5 | Medium | EP-04 – Gestión de clientes | POR HACER |
| | **Total planificado** | **13** | | | |

La actualización identifica el Sprint 2 como activo. Como su periodo planificado termina el 4 de octubre y este documento se actualiza el 9 de octubre de 2026, es necesario revisar Jira para determinar si el sprint fue cerrado, si se modificaron las fechas o si continúa activo.

### 3.2. Demostración esperada de HU-04 – Gestión de pedidos

La demostración debería mostrar el registro y la consulta de pedidos, así como la validación de los campos obligatorios definidos por el sistema. Según el diseño del proyecto, los datos pueden incluir cliente, dirección o ubicación de entrega, peso, volumen, prioridad y ventana horaria.

**Evidencias recomendadas:**
- Captura del formulario de registro de pedidos.
- Ejemplo de un pedido guardado y consultado.
- Resultado de la validación ante datos obligatorios incompletos.
- Evidencia de la relación con el cliente cuando corresponda.
- Pruebas que demuestren que la información almacenada es consistente.

**Estado:** la información recibida indica EN CURSO. No se declara la historia como completada hasta verificar su estado y la demostración funcional.

### 3.3. Demostración esperada de HU-05 – Gestión de clientes

La demostración debería mostrar el registro, la consulta y la actualización de clientes, validando los campos requeridos por el diseño. Cuando corresponda, también debe evidenciarse la relación entre el cliente y sus pedidos.

**Evidencias recomendadas:**
- Captura del formulario de registro de clientes.
- Ejemplo de un cliente guardado y consultado.
- Evidencia de actualización de los datos permitidos.
- Pruebas de validación de los campos obligatorios.
- Comprobación de la relación con pedidos, si aplica.

**Estado:** la información recibida indica POR HACER. Por tanto, la historia debe considerarse pendiente hasta que el equipo la implemente, valide y actualice en Jira.

### 3.4. Criterio de cierre del Sprint 2

Para declarar cerrado el Sprint 2 se debe verificar que HU-04 y HU-05 cumplan sus criterios de aceptación y la definición de terminado. Además, Jira debe mostrar el estado real de las historias y el cierre formal del sprint, si este se ha realizado.

La planificación original plantea un escenario supuesto en el que ambas historias se completan. Este documento no presenta ese escenario como resultado real sin evidencias.

## 4. Resumen de alcance de los dos primeros sprints

| Indicador | Sprint 1 | Sprint 2 | Total |
|---|---:|---:|---:|
| Historias planificadas en la distribución actualizada | 3 | 2 | 5 |
| Story Points planificados | 15 | 13 | 28 |
| Historias que se completarían en el escenario supuesto | 3 | 2 | 5 |
| Story Points que se completarían en el escenario supuesto | 15 | 13 | 28 |

La tabla resume la planificación actualizada, no un resultado verificado. No se debe reportar una tasa de finalización del 100 % hasta contrastar las historias con Jira y con sus criterios de aceptación.

## 5. Validación de calidad para aceptar las historias

| Área | Validación requerida | Evidencia esperada |
|---|---|---|
| Autenticación | Acceso válido, rechazo de credenciales incorrectas, bloqueo y expiración de sesión | Pruebas funcionales y capturas |
| Gestión de flota | Registro, consulta, actualización y validación de vehículos | Pruebas funcionales |
| Gestión de conductores | Registro, consulta, actualización y validación de datos | Pruebas funcionales |
| Gestión de pedidos | Registro, consulta y validación de pedidos | Pruebas funcionales |
| Gestión de clientes | Registro, consulta y actualización de clientes | Pruebas funcionales |
| Cobertura | Cobertura unitaria mínima del 80 %, según la definición de terminado del proyecto | Reporte de cobertura |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación |
| Despliegue | Despliegue automatizado en el entorno de pruebas | Registro del despliegue |
| Documentación | Documentación de API y código actualizada | Documentación revisada |

La evidencia de estas validaciones debe adjuntarse cuando esté disponible. No se afirma que las pruebas se hayan superado si no existen resultados que lo demuestren.

## 6. Pendientes y acciones posteriores

### 6.1. Verificaciones inmediatas

- Confirmar en Jira la distribución definitiva de historias entre los Sprints 1 y 2.
- Aclarar por qué el archivo de actualización indica el Sprint 2 como activo si el periodo planificado terminó el 04/10/2026.
- Verificar los estados reales de HU-02 y HU-03.
- Confirmar el avance de HU-04 y HU-05.
- Comprobar criterios de aceptación y evidencias de las historias declaradas finalizadas.
- Mantener sincronizados el documento, Jira y el repositorio.

### 6.2. Próximas funcionalidades planificadas

Según las capturas de Jira compartidas, el Sprint 3 – Rutas contempla:

| ID | Historia de usuario | Puntos | Estado mostrado en Jira |
|---|---|---:|---|
| HU-06 | Generación de rutas optimizadas | 8 | EN CURSO |
| HU-07 | Visualización de rutas en mapa | 5 | POR HACER |
| HU-08 | Re-optimización dinámica | 8 | POR HACER |
| | **Total planificado** | **21** | |

El Sprint 4 – Sostenibilidad contempla:

| ID | Historia de usuario | Puntos | Estado mostrado en Jira |
|---|---|---:|---|
| HU-09 | Dashboard de indicadores | 5 | POR HACER |
| HU-10 | Reportes de sostenibilidad | 5 | POR HACER |
| HU-11 | Plan de compensación de carbono | 5 | POR HACER |
| | **Total planificado** | **15** | |

Estos estados corresponden a las capturas compartidas y pueden cambiar. Deben actualizarse según el tablero actual.

## 7. Conclusiones

1. La planificación actualizada distribuye cinco historias de usuario entre los Sprints 1 y 2, con un total de 28 Story Points.
2. La revisión anterior registraba HU-01 como finalizada; las demás historias y la nueva distribución deben verificarse en Jira.
3. La información recibida para el Sprint 2 muestra HU-04 en curso y HU-05 por hacer, por lo que no corresponde declarar ambas como terminadas sin evidencia posterior.
4. La demostración del trabajo debe respaldarse con capturas de la aplicación, pruebas y criterios de aceptación, además de los estados de Jira.
5. Las funcionalidades de generación de rutas, visualización, reoptimización y sostenibilidad continúan en los sprints posteriores según la planificación compartida.

## 8. Historial de cambios

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0.0 | 30/09/2026 | Revisión inicial del Sprint 1 con los estados registrados en Jira en ese momento. |
| 2.0.0 | 09/10/2026 | Se incorpora la planificación actualizada de los Sprints 1 y 2, las historias HU-01 a HU-05, sus estimaciones, criterios de demostración, validaciones de calidad y pendientes de verificación. Se señala la discrepancia entre la planificación nueva y los estados anteriores de Jira. |

---

**Nota final:** esta revisión debe contrastarse con Jira antes de presentarla como acta definitiva de los sprints. La planificación y los estados descritos en el archivo de actualización no sustituyen la evidencia del trabajo realmente completado.
