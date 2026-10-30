[← Volver al README Principal](../../../README.md)

# Informe de Estado del Proyecto

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Metodología de trabajo:** Scrum  
**Herramienta de gestión:** Jira  
**Versión del documento:** 2.0.0  
**Fecha de actualización:** 30/10/2026  
**Sprint evaluado:** Sprint 1 – Configuración y gestión básica  
**Periodo del sprint:** 14/09/2026 – 27/09/2026  
**Versión del producto considerada:** EcoLima MVP 1.0.0  
**Estado del sprint:** Finalizado

---

## 1. Resumen ejecutivo

EcoLima es un proyecto orientado a apoyar la gestión de operaciones logísticas mediante funcionalidades para administrar el acceso al sistema, los vehículos, los conductores, los pedidos y los clientes, y, en etapas posteriores, la generación de rutas y las funciones de sostenibilidad.

El Sprint 1 tuvo como propósito establecer la base de acceso y administración de los recursos logísticos. Se planificaron tres historias de usuario con un total de 15 Story Points, todas completadas al cierre del sprint.

| Indicador | Planificado | Completado |
|---|---:|---:|
| Historias de usuario | 3 | 3 |
| Story Points | 15 | 15 |

## 2. Objetivo y alcance

### 2.1. Objetivo del sprint

Establecer las funcionalidades básicas de acceso y administración de vehículos y conductores, como base para la gestión de las operaciones logísticas.

### 2.2. Alcance

1. Inicio de sesión con bloqueo y expiración de sesión.
2. Gestión de flota.
3. Gestión de conductores.

## 3. Estado general del sprint

| Variable | Estado y análisis |
|---|---|
| **Alcance** | Las tres historias planificadas (15 Story Points) fueron completadas. |
| **Cronograma** | El sprint se ejecutó en el periodo planificado, del 14 al 27 de septiembre de 2026. |
| **Costos** | No se dispone de un registro de costos ejecutados específico para este sprint; por ello no se calcula una desviación respecto del presupuesto. |
| **Calidad** | Las historias se aceptaron según sus criterios de aceptación y la definición de terminado. Las evidencias se listan en la sección 6. |
| **Gestión y seguimiento** | Jira se utilizó para organizar épicas, historias, prioridades, Story Points y estados. |

## 4. Historias de usuario del Sprint 1

| ID | Historia de usuario | Story Points | Prioridad | Épica | Estado |
|---|---|---:|---|---|---|
| HU-01 | Login con bloqueo y expiración de sesión | 5 | Highest | EP-01 – Gestión de acceso y usuarios | Finalizado |
| HU-02 | Gestión de flota | 5 | Medium | EP-02 – Gestión de flota y conductores | Finalizado |
| HU-03 | Gestión de conductores | 5 | Medium | EP-02 – Gestión de flota y conductores | Finalizado |
| | **Total** | **15** | | | |

## 5. Resultados funcionales

**HU-01 – Login con bloqueo y expiración de sesión.** Los usuarios inician sesión con sus credenciales y acceden a las funciones autorizadas según su rol. El sistema gestiona los intentos fallidos y la expiración de sesión por inactividad.

Validaciones:
- Acceso con credenciales válidas.
- Rechazo de credenciales incorrectas.
- Bloqueo después de los intentos fallidos definidos.
- Expiración de la sesión según la regla de inactividad.
- Permisos acordes con el rol del usuario.

**HU-02 – Gestión de flota.** El sistema permite registrar, consultar y administrar los vehículos de la operación, que servirán de base para asignaciones y planificación de rutas.

Validaciones:
- Registro de un vehículo con los campos obligatorios.
- Consulta de vehículos registrados.
- Actualización de la información permitida.
- Rechazo o advertencia ante datos incompletos o inválidos.

**HU-03 – Gestión de conductores.** El sistema permite registrar, consultar y actualizar los datos de los conductores, con información consistente para las operaciones posteriores.

Validaciones:
- Registro de los datos obligatorios del conductor.
- Consulta de la información registrada.
- Actualización de los campos permitidos.
- Validación de los datos requeridos según las reglas del proyecto.

## 6. Control de calidad y evidencias

| Área | Validación requerida | Evidencia esperada | Evidencia adjunta |
|---|---|---|---|
| Autenticación (HU-01) | Acceso válido, rechazo de credenciales incorrectas, bloqueo y expiración de sesión | Pruebas funcionales y capturas | [adjuntar] |
| Gestión de flota (HU-02) | Registro, consulta, actualización y validación de campos | Pruebas funcionales | [adjuntar] |
| Gestión de conductores (HU-03) | Registro, consulta, actualización y validación de datos | Pruebas funcionales | [adjuntar] |
| Cobertura de pruebas | Cobertura unitaria mínima del 80 % (definición de terminado) | Reporte de cobertura | [adjuntar] |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis | [adjuntar] |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación | [adjuntar] |
| Despliegue | Despliegue automatizado al entorno de pruebas | Registro del despliegue | [adjuntar] |
| Documentación | Documentación de API y código actualizada | Documentación revisada | [adjuntar] |

## 7. Gestión del proyecto mediante Jira

### 7.1. Épicas e historias del sprint

| Épica | Historias |
|---|---|
| EP-01 – Gestión de acceso y usuarios | HU-01 |
| EP-02 – Gestión de flota y conductores | HU-02 y HU-03 |

### 7.2. Flujo de trabajo

1. **To Do:** historia pendiente de iniciar.
2. **In Progress:** historia en desarrollo.
3. **In Review / QA:** historia en revisión técnica o pruebas.
4. **Done:** historia que cumple la definición de terminado y los criterios de aceptación.

## 8. Riesgos y medidas de mitigación

| Riesgo | Impacto posible | Mitigación aplicada o propuesta |
|---|---|---|
| Curva de aprendizaje de las herramientas | Retrasos al configurar o actualizar tareas | Compartir conocimientos, documentar procedimientos y distribuir tareas según las capacidades del equipo. |
| Descoordinación o comunicación insuficiente | Duplicación de trabajo o historias que no avanzan a tiempo | Definir responsables al inicio del sprint y actualizar Jira tras cambios relevantes. |
| Datos incompletos o inconsistentes | Errores al registrar vehículos o conductores | Definir campos obligatorios, validaciones y pruebas con datos inválidos. |
| Cierre sin evidencias suficientes | Que Done no represente una funcionalidad validada | Aplicar la definición de terminado y adjuntar pruebas antes de cerrar. |

Los impedimentos efectivamente ocurridos se detallan en el [Registro de Impedimentos del Sprint 1](02_Registro_de_Impedimentos_Sprint_1.md).

## 9. Costos y presupuesto

No se cuenta con un registro de costos ejecutados específico del Sprint 1, por lo que no es posible calcular el gasto real ni su variación respecto del presupuesto. El presupuesto general del proyecto es una referencia de planificación, no evidencia de gasto.

## 10. Retrospectiva y mejora continua

En la retrospectiva del Sprint 1 el equipo identificó que aprendió a utilizar Jira y que se organizó adecuadamente, y señaló la necesidad de mejorar la comunicación y distribuir mejor las tareas. El detalle se encuentra en la [Retrospectiva del Sprint 1](04_Retrospectiva_del_Sprint_Sprint_1.md).

| Área | Acción acordada | Resultado esperado |
|---|---|---|
| Organización | Definir responsable y alcance de cada historia al iniciar el sprint | Claridad sobre quién realiza cada actividad |
| Comunicación | Compartir avances, dudas y bloqueos oportunamente | Detectar problemas antes de que afecten el cronograma |
| Jira | Actualizar estados y estimaciones cuando haya cambios reales | Tablero coherente con el trabajo |

## 11. Próximo sprint

El Sprint 2 – Pedidos y clientes (28/09/2026 – 04/10/2026) incorpora HU-04 (Gestión de pedidos) y HU-05 (Gestión de clientes), con 13 Story Points. Véase el [Informe de Estado del Sprint 2](01_Informe_de_Estado_del_Proyecto_Sprint_2.md).

## 12. Conclusiones

1. El Sprint 1 planificó tres historias y 15 Story Points, y los completó en su totalidad.
2. Quedó establecida la base de acceso y de administración de flota y conductores.
3. El equipo identificó mejoras en comunicación, distribución de tareas y uso de Jira que se aplicaron en el sprint siguiente.
4. Los datos de costos y las evidencias técnicas deben mantenerse adjuntos al registro del proyecto.

---

**Versión del documento:** 2.0.0
