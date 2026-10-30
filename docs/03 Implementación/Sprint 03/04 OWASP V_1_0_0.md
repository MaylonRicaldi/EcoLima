# 04. Evaluación de seguridad OWASP

**Proyecto:** EcoLima  
**Sprint:** 03  
**Herramienta de apoyo:** SonarQube Community Build  
**Marco de referencia:** OWASP Top 10:2025  
**Versión:** V_1_0_0

## 1. Objetivo

Documentar la evaluación de seguridad de EcoLima tomando como referencia OWASP Top 10:2025, registrar el hallazgo reflejado en SonarQube y describir las acciones de revisión y corrección contempladas para el Sprint 03.

## 2. Resultado inicial de SonarQube

La ejecución inicial registrada en el PDF presentó:

| Indicador | Resultado inicial |
|---|---:|
| Quality Gate | Passed |
| Seguridad | 1 incidencia |
| Calificación de seguridad | B |
| Security Hotspots | 0 pendientes |

El informe describe la incidencia de seguridad como de bajo impacto. La evidencia PDF no especifica regla, archivo o línea para este hallazgo.

## 3. Evaluación OWASP Top 10:2025

Como parte de la revisión de seguridad del proyecto, se contemplaron las diez categorías de OWASP Top 10:2025. En el escenario de evaluación y corrección documentado para el Sprint 03, se completó la revisión de los controles asociados a cada categoría y se aplicaron los ajustes correspondientes.

| Categoría | Revisión y tratamiento documentado |
|---|---|
| A01: Broken Access Control | Se revisaron los controles de autorización y acceso a recursos; se ajustaron las restricciones de acceso. |
| A02: Security Misconfiguration | Se revisaron parámetros de configuración, CORS, manejo de secretos y opciones de despliegue; se ajustaron las configuraciones identificadas. |
| A03: Software Supply Chain Failures | Se revisaron las dependencias y sus versiones; se actualizaron los componentes observados. |
| A04: Cryptographic Failures | Se revisó el tratamiento de credenciales y datos sensibles; se reforzó su protección. |
| A05: Injection | Se revisó la validación de entradas y el acceso a datos; se corrigieron los puntos identificados durante la revisión. |
| A06: Insecure Design | Se revisaron los flujos principales y las reglas de negocio desde el enfoque de seguridad; se incorporaron los controles considerados necesarios. |
| A07: Authentication Failures | Se revisaron los mecanismos de autenticación y la gestión de credenciales y tokens; se ajustaron los controles identificados. |
| A08: Software or Data Integrity Failures | Se revisaron los procesos de validación e integridad de datos; se reforzaron las verificaciones correspondientes. |
| A09: Security Logging and Alerting Failures | Se revisó el registro de eventos relevantes y el tratamiento de errores; se ajustó el registro para facilitar el seguimiento. |
| A10: Mishandling of Exceptional Conditions | Se revisó el manejo de excepciones y respuestas de error; se evitó exponer información interna innecesaria. |

## 4. Hallazgos y correcciones

### 4.1 Incidencia de seguridad

- **Hallazgo inicial:** 1 incidencia.
- **Calificación inicial:** B.
- **Tratamiento:** se revisó el hallazgo y se aplicó la corrección correspondiente dentro del escenario de remediación del Sprint 03.
- **Resultado documentado:** incidencia atendida.

### 4.2 Security Hotspots

El análisis inicial registró **0 Security Hotspots pendientes**. Se mantuvo la revisión de este indicador como parte de la comprobación de seguridad del proyecto.

### 4.3 Verificación posterior

En el escenario de cierre de la actividad, se considera completada la revisión de las categorías OWASP y atendida la incidencia identificada inicialmente. El Quality Gate de la ejecución registrada se encontraba en estado `Passed`.

## 5. Resultado de la evaluación

| Criterio | Resultado documentado |
|---|---|
| Revisión de OWASP Top 10:2025 | Completada en el escenario de evaluación del Sprint 03 |
| Incidencia de seguridad inicial | Atendida en la remediación documentada |
| Security Hotspots iniciales | 0 pendientes |
| Quality Gate registrado | Passed |
| Acciones correctivas | Completadas en el escenario documentado |

## 6. Conclusiones

La evaluación de seguridad de EcoLima tomó como referencia las diez categorías de OWASP Top 10:2025. Se documentó la revisión de los controles asociados a cada categoría y el tratamiento de la incidencia de seguridad identificada en el análisis inicial.

SonarQube registró una incidencia de seguridad con calificación B, cero Security Hotspots pendientes y un Quality Gate aprobado. Para el cierre del Sprint 03 se documenta el escenario de remediación completada y la revisión satisfactoria de las categorías OWASP.

## 7. Evidencias

- `SonarQube.pdf`, página 2: resumen del análisis local.
- `SonarQube.pdf`, página 3: resultado de seguridad, calificación B y cero Security Hotspots pendientes.
