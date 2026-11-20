[← Volver al README principal](../../../README.md)

# 02. Retrospectiva del Sprint 4

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.0.0  
**Fecha de corte documental:** 19 de noviembre de 2026

---

## 1. Objetivo

Analizar el trabajo relacionado con HU-09 Dashboard de indicadores, HU-10 Reportes de sostenibilidad y HU-11 Plan de compensación de carbono. Esta retrospectiva se presenta como un análisis de trabajo basado en el código y la documentación revisados; no se atribuyen acuerdos a una reunión que todavía no cuenta con acta o evidencia.

## 2. ¿Qué aprendimos?

- Un dashboard debe mostrar información que provenga de consultas consistentes y no de valores escritos manualmente en la interfaz.
- Los reportes requieren distinguir entre registrar sus metadatos y producir un archivo que el usuario pueda recuperar.
- Los cálculos ambientales deben documentar el factor utilizado. EcoLima contempla 22 kg de CO₂ capturados por árbol al año para la equivalencia definida en el proyecto.
- La existencia de endpoints y componentes no sustituye las pruebas de aceptación ni las pruebas E2E.
- La evaluación de usabilidad necesita respuestas reales de participantes; no es correcto estimar un puntaje SUS sin aplicar el cuestionario.

## 3. ¿Qué estamos haciendo bien?

- Se mantiene la separación entre frontend, backend y base de datos.
- El backend centraliza las consultas y operaciones de indicadores, sostenibilidad y reportes.
- Los endpoints revisados aplican autenticación y permisos por recurso.
- El dashboard contempla estados de carga, error y reintento.
- Las operaciones de escritura de compensación y registro de reportes utilizan transacciones para confirmar o revertir los cambios ante errores.
- La documentación diferencia las funciones implementadas de las validaciones que todavía necesitan evidencia.

## 4. ¿Qué podemos hacer mejor?

### 4.1. Personas

- Distribuir las pruebas de cada historia entre integrantes, evitando que una sola persona concentre la revisión funcional.
- Asegurar que quienes validen el cálculo ambiental comprendan el factor de captura y la unidad kg CO₂/árbol/año.
- Designar evaluadores que representen a los perfiles que utilizarán el dashboard y los reportes.

### 4.2. Relaciones

- Coordinar frontend y backend para que los nombres, formatos y estados de las respuestas sean consistentes.
- Revisar con los stakeholders qué información debe incluir cada reporte y cómo esperan descargarlo.
- Compartir los resultados de las pruebas antes de marcar una historia como terminada.

### 4.3. Procesos

- Vincular cada criterio de aceptación con un caso de prueba y una evidencia.
- Incluir pruebas de permisos, errores de validación, ausencia de datos y consistencia de agregados.
- No cerrar HU-10 sin comprobar la existencia y recuperación del archivo que se presenta al usuario.
- Incorporar las pruebas E2E y la evaluación SUS en la Definition of Done.

### 4.4. Herramientas

- Incorporar Playwright como herramienta E2E, ya que no se encontró dependencia ni configuración Playwright en los archivos package.json revisados.
- Mantener los resultados de pruebas y reportes como artefactos de GitHub Actions.
- Usar Jira para relacionar HU, tareas, pruebas y evidencias.
- Mantener variables sensibles fuera del repositorio y utilizar GitHub Secrets para los workflows.

### 4.5. Acciones a realizar

| Acción | Responsable funcional | Indicador de seguimiento | Evidencia esperada |
|---|---|---|---|
| Preparar y ejecutar pruebas E2E de HU-09, HU-10 y HU-11 | Equipo de desarrollo | Casos ejecutados y tasa de aprobación | Reporte HTML de Playwright |
| Verificar generación y recuperación del archivo de reporte | Desarrollo backend y frontend | Reporte generado y archivo recuperable | Captura y prueba automatizada |
| Contrastar los indicadores con la base de datos | Equipo de pruebas | Diferencias detectadas entre API y consulta SQL | Matriz de resultados |
| Aplicar cuestionario SUS | Responsable de evaluación | Participantes con cuestionario completo | Respuestas originales y cálculo |
| Revisar workflows y secretos | Responsable de integración | Ejecuciones exitosas por workflow | Enlaces a GitHub Actions |
| Actualizar Jira y documentación | Equipo Scrum | Historias con estado y evidencias coherentes | Tickets y enlaces del repositorio |

## 5. Compromisos para el cierre

1. No declarar terminada una HU sin pruebas y evidencia.
2. Completar la suite Playwright y conservar los reportes de ejecución.
3. Verificar el comportamiento de los reportes, incluida la recuperación del archivo.
4. Calcular el puntaje SUS únicamente con encuestas respondidas.
5. Revisar los resultados de CI/CD y documentar los fallos corregidos.
6. Mantener actualizados los enlaces entre README, documentos y tickets de Jira.

---

**Versión del documento:** 1.0.0
