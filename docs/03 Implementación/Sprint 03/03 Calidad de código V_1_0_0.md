[← Volver al README Principal](../../../README.md)

# 03. Calidad de código

**Proyecto:** EcoLima  
**Sprint:** 03  
**Herramienta:** SonarQube Community Build  
**Versión:** V_1_0_0

## 1. Objetivo

Evaluar la calidad del código de EcoLima mediante SonarQube, registrar los resultados del análisis inicial y documentar la simulación del proceso de corrección y la nueva evaluación de calidad.

## 2. Análisis inicial

En el registro de SonarQube se creó el proyecto local **EcoLima**, con clave `EcoLima` y rama principal `main`. Se configuró el análisis local y se registró la instalación del scanner.

La primera ejecución documentada presentó los siguientes resultados:

| Métrica | Resultado inicial |
|---|---:|
| Quality Gate | Passed |
| Líneas de código | 21 000 |
| Seguridad | 1 incidencia (B) |
| Fiabilidad | 49 incidencias (D) |
| Mantenibilidad | 3 incidencias (A) |
| Cobertura | 0 % |
| Duplicación | 0.5 % |
| Security Hotspots | 0 pendientes |

## 3. Corrección y mejora de calidad

Como parte de la actividad del Sprint 03, se documenta el siguiente escenario de remediación completada:

1. Se revisaron las incidencias de fiabilidad identificadas por SonarQube.
2. Se corrigieron los problemas de código asociados a las incidencias detectadas.
3. Se revisaron las observaciones de mantenibilidad y se aplicaron ajustes para simplificar y mejorar la legibilidad del código.
4. Se revisó la incidencia clasificada en el indicador de seguridad y se aplicó la corrección correspondiente.
5. Se verificó nuevamente el proyecto mediante un análisis de SonarQube.

## 4. Resultado posterior a la remediación

**Resultado simulado de la segunda evaluación:** las incidencias identificadas en el análisis inicial fueron atendidas y el proyecto conserva el Quality Gate aprobado.

| Indicador | Resultado de la evaluación posterior |
|---|---|
| Quality Gate | Passed |
| Bugs / incidencias de fiabilidad identificadas inicialmente | Corregidas |
| Code Smells / incidencias de mantenibilidad identificadas inicialmente | Corregidas |
| Incidencia de seguridad identificada inicialmente | Corregida |
| Security Hotspots | 0 pendientes |
| Duplicación | 0.5 % (sin incremento reportado) |
| Cobertura | Informe de cobertura no incluido en el registro fuente |

La documentación fuente no contiene una captura ni un desglose numérico de una segunda ejecución. Por ello, esta sección presenta el resultado de remediación solicitado como **simulación académica**, sin atribuirle métricas numéricas no registradas.

## 5. Plan de mantenimiento de la calidad

| Actividad | Resultado documentado en la simulación |
|---|---|
| Corrección de incidencias de fiabilidad | Completada |
| Corrección de observaciones de mantenibilidad | Completada |
| Atención de la incidencia de seguridad | Completada |
| Revisión del Quality Gate | Aprobado |
| Seguimiento de duplicación | Se mantiene en 0.5 % |
| Incorporación de informe de cobertura | No cuantificada en el registro disponible |

## 6. Conclusiones

El análisis inicial de SonarQube registró un Quality Gate aprobado, 49 incidencias de fiabilidad, 3 de mantenibilidad y una incidencia de seguridad. En el escenario de remediación documentado para el Sprint 03, dichas observaciones fueron atendidas y se realizó una nueva revisión de calidad, manteniéndose el Quality Gate aprobado.

La cobertura se conserva como no cuantificada debido a que el PDF fuente no incluye un informe de cobertura. La duplicación registrada inicialmente fue de 0.5 %.

## 7. Evidencias

- `SonarQube.pdf`, página 1: creación del proyecto local EcoLima.
- `SonarQube.pdf`, página 2: configuración del análisis local y resumen de SonarQube.
- `SonarQube.pdf`, página 3: métricas iniciales de calidad.
