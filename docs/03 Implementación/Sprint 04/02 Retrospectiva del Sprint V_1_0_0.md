# Retrospectiva del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Diego Marlon Quispe Povis

## ¿Qué aprendimos?

- En primer lugar, aprendimos que un dashboard debe presentar información obtenida de fuentes consistentes del backend y de la base de datos. También comprendimos la importancia de mostrar las unidades y el significado de cada indicador para facilitar su interpretación.
- En segundo lugar, comprobamos que un reporte de sostenibilidad no se limita a registrar una solicitud: debe reunir información de las rutas, generar un contenido útil y permitir que el usuario obtenga el archivo correspondiente.
- En la funcionalidad de compensación de carbono reforzamos la importancia de mantener una regla de cálculo uniforme. EcoLima utiliza el factor de 22 kg de CO₂ por árbol al año y redondea hacia arriba la cantidad de árboles para evitar subestimar la compensación requerida.
- Aprendimos que la integración continua y las pruebas automatizadas ayudan a detectar errores antes de incorporar cambios a la rama principal.
- También identificamos que la coordinación entre frontend, backend y base de datos es importante para mantener consistentes los formatos de respuesta, las validaciones y la información que se muestra al usuario.

## ¿Qué estamos haciendo bien?

- Se mantuvo la organización del proyecto separando frontend, backend y base de datos.
- Se utilizó GitHub para controlar versiones, revisar cambios e integrar el incremento del Sprint 04 mediante un Pull Request.
- Las funcionalidades desarrolladas cuentan con validaciones en el backend y controles de acceso según los permisos definidos.
- El dashboard presenta estados de carga y error, lo que permite informar al usuario cuando los servicios no responden como se espera.
- Los reportes y los cálculos ambientales se gestionan desde servicios del backend, evitando concentrar la lógica de negocio en los componentes de interfaz.
- Se incorporaron pruebas automatizadas y verificaciones de calidad para fortalecer la estabilidad del sistema.
- Las tres historias de usuario del sprint se completaron y se integraron al repositorio, manteniendo trazabilidad mediante el PR #6 y los commits asociados.

## ¿Qué podemos hacer mejor?

### Personas

- Fortalecer el conocimiento compartido sobre las reglas de negocio de indicadores, reportes y compensación de carbono, para que más de un integrante pueda revisar cada funcionalidad.
- Distribuir las revisiones técnicas y funcionales entre los integrantes del equipo, evitando concentrar la validación en una sola persona.
- Mantener una actualización constante sobre el avance de las tareas y comunicar oportunamente los cambios que puedan afectar a otros módulos.

### Relaciones

- Mejorar la coordinación entre frontend y backend antes de realizar cambios en los endpoints o en la estructura de las respuestas.
- Mantener una comunicación directa con los usuarios y stakeholders para conocer si los indicadores, reportes y resultados ambientales se presentan de forma comprensible.
- Compartir los resultados de las pruebas y las decisiones técnicas con todo el equipo para mantener un criterio común sobre el funcionamiento del sistema.

### Procesos

- Mantener la relación entre cada historia de usuario, sus criterios de aceptación, los casos de prueba y las evidencias correspondientes.
- Continuar utilizando Pull Requests para revisar los cambios antes de integrarlos a la rama principal.
- Incorporar en las revisiones de código una comprobación del impacto que los cambios puedan tener en frontend, backend y base de datos.
- Conservar la documentación de cada sprint actualizada y coherente con el estado real del producto y con los cambios que se integran al repositorio.

### Herramientas

- Continuar utilizando Jira para organizar el backlog, asignar responsables y realizar el seguimiento de las historias de usuario.
- Mantener GitHub como herramienta principal para el control de versiones, revisión de código y trazabilidad de los cambios.
- Aprovechar Playwright para ampliar las pruebas de los flujos principales del sistema y conservar sus reportes de ejecución.
- Mantener los despliegues de frontend, backend y base de datos mediante Vercel, Render y Neon, respectivamente.
- Conservar los resultados de CI y los análisis de calidad como evidencia técnica de las versiones integradas.
- Gestionar las variables sensibles desde la configuración de cada entorno y evitar incorporarlas al repositorio.

### Acciones a realizar

Las siguientes acciones corresponden a mejora continua y mantenimiento evolutivo del producto. No representan historias inconclusas ni modifican el cierre del Sprint 04.

| Acción de mejora | Responsable | Seguimiento / métrica | Resultado esperado |
|---|---|---|---|
| Ampliar los escenarios automatizados de los módulos de Dashboard, reportes y compensación. | Equipo de QA y desarrollo | Porcentaje de casos E2E aprobados en cada ejecución. | Mayor cobertura de los flujos principales y detección temprana de regresiones. |
| Revisar periódicamente la consistencia de los indicadores mostrados en el Dashboard. | Responsable de backend y responsable de frontend | Comparación de los valores de la API con los datos almacenados. | Indicadores consistentes y correctamente presentados. |
| Mantener la generación y descarga de reportes CSV con sus validaciones correspondientes. | Equipo de desarrollo | Pruebas satisfactorias de generación, contenido y descarga. | Reportes accesibles y con información coherente. |
| Revisar la regla de cálculo de compensación cuando se modifiquen los parámetros ambientales del proyecto. | Responsable de backend | Pruebas unitarias de los valores de referencia y del redondeo. | Resultados reproducibles y coherentes con el factor ambiental definido. |
| Mantener actualizados los criterios de aceptación y las evidencias de las historias en Jira. | Scrum Master y equipo | Historias con criterios, enlaces y evidencias actualizados. | Trazabilidad entre planificación, desarrollo y entregables. |
| Revisar los resultados de integración continua y análisis de calidad en cada integración. | Responsable de integración y equipo de desarrollo | Ejecuciones exitosas de los workflows y registro de correcciones. | Integraciones estables y reducción de errores introducidos por cambios. |

---

**Versión del documento:** 1.0.0
