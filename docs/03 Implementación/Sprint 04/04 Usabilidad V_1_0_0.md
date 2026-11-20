[← Volver al README principal](../../../README.md)

# 04. Evaluación cuantitativa de usabilidad – SUS

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.0.0  
**Instrumento:** System Usability Scale (SUS)  
**Fecha de elaboración:** 19 de noviembre de 2026

---

## 1. Objetivo

Establecer el procedimiento para evaluar cuantitativamente la facilidad de uso de EcoLima, considerando las funciones de dashboard, reportes de sostenibilidad y compensación de carbono. La evaluación utilizará la escala System Usability Scale (SUS), que permite obtener una puntuación global de 0 a 100.

## 2. Ficha técnica de la evaluación

| Elemento | Definición |
|---|---|
| Instrumento | System Usability Scale (SUS) |
| Cantidad de preguntas | 10 afirmaciones |
| Escala de respuesta | Likert de 1 a 5 |
| 1 | Totalmente en desacuerdo |
| 2 | En desacuerdo |
| 3 | Ni de acuerdo ni en desacuerdo |
| 4 | De acuerdo |
| 5 | Totalmente de acuerdo |
| Perfil de evaluadores | Usuarios que representen perfiles operativos, administrativos o de auditoría del sistema |
| Muestra | Debe definirse y registrarse antes de aplicar el cuestionario |
| Sistema evaluado | Versión desplegada de EcoLima, identificando URL y commit |

No se registran participantes ni puntuaciones en este documento porque no se proporcionaron cuestionarios respondidos. Para mantener la integridad de la evaluación, no se inventan datos ni resultados.

## 3. Tareas que debe realizar cada evaluador

Antes de responder el cuestionario, cada participante debe realizar las tareas que correspondan a sus permisos:

1. Iniciar sesión en el sistema.
2. Ingresar al Dashboard e identificar la cantidad de rutas, pedidos y vehículos.
3. Localizar los indicadores de emisiones de CO₂ y ahorro ambiental.
4. Consultar los reportes disponibles.
5. Solicitar un reporte de sostenibilidad, si su rol tiene permiso.
6. Consultar el impacto ambiental y revisar los árboles equivalentes.
7. Generar un plan de compensación, si su rol tiene permiso.
8. Identificar dónde se presentan los resultados y mensajes de confirmación o error.

Se debe registrar si una tarea no pudo realizarse por permisos o indisponibilidad del entorno.

## 4. Cuestionario SUS

Cada participante debe valorar las siguientes afirmaciones del 1 al 5:

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
| 10 | Necesitaría aprender muchas cosas antes de poder utilizar el sistema. |

## 5. Método de cálculo SUS

La puntuación se calcula por participante:

- Para los ítems impares (1, 3, 5, 7 y 9), se resta 1 a la respuesta.
- Para los ítems pares (2, 4, 6, 8 y 10), se resta la respuesta a 5.
- Se suman los diez valores ajustados.
- El resultado se multiplica por 2.5.

La fórmula es:

[
SUS = 2.5 \times
\left[
\sum_{i \in \{1,3,5,7,9\}}(R_i-1)
+
\sum_{i \in \{2,4,6,8,10\}}(5-R_i)
\right]
]

Donde (R_i) representa la respuesta del participante al ítem correspondiente. El resultado individual se encuentra entre 0 y 100.

### 5.1. Ejemplo de cálculo

Ejemplo exclusivamente ilustrativo, no corresponde a una encuesta aplicada a usuarios de EcoLima.

Si un participante responde 4 en todos los ítems:

- Ítems impares: cada respuesta aporta (4-1=3). Total: 15.
- Ítems pares: cada respuesta aporta (5-4=1). Total: 5.
- Suma ajustada: 20.
- Puntaje SUS: (20 \times 2.5 = 50).

Este ejemplo explica la fórmula y no debe utilizarse como resultado del proyecto.

## 6. Matriz de registro de respuestas

La matriz debe completarse con las respuestas originales de cada participante. Se debe conservar la identidad de los participantes de forma codificada para proteger sus datos personales.

| Participante | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | SUS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Registro 01 | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | No calculado |
| Registro 02 | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | No calculado |
| Registro 03 | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | No calculado |
| Registro 04 | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | No calculado |
| Registro 05 | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | Por aplicar | No calculado |

La muestra mínima objetivo para la evaluación del proyecto es de cinco participantes. Las filas anteriores son espacios de registro, no representan personas encuestadas.

## 7. Cálculo del promedio global

Una vez calculado el puntaje individual de cada participante, el promedio global se obtiene mediante:

[
SUS_{promedio}=\frac{\sum_{j=1}^{n}SUS_j}{n}
]

Donde (n) es el número de cuestionarios completos y válidos.

No se puede calcular el promedio global hasta contar con las respuestas reales.

## 8. Interpretación de resultados

Como referencia de aceptación establecida en la consigna, se utilizará un puntaje SUS de **68 puntos o más**. La interpretación debe considerar también la distribución de las respuestas y los comentarios de los participantes.

| Puntaje SUS | Interpretación general |
|---:|---|
| 80.3 a 100 | Excelente nivel de usabilidad |
| 68 a 80.2 | Aceptable, por encima del umbral de referencia |
| Menor de 68 | Por debajo del umbral de referencia; requiere analizar mejoras |

La clasificación por grados A–F debe asignarse cuando exista un promedio real, indicando el criterio de conversión utilizado. No se asigna una calificación a EcoLima en este documento porque todavía no existe un resultado de encuesta verificable.

## 9. Aspectos de interfaz que deben observarse

Durante las tareas se recomienda registrar:

- Facilidad para localizar los indicadores principales.
- Claridad de las unidades de medida, especialmente km, litros, soles y kg de CO₂.
- Comprensión de las diferencias entre emisiones, emisiones ahorradas y emisiones por compensar.
- Claridad de los mensajes al generar reportes y planes de compensación.
- Facilidad para identificar si un reporte está registrado y si el archivo puede recuperarse.
- Comportamiento de la interfaz cuando el backend no responde.
- Consistencia de tablas, botones y mensajes entre las distintas secciones.

Las observaciones deben vincularse con una tarea y una evidencia concreta.

## 10. Plan de mejora posterior a la evaluación

Después de aplicar SUS, el equipo debe priorizar las observaciones repetidas o que impidan completar una tarea:

1. Corregir etiquetas o unidades que generen confusión.
2. Mejorar la ubicación y jerarquía visual de los indicadores más consultados.
3. Explicar con mensajes breves el factor de captura de carbono utilizado.
4. Diferenciar claramente el registro de un reporte de la descarga del archivo.
5. Mejorar la presentación de errores y la opción para reintentar.
6. Volver a evaluar las tareas afectadas después de aplicar las correcciones.

## 11. Resultado de la evaluación al corte

| Indicador | Resultado |
|---|---|
| Instrumento definido | SUS, 10 ítems |
| Escala | Likert de 1 a 5 |
| Muestra objetivo | 5 participantes como mínimo |
| Cuestionarios recibidos | No proporcionados |
| Puntaje SUS promedio | No calculado |
| Comparación con umbral 68 | Pendiente de resultados |
| Grado A–F | Pendiente de resultados |
| Mejoras verificadas mediante una segunda medición | Pendiente |

## 12. Conclusión

Se ha definido el instrumento, las tareas de evaluación, el procedimiento de cálculo y los criterios de interpretación para medir la usabilidad de EcoLima. El resultado cuantitativo queda pendiente de aplicar el cuestionario a usuarios reales. Esta separación permite presentar un procedimiento reproducible sin atribuir al proyecto puntuaciones que no han sido obtenidas.

---

**Versión del documento:** 1.0.0
