[← Volver al README Principal](../../../README.md)

# 03. Calidad de código

**Proyecto:** EcoLima  
**Sprint:** 03  
**Herramienta:** SonarQube Community Build  
**Versión del documento:** V_1_0_0  
**Fecha de evaluación:** 23 de octubre de 2026  

---

## 1. Objetivo

Evaluar la calidad del código fuente del proyecto EcoLima mediante SonarQube, identificando los resultados del análisis de calidad, las incidencias relacionadas con fiabilidad, seguridad y mantenibilidad, así como los niveles de cobertura y duplicación del código.

Además, se establece un plan de remediación para atender las observaciones identificadas y mantener la calidad del software durante las siguientes etapas de desarrollo.

## 2. Configuración del análisis

Para realizar la evaluación se utilizó SonarQube Community Build, configurando el proyecto local con los siguientes datos:

| Elemento | Configuración |
|---|---|
| Proyecto | EcoLima |
| Project Key | EcoLima |
| Rama principal | main |
| Herramienta | SonarQube Community Build |
| Tipo de análisis | Análisis estático del código |
| Líneas de código registradas | 22 000 |

El análisis permitió obtener indicadores sobre la calidad del código y detectar observaciones que requieren revisión por parte del equipo de desarrollo.

## 3. Resultados del análisis inicial

La primera evaluación documentada presentó los siguientes resultados:

| Indicador | Resultado inicial |
|---|---:|
| Quality Gate | Passed |
| Líneas de código | 22 000 |
| Seguridad | B – 1 incidencia |
| Fiabilidad | D – 49 incidencias |
| Mantenibilidad | A – 3 incidencias |
| Cobertura de código | 0 % |
| Duplicación de código | 0.5 % |
| Security Hotspots pendientes | 0 |

### 3.1. Quality Gate

El proyecto obtuvo un resultado **Passed** en el Quality Gate de SonarQube durante el análisis inicial.

Este resultado indica que se cumplieron las condiciones configuradas para dicha evaluación. Sin embargo, un Quality Gate aprobado no significa que el código esté libre de incidencias. Por ello, se considera necesario revisar los indicadores de fiabilidad, seguridad y mantenibilidad identificados.

### 3.2. Bugs y fiabilidad

El indicador de fiabilidad presentó una calificación D y 49 incidencias registradas.

Estas observaciones deben revisarse para identificar posibles errores que puedan afectar el comportamiento del sistema, la ejecución de sus funcionalidades o el procesamiento de información.

La atención de estas incidencias debe priorizarse de acuerdo con su severidad y el impacto que puedan ocasionar en EcoLima.

### 3.3. Code Smells y mantenibilidad

El indicador de mantenibilidad presentó una calificación A y 3 incidencias registradas.

Aunque la calificación obtenida es A, las observaciones deben revisarse para identificar oportunidades de mejora relacionadas con la legibilidad, organización y facilidad de mantenimiento del código.

### 3.4. Cobertura de código

La cobertura registrada durante el análisis inicial fue de **0 %**.

Este resultado indica que SonarQube no detectó cobertura de pruebas en el análisis. No permite concluir por sí solo que no existan pruebas funcionales, ya que para calcular este indicador es necesario generar e importar correctamente los informes de cobertura.

Por ello, se considera necesario configurar la generación de reportes de cobertura e incorporarlos al siguiente análisis.

### 3.5. Duplicación de código

El porcentaje de duplicación registrado fue de **0.5 %**.

Este indicador permite identificar fragmentos de código repetidos que podrían dificultar el mantenimiento del proyecto. El resultado inicial muestra un nivel reducido de duplicación, por lo que se recomienda mantener su seguimiento en futuras evaluaciones.

### 3.6. Seguridad y Security Hotspots

El indicador de seguridad presentó una calificación B y una incidencia registrada. Asimismo, el análisis inicial mostró cero Security Hotspots pendientes.

La incidencia de seguridad debe revisarse para determinar su origen, nivel de riesgo y solución correspondiente. Los Security Hotspots deben evaluarse para establecer si representan un riesgo real o si corresponden a una situación aceptable.

## 4. Análisis de los resultados

A partir de la evaluación inicial se identificaron los siguientes aspectos:

| Área evaluada | Hallazgo | Acción requerida |
|---|---|---|
| Quality Gate | Resultado Passed | Mantener las condiciones de calidad configuradas. |
| Fiabilidad | 49 incidencias, calificación D | Revisar y priorizar las incidencias detectadas. |
| Mantenibilidad | 3 incidencias, calificación A | Evaluar y corregir las observaciones de código. |
| Seguridad | 1 incidencia, calificación B | Analizar el riesgo y aplicar la corrección correspondiente. |
| Cobertura | 0 % | Configurar e importar los informes de cobertura. |
| Duplicación | 0.5 % | Mantener el control de código duplicado. |
| Security Hotspots | 0 pendientes | Continuar con la revisión de posibles riesgos de seguridad. |

## 5. Plan de remediación de deuda técnica

Con base en los resultados obtenidos, se establece el siguiente plan de remediación para mejorar progresivamente la calidad del código:

| Prioridad | Actividad de remediación | Resultado esperado |
|---|---|---|
| Alta | Revisar las 49 incidencias de fiabilidad. | Identificar y corregir los problemas que puedan afectar el funcionamiento del sistema. |
| Alta | Analizar la incidencia de seguridad registrada. | Determinar el riesgo y aplicar la solución correspondiente. |
| Media | Revisar las 3 incidencias de mantenibilidad. | Mejorar la legibilidad y facilitar el mantenimiento del código. |
| Alta | Configurar la generación de informes de cobertura. | Obtener un porcentaje de cobertura verificable mediante SonarQube. |
| Media | Revisar los fragmentos de código duplicados. | Mantener o reducir el porcentaje de duplicación. |
| Media | Realizar nuevos análisis después de las correcciones. | Comparar los resultados y comprobar la evolución de la calidad. |

### 5.1. Seguimiento de la remediación

Para verificar el cumplimiento del plan, se propone realizar las siguientes actividades:

1. Revisar las incidencias detectadas por SonarQube y clasificarlas según su prioridad.
2. Atender primero los problemas relacionados con la fiabilidad y seguridad.
3. Corregir las observaciones de mantenibilidad identificadas.
4. Incorporar los informes de cobertura generados por las pruebas automatizadas.
5. Ejecutar nuevamente el análisis de SonarQube después de aplicar las correcciones.
6. Comparar los resultados iniciales y posteriores para verificar las mejoras obtenidas.

Las actividades de remediación deberán registrarse con sus respectivas evidencias. No se considerará una incidencia corregida hasta comprobarlo mediante una nueva evaluación.

## 6. Conclusiones

La evaluación de calidad de código de EcoLima mediante SonarQube permitió identificar el estado inicial de la calidad del proyecto y registrar observaciones relacionadas con fiabilidad, seguridad y mantenibilidad.

El análisis inicial obtuvo un Quality Gate aprobado; sin embargo, también registró 49 incidencias de fiabilidad, 3 de mantenibilidad y una incidencia de seguridad. Asimismo, se identificó una cobertura de código de 0 % y una duplicación de 0.5 %.

A partir de estos resultados se estableció un plan de remediación orientado a priorizar las incidencias, mejorar la mantenibilidad, revisar los aspectos de seguridad e incorporar informes de cobertura.

Finalmente, se considera necesario realizar nuevas evaluaciones con SonarQube para comprobar las correcciones y medir la evolución de la calidad del código durante las siguientes etapas del proyecto.

## 7. Evidencias

Las evidencias documentales del análisis se encuentran registradas en el archivo `SonarQube.pdf`:

- **Página 1:** Creación del proyecto local EcoLima en SonarQube.
- **Página 2:** Configuración del análisis local y resumen de SonarQube.
- **Página 3:** Resultados y métricas iniciales de calidad del código.

Las futuras correcciones deberán respaldarse con nuevas capturas o informes de análisis para demostrar la evolución de los indicadores.

