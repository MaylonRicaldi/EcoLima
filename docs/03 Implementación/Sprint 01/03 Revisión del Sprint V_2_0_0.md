[← Volver al README Principal](../../../README.md)

# Revisión del Sprint

**Nombre del proyecto:** EcoLima – Sistema de gestión y optimización de operaciones logísticas  
**Responsable del proyecto:** Diego Marlon Quispe Povis  
**Versión del documento:** 2.0.0  
**Fecha de actualización:** 30/10/2026  
**Periodo del sprint:** 14/09/2026 – 27/09/2026  
**Versión del producto:** EcoLima MVP 1.0.0

---

## 1. Objetivo de la revisión

Evaluar las historias de usuario planificadas para el Sprint 1, mostrar el trabajo completado y verificar que los resultados cumplan los criterios de aceptación y la definición de terminado.

## 2. Objetivo del sprint

Establecer las funcionalidades básicas de acceso y administración de vehículos y conductores, como base para la gestión de las operaciones logísticas.

## 3. Historias de usuario y resultado

| ID | Historia de usuario | Puntos | Prioridad | Estado |
|---|---|---:|---|---|
| HU-01 | Login con bloqueo y expiración de sesión | 5 | Highest | Finalizado |
| HU-02 | Gestión de flota | 5 | Medium | Finalizado |
| HU-03 | Gestión de conductores | 5 | Medium | Finalizado |
| | **Total** | **15** | | |

> **Nota de alcance:** una versión anterior de este documento listaba seis historias en el Sprint 1 (HU-01, HU-02, HU-04, HU-05, HU-07 y HU-09). La distribución vigente del proyecto es: Sprint 1 con HU-01, HU-02 y HU-03; y Sprint 2 con HU-04 y HU-05.

## 4. Demostración del trabajo completado

### 4.1. HU-01 – Login con bloqueo y expiración de sesión

Acceso al sistema mediante autenticación, con bloqueo y expiración de sesión según las reglas del proyecto.

Criterios de aceptación:
- Inicio de sesión con credenciales válidas.
- Rechazo de credenciales incorrectas.
- Bloqueo tras los intentos fallidos definidos.
- Expiración de la sesión por inactividad.
- Acceso únicamente a las funciones autorizadas para el rol.

### 4.2. HU-02 – Gestión de flota

Registro, consulta y actualización de vehículos, con validación de campos obligatorios.

Evidencias recomendadas:
- Captura del formulario de registro de vehículos.
- Vehículo guardado y consultado.
- Actualización de datos permitidos.
- Resultado de la validación ante datos incompletos o inválidos.

### 4.3. HU-03 – Gestión de conductores

Registro, consulta y actualización de conductores, con validación de los datos requeridos.

Evidencias recomendadas:
- Captura del formulario de registro de conductores.
- Conductor guardado y consultado.
- Actualización de datos permitidos.
- Resultado de la validación de campos obligatorios.

## 5. Resumen de alcance

| Indicador | Planificado | Completado |
|---|---:|---:|
| Historias de usuario | 3 | 3 |
| Story Points | 15 | 15 |
| Tasa de finalización | | 100 % |

## 6. Validación de calidad

| Área | Validación requerida | Evidencia esperada |
|---|---|---|
| Autenticación | Acceso válido, rechazo de credenciales incorrectas, bloqueo y expiración de sesión | Pruebas funcionales y capturas |
| Gestión de flota | Registro, consulta, actualización y validación de vehículos | Pruebas funcionales |
| Gestión de conductores | Registro, consulta, actualización y validación de datos | Pruebas funcionales |
| Cobertura | Cobertura unitaria mínima del 80 % | Reporte de cobertura |
| Seguridad | Análisis estático sin vulnerabilidades críticas | Reporte de análisis |
| Revisión técnica | Revisión por pares mediante pull request | Evidencia de aprobación |
| Despliegue | Despliegue automatizado en el entorno de pruebas | Registro del despliegue |
| Documentación | Documentación de API y código actualizada | Documentación revisada |

## 7. Criterio de cierre

El Sprint 1 se considera cerrado al haberse completado sus tres historias conforme a sus criterios de aceptación y la definición de terminado. Se recomienda conservar el registro del sprint en Jira, los resultados de pruebas y las evidencias funcionales.

## 8. Conclusiones

1. Se completaron HU-01, HU-02 y HU-03 (15 Story Points, 100 % del alcance planificado).
2. El sistema cuenta con la base de acceso seguro y de administración de flota y conductores.
3. El trabajo continúa en el Sprint 2 con la gestión de pedidos y clientes.

---

**Versión del documento:** 2.0.0
