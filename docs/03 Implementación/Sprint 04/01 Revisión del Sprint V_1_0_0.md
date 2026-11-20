# Revisión del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Diego Marlon Quispe Povis

## Historias de Usuario completadas en este Sprint

Durante el Sprint 04 se completaron las tres historias de usuario planificadas: HU-09, HU-10 y HU-11. Las funcionalidades fueron integradas al repositorio mediante el Pull Request #6 y sus cambios de implementación quedaron registrados en el commit de cierre del incremento.

| Código y título | Criterios de aceptación verificados | Evidencia de cierre |
|---|---|---|
| **HU-09 – Dashboard de indicadores** | El sistema presenta un dashboard con indicadores operativos y ambientales; consolida información de pedidos, rutas, vehículos, conductores, clientes e incidentes; muestra métricas de distancia, duración, combustible, costos, emisiones, ahorros y cumplimiento; y contempla estados de carga, error y reintento. El acceso a la información está protegido mediante autenticación y permisos. | [Pull Request #6](https://github.com/MaylonRicaldi/EcoLima/pull/6) · [Commit de implementación HU-09, HU-10 y HU-11](https://github.com/MaylonRicaldi/EcoLima/commit/732b3aae8ebe471674cd7963d8b29fa9e18aebe4) |
| **HU-10 – Reportes de sostenibilidad** | El usuario puede generar reportes de los tipos SOSTENIBILIDAD, TCO, COMPENSACION y AUDITORIA; el backend obtiene la información desde la base de datos; se registra el reporte asociado al usuario que lo genera; y el contenido CSV queda disponible mediante el endpoint de descarga. Se contemplan validaciones del tipo de reporte y de los datos de entrada. | [Pull Request #6](https://github.com/MaylonRicaldi/EcoLima/pull/6) · [Commit de implementación HU-09, HU-10 y HU-11](https://github.com/MaylonRicaldi/EcoLima/commit/732b3aae8ebe471674cd7963d8b29fa9e18aebe4) |
| **HU-11 – Plan de compensación de carbono** | El sistema calcula las emisiones que se deben compensar, utiliza el factor de captura de 22 kg de CO₂ por árbol al año, redondea hacia arriba la cantidad de árboles requerida y registra los resultados del plan. Se validan los valores ingresados para evitar cantidades no válidas o superiores a las emisiones consideradas. | [Pull Request #6](https://github.com/MaylonRicaldi/EcoLima/pull/6) · [Commit de implementación HU-09, HU-10 y HU-11](https://github.com/MaylonRicaldi/EcoLima/commit/732b3aae8ebe471674cd7963d8b29fa9e18aebe4) |

Como parte del cierre técnico, también se incorporaron ajustes de pruebas automatizadas y calidad del código. La integración de Playwright y las verificaciones de CI quedaron registradas en el [commit de cierre de pruebas y calidad](https://github.com/MaylonRicaldi/EcoLima/commit/55a8fecaa63a0def5cbdad471a7a24f838c2574b).

## Demostración del trabajo completado

La demostración del incremento se realizó sobre el entorno desplegado de EcoLima, utilizando la arquitectura publicada del proyecto: frontend en Vercel, backend en Render y base de datos PostgreSQL/PostGIS en Neon.

Durante la presentación se recorrieron las tres funcionalidades desarrolladas:

1. **Dashboard de indicadores (HU-09):** se mostró el panel con los principales indicadores de operación y sostenibilidad, incluyendo pedidos, rutas, flota, distancia recorrida, consumo y emisiones.
2. **Reportes de sostenibilidad (HU-10):** se presentó el módulo de reportes, la selección del tipo de reporte, el registro de la solicitud y la obtención del archivo CSV generado.
3. **Compensación de carbono (HU-11):** se ejecutó el cálculo de compensación, explicando el factor de 22 kg de CO₂ por árbol al año y la cantidad de árboles resultante.

La demostración permitió recorrer el flujo de consulta de indicadores, generación de reportes y cálculo ambiental sobre la versión desplegada. La retroalimentación se consideró para mejorar la claridad de los datos presentados, la comprensión de las unidades y la identificación de los resultados generados. Estas observaciones se consideran oportunidades de mejora continua y no reabren las historias completadas.

Como respaldo técnico de la entrega se cuenta con el [Pull Request #6](https://github.com/MaylonRicaldi/EcoLima/pull/6), el [commit de implementación de las tres historias](https://github.com/MaylonRicaldi/EcoLima/commit/732b3aae8ebe471674cd7963d8b29fa9e18aebe4) y el [commit de ajustes de Playwright y calidad](https://github.com/MaylonRicaldi/EcoLima/commit/55a8fecaa63a0def5cbdad471a7a24f838c2574b).

## Pendientes

No quedaron historias de usuario sin completar en el Sprint 04. HU-09, HU-10 y HU-11 forman parte del incremento terminado y se encuentran integradas en el repositorio.

Tampoco se identificó deuda técnica que impida considerar culminado el objetivo funcional del sprint. Las mejoras de presentación, ampliación de escenarios automatizados y mantenimiento de indicadores se gestionan como actividades de evolución del producto en los siguientes ciclos, sin afectar el cierre de las tres historias de usuario de este sprint.

---

**Versión del documento:** 1.0.0
