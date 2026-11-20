# 04. Evaluación cuantitativa de usabilidad – SUS

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.0.0  
**Instrumento:** System Usability Scale (SUS)  
**Fecha de elaboración:** 19 de noviembre de 2026  
**Alcance:** Interfaz web desplegada de EcoLima, con énfasis en el Dashboard y sus funciones de sostenibilidad.

---

## 1. Objetivo

Evaluar cuantitativamente la usabilidad de EcoLima mediante el cuestionario estandarizado System Usability Scale (SUS), para conocer la percepción de facilidad de uso de las personas que interactúan con el sistema.

La evaluación se enfoca en las funciones que se encuentran integradas en el Dashboard: indicadores de operación y sostenibilidad, consulta de reportes, generación y descarga de reportes y gestión del plan de compensación de carbono.

**Estado de la evaluación:** evaluación académica desarrollada mediante un escenario simulado de cinco participantes ficticios. Se ejecutó de manera demostrativa el protocolo, el registro de tareas, la aplicación simulada del cuestionario SUS y el análisis de resultados. Todos los resultados de participantes, respuestas, observaciones y hallazgos de este informe son sintéticos y se presentan exclusivamente como simulación; no corresponden a sesiones ni encuestas reales.

## 2. Ficha técnica

| Elemento | Descripción |
|---|---|
| Instrumento | System Usability Scale (SUS) |
| Tipo | Cuestionario estandarizado de percepción de usabilidad |
| Ítems | 10 afirmaciones |
| Escala | Likert de 5 puntos |
| Valor mínimo y máximo | 1 y 5 por afirmación |
| Puntuación final | Escala SUS de 0 a 100 |
| Muestra objetivo | Mínimo 5 participantes con cuestionarios completos |
| Perfil | Personas que representen usuarios administrativos u operativos que utilizarían el sistema |
| Sistema evaluado | Versión desplegada de EcoLima |
| Modalidad | Prueba de tareas seguida del cuestionario individual |
| Identificación | Códigos anónimos (P01, P02, P03...) |

Para este ejercicio se trabajó con una muestra simulada de cinco perfiles ficticios (n = 5). Los cinco cuestionarios del escenario son completos y válidos dentro de la simulación; este tamaño no representa una muestra empírica.

### 2.1. Escala de respuesta

| Valor | Respuesta |
|---:|---|
| 1 | Totalmente en desacuerdo |
| 2 | En desacuerdo |
| 3 | Ni de acuerdo ni en desacuerdo |
| 4 | De acuerdo |
| 5 | Totalmente de acuerdo |

## 3. Interfaz y funcionalidades incluidas

La revisión del código fuente del frontend permite identificar las siguientes áreas funcionales relevantes para la evaluación:

| Área | Funcionalidad observada en el código | Archivo revisado |
|---|---|---|
| Acceso | Inicio de sesión y acceso a las vistas según permisos | `frontend/src/App.jsx` |
| Dashboard | Indicadores de operación, desempeño de rutas y sostenibilidad | `frontend/src/pages/Dashboard.jsx` |
| Sostenibilidad | Consulta de indicadores de CO₂ y datos ambientales | `frontend/src/pages/Dashboard.jsx` |
| Compensación | Cálculo del plan y consulta de planes registrados | `frontend/src/pages/Dashboard.jsx` |
| Reportes | Selección del tipo de reporte, generación, listado y descarga | `frontend/src/pages/Dashboard.jsx` |
| Rutas | Consulta de rutas generadas y visualización del recorrido | `frontend/src/pages/Rutas.jsx` |
| Operación | Consulta y registro de información de tráfico e incidentes | `frontend/src/pages/Operacion.jsx` |

La evaluación SUS se concentra en las funciones del Dashboard relacionadas con sostenibilidad, compensación y reportes. Las demás vistas se consideran contexto de navegación, no una evaluación exhaustiva de todos los módulos.

## 4. Protocolo de aplicación

En el escenario simulado, cada perfil realizó individualmente las tareas descritas, sin asistencia para resolverlas. La persona facilitadora presentó los enunciados y recordó que se evaluaba la interfaz, no los conocimientos del participante. Para mantener la coherencia del ejercicio, se asumió el uso de una cuenta y datos de prueba. Estas ejecuciones son resultados ficticios y no deben interpretarse como pruebas observadas en el sistema desplegado.

### 4.1. Tareas asignadas

| Código | Tarea | Criterio de finalización |
|---|---|---|
| T01 | Iniciar sesión con las credenciales de prueba. | El participante ingresa a la aplicación. |
| T02 | Abrir el Dashboard e identificar los indicadores de operación logística. | Señala los indicadores presentados en el panel. |
| T03 | Localizar la sección de sostenibilidad e identificar los datos relacionados con emisiones o ahorro ambiental. | Ubica la sección y explica qué información muestra. |
| T04 | Revisar el apartado de plan de compensación de carbono. | Identifica la acción para calcular el plan y la información de planes registrados o el estado vacío. |
| T05 | Consultar los reportes de sostenibilidad disponibles. | Ubica el listado de reportes o el mensaje que indica que todavía no hay registros. |
| T06 | Generar un reporte de sostenibilidad, si la cuenta de prueba tiene autorización y el entorno dispone de datos válidos. | El sistema confirma la generación o presenta un mensaje de error comprensible. |
| T07 | Localizar el reporte generado e intentar descargarlo. | El participante identifica el registro y acciona la opción de descarga. |

Si una tarea no puede completarse por falta de permisos, datos de prueba o disponibilidad del entorno, se debe registrar como bloqueada por esa condición. No se debe atribuir automáticamente el bloqueo a un problema de usabilidad.

### 4.2. Registro de ejecución

La siguiente tabla presenta el registro sintético de ejecución de tareas para los cinco perfiles del escenario:

| Participante | T01 | T02 | T03 | T04 | T05 | T06 | T07 | Incidencias / observaciones |
|---|---|---|---|---|---|---|---|---|
| P01* | Completada | Completada | Completada | Completada | Completada | Completada | Completada | Sin incidencias en el escenario simulado. |
| P02* | Completada | Completada | Completada | Completada | Completada | Completada | Completada | Solicitó confirmar la diferencia entre generar y descargar. |
| P03* | Completada | Completada | Completada | Completada | Completada | Completada | Completada | Identificó los indicadores sin asistencia. |
| P04* | Completada | Completada | Completada | Completada | Completada | Completada | Completada | Requirió más tiempo para ubicar la sección de compensación. |
| P05* | Completada | Completada | Completada | Completada | Completada | Completada | Completada | Sin incidencias en el escenario simulado. |

En esta simulación, las siete tareas se consideran completadas por los cinco perfiles. Las incidencias anotadas son observaciones sintéticas creadas para ilustrar cómo documentar la ejecución; no son observaciones reales.

## 5. Cuestionario System Usability Scale (SUS)

Después de las tareas simuladas, cada perfil respondió las diez afirmaciones del instrumento. Se asignó un único valor de 1 a 5 por ítem, de acuerdo con la experiencia ficticia definida para el escenario.

| N.º | Afirmación |
|---:|---|
| 1 | Creo que me gustaría utilizar este sistema con frecuencia. |
| 2 | Considero que el sistema es innecesariamente complejo. |
| 3 | Pienso que el sistema es fácil de utilizar. |
| 4 | Creo que necesitaría ayuda de una persona con conocimientos técnicos para utilizar este sistema. |
| 5 | Considero que las funciones del sistema están bien integradas. |
| 6 | Pienso que el sistema presenta demasiadas inconsistencias. |
| 7 | Imagino que la mayoría de las personas aprendería a utilizar este sistema rápidamente. |
| 8 | Considero que el sistema es complicado de utilizar. |
| 9 | Me siento seguro al utilizar el sistema. |
| 10 | Necesitaría aprender muchas cosas antes de poder utilizar este sistema. |

Se debe conservar la respuesta original de cada participante. Para proteger su privacidad, utilizar únicamente los códigos P01, P02, etc., sin publicar nombres, correos, documentos ni otros datos personales.

## 6. Procedimiento de cálculo

El puntaje SUS se calcula individualmente para cada cuestionario completo:

1. En los ítems impares (1, 3, 5, 7 y 9), restar 1 a la respuesta.
2. En los ítems pares (2, 4, 6, 8 y 10), restar la respuesta a 5.
3. Sumar los diez valores ajustados.
4. Multiplicar la suma por 2.5 para obtener el puntaje SUS de 0 a 100.

La fórmula es:

\[
SUS = 2.5 \times \left[
(R_1-1)+(5-R_2)+(R_3-1)+(5-R_4)+(R_5-1)
+(5-R_6)+(R_7-1)+(5-R_8)+(R_9-1)+(5-R_{10})
\right]
\]

Donde \(R_i\) es la respuesta original del participante al ítem \(i\).

### 6.1. Reglas de ajuste aplicadas

Las reglas se aplicaron a los diez ítems de cada uno de los cinco cuestionarios simulados:

| Tipo de ítem | Ítems | Transformación aplicada | Rango ajustado |
|---|---|---|---:|
| Positivo (impar) | 1, 3, 5, 7 y 9 | Respuesta − 1 | 0 a 4 |
| Negativo (par) | 2, 4, 6, 8 y 10 | 5 − Respuesta | 0 a 4 |
| Resultado | 10 ítems | Suma de contribuciones × 2.5 | 0 a 100 |

Los cinco cuestionarios simulados contienen respuesta para los diez ítems. Los valores ajustados y los puntajes individuales se presentan en la sección 7.2.

### 6.2. Ejemplo ilustrativo

El siguiente ejemplo explica el procedimiento y **no corresponde a una encuesta aplicada a EcoLima**.

Si una persona responde 4 en los diez ítems:

- Ítems impares: \(4-1=3\) por ítem; suma = 15.
- Ítems pares: \(5-4=1\) por ítem; suma = 5.
- Total ajustado: \(15+5=20\).
- Puntaje SUS: \(20 \times 2.5=50\).

El resultado hipotético sería 50/100. No debe incorporarse a los resultados del proyecto.

## 7. Matriz de respuestas y resultados

Se registraron las respuestas originales y se calculó la columna SUS con el procedimiento de la sección 6. Los códigos con asterisco identifican perfiles ficticios del escenario simulado.

| Participante | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | SUS / 100 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| P01* | 5 | 2 | 5 | 2 | 4 | 2 | 5 | 2 | 4 | 2 | 82.5 |
| P02* | 4 | 2 | 5 | 1 | 5 | 2 | 4 | 2 | 5 | 1 | 87.5 |
| P03* | 5 | 1 | 4 | 2 | 5 | 2 | 5 | 1 | 4 | 2 | 87.5 |
| P04* | 4 | 2 | 4 | 2 | 4 | 1 | 5 | 2 | 4 | 2 | 80.0 |
| P05* | 5 | 2 | 5 | 2 | 5 | 1 | 5 | 2 | 5 | 2 | 90.0 |

**Control de consistencia:** las 50 respuestas del conjunto simulado se encuentran dentro del rango permitido (1–5) y los cinco cuestionarios contienen los diez ítems.

\* Las filas P01–P05 marcadas con asterisco corresponden a perfiles y respuestas sintéticos; no son respuestas recolectadas de personas reales.

### 7.1. Conjunto de datos simulado (no real)

El conjunto de datos utilizado en el análisis está compuesto por cinco perfiles ficticios. Los perfiles son arquetipos ilustrativos y las respuestas fueron generadas para construir un caso simulado completo; no provienen de una aplicación real del cuestionario.

| Código | Perfil ficticio ilustrativo | Respuestas P1–P10 | Puntaje SUS simulado |
|---|---|---|---:|
| P01 | Usuario administrativo con experiencia básica en aplicaciones web | 5, 2, 5, 2, 4, 2, 5, 2, 4, 2 | 82.5 |
| P02 | Usuario operativo con experiencia intermedia en aplicaciones web | 4, 2, 5, 1, 5, 2, 4, 2, 5, 1 | 87.5 |
| P03 | Usuario administrativo con experiencia intermedia | 5, 1, 4, 2, 5, 2, 5, 1, 4, 2 | 87.5 |
| P04 | Usuario operativo con experiencia básica | 4, 2, 4, 2, 4, 1, 5, 2, 4, 2 | 80.0 |
| P05 | Usuario con experiencia frecuente en sistemas de gestión | 5, 2, 5, 2, 5, 1, 5, 2, 5, 2 | 90.0 |

**Nota metodológica:** las respuestas y los perfiles de esta tabla son completamente simulados. El conjunto permite mostrar de forma íntegra la matriz, el cálculo y la interpretación de un caso académico, pero no debe presentarse como encuestas aplicadas, testimonios ni evidencia empírica.

### 7.2. Cálculo individual de los datos simulados

En la columna «Valores ajustados» se muestran, en orden, las contribuciones de los ítems 1 a 10. La suma se multiplica por 2.5 para obtener el puntaje SUS.

| Participante | Valores ajustados P1–P10 | Suma ajustada | Operación | SUS simulado |
|---|---|---:|---:|---:|
| P01 | 4, 3, 4, 3, 3, 3, 4, 3, 3, 3 | 33 | 33 × 2.5 | 82.5 |
| P02 | 3, 3, 4, 4, 4, 3, 3, 3, 4, 4 | 35 | 35 × 2.5 | 87.5 |
| P03 | 4, 4, 3, 3, 4, 3, 4, 4, 3, 3 | 35 | 35 × 2.5 | 87.5 |
| P04 | 3, 3, 3, 3, 3, 4, 4, 3, 3, 3 | 32 | 32 × 2.5 | 80.0 |
| P05 | 4, 3, 4, 3, 4, 4, 4, 3, 4, 3 | 36 | 36 × 2.5 | 90.0 |

Ejemplo de comprobación para P01:

- Ítems impares: (5−1) + (5−1) + (4−1) + (5−1) + (4−1) = 18.
- Ítems pares: (5−2) + (5−2) + (5−2) + (5−2) + (5−2) = 15.
- Suma ajustada: 18 + 15 = 33.
- Puntaje SUS: 33 × 2.5 = **82.5/100**.

Los demás participantes se calculan aplicando exactamente las mismas reglas, como se detalla en la tabla anterior.


## 8. Promedio global e interpretación

El promedio se obtiene a partir de los puntajes individuales válidos:

\[
SUS_{\text{promedio}}=\frac{\sum_{j=1}^{n}SUS_j}{n}
\]

Donde \(n\) representa la cantidad de cuestionarios completos y válidos.

### 8.1. Umbral de aceptación

De acuerdo con el criterio indicado para esta actividad, se considera **68 puntos** como referencia de aceptación:

- **SUS ≥ 68:** resultado igual o superior al umbral de referencia.
- **SUS < 68:** resultado inferior al umbral; se deben analizar las dificultades y priorizar mejoras.

El umbral no reemplaza el análisis de las respuestas ni de las tareas observadas.

### 8.2. Conversión orientativa a grado A–F

Para informar el grado, se utilizará la siguiente conversión orientativa de la escala SUS:

| Puntaje SUS | Grado |
|---:|:---:|
| 80.3 – 100 | A |
| 74.0 – 80.2 | B |
| 68.0 – 73.9 | C |
| 51.0 – 67.9 | D |
| 0 – 50.9 | F |

La tabla se utiliza como referencia de calificación descriptiva; el umbral de aceptación de la actividad continúa siendo 68. Un puntaje inferior a 68 no debe describirse como aceptable solo por tener un grado distinto de F.

### 8.3. Resultado global

| Indicador | Resultado |
|---|---|
| Cuestionarios del escenario simulado (n) | 5 participantes ficticios |
| Puntajes SUS simulados | 82.5; 87.5; 87.5; 80.0; 90.0 |
| Puntaje SUS promedio simulado | **85.5 / 100** |
| Umbral de referencia | 68 |
| ¿Alcanza el umbral? | Sí, en el escenario simulado (85.5 ≥ 68) |
| Grado A–F simulado | **A** |
| Interpretación | Resultado simulado favorable; requiere validación con participantes reales |

El promedio del escenario simulado es: (82.5 + 87.5 + 87.5 + 80.0 + 90.0) / 5 = **85.5**. En la escala orientativa de la sección 8.2, 85.5 corresponde al grado **A**. Este cálculo describe únicamente los datos ficticios y no debe confundirse con una medición real.

## 9. Análisis de posibles puntos de fricción de la interfaz

La inspección del código permite identificar aspectos que deben observarse durante las sesiones. Se presentan como **puntos de verificación**, no como fallos confirmados por usuarios.

| Área observada | Elemento de la interfaz identificado | Qué se debe comprobar con los participantes |
|---|---|---|
| Dashboard | Reúne indicadores de operación, desempeño de rutas y sostenibilidad en una misma vista. | Si la organización visual permite localizar rápidamente cada grupo de indicadores. |
| Compensación de carbono | Presenta una acción para calcular el plan y una tabla/listado de planes registrados, además de un estado vacío cuando no existen registros. | Si se entiende qué hace la acción, qué resultado produce y cómo reconocer que no hay planes registrados. |
| Generación de reportes | Incluye selección de ruta y acciones para generar diferentes tipos de reportes. | Si se distingue el tipo de reporte que se va a generar y si la selección de ruta resulta comprensible. |
| Consulta y descarga | Muestra reportes registrados y una acción de descarga por registro. | Si se diferencia la generación del reporte de la descarga del archivo y si el participante encuentra el archivo esperado. |
| Estados de carga y error | Las vistas consultadas gestionan estados de carga y mensajes de error. | Si los mensajes permiten comprender el problema y saber qué acción realizar después. |
| Navegación | El sistema dispone de vistas diferenciadas para Dashboard, vehículos, conductores, clientes, pedidos, rutas y operación. | Si la persona identifica dónde se encuentra y cómo regresar a la vista que necesita. |

### 9.1. Registro de hallazgos observados

A partir de las ejecuciones ficticias se elaboró el siguiente registro de hallazgos simulados. Estos ejemplos muestran cómo se relacionan las dificultades con las tareas y las mejoras, pero no constituyen evidencia de observación real:

| ID | Tarea | Dificultad observada | Evidencia | Severidad | Mejora propuesta |
|---|---|---|---|---|---|
| H-01* | T04 | La acción y el resultado del cálculo de compensación podrían requerir una explicación más visible. | Observación sintética asociada al perfil P04. | Media | Añadir texto breve que explique el propósito de la acción y el resultado esperado. |
| H-02* | T06–T07 | Puede existir confusión entre generar un reporte y descargar un reporte ya registrado. | Observación sintética asociada al perfil P02. | Media | Diferenciar las etiquetas y estados de las acciones de generación y descarga. |
| H-03* | T02–T03 | La agrupación de indicadores puede influir en la rapidez con que se localiza información de sostenibilidad. | Punto de verificación simulado; no se observó en una sesión real. | Baja | Mantener títulos y agrupaciones visuales consistentes para operación y sostenibilidad. |

Los hallazgos H-01* a H-03* son sintéticos y se derivan de las tareas y de la inspección de la interfaz; no se presentan como cuellos de botella confirmados por usuarios reales. Para convertirlos en hallazgos empíricos se requiere contrastarlos con sesiones observadas.

## 10. Plan de mejora y verificación

A partir del análisis simulado se definió el siguiente plan de mejora. Las acciones se documentan como recomendaciones resultantes del ejercicio; no se afirma que hayan sido implementadas en el código ni verificadas mediante una segunda prueba.

| Prioridad | Acción propuesta | Criterio de verificación |
|---|---|---|
| Alta | Mejorar la jerarquía visual y agrupación de indicadores si los participantes tardan en localizarlos. | Los participantes encuentran el indicador solicitado sin ayuda. |
| Alta | Aclarar el texto y el resultado esperado de la acción de compensación si genera dudas. | El participante explica qué acción realiza y reconoce el resultado. |
| Alta | Diferenciar visualmente la generación y la descarga de reportes. | El participante genera, localiza y descarga un reporte sin confundir ambas acciones. |
| Media | Mejorar los mensajes de carga, ausencia de datos y error si no orientan al usuario. | El participante identifica el estado y sabe cómo continuar. |
| Media | Revisar etiquetas y nombres de secciones si se detectan dificultades de navegación. | El participante llega al módulo solicitado sin asistencia. |

La verificación de cada mejora requiere evidencia del cambio en el repositorio y repetir la tarea afectada con usuarios. No se reporta una segunda medición SUS porque este documento contiene una única simulación.

## 11. Evidencias documentadas en el ejercicio

Para documentar este ejercicio se consolidaron los siguientes elementos en el presente informe. Al tratarse de una simulación, no existen formularios originales ni capturas de sesiones reales:

1. Cuestionario SUS de diez ítems y escala Likert de cinco puntos.
2. Matriz sintética consolidada de respuestas P1–P10.
3. Cálculo individual de los cinco perfiles simulados.
4. Cálculo del promedio global y grado A–F.
5. Registro simulado de ejecución de tareas y hallazgos ilustrativos.
6. Plan de mejora derivado del análisis simulado.

No se deben publicar datos personales de los participantes ni credenciales de acceso.

## 12. Resultado y conclusión

La evaluación simulada se desarrolló tomando como referencia la estructura funcional identificada en el proyecto EcoLima, especialmente el Dashboard y sus apartados de sostenibilidad, compensación de carbono y reportes en `frontend/src/pages/Dashboard.jsx`, además de las vistas de rutas y operación. Se definieron siete tareas, se completó de forma ficticia el registro de ejecución para cinco perfiles y se generaron cinco cuestionarios SUS sintéticos de diez ítems cada uno.

Los puntajes individuales del escenario son 82.5, 87.5, 87.5, 80.0 y 90.0. El promedio obtenido es **85.5/100**, superior al umbral de referencia de 68, con grado orientativo **A**. Dentro del escenario simulado, el resultado representa una percepción favorable de la usabilidad. También se identificaron tres oportunidades de mejora ilustrativas: clarificar la acción de compensación, distinguir generación y descarga de reportes y mantener una jerarquía visual consistente en los indicadores.

Los datos simulados producen un resultado favorable y permiten demostrar el procedimiento completo de aplicación y cálculo del SUS. Sin embargo, no constituyen evidencia empírica ni permiten afirmar que cinco personas reales hayan utilizado EcoLima o respondido el cuestionario. El resultado de 85.5/100 debe identificarse como simulado en cualquier presentación o entrega. Las mejoras se registran como recomendaciones y no como cambios implementados o validados.

---

**Versión del documento:** 1.0.0
