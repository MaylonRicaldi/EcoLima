[← Volver al README principal](../../../README.md)

# Revisión del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Diego Marlon Quispe Povis

## Historias de Usuario completadas en este Sprint

Durante el Sprint 04 se completaron las tres historias de usuario planificadas. El incremento desarrollado comprende el dashboard de indicadores, los reportes de sostenibilidad y el plan de compensación de carbono.

| Código y título | Criterios de aceptación verificados | Resultado |
|---|---|---|
| **HU-09 – Dashboard de indicadores** | El sistema presenta indicadores operativos y ambientales; consolida información de pedidos, rutas, vehículos, conductores, clientes e incidentes; muestra métricas de distancia, duración, combustible, costos, emisiones, ahorros y cumplimiento; y presenta estados de carga y mensajes cuando ocurre un error. El acceso a la información se encuentra protegido mediante autenticación y permisos. | Dashboard implementado e integrado al sistema, con visualización de indicadores operativos y ambientales. |
| **HU-10 – Reportes de sostenibilidad** | El usuario puede generar reportes de los tipos SOSTENIBILIDAD, TCO, COMPENSACION y AUDITORIA; el backend obtiene la información desde la base de datos; se registra el reporte asociado al usuario que lo genera; y el contenido CSV se encuentra disponible para su descarga. Se aplican validaciones al tipo de reporte y a los datos de entrada. | Módulo de reportes implementado, con generación, registro y descarga de archivos CSV. |
| **HU-11 – Plan de compensación de carbono** | El sistema calcula las emisiones que se deben compensar, utiliza el factor de captura de 22 kg de CO₂ por árbol al año, redondea hacia arriba la cantidad de árboles requerida y registra los resultados del plan. Se validan los valores ingresados para evitar cantidades no válidas o superiores a las emisiones consideradas. | Funcionalidad de compensación implementada, con cálculo de árboles requeridos y registro de los resultados. |

Las tres historias de usuario cumplen con el alcance funcional establecido para el Sprint 04 y forman parte del incremento desarrollado de EcoLima.

## Demostración del trabajo completado

Durante la demostración del Sprint 04 se presentaron las tres funcionalidades desarrolladas en el sistema:

1. **Dashboard de indicadores (HU-09):** se mostró el panel con los principales indicadores de operación y sostenibilidad, incluyendo pedidos, rutas, flota, distancia recorrida, consumo y emisiones.
2. **Reportes de sostenibilidad (HU-10):** se presentó el módulo de reportes, la selección del tipo de reporte, el registro de la solicitud y la obtención del archivo CSV generado.
3. **Compensación de carbono (HU-11):** se ejecutó el cálculo de compensación, considerando el factor de 22 kg de CO₂ por árbol al año y mostrando la cantidad de árboles resultante.

La presentación permitió mostrar el funcionamiento de las tres historias de usuario y la forma en que contribuyen a la gestión operativa y ambiental de EcoLima.

---

**Versión del documento:** 1.0.0
