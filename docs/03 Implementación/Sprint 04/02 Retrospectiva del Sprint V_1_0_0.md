[← Volver al README principal](../../../README.md)

# Retrospectiva del sprint

**Nombre del Proyecto:** EcoLogística Lima (EcoLima)

**Líder del Proyecto:** Scrum Master del equipo EcoLima. El nombre y apellidos del responsable no están consignados en los archivos del repositorio consultados; debe mantenerse el nombre registrado en Jira.

**Sprint:** 4  
**Fecha de elaboración:** 19 de noviembre de 2026  
**Versión:** 1.0.0

## ¿Qué aprendimos?

- En primer lugar, aprendimos que los indicadores del Dashboard deben obtenerse de consultas consistentes del backend y no de valores independientes en la interfaz. También es necesario distinguir entre un valor igual a cero y la ausencia de datos para no presentar información que pueda interpretarse de manera incorrecta.
- En segundo lugar, comprobamos que un reporte no está completo únicamente cuando se registra su información. También debe generarse su contenido, persistirse y estar disponible para descarga. En EcoLima, el servicio de reportes prepara archivos CSV y el endpoint de descarga recupera el contenido almacenado.
- Para la compensación de carbono, se debe mantener una regla de cálculo uniforme. El proyecto utiliza 22 kg de CO₂ por árbol al año y aplica redondeo hacia arriba para no subestimar la cantidad de árboles requeridos.
- La integración del código mediante un Pull Request facilita revisar los cambios, pero no reemplaza las pruebas de aceptación en el entorno desplegado ni la actualización del estado de las historias en Jira.
- Las modificaciones de estructura en PostgreSQL deben coordinarse con el backend. Una funcionalidad puede estar implementada en el código y, aun así, fallar si la migración requerida no se ha aplicado en la base de datos del ambiente correspondiente.

## ¿Qué estamos haciendo bien?

- Se conserva la separación de responsabilidades entre frontend, backend y base de datos, lo que permite ubicar y revisar los cambios de cada módulo.
- Se utiliza GitHub mediante ramas y Pull Requests para integrar los cambios del Sprint 4 y conservar su trazabilidad.
- Las operaciones del backend aplican autenticación y permisos por recurso, en lugar de depender únicamente de controles visuales en la interfaz.
- Se incorporaron validaciones para los tipos de reportes y para los valores de compensación de carbono.
- Se agregaron pruebas unitarias para el cálculo de árboles y para el escape de caracteres especiales en el contenido CSV.
- La documentación técnica identifica qué aspectos están implementados y cuáles todavía requieren validación, evitando presentar como evidencia una prueba que no se ha ejecutado.

## ¿Qué podemos hacer mejor?

### Personas

- Distribuir la validación de HU-09, HU-10 y HU-11 entre responsables de frontend, backend y pruebas, de modo que la revisión no dependa de una sola persona.
- Asegurar que cada responsable conozca los criterios de aceptación de la historia que valida y sepa qué evidencia debe guardar.
- Reforzar el conocimiento del equipo sobre migraciones de PostgreSQL, permisos de API y pruebas funcionales del flujo completo.

### Relaciones

- Mejorar la coordinación entre frontend y backend antes de integrar cambios que modifiquen la estructura o el formato de las respuestas de la API.
- Confirmar con los stakeholders qué indicadores necesitan consultar y qué información esperan encontrar en los reportes.
- Compartir los resultados de las pruebas con el equipo antes de cambiar una historia a estado terminado en Jira.

### Procesos

- Relacionar cada criterio de aceptación de Jira con una prueba y una evidencia concreta.
- Revisar los cambios mediante Pull Request antes de integrarlos a `main`, incluyendo la verificación de migraciones asociadas.
- Incorporar en la revisión del sprint una comprobación del entorno desplegado y no limitar la aceptación a que el código compile o se encuentre fusionado.
- Registrar los defectos y la deuda técnica en Jira, asignando prioridad y responsable para evitar que queden únicamente como observaciones documentales.

### Herramientas

- Utilizar Jira como fuente de seguimiento del estado, responsable, fechas y aceptación de cada historia.
- Mantener GitHub como repositorio de código y trazabilidad de Pull Requests, commits y ejecuciones de integración.
- Utilizar Vercel, Render y Neon como los entornos del despliegue actual; las pruebas de cambios de esquema deben realizarse primero en la base de datos de pruebas.
- Conservar los reportes de pruebas automatizadas y las evidencias de ejecución como artefactos consultables del equipo.
- Evitar registrar credenciales o variables sensibles en los archivos versionados; utilizar la configuración segura de cada plataforma.

### Acciones a realizar

| Acción concreta | Responsable | Fecha objetivo | Métrica de seguimiento | Evidencia de cumplimiento |
|---|---|---|---|---|
| Ejecutar y documentar la validación funcional de HU-09, incluyendo contraste de indicadores y permisos. | Responsable de frontend y responsable de QA | Antes del cierre del siguiente sprint | 100 % de criterios de aceptación de HU-09 comprobados. | Capturas del Dashboard y registro de resultados de prueba. |
| Aplicar la migración de reportes primero en Neon de pruebas y comprobar la generación, persistencia y descarga del CSV. | Responsable de backend | Antes del cierre del siguiente sprint | 4 tipos de reporte comprobados y descarga satisfactoria de cada tipo probado. | Registro de migración, archivos CSV de prueba y capturas del módulo. |
| Verificar el cálculo de compensación en backend, frontend y base de datos. | Responsable de backend y responsable de QA | Antes del cierre del siguiente sprint | 6 valores de prueba (22, 44, 50, 100, 220 y 500 kg) con resultados esperados. | Resultados de pruebas y captura del módulo de compensación. |
| Completar el registro de aceptación y trazabilidad de las HU del Sprint 4 en Jira. | Scrum Master | Antes de cerrar el siguiente sprint | 100 % de las HU con estado actualizado, responsable, criterios y enlaces de evidencia. | Enlaces a las historias de Jira y al PR #6. |
| Realizar la demostración del incremento y registrar la retroalimentación de stakeholders. | Scrum Master y equipo de desarrollo | En la siguiente sesión de revisión acordada en Jira | Una sesión documentada con fecha, participantes, observaciones y acuerdos. | Acta y capturas o video de la demostración. |
| Revisar las migraciones y los cambios de API antes de integrar futuras funcionalidades. | Responsable técnico y revisores del Pull Request | En cada Pull Request que modifique backend o base de datos | 100 % de esos Pull Requests con revisión de impacto y pruebas correspondientes. | Lista de verificación en la revisión del Pull Request. |

