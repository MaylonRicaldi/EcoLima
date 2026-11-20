[← Volver al README principal](../../../README.md)

# Revisión del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Diego Marlon Quispe Povis

## Historias de Usuario completadas en este Sprint

El Sprint 04 culminó con la implementación de las tres historias de usuario definidas para este incremento del producto. Estas funcionalidades se agruparon en la versión **EcoLima MVP 3.0.0**, cuyo periodo de publicación comprende desde el **7 de octubre de 2026 hasta el 19 de noviembre de 2026**. La versión se encuentra registrada en Jira como publicada y contiene las historias ECO-16, ECO-17 y ECO-18.

La entrega tuvo como objetivo ampliar las capacidades de seguimiento operativo y ambiental de EcoLima. Para ello, se desarrolló un dashboard que reúne los principales indicadores del sistema, un módulo para generar reportes de sostenibilidad y una funcionalidad para calcular la compensación de emisiones de carbono.

| Código Jira | Historia de Usuario | Criterios de aceptación verificados | Resultado y cierre |
|---|---|---|---|
| **ECO-16** | **HU-09 – Dashboard de indicadores** | El sistema presenta indicadores operativos y ambientales a partir de la información registrada en la base de datos. El dashboard reúne datos relacionados con pedidos, rutas, vehículos, conductores, clientes e incidentes. Además, muestra métricas como distancia recorrida, duración, consumo de combustible, costos, emisiones de CO₂, ahorros y cumplimiento de ventanas de tiempo. La información se presenta mediante componentes visuales que facilitan la interpretación de los resultados. También se contemplan los estados de carga y los mensajes de error, y el acceso al módulo se encuentra protegido mediante autenticación y permisos. | **Completada.** Se incorporó el dashboard al sistema y se integró con los servicios del backend para presentar información operativa y ambiental en un mismo espacio. La historia forma parte de la versión MVP 3.0.0. |
| **ECO-17** | **HU-10 – Reportes de sostenibilidad** | El usuario puede generar reportes de los tipos SOSTENIBILIDAD, TCO, COMPENSACION y AUDITORIA. El backend obtiene los datos desde la base de datos, valida el tipo de reporte y los parámetros recibidos, y registra la generación asociándola al usuario correspondiente. El sistema prepara el contenido en formato CSV y permite recuperar el archivo para su descarga. Se consideran respuestas de validación cuando se envían parámetros incorrectos o se solicita información que no existe. | **Completada.** Se implementó el módulo de reportes con generación, registro del reporte y descarga del archivo CSV. La funcionalidad permite obtener información organizada para revisar los resultados operativos, económicos y ambientales de EcoLima. La historia forma parte de la versión MVP 3.0.0. |
| **ECO-18** | **HU-11 – Plan de compensación de carbono** | El sistema obtiene las emisiones de CO₂ consideradas para la compensación y permite calcular la cantidad de árboles necesaria. Para el cálculo se utiliza el factor de captura de **22 kg de CO₂ por árbol al año**. La cantidad de árboles se redondea hacia arriba para evitar subestimar la compensación requerida. También se validan los valores ingresados, evitando cantidades no numéricas, negativas, iguales a cero o superiores a las emisiones consideradas. El resultado del cálculo queda registrado para su consulta. | **Completada.** Se incorporó el cálculo de compensación de carbono y el registro de sus resultados, manteniendo una regla uniforme para determinar la cantidad de árboles requerida. La historia forma parte de la versión MVP 3.0.0. |

Las tres historias cumplen el alcance funcional establecido para el Sprint 04 y se consideran terminadas de acuerdo con el incremento entregado. Su trazabilidad se conserva mediante los identificadores de Jira y el registro de publicación de la versión:

- **Versión:** [EcoLima MVP 3.0.0 – Release report de Jira](https://eco-lima.atlassian.net/projects/ECO/versions/10034/tab/release-report-all-issues).
- **Pull Request de integración del Sprint 04:** [PR #6 – Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6), integrado en la rama principal.
- **Commit de integración:** [4bb9b86935312c7b48693b720f92661d9177d924](https://github.com/MaylonRicaldi/EcoLima/commit/4bb9b86935312c7b48693b720f92661d9177d924).

De esta manera, el cierre del sprint no se limita a la implementación individual de cada módulo, sino que considera su integración dentro del producto y su inclusión en la versión MVP 3.0.0.

## Demostración del trabajo completado

La demostración del Sprint 04 se organizó alrededor de las tres funcionalidades terminadas, siguiendo el recorrido que realizaría un usuario al consultar los resultados de la operación y la información ambiental de EcoLima. Para la presentación se considera el entorno desplegado del proyecto, compuesto por el frontend publicado en **Vercel**, el backend desplegado en **Render** y la base de datos alojada en **Neon**. Esta configuración permite mostrar el funcionamiento de la aplicación utilizando los servicios conectados del proyecto, sin depender de la ejecución local mediante Docker.

En primer lugar, se presentó el **Dashboard de indicadores (HU-09)**. Se explicó cómo el usuario puede consultar en un solo panel información relacionada con la operación logística y el desempeño ambiental. Se recorrieron los indicadores de pedidos, rutas y flota, así como los valores de distancia, duración, combustible, costos y emisiones. También se explicó la utilidad de reunir estos datos para facilitar el seguimiento de la operación y reconocer el comportamiento general de las rutas.

En segundo lugar, se mostró el módulo de **Reportes de sostenibilidad (HU-10)**. Durante este recorrido se explicó la selección del tipo de reporte, la solicitud de generación y el registro de la información correspondiente. Se presentó el formato CSV como medio para obtener los datos y revisarlos fuera del sistema. También se explicó que la generación se realiza desde el backend y que el archivo queda asociado al usuario que solicita el reporte.

En tercer lugar, se presentó el **Plan de compensación de carbono (HU-11)**. Se explicó el uso del factor de captura de 22 kg de CO₂ por árbol al año y la forma en que el sistema determina la cantidad necesaria mediante el redondeo hacia arriba. Con ello se mostró cómo EcoLima relaciona las emisiones calculadas con una cantidad estimada de árboles para su compensación.

La demostración permitió recorrer el propósito de cada historia y explicar cómo se complementan: el dashboard facilita la consulta de indicadores, los reportes permiten obtener información estructurada y el módulo de compensación traduce las emisiones consideradas en un resultado ambiental comprensible.

**Entorno y evidencias de la entrega:**

- **Frontend:** aplicación desplegada en Vercel.
- **Backend:** servicios de la aplicación desplegados en Render.
- **Base de datos:** instancia de Neon utilizada por el backend.
- **Trazabilidad de la versión:** [EcoLima MVP 3.0.0 en Jira](https://eco-lima.atlassian.net/projects/ECO/versions/10034/tab/release-report-all-issues).
- **Evidencia de integración del incremento:** [Pull Request #6 – Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6) y [commit de integración](https://github.com/MaylonRicaldi/EcoLima/commit/4bb9b86935312c7b48693b720f92661d9177d924).

La información disponible permite identificar la versión publicada y el cambio integrado en el repositorio. No se atribuyen comentarios textuales a los stakeholders ni se presenta un acta formal de reunión que no se encuentre incorporada entre las evidencias del proyecto. Por ello, la retroalimentación específica y el registro multimedia de la exposición deben sustentarse con el acta o las capturas correspondientes si se incorporan como anexos de la entrega académica.

## Pendientes

Al cierre del Sprint 04 **no quedaron historias de usuario del alcance planificado sin completar**. Las tres historias incluidas en la versión EcoLima MVP 3.0.0 se encuentran culminadas:

- **ECO-16 – HU-09:** Dashboard de indicadores.
- **ECO-17 – HU-10:** Reportes de sostenibilidad.
- **ECO-18 – HU-11:** Plan de compensación de carbono.

Por tanto, no existen historias de usuario de este sprint que deban trasladarse a una iteración posterior por falta de implementación. Las actividades de seguimiento que puedan realizarse sobre estas funcionalidades corresponden al mantenimiento y evolución del producto, por ejemplo, ampliar escenarios de pruebas automatizadas, revisar periódicamente la consistencia de los indicadores y conservar la disponibilidad de los reportes. Estas actividades no modifican el estado de cierre de las tres historias ni representan funcionalidades incompletas del Sprint 04.

En conclusión, el Sprint 04 queda cerrado respecto de su alcance funcional, con las tres historias incorporadas en la versión publicada EcoLima MVP 3.0.0 y con su trazabilidad registrada en Jira y GitHub.

---

**Versión del documento:** 1.0.0
