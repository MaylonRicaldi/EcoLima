[← Volver al README Principal](../../../README.md)

# Revisión del Sprint

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Versión del documento:** 2.0.0  
**Fecha de actualización:** 30/10/2026  
**Periodo del sprint:** 28/09/2026 – 04/10/2026  
**Versión del producto:** EcoLima MVP 1.0.0

---

## 1. Objetivo de la revisión

Evaluar las historias de usuario planificadas para el Sprint 2, mostrar el trabajo completado y verificar que los resultados cumplan los criterios de aceptación y la definición de terminado.

## 2. Objetivo del sprint

Incorporar la gestión de pedidos y clientes para completar la información básica que se necesita antes de desarrollar las funciones de planificación logística.

## 3. Historias de usuario y resultado

| ID | Historia de usuario | Puntos | Prioridad | Épica | Estado |
|---|---|---:|---|---|---|
| HU-04 | Gestión de pedidos | 8 | Highest | EP-03 – Gestión de pedidos | Finalizado |
| HU-05 | Gestión de clientes | 5 | Medium | EP-04 – Gestión de clientes | Finalizado |
| | **Total** | **13** | | | |

## 4. Demostración del trabajo completado

### 4.1. HU-04 – Gestión de pedidos

Registro y consulta de pedidos, con validación de los campos obligatorios definidos por el sistema: cliente, dirección o ubicación de entrega, peso, volumen, prioridad y ventana horaria.

Evidencias recomendadas:
- Captura del formulario de registro de pedidos.
- Pedido guardado y consultado.
- Resultado de la validación ante datos obligatorios incompletos.
- Relación del pedido con el cliente.
- Pruebas que demuestren la consistencia de la información almacenada.

### 4.2. HU-05 – Gestión de clientes

Registro, consulta y actualización de clientes, validando los campos requeridos y su relación con los pedidos.

Evidencias recomendadas:
- Captura del formulario de registro de clientes.
- Cliente guardado y consultado.
- Actualización de los datos permitidos.
- Pruebas de validación de los campos obligatorios.
- Comprobación de la relación con pedidos.

## 5. Resumen de alcance

| Indicador | Planificado | Completado |
|---|---:|---:|
| Historias de usuario | 2 | 2 |
| Story Points | 13 | 13 |
| Tasa de finalización | | 100 % |

Acumulado de los Sprints 1 y 2: 5 historias y 28 Story Points completados.

## 6. Validación de calidad

| Área | Validación requerida | Evidencia esperada |
|---|---|---|
| Gestión de pedidos | Registro, consulta y validación de pedidos | Pruebas funcionales |
| Gestión de clientes | Registro, consulta y actualización de clientes | Pruebas funcionales |
| Cobertura | Cobertura unitaria mínima del 80 % | Reporte de cobertura |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación |
| Despliegue | Despliegue automatizado en el entorno de pruebas | Registro del despliegue |
| Documentación | Documentación de API y código actualizada | Documentación revisada |

## 7. Criterio de cierre

El Sprint 2 se considera cerrado al haberse completado HU-04 y HU-05 conforme a sus criterios de aceptación y la definición de terminado. Se recomienda conservar el cierre formal del sprint en Jira, los resultados de pruebas y las evidencias funcionales.

## 8. Próximas funcionalidades

El Sprint 3 – Rutas contempla HU-06 (Generación de rutas optimizadas, 8 puntos), HU-07 (Visualización de rutas en mapa, 5 puntos) y HU-08 (Re-optimización dinámica, 8 puntos), con 21 Story Points en total.

## 9. Conclusiones

1. Se completaron HU-04 y HU-05 (13 Story Points, 100 % del alcance planificado).
2. El sistema cuenta con la gestión de pedidos y clientes, base de datos para la planificación de rutas.
3. El trabajo continúa en el Sprint 3 con la generación, visualización y reoptimización de rutas.

---

**Versión del documento:** 2.0.0
