[← Volver al README Principal](../../../README.md)

# Informe de Estado del Proyecto

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Metodología de trabajo:** Scrum  
**Herramienta de gestión:** Jira  
**Versión del documento:** 2.0.0  
**Fecha de actualización:** 30/10/2026  
**Sprint evaluado:** Sprint 2 – Pedidos y clientes  
**Periodo del sprint:** 28/09/2026 – 04/10/2026  
**Versión del producto considerada:** EcoLima MVP 1.0.0  
**Estado del sprint:** Finalizado

---

## 1. Resumen ejecutivo

El Sprint 2 incorporó la gestión de pedidos y clientes, completando la información básica necesaria antes de desarrollar las funciones de planificación logística. Se planificaron dos historias de usuario con 13 Story Points, ambas completadas al cierre del sprint.

| Indicador | Planificado | Completado |
|---|---:|---:|
| Historias de usuario | 2 | 2 |
| Story Points | 13 | 13 |

Este sprint se apoyó en la base de acceso, flota y conductores construida en el [Sprint 1](01_Informe_de_Estado_del_Proyecto_Sprint_1.md).

## 2. Objetivo y alcance

### 2.1. Objetivo del sprint

Incorporar la gestión de pedidos y clientes para completar la información básica que se necesita antes de desarrollar las funciones de planificación logística.

### 2.2. Alcance

1. Gestión de pedidos.
2. Gestión de clientes.

## 3. Estado general del sprint

| Variable | Estado y análisis |
|---|---|
| **Alcance** | Las dos historias planificadas (13 Story Points) fueron completadas. |
| **Cronograma** | El sprint se ejecutó del 28 de septiembre al 4 de octubre de 2026. |
| **Costos** | No se dispone de un registro de costos ejecutados específico para este sprint; no se calcula desviación respecto del presupuesto. |
| **Calidad** | Las historias se aceptaron según sus criterios de aceptación y la definición de terminado. Las evidencias se listan en la sección 6. |
| **Gestión y seguimiento** | Jira se utilizó para organizar épicas, historias, prioridades, Story Points y estados. |

## 4. Historias de usuario del Sprint 2

| ID | Historia de usuario | Story Points | Prioridad | Épica | Estado |
|---|---|---:|---|---|---|
| HU-04 | Gestión de pedidos | 8 | Highest | EP-03 – Gestión de pedidos | Finalizado |
| HU-05 | Gestión de clientes | 5 | Medium | EP-04 – Gestión de clientes | Finalizado |
| | **Total** | **13** | | | |

## 5. Resultados funcionales

**HU-04 – Gestión de pedidos.** El operador logístico puede registrar y administrar pedidos con los datos necesarios para organizar las entregas. La información incluye, según el diseño aprobado, cliente, dirección o ubicación de entrega, peso, volumen, prioridad y ventana horaria.

Validaciones:
- Registro de un pedido con los campos obligatorios.
- Consulta de los pedidos registrados.
- Validación de que los datos requeridos estén completos y sean consistentes.
- Relación del pedido con el cliente correspondiente.
- Información utilizable posteriormente en la planificación de rutas.

**HU-05 – Gestión de clientes.** El sistema permite registrar, consultar y actualizar la información de clientes y destinatarios, manteniendo los datos necesarios para gestionar las entregas.

Validaciones:
- Registro de un cliente con los campos obligatorios.
- Consulta de la información registrada.
- Actualización de los datos permitidos.
- Validación de la consistencia de los campos definidos.
- Relación entre clientes y pedidos.

## 6. Control de calidad y evidencias

| Área | Validación requerida | Evidencia esperada | Evidencia adjunta |
|---|---|---|---|
| Gestión de pedidos (HU-04) | Registro, consulta y validación de pedidos | Pruebas funcionales | [adjuntar] |
| Gestión de clientes (HU-05) | Registro, consulta y actualización de clientes | Pruebas funcionales | [adjuntar] |
| Cobertura de pruebas | Cobertura unitaria mínima del 80 % (definición de terminado) | Reporte de cobertura | [adjuntar] |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis | [adjuntar] |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación | [adjuntar] |
| Despliegue | Despliegue automatizado al entorno de pruebas | Registro del despliegue | [adjuntar] |
| Documentación | Documentación de API y código actualizada | Documentación revisada | [adjuntar] |

## 6.1. Gestión del proyecto mediante Jira

| Épica | Historias del sprint |
|---|---|
| EP-03 – Gestión de pedidos | HU-04 |
| EP-04 – Gestión de clientes | HU-05 |

Las historias se asocian a **EcoLima MVP 1.0.0**. La versión solo debe marcarse como publicada tras su validación y liberación formal.

## 7. Riesgos y medidas de mitigación

| Riesgo | Impacto posible | Mitigación aplicada o propuesta |
|---|---|---|
| Datos incompletos o inconsistentes | Errores al registrar pedidos o clientes | Definir campos obligatorios, validaciones y pruebas con datos inválidos. |
| Dependencias entre historias | Pedidos y clientes están relacionados; una puede bloquear a la otra | Identificar dependencias antes de iniciar y verificar la integración entre módulos. |
| Descoordinación del equipo | Duplicación o tareas olvidadas | Definir responsables al inicio y mantener comunicación frecuente. |
| Cierre sin evidencias suficientes | Que Done no represente una funcionalidad validada | Aplicar la definición de terminado y adjuntar pruebas. |

Los impedimentos del sprint se detallan en el [Registro de Impedimentos del Sprint 2](02_Registro_de_Impedimentos_Sprint_2.md).

## 8. Costos y presupuesto

No se cuenta con un registro de costos ejecutados específico del Sprint 2, por lo que no es posible calcular el gasto real ni su variación respecto del presupuesto.

## 9. Retrospectiva y mejora continua

Los acuerdos del Sprint 1 (distribuir mejor las tareas, reforzar la comunicación y mantener Jira actualizado) se aplicaron en este sprint. Véase la [Retrospectiva del Sprint 2](04_Retrospectiva_del_Sprint_Sprint_2.md).

| Área | Acción | Resultado esperado |
|---|---|---|
| Integración | Probar las relaciones entre clientes, pedidos y datos operativos | Reducir errores al preparar las funciones de rutas |
| Calidad | Revisar criterios de aceptación y pruebas antes de cerrar historias | Evitar cierres sin validación suficiente |

## 10. Próximo sprint

El Sprint 3 – Rutas (08/10/2026 – 23/10/2026) contempla HU-06 (Generación de rutas optimizadas, 8 puntos), HU-07 (Visualización de rutas en mapa, 5 puntos) y HU-08 (Re-optimización dinámica, 8 puntos), con 21 Story Points. Estas funciones se apoyan en los datos de pedidos, clientes, flota y conductores construidos en los Sprints 1 y 2.

## 11. Conclusiones

1. El Sprint 2 planificó dos historias y 13 Story Points, y los completó en su totalidad.
2. Con HU-04 y HU-05 queda disponible la información de pedidos y clientes para la planificación de rutas.
3. Junto con el Sprint 1, el MVP 1.0.0 acumula cinco historias y 28 Story Points completados.
4. Los datos de costos y las evidencias técnicas deben mantenerse adjuntos al registro del proyecto.

---

**Versión del documento:** 2.0.0
