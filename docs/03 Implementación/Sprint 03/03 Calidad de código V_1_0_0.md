# 03. Calidad de código

**Proyecto:** EcoLima  
**Sprint:** 03  
**Herramienta:** SonarQube Community Build (análisis local)
**Versión:** V_1_0_0

## 1. Objetivo

Evaluar la calidad estática del código de EcoLima mediante SonarQube, registrar las observaciones identificadas y proponer acciones para reducir los problemas de fiabilidad y mantener la calidad del proyecto.

## 2. Herramienta y ejecución

El registro evidencia la creación del proyecto local **EcoLima**, con clave `EcoLima` y rama principal `main`. También se documenta la selección del análisis local y la instalación de `@sonar/scan`; el comando de versión muestra `sonar-scanner-npm` 5.0.2 (páginas 1 y 2).

Los resultados de este documento corresponden a la ejecución que aparece en el PDF. No se atribuyen a intentos posteriores.

## 3. Resultados de SonarQube

| Métrica | Resultado registrado | Evaluación |
|---|---:|---|
| Quality Gate | Passed | Aprobado |
| Líneas de código | 21 000 | — |
| Seguridad | 1 incidencia | B |
| Fiabilidad | 49 incidencias | D |
| Mantenibilidad | 3 incidencias | A |
| Cobertura | 0 % | Sin informe de cobertura registrado |
| Duplicación | 0.5 % | Baja |
| Security Hotspots | 0 | Sin puntos pendientes |

### Interpretación

- **Quality Gate:** la ejecución registrada terminó con estado `Passed`.
- **Fiabilidad:** se reportaron 49 incidencias y calificación D. El informe las identifica como la principal prioridad porque podrían provocar errores o comportamientos inesperados.
- **Mantenibilidad:** se reportaron 3 incidencias y calificación A.
- **Seguridad:** se registró 1 incidencia y calificación B. El PDF no indica su regla, archivo ni línea.
- **Cobertura:** figura como 0 %. El informe aclara que SonarQube no recibió un informe de cobertura; esto no demuestra que el proyecto carezca de pruebas.
- **Duplicación:** 0.5 %, considerada baja.
- **Security Hotspots:** 0 pendientes en la captura registrada.

## 4. Hallazgos

### 4.1 Fiabilidad

Las 49 incidencias de fiabilidad (rating D) constituyen el principal foco de remediación. El PDF no incluye el detalle individual de las reglas ni de los archivos afectados; por ello, no se asignan causas específicas sin evidencia.

**Acción propuesta:** consultar el listado de Issues de SonarQube, ordenar por severidad y corregir primero los problemas de mayor impacto. Validar cada corrección mediante una nueva ejecución.

### 4.2 Mantenibilidad

Se registran 3 incidencias de mantenibilidad (rating A). Aunque la calificación global es favorable, deben revisarse y corregirse cuando corresponda para evitar acumulación de deuda técnica.

### 4.3 Cobertura de pruebas

El indicador es 0 % porque no se registró un informe de cobertura en SonarQube. No debe interpretarse como ausencia confirmada de pruebas.

**Acción propuesta:** generar el informe de cobertura con las herramientas de pruebas del backend y/o frontend e indicar su ruta en la configuración del scanner. Volver a ejecutar el análisis para importar el reporte.

### 4.4 Duplicación

La duplicación registrada es 0.5 %, un valor bajo. Se recomienda vigilar este indicador durante los siguientes cambios.

## 5. Plan de remediación de deuda técnica

| Prioridad | Trabajo propuesto | Criterio de cierre |
|---|---|---|
| Alta | Revisar y clasificar las 49 incidencias de fiabilidad | Incidencias revisadas, priorizadas por severidad y correcciones verificadas en un nuevo análisis |
| Alta | Identificar el detalle de la incidencia de seguridad | Regla, archivo, línea, impacto y tratamiento documentados |
| Media | Revisar las 3 incidencias de mantenibilidad | Cada incidencia corregida o justificada |
| Media | Generar e importar reportes de cobertura | SonarQube muestra cobertura procedente de un informe válido |
| Baja | Vigilar la duplicación de código | Mantener la duplicación baja y revisar incrementos |

## 6. Conclusiones

La ejecución documentada obtuvo un **Quality Gate aprobado**. Sin embargo, la calificación de fiabilidad D y sus 49 incidencias requieren atención prioritaria. La mantenibilidad obtuvo A y la duplicación fue de 0.5 %. La cobertura aparece en 0 % por falta de un informe importado, por lo que no puede concluirse que no existan pruebas.

Para completar la trazabilidad técnica se necesita exportar o capturar el detalle de Issues de SonarQube, especialmente las incidencias de fiabilidad y la incidencia de seguridad. Los resultados consignados se limitan a los datos visibles en el PDF fuente.

## 7. Evidencias

- `SonarQube.pdf`, página 1: creación del proyecto local EcoLima y configuración de la rama `main`.
- `SonarQube.pdf`, página 2: selección del análisis local, instalación del scanner y captura del resumen de SonarQube.
- `SonarQube.pdf`, página 3: tabla de métricas e interpretación de resultados.
