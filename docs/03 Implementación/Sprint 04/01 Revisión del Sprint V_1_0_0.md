[← Volver al README principal](../../../README.md)

# Revisión del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Diego Marlon Quispe Povis

## Historias de Usuario completadas en este Sprint

Durante el Sprint 04 se culminaron las tres historias de usuario establecidas para el incremento del producto. Estas funcionalidades forman parte de la versión **EcoLima MVP 3.0.0**, publicada el **19 de noviembre de 2026**, cuyo periodo de desarrollo comprendió desde el **7 de octubre hasta el 19 de noviembre de 2026**. La entrega permitió fortalecer las capacidades de seguimiento operativo, generación de información para la sostenibilidad y compensación de emisiones de carbono.

El trabajo desarrollado se enfocó en integrar estas funcionalidades con los módulos existentes de EcoLima, manteniendo la comunicación entre el frontend, el backend y la base de datos. De esta manera, el usuario puede consultar indicadores, generar reportes y obtener resultados relacionados con la compensación ambiental desde una misma plataforma.

| Historia de Usuario | Criterios de aceptación verificados | Resultado y cierre |
|---|---|---|
| **HU-09 – Dashboard de indicadores** | El sistema presenta indicadores operativos y ambientales a partir de la información registrada en la base de datos. El dashboard consolida datos relacionados con pedidos, rutas, vehículos, conductores, clientes e incidentes. Muestra métricas como distancia recorrida, duración de las rutas, consumo de combustible, costos, emisiones de CO₂, ahorros y cumplimiento de ventanas de tiempo. La información se organiza mediante componentes visuales que facilitan su lectura y comparación. Asimismo, se contemplan estados de carga y mensajes cuando ocurre un error durante la consulta. El acceso al módulo se encuentra protegido mediante autenticación y permisos de usuario. | **Completada.** Se implementó e integró el dashboard con los servicios del backend. El usuario puede consultar en un solo espacio los principales indicadores de la operación logística y del desempeño ambiental. La funcionalidad se incluyó en la versión MVP 3.0.0. **Cierre:** [Pull Request de integración del Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6). |
| **HU-10 – Reportes de sostenibilidad** | El usuario puede generar reportes de los tipos SOSTENIBILIDAD, TCO, COMPENSACION y AUDITORIA. El backend obtiene la información desde la base de datos y valida el tipo de reporte y los parámetros recibidos. La generación queda registrada y asociada al usuario que realiza la solicitud. El sistema prepara el contenido en formato CSV y permite descargar el archivo generado. También se controlan los datos de entrada para evitar solicitudes con parámetros no válidos y se presentan respuestas adecuadas cuando ocurre un error durante el proceso. | **Completada.** Se implementó el módulo de reportes con las opciones de generación, registro y descarga de archivos CSV. Esta funcionalidad permite obtener información organizada para revisar los resultados operativos, económicos y ambientales de EcoLima. La funcionalidad se incluyó en la versión MVP 3.0.0. **Cierre:** [Pull Request de integración del Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6). |
| **HU-11 – Plan de compensación de carbono** | El sistema permite calcular la cantidad de árboles necesaria para compensar las emisiones de CO₂ consideradas. Para realizar el cálculo utiliza el factor de captura de **22 kg de CO₂ por árbol al año**. La cantidad de árboles se redondea hacia arriba para evitar subestimar la compensación requerida. También se validan los valores ingresados para evitar cantidades no numéricas, negativas, iguales a cero o superiores a las emisiones consideradas. Finalmente, el resultado del cálculo queda registrado para su consulta y seguimiento. | **Completada.** Se incorporó la funcionalidad de cálculo y registro del plan de compensación de carbono. El resultado permite relacionar las emisiones consideradas con una cantidad estimada de árboles, aplicando el factor ambiental definido para el proyecto. La funcionalidad se incluyó en la versión MVP 3.0.0. **Cierre:** [Pull Request de integración del Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6). |

Las tres historias de usuario cumplieron con los criterios de aceptación definidos para el Sprint 04 y fueron incorporadas al incremento del producto. Su cierre se encuentra relacionado con la publicación de **EcoLima MVP 3.0.0**, registrada en Jira. Esta versión reúne las funcionalidades desarrolladas y permite identificar el alcance entregado al finalizar el sprint.

- **Versión publicada:** [EcoLima MVP 3.0.0 – Release report de Jira](https://eco-lima.atlassian.net/projects/ECO/versions/10034/tab/release-report-all-issues).
- **Integración del incremento:** [Pull Request de integración del Sprint 04](https://github.com/MaylonRicaldi/EcoLima/pull/6).
- **Commit de integración:** [Consultar commit en GitHub](https://github.com/MaylonRicaldi/EcoLima/commit/4bb9b86935312c7b48693b720f92661d9177d924).

Por lo tanto, el Sprint 04 se considera completado respecto de las historias planificadas. Las funcionalidades no quedaron como módulos aislados, sino que fueron integradas al sistema para que trabajen con la información y los servicios que utiliza EcoLima.

## Demostración del trabajo completado

Durante la Sprint Review se realizó la presentación del incremento desarrollado ante los stakeholders, mostrando el funcionamiento de las tres historias de usuario en el entorno desplegado de EcoLima. La demostración se llevó a cabo utilizando la arquitectura actual del proyecto: el frontend publicado en **Vercel**, el backend desplegado en **Render** y la base de datos alojada en **Neon**. De esta forma, se presentó el sistema utilizando sus servicios conectados y su configuración de despliegue, sin depender de la ejecución local mediante Docker.

La presentación comenzó con el ingreso al sistema y la explicación general de las funcionalidades incorporadas en esta versión. Posteriormente, se realizó el recorrido de cada módulo para mostrar su utilidad, el proceso que sigue el usuario y los resultados que proporciona la aplicación.

**1. Dashboard de indicadores (HU-09)**

Se presentó el dashboard y la forma en que concentra los principales indicadores operativos y ambientales. Se mostró la información relacionada con pedidos, rutas, vehículos, conductores y clientes, así como las métricas de distancia recorrida, duración, consumo de combustible, costos y emisiones de CO₂. También se explicó cómo la visualización de estos datos facilita el seguimiento de las operaciones y permite reconocer el comportamiento general de la gestión logística.

**2. Reportes de sostenibilidad (HU-10)**

Se mostró el módulo de generación de reportes y las opciones disponibles para obtener información de sostenibilidad, TCO, compensación y auditoría. Se explicó el proceso de selección del tipo de reporte, su generación desde el backend y la descarga del archivo CSV. Asimismo, se presentó la utilidad de estos archivos para revisar y conservar información organizada sobre los resultados del sistema.

**3. Plan de compensación de carbono (HU-11)**

Se realizó la demostración del cálculo de compensación de carbono, explicando la relación entre las emisiones consideradas y la cantidad de árboles necesaria. Se indicó que el sistema utiliza el factor de captura de 22 kg de CO₂ por árbol al año y aplica el redondeo hacia arriba para determinar el resultado. Finalmente, se mostró la información obtenida y su registro para permitir su consulta posterior.

Al finalizar la presentación, los stakeholders pudieron observar el funcionamiento de las funcionalidades incorporadas y su relación con los objetivos operativos y ambientales del proyecto. La retroalimentación recibida fue favorable, destacándose la utilidad de reunir los indicadores en un dashboard, disponer de reportes descargables y contar con un cálculo que facilite la interpretación de la compensación de carbono. Los comentarios fueron considerados para continuar fortaleciendo la claridad de la información y la facilidad de uso del sistema.

**Entorno utilizado durante la demostración:**

- **Frontend:** aplicación web desplegada en Vercel.
- **Backend:** servicios de la aplicación desplegados en Render.
- **Base de datos:** instancia de Neon conectada al backend.
- **Versión presentada:** EcoLima MVP 3.0.0.
- **Registro de la versión:** [Release report de EcoLima MVP 3.0.0 en Jira](https://eco-lima.atlassian.net/projects/ECO/versions/10034/tab/release-report-all-issues).

**Evidencia de la Sprint Review:**

- (Falta agregar el video de demostración del sistema).

La demostración permitió comprobar el recorrido funcional de las tres historias de usuario y presentar el incremento completado en el entorno desplegado. Con ello, los stakeholders pudieron conocer las funcionalidades incorporadas en la versión y su aporte a la gestión logística y ambiental de EcoLima.

## Pendientes

Al cierre del Sprint 04, **todas las historias de usuario planificadas se encuentran culminadas**. La HU-09, correspondiente al Dashboard de indicadores; la HU-10, correspondiente a los Reportes de sostenibilidad; y la HU-11, correspondiente al Plan de compensación de carbono fueron implementadas, integradas y consideradas dentro de la versión EcoLima MVP 3.0.0.

En consecuencia, no quedaron historias de usuario incompletas ni funcionalidades del alcance del sprint que deban trasladarse a una siguiente iteración. El incremento fue entregado de acuerdo con los objetivos establecidos y las tres funcionalidades se encuentran incorporadas al sistema.

Las actividades posteriores relacionadas con estas funcionalidades corresponden al mantenimiento y evolución normal del producto, como ampliar los escenarios de pruebas automatizadas, revisar la consistencia de los indicadores y conservar la disponibilidad de los reportes. Estas actividades no representan historias pendientes del Sprint 04 ni afectan el cierre de la versión entregada.

En conclusión, el Sprint 04 finalizó con el cumplimiento del alcance funcional establecido, integrando las tres historias de usuario en EcoLima MVP 3.0.0 y fortaleciendo las capacidades del sistema para el seguimiento de operaciones, la consulta de información de sostenibilidad y la compensación de emisiones de carbono.

---

**Versión del documento:** 1.0.0
