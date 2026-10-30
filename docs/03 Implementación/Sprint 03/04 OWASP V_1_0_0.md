# 04. Evaluación de seguridad OWASP

**Proyecto:** EcoLima  
**Sprint:** 03  
**Herramienta de apoyo:** SonarQube Community Build (análisis estático local)  
**Versión:** V_1_0_0

## 1. Objetivo

Registrar la evaluación de seguridad disponible para EcoLima, relacionar los resultados observados con el trabajo de revisión de seguridad y establecer acciones correctivas. Se distingue entre los datos efectivamente registrados y los aspectos que todavía requieren verificación.

## 2. Alcance y limitaciones

El PDF evidencia una ejecución de análisis en SonarQube y muestra métricas generales de seguridad. No contiene el detalle de la incidencia de seguridad, su regla, archivo, línea, severidad técnica ni recomendación de corrección. Tampoco contiene una matriz de pruebas manuales por categoría OWASP Top 10:2025.

Por tanto, **no es posible afirmar con esta evidencia que las diez categorías OWASP hayan sido verificadas ni que estén libres de vulnerabilidades**. SonarQube aporta resultados de análisis estático, pero no sustituye una revisión de diseño, configuración, autenticación, autorización, dependencias, ejecución ni pruebas dinámicas.

## 3. Resultados de seguridad registrados

| Indicador | Resultado del PDF | Lectura |
|---|---:|---|
| Seguridad | 1 incidencia | Calificación B |
| Security Hotspots | 0 | Sin puntos pendientes en la captura |
| Quality Gate | Passed | Aprobado en la ejecución registrada |

El informe describe la incidencia de seguridad como de bajo impacto. Sin embargo, no identifica la regla ni el componente afectado. Los cero Security Hotspots indican que no había puntos pendientes en el indicador mostrado; no prueban por sí solos que el sistema esté libre de riesgos.

## 4. Revisión frente a OWASP Top 10:2025

La evidencia disponible no permite asignar la incidencia detectada a una categoría OWASP concreta. Se registra el estado de cada categoría como **pendiente de verificación**, evitando declarar controles como aprobados sin pruebas.

| Categoría OWASP Top 10:2025 | Estado con la evidencia disponible | Verificación pendiente |
|---|---|---|
| A01: Broken Access Control | Pendiente | Revisar autorización por rol, acceso a recursos ajenos y rutas protegidas en backend |
| A02: Security Misconfiguration | Pendiente | Revisar CORS, secretos, modo debug, cabeceras, permisos y configuración de despliegue |
| A03: Software Supply Chain Failures | Pendiente | Revisar dependencias, versiones, procedencia de paquetes y vulnerabilidades conocidas |
| A04: Cryptographic Failures | Pendiente | Revisar almacenamiento y transmisión de datos sensibles, TLS y protección de credenciales |
| A05: Injection | Pendiente | Revisar consultas a base de datos, validación de entradas y construcción de comandos o consultas |
| A06: Insecure Design | Pendiente | Revisar amenazas, reglas de negocio, límites de confianza y controles de seguridad desde el diseño |
| A07: Authentication Failures | Pendiente | Revisar inicio de sesión, gestión de sesiones o tokens, expiración y recuperación de credenciales |
| A08: Software or Data Integrity Failures | Pendiente | Revisar validación de datos, integridad de actualizaciones y procesos de confianza |
| A09: Security Logging and Alerting Failures | Pendiente | Revisar registro de eventos relevantes, protección de logs y mecanismos de alertas |
| A10: Mishandling of Exceptional Conditions | Pendiente | Revisar manejo de excepciones, respuestas de error y exposición de información interna |

## 5. Hallazgos y acciones correctivas

### 5.1 Incidencia de seguridad reportada por SonarQube

- **Resultado:** 1 incidencia.
- **Calificación:** B.
- **Descripción disponible:** el PDF la caracteriza como de bajo impacto.
- **Archivo, línea y regla:** no especificados en el PDF.
- **Corrección aplicada:** no documentada en la evidencia disponible.

**Acción requerida:** abrir la sección Issues del proyecto EcoLima en SonarQube, localizar la incidencia de tipo Security y registrar su regla, archivo, línea y explicación. Aplicar la corrección recomendada y ejecutar nuevamente el análisis. No se declara la incidencia corregida hasta contar con evidencia de una nueva ejecución.

### 5.2 Security Hotspots

- **Resultado registrado:** 0 pendientes.
- **Interpretación:** la captura no muestra hotspots pendientes de revisión.
- **Acción:** conservar la captura del indicador y revisar nuevamente este apartado después de cada análisis relevante.

### 5.3 Priorización de correcciones

1. Identificar y documentar la única incidencia de seguridad.
2. Revisar controles de autenticación y autorización en backend.
3. Revisar configuración de CORS, secretos y parámetros de despliegue.
4. Revisar dependencias del frontend y backend.
5. Ejecutar pruebas específicas para entradas no confiables, manejo de errores y acceso a recursos.
6. Repetir el análisis estático y conservar la evidencia de los resultados.

## 6. Conclusiones

La ejecución de SonarQube incluida en el PDF obtuvo Quality Gate `Passed`, una incidencia de seguridad con calificación B y cero Security Hotspots pendientes. Estos resultados son favorables como primera señal del análisis estático, pero no bastan para certificar el cumplimiento de OWASP Top 10:2025.

La incidencia debe identificarse y tratarse con evidencia verificable. Asimismo, las diez categorías OWASP quedan pendientes de una revisión específica del código, configuración y comportamiento de la aplicación. No se registran correcciones como realizadas porque el PDF no contiene evidencia de ellas.

## 7. Evidencias

- `SonarQube.pdf`, página 2: captura del resumen del análisis local.
- `SonarQube.pdf`, página 3: indicadores de seguridad, calificación B y cero Security Hotspots pendientes.
