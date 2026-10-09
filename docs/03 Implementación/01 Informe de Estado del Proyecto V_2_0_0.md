# Informe de Estado del Proyecto

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Metodología de trabajo:** Scrum  
**Herramienta de gestión:** Jira  
**Versión del documento:** 2.0.0  
**Fecha del informe:** 09/10/2026  
**Periodo evaluado:** 14/09/2026 – 04/10/2026  
**Versión del producto considerada:** EcoLima MVP 1.0.0  
**Estado del informe:** Actualización basada en la planificación proporcionada. El cierre satisfactorio de los Sprints 1 y 2 es un escenario supuesto y debe contrastarse con Jira, el repositorio y las pruebas del sistema.

---

## 1. Resumen ejecutivo

EcoLima es un proyecto orientado a apoyar la gestión de operaciones logísticas mediante funcionalidades para administrar el acceso al sistema, los vehículos, los conductores, los pedidos y los clientes. En etapas posteriores se incorporarán la generación y optimización de rutas, la visualización de recorridos en mapas, la reoptimización dinámica y las funciones de sostenibilidad.

Este informe actualiza la versión anterior e incorpora la planificación descrita para los dos primeros sprints. El Sprint 1 se orienta a establecer la base de acceso y administración de recursos logísticos; el Sprint 2 se enfoca en la gestión de pedidos y clientes. En conjunto, la planificación actualizada considera cinco historias de usuario y 28 Story Points.

| Indicador de planificación | Sprint 1 | Sprint 2 | Total |
|---|---:|---:|---:|
| Historias de usuario planificadas | 3 | 2 | 5 |
| Story Points planificados | 15 | 13 | 28 |
| Historias previstas para el cierre supuesto | 3 | 2 | 5 |
| Story Points previstos para el cierre supuesto | 15 | 13 | 28 |

Los valores de cierre indicados son metas del escenario de planificación, no resultados verificados. Para declarar que el alcance fue completado, se debe confirmar que cada historia cumpla sus criterios de aceptación y la definición de terminado, además de revisar su estado en Jira y las evidencias técnicas.

La actualización también mantiene como próximos pasos las funcionalidades de rutas del Sprint 3 y las funciones de sostenibilidad del Sprint 4. La información de Jira compartida previamente muestra un Sprint 3 denominado “Rutas” y un Sprint 4 denominado “Sostenibilidad”; no obstante, se debe aclarar la situación del Sprint 2 en el tablero antes de declarar formalmente su cierre.

## 2. Objetivo y alcance del informe

### 2.1. Objetivo general

Describir el estado de planificación de EcoLima durante los Sprints 1 y 2, detallando el alcance previsto, el cronograma, los costos, la calidad, los riesgos y las actividades siguientes para mantener la trazabilidad del proyecto.

### 2.2. Objetivos específicos

- Resumir las historias de usuario y los Story Points planificados para los dos primeros sprints.
- Describir los resultados funcionales que se esperan de cada historia.
- Establecer los criterios y evidencias necesarios para verificar el cierre de las historias.
- Identificar riesgos relacionados con la seguridad, la calidad de los datos, la integración y el cumplimiento del cronograma.
- Mantener la continuidad entre el MVP 1.0.0 y las funcionalidades planificadas para los sprints posteriores.
- Señalar los datos que todavía deben confirmarse mediante Jira, pruebas y evidencias del repositorio.

### 2.3. Alcance considerado

El alcance de los dos primeros sprints comprende las siguientes funcionalidades:

1. Inicio de sesión con bloqueo y expiración de sesión.
2. Gestión de flota.
3. Gestión de conductores.
4. Gestión de pedidos.
5. Gestión de clientes.

La generación de rutas optimizadas, su visualización en mapas, la reoptimización dinámica, el dashboard de indicadores y los reportes de sostenibilidad se consideran funcionalidades posteriores dentro de la planificación compartida.

## 3. Estado general del proyecto

### 3.1. Variables de control

| Variable | Estado y análisis |
|---|---|
| **Alcance** | La planificación actualizada considera cinco historias de usuario entre los Sprints 1 y 2, con 28 Story Points. El escenario de cierre supone que las cinco historias se completarían; esta situación debe validarse con los estados reales de Jira y con las pruebas funcionales. |
| **Cronograma** | El Sprint 1 se planificó del 14 al 27 de septiembre de 2026. El archivo de actualización sitúa el Sprint 2 del 28 de septiembre al 4 de octubre de 2026. Como el informe se prepara el 9 de octubre, se debe confirmar en Jira si el Sprint 2 fue completado, quedó activo o requiere actualización de fechas y estado. |
| **Costos** | No se ha proporcionado información de costos reales ejecutados específicamente para los Sprints 1 y 2. Por ello, no es posible calcular una desviación real respecto del presupuesto. El presupuesto aprobado o estimado del proyecto no debe interpretarse como gasto efectivamente realizado. |
| **Calidad** | No se han proporcionado resultados consolidados de pruebas, cobertura, análisis estático, revisión de código o despliegue para las cinco historias. La calidad debe verificarse con evidencias antes de declarar una historia como terminada. |
| **Gestión y seguimiento** | Jira se utiliza para organizar épicos, historias, prioridades, Story Points, sprints y estados. Se debe asegurar que el Sprint 2 esté visible y correctamente registrado, y que los estados reflejen el trabajo realmente realizado. |

### 3.2. Estado del informe

Este documento integra la planificación de los dos primeros sprints y define cómo evaluar su cierre. No constituye por sí solo una evidencia de que las funcionalidades estén implementadas. Cuando se disponga de los resultados reales, se deben reemplazar las expresiones de escenario supuesto por estados verificados y añadir las evidencias correspondientes.

## 4. Planificación y resultados esperados del Sprint 1

**Nombre:** Sprint 1 – Configuración y gestión básica  
**Periodo planificado:** 14/09/2026 – 27/09/2026  
**Objetivo:** establecer las funcionalidades básicas de acceso y administración de vehículos y conductores, como base para la gestión de las operaciones logísticas.

### 4.1. Historias planificadas

| ID | Historia de usuario | Story Points | Prioridad | Épica |
|---|---|---:|---|---|
| HU-01 | Login con bloqueo y expiración de sesión | 5 | Highest | EP-01 – Gestión de acceso y usuarios |
| HU-02 | Gestión de flota | 5 | Medium | EP-02 – Gestión de flota y conductores |
| HU-03 | Gestión de conductores | 5 | Medium | EP-02 – Gestión de flota y conductores |
| | **Total planificado** | **15** | | |

### 4.2. Resultados funcionales esperados

**HU-01 – Login con bloqueo y expiración de sesión**

Se espera que los usuarios puedan iniciar sesión mediante sus credenciales y acceder a las funciones autorizadas según su rol. El sistema debe gestionar los intentos fallidos y la expiración de sesión por inactividad conforme a las reglas de seguridad definidas.

Validaciones requeridas:
- Permitir el acceso con credenciales válidas.
- Rechazar credenciales incorrectas.
- Aplicar el bloqueo configurado después de los intentos fallidos definidos.
- Expirar la sesión según la regla establecida.
- Verificar que los permisos se correspondan con el rol del usuario.

**HU-02 – Gestión de flota**

Se espera que el sistema permita registrar, consultar y administrar vehículos de la operación logística. Los datos registrados deben servir como base para futuras asignaciones y para la planificación de rutas.

Validaciones requeridas:
- Registrar un vehículo con los campos obligatorios.
- Consultar vehículos registrados.
- Actualizar la información permitida.
- Rechazar o advertir datos incompletos o inválidos, según las reglas definidas.

**HU-03 – Gestión de conductores**

Se espera que el sistema permita registrar, consultar y actualizar los datos de los conductores, con la finalidad de contar con información consistente para las operaciones logísticas posteriores.

Validaciones requeridas:
- Registrar los datos obligatorios del conductor.
- Consultar la información registrada.
- Actualizar los campos permitidos.
- Validar los datos requeridos de acuerdo con las reglas del proyecto.

### 4.3. Criterio de cierre del Sprint 1

Para considerar completado el Sprint 1, las tres historias deben cumplir sus criterios de aceptación y la definición de terminado del equipo. La evidencia debería incluir los estados finales en Jira, pruebas funcionales y técnicas disponibles, revisión de código y documentación aplicable.

La planificación supone que las tres historias se completan; este informe no confirma que todas hayan alcanzado realmente el estado Done.

## 5. Planificación y resultados esperados del Sprint 2

**Nombre:** Sprint 2 – Pedidos y clientes  
**Periodo planificado en el archivo de actualización:** 28/09/2026 – 04/10/2026  
**Objetivo:** incorporar la gestión de pedidos y clientes para completar la información básica que se necesita antes de desarrollar las funciones de planificación logística.

### 5.1. Historias planificadas

| ID | Historia de usuario | Story Points | Prioridad | Épica | Estado indicado en la actualización |
|---|---|---:|---|---|---|
| HU-04 | Gestión de pedidos | 8 | Highest | EP-03 – Gestión de pedidos | En curso |
| HU-05 | Gestión de clientes | 5 | Medium | EP-04 – Gestión de clientes | Por hacer |
| | **Total planificado** | **13** | | | |

La actualización proporcionada identifica al Sprint 2 como “ACTIVO” y señala HU-04 en curso y HU-05 por hacer. Como el periodo planificado indicado finaliza el 4 de octubre de 2026, mientras que este informe está fechado el 9 de octubre, es necesario comprobar en Jira si el sprint sigue activo, si las fechas cambiaron o si falta registrar su cierre. No se debe asumir que las historias fueron terminadas únicamente porque el informe de planificación contemple un escenario de cierre satisfactorio.

### 5.2. Resultados funcionales esperados

**HU-04 – Gestión de pedidos**

Se espera que el operador logístico pueda registrar y administrar pedidos con los datos necesarios para organizar las entregas. De acuerdo con el alcance descrito, la información puede incluir los datos del cliente, la dirección y ubicación de entrega, peso, volumen, prioridad y ventana horaria, siempre que estos campos estén contemplados en el diseño aprobado.

Validaciones requeridas:
- Registrar un pedido con los campos obligatorios.
- Consultar los pedidos registrados.
- Validar que los datos requeridos estén completos y sean consistentes.
- Verificar la relación del pedido con el cliente correspondiente, si aplica al modelo de datos.
- Comprobar que la información pueda utilizarse posteriormente en la planificación de rutas.

**HU-05 – Gestión de clientes**

Se espera que el sistema permita registrar, consultar y actualizar la información de los clientes y destinatarios, manteniendo los datos necesarios para gestionar las entregas.

Validaciones requeridas:
- Registrar un cliente con los campos obligatorios.
- Consultar la información registrada.
- Actualizar los datos permitidos.
- Validar la consistencia de los campos definidos.
- Comprobar la relación entre clientes y pedidos cuando corresponda al diseño del sistema.

### 5.3. Criterio de cierre del Sprint 2

El cierre se debe validar cuando HU-04 y HU-05 cumplan sus criterios de aceptación y la definición de terminado. Como mínimo, se deben revisar los estados de Jira, las pruebas funcionales, los defectos pendientes y las evidencias técnicas disponibles.

La finalización de este sprint no debe declararse como un hecho hasta confirmar el resultado real. Si el Sprint 2 continúa activo, el informe deberá actualizarse con el estado efectivo y las tareas pendientes.

## 6. Resumen consolidado de los Sprints 1 y 2

| Indicador | Sprint 1 | Sprint 2 | Total |
|---|---:|---:|---:|
| Historias planificadas | 3 | 2 | 5 |
| Story Points planificados | 15 | 13 | 28 |
| Historias previstas en el escenario de cierre | 3 | 2 | 5 |
| Story Points previstos en el escenario de cierre | 15 | 13 | 28 |

### 6.1. Interpretación de los indicadores

En el escenario de cierre satisfactorio, se completarían cinco historias de usuario y 28 Story Points, equivalentes al 100 % de la planificación de ambos sprints. Sin embargo, este porcentaje es una proyección del escenario supuesto y no debe presentarse como velocidad real ni como tasa efectiva de finalización sin comprobar los registros de Jira.

Para informar resultados reales, se debe diferenciar entre:
- **Trabajo planificado:** historias y puntos comprometidos al inicio del sprint.
- **Trabajo terminado:** historias que cumplen la definición de terminado.
- **Trabajo aceptado:** historias cuyos criterios de aceptación han sido comprobados.
- **Trabajo pendiente:** historias no terminadas, rechazadas o trasladadas a otro sprint.

## 7. Gestión del proyecto mediante Jira

Jira se utiliza para organizar y seguir el trabajo del equipo. Para que el registro sea útil, cada historia debe conservar su clave, título, épica, prioridad, estimación, sprint y estado correctos.

### 7.1. Relación entre épicas e historias

| Épica | Historias asociadas según la planificación actualizada |
|---|---|
| EP-01 – Gestión de acceso y usuarios | HU-01 |
| EP-02 – Gestión de flota y conductores | HU-02 y HU-03 |
| EP-03 – Gestión de pedidos | HU-04 |
| EP-04 – Gestión de clientes | HU-05 |

### 7.2. Flujo de trabajo

El flujo de trabajo acordado contempla los siguientes estados:

1. **To Do:** historia pendiente de iniciar.
2. **In Progress:** historia en desarrollo.
3. **In Review / QA:** historia en revisión técnica o pruebas.
4. **Done:** historia que cumple la definición de terminado y los criterios de aceptación.

Mover una historia a Done no sustituye las pruebas ni la revisión de calidad. El estado debe reflejar el resultado comprobado y no solamente la intención de completar la tarea.

### 7.3. Verificación del Sprint 2

La información compartida en la actualización identifica al Sprint 2 como activo, mientras que las capturas previas del Backlog muestran el Sprint 3 – Rutas y el Sprint 4 – Sostenibilidad, con el Backlog vacío. Las capturas disponibles no muestran el Sprint 2. Por ello, se recomienda:

- Confirmar con el equipo si el Sprint 2 fue creado y si después se cerró, modificó o eliminó.
- Revisar el historial o los informes disponibles en Jira.
- Verificar que HU-04 y HU-05 estén asociadas al Sprint 2 y a la versión correcta.
- Corregir fechas o estados solo después de confirmar qué ocurrió.
- Guardar capturas que respalden la planificación y el cierre real.

No se debe crear un sprint duplicado ni eliminar sprints existentes como método de búsqueda.

### 7.4. Control de la versión del producto

Las historias HU-01 a HU-05 se asocian en la planificación a **EcoLima MVP 1.0.0**. La versión debe marcarse como publicada únicamente después de validar el producto y acordar formalmente su liberación. La asociación de historias a una versión no demuestra, por sí sola, que la versión esté terminada o publicada.

## 8. Control de calidad y evidencias

Para declarar completadas las funcionalidades de los dos primeros sprints, se requiere evidencia verificable. La siguiente tabla establece qué revisar.

| Área | Validación requerida | Evidencia esperada | Estado de evidencia |
|---|---|---|---|
| Autenticación | Acceso válido, rechazo de credenciales incorrectas, bloqueo y expiración de sesión | Pruebas funcionales y capturas | Pendiente de confirmar |
| Gestión de flota | Registro, consulta, actualización y validación de campos | Pruebas funcionales | Pendiente de confirmar |
| Gestión de conductores | Registro, consulta, actualización y validación de datos | Pruebas funcionales | Pendiente de confirmar |
| Gestión de pedidos | Registro, consulta y validación de pedidos | Pruebas funcionales | Pendiente de confirmar |
| Gestión de clientes | Registro, consulta y actualización de clientes | Pruebas funcionales | Pendiente de confirmar |
| Cobertura de pruebas | Cobertura unitaria de al menos 80 %, según la definición de terminado establecida para el proyecto | Reporte de cobertura | Pendiente de confirmar |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis | Pendiente de confirmar |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación | Pendiente de confirmar |
| Despliegue | Despliegue automatizado al entorno de pruebas | Registro o captura del despliegue | Pendiente de confirmar |
| Documentación | Actualización de la documentación de API y código | Documentación actualizada | Pendiente de confirmar |

No se afirma que estas validaciones hayan sido superadas, ya que no se han proporcionado los resultados correspondientes. El equipo debe completar esta sección con los valores y evidencias reales.

## 9. Riesgos y medidas de mitigación

| Riesgo | Impacto posible | Responsable | Mitigación propuesta |
|---|---|---|---|
| Curva de aprendizaje de las herramientas | Retrasos al configurar, desarrollar o actualizar tareas | Equipo de desarrollo | Compartir conocimientos, documentar procedimientos y distribuir tareas de acuerdo con las capacidades del equipo. |
| Descoordinación o comunicación insuficiente | Duplicación de trabajo, tareas olvidadas o historias que no avanzan a tiempo | Responsable del proyecto y equipo | Definir responsables al inicio del sprint, mantener comunicación frecuente y actualizar Jira después de cambios relevantes. |
| Datos incompletos o inconsistentes | Errores al registrar pedidos, clientes, vehículos o conductores | Equipo de desarrollo | Definir campos obligatorios, validaciones y pruebas para datos inválidos o incompletos. |
| Dependencias entre historias | Una funcionalidad puede quedar bloqueada por datos o componentes aún no disponibles | Equipo de desarrollo | Identificar dependencias antes de iniciar las historias y verificar la integración entre módulos. |
| Cierre sin evidencias suficientes | El estado Done podría no representar una funcionalidad validada | Equipo de desarrollo y responsable del proyecto | Aplicar la definición de terminado, adjuntar pruebas y revisar los criterios de aceptación antes de cerrar las historias. |
| Inconsistencia entre planificación y Jira | Fechas, estados o historias pueden diferir entre el informe y el tablero | Responsable del proyecto | Comparar el documento con Jira antes de cada entrega y registrar cualquier cambio aprobado. |

Estos riesgos son aspectos que se deben controlar; no se afirma que todos se hayan materializado durante los sprints.

## 10. Costos y presupuesto

No se ha proporcionado un registro de costos ejecutados específicamente para los Sprints 1 y 2. Por tanto, no es posible calcular el gasto real, la variación respecto del presupuesto o el costo por historia terminada.

Para mejorar el seguimiento, se recomienda registrar por separado:
- Presupuesto aprobado para el proyecto.
- Gastos realmente ejecutados durante cada periodo.
- Recursos o servicios utilizados.
- Diferencias entre lo planificado y lo ejecutado.
- Justificación de cualquier variación relevante.

El presupuesto general del proyecto debe mantenerse como referencia de planificación y no como evidencia de gasto real del sprint.

## 11. Retrospectiva y mejora continua

En la retrospectiva del Sprint 1, el equipo identificó que aprendió a utilizar Jira y que logró organizarse adecuadamente. También señaló la necesidad de mejorar la comunicación y distribuir mejor las tareas para el siguiente sprint.

A partir de esas observaciones, se proponen las siguientes acciones de mejora:

| Área | Acción propuesta | Resultado esperado |
|---|---|---|
| Organización | Definir responsable y alcance de cada historia al iniciar el sprint | Mayor claridad sobre quién realiza cada actividad |
| Comunicación | Compartir avances, dudas y bloqueos oportunamente | Detectar problemas antes de que afecten el cronograma |
| Jira | Actualizar estados y estimaciones cuando haya cambios reales | Mantener el tablero coherente con el trabajo |
| Calidad | Revisar criterios de aceptación y pruebas antes de cerrar historias | Evitar cierres sin validación suficiente |
| Integración | Probar las relaciones entre clientes, pedidos y datos operativos | Reducir errores al preparar las funciones de rutas |

Estas acciones son recomendaciones derivadas de las oportunidades de mejora identificadas. La retrospectiva del Sprint 2 debe completarse con los comentarios reales del equipo una vez confirmada su ejecución.

## 12. Próximos avances: Sprint 3 y Sprint 4

Según la planificación mostrada en Jira, los siguientes sprints se orientan a rutas y sostenibilidad.

### 12.1. Sprint 3 – Rutas

**Periodo mostrado en Jira:** 8/10/2026 – 23/10/2026.

| ID | Historia de usuario | Story Points | Estado mostrado en la captura |
|---|---|---:|---|
| HU-06 | Generación de rutas optimizadas | 8 | En curso |
| HU-07 | Visualización de rutas en mapa | 5 | Por hacer |
| HU-08 | Re-optimización dinámica | 8 | Por hacer |
| | **Total planificado** | **21** | |

Próximas actividades:
- Continuar el desarrollo de la generación de rutas optimizadas.
- Preparar la visualización de recorridos y puntos de entrega en un mapa.
- Definir y probar las condiciones bajo las cuales una ruta debe recalcularse.
- Validar que la información de pedidos y vehículos esté disponible y sea consistente.
- Revisar los criterios de aceptación y las restricciones operativas antes de cerrar las historias.

### 12.2. Sprint 4 – Sostenibilidad

**Periodo mostrado en Jira:** 26/10/2026 – 08/11/2026.

| ID | Historia de usuario | Story Points | Estado mostrado en la captura |
|---|---|---:|---|
| HU-09 | Dashboard de indicadores | 5 | Por hacer |
| HU-10 | Reportes de sostenibilidad | 5 | Por hacer |
| HU-11 | Plan de compensación de carbono | 5 | Por hacer |
| | **Total planificado** | **15** | |

Próximas actividades:
- Definir los indicadores que se mostrarán en el dashboard.
- Determinar los datos y cálculos que respaldarán los reportes de sostenibilidad.
- Establecer cómo se presentará el plan de compensación de carbono.
- Verificar que los resultados ambientales se basen en datos y fórmulas documentados.
- Preparar pruebas y evidencias para aceptar cada funcionalidad.

Las fechas y estados anteriores reflejan lo visible en la captura compartida de Jira y deberán actualizarse si el tablero cambia.

## 13. Conclusiones

1. La planificación actualizada de los Sprints 1 y 2 comprende cinco historias de usuario y 28 Story Points: 15 para acceso, flota y conductores; y 13 para pedidos y clientes.
2. El Sprint 1 establece la base de administración de los recursos logísticos, mientras que el Sprint 2 incorpora la gestión de pedidos y clientes.
3. La finalización de los dos primeros sprints permitiría preparar el MVP 1.0.0 para continuar con la planificación de rutas, pero dicho cierre debe confirmarse con evidencias reales.
4. Jira debe mantenerse alineado con los documentos del proyecto, especialmente en las fechas, los estados de las historias, las asociaciones con sprints y la versión del producto.
5. No se dispone de métricas verificadas de costos ejecutados, cobertura de pruebas, seguridad, despliegue o aceptación funcional; estos datos deben incorporarse cuando estén disponibles.
6. La mejora de la comunicación, la distribución de responsabilidades y el seguimiento de tareas debe mantenerse como prioridad del equipo.
7. El Sprint 3 está planificado para generación, visualización y reoptimización de rutas; el Sprint 4 se orienta al dashboard, los reportes y el plan de compensación de carbono.

## 14. Evidencias que deben adjuntarse

Para convertir este informe de planificación en un informe de resultados verificados, se recomienda adjuntar:

1. Captura del backlog con las historias HU-01 a HU-11, prioridades, Story Points y épicas.
2. Evidencia del estado real del Sprint 1 y de su cierre, si corresponde.
3. Evidencia de la existencia, las fechas y el estado real del Sprint 2.
4. Capturas de HU-04 y HU-05 mostrando su estado, sprint, prioridad y estimación.
5. Evidencia de las pruebas funcionales de acceso, flota, conductores, pedidos y clientes.
6. Reportes disponibles de cobertura de pruebas y análisis de seguridad.
7. Evidencia de revisión de código, integración y despliegue en el entorno de pruebas.
8. Evidencia de la versión EcoLima MVP 1.0.0, si fue configurada y publicada.
9. Capturas del Sprint 3 y Sprint 4 para respaldar la planificación posterior.

## 15. Historial de cambios

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0.0 | 30/09/2026 | Informe inicial del estado del Sprint 1. |
| 2.0.0 | 09/10/2026 | Se amplía el informe para incluir la planificación de los Sprints 1 y 2, el MVP 1.0.0, las validaciones de calidad, los riesgos, las acciones de mejora y los próximos sprints. Se aclara que el cierre de los Sprints 1 y 2 requiere verificación. |

---

**Nota final:** Este informe está actualizado con la información de planificación proporcionada y distingue los resultados esperados de los resultados comprobados. Antes de entregarlo como cierre efectivo, se deben verificar las historias y los sprints en Jira, confirmar las fechas y completar las evidencias técnicas disponibles.
