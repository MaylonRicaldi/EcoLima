# 02. Retrospectiva del Sprint 3

**Proyecto:** EcoLogística Lima – EcoLima
**Sprint:** Sprint 3
**Versión:** 1.0.0

## 1. Objetivo

Identificar los aprendizajes y aciertos del Sprint 3 y proponer acciones concretas de mejora en las cuatro dimensiones de la retrospectiva: **Personas, Relaciones, Procesos y Herramientas**.

---

## 2. Resumen del sprint

Durante el Sprint 3 se trabajaron las historias de usuario del MVP 2.0.0:

| Código | Historia de usuario |
|--------|---------------------|
| HU-06 | Generación de rutas optimizadas |
| HU-07 | Visualización de rutas en el mapa |
| HU-08 | Reoptimización dinámica de rutas |

Además, se hicieron actividades de calidad de código (SonarQube), seguridad (OWASP Top 10:2025) y accesibilidad (WCAG 2.1/2.2 AA), cada una con su informe.

---

## 3. Retrospectiva por dimensión

### 3.1 Personas

**Qué salió bien**
- El equipo trabajó las tres historias de usuario del sprint y llegó a la revisión con evidencias.
- Se asumieron tareas de calidad, seguridad y accesibilidad además del desarrollo, lo que muestra compromiso con el producto.

**Qué aprendimos**
- Cada integrante tiene fortalezas distintas (desarrollo, pruebas, documentación). Cuando una sola persona carga con una parte, se retrasa todo lo demás.
- Revisar seguridad y accesibilidad requiere conocimiento que no todos tenían al inicio.

**Acciones concretas**
| Acción | Responsable | Plazo |
|--------|-------------|-------|
| Repartir las tareas por afinidad y rotar quién documenta cada sprint | Todo el equipo | Planificación del Sprint 4 |
| Hacer una mini sesión interna (20 min) sobre OWASP y WCAG para que todos sepan qué revisar | Quien lideró esas pruebas | Primera semana del Sprint 4 |

---

### 3.2 Relaciones

**Qué salió bien**
- La revisión del sprint permitió mostrar las funcionalidades al equipo y a los interesados.
- Los informes (calidad, seguridad, accesibilidad) quedaron ligados entre sí y a la revisión del sprint.

**Qué aprendimos**
- Los documentos se escribieron por separado y quedaron con datos que no coinciden (por ejemplo, los *Security Hotspots* aparecen como 0 en un informe y como 2 en otro). Faltó que alguien revisara el conjunto.
- Los interesados necesitan saber con claridad qué quedó terminado y qué queda pendiente.

**Acciones concretas**
| Acción | Responsable | Plazo |
|--------|-------------|-------|
| Hacer una revisión cruzada: una persona distinta al autor lee cada documento antes de entregarlo | Todo el equipo | Antes del cierre de cada sprint |
| En la revisión del sprint, indicar por cada historia de usuario si está terminada, aceptada o pendiente | Scrum Master / Product Owner | Revisión del Sprint 4 |
| Mantener un canal fijo de comunicación para dudas y avisos rápidos | Todo el equipo | Inmediato |

---

### 3.3 Procesos

**Qué salió bien**
- Se siguió Scrum: planificación, desarrollo, revisión y retrospectiva.
- SonarQube mantuvo el *Quality Gate* en **Aprobado**.
- La revisión de las 10 categorías de OWASP Top 10:2025 quedó documentada.
- En accesibilidad se obtuvo Lighthouse 100/100, axe DevTools con 0 incidencias y WAVE con AIM Score 9.8/10, y se corrigieron las 8 alertas de WAVE.

**Qué aprendimos**
- El análisis inicial de SonarQube mostró **49 incidencias de fiabilidad (D)**, **0 % de cobertura** y 1 incidencia de seguridad (B). El *Quality Gate* aprobado no significa que no haya nada que mejorar.
- Las pruebas de accesibilidad se hicieron en pantallas distintas y no se volvió a escanear después de corregir.
- Dejar la calidad y la seguridad para el final del sprint acumula incidencias.

**Acciones concretas**
| Acción | Responsable | Plazo |
|--------|-------------|-------|
| Incluir en la Definición de Hecho (DoD): código sin incidencias nuevas en SonarQube, revisión de accesibilidad y documento revisado | Todo el equipo | Planificación del Sprint 4 |
| Subir la cobertura de pruebas (empezar con pruebas de las funciones de rutas) y agregar el informe de cobertura a SonarQube | Equipo de desarrollo | Sprint 4 |
| Volver a escanear con WAVE/axe después de cada corrección y guardar la captura como evidencia | Quien haga las pruebas de accesibilidad | Cada sprint |
| Analizar con SonarQube a mitad del sprint, no solo al final | Equipo de desarrollo | Mitad del Sprint 4 |
| Registrar regla, archivo y línea de cada hallazgo de seguridad | Quien haga la revisión de seguridad | Sprint 4 |

---

### 3.4 Herramientas

**Qué salió bien**
- **SonarQube Community Build** permitió medir líneas de código (21 000), fiabilidad, mantenibilidad, seguridad y duplicación (0,5 %).
- **Lighthouse, axe DevTools y WAVE** se complementaron para revisar accesibilidad.
- El mapa del sistema permitió mostrar las rutas generadas (HU-07).

**Qué aprendimos**
- Las herramientas automáticas solo detectan una parte de los problemas. La navegación con teclado se probó a mano, pero falta probar con lector de pantalla.
- Los nombres de los indicadores de SonarQube se tradujeron mal en los informes (por ejemplo, *Security Hotspots* como "puntos de acceso seguros" y *Code Smells* como "código olores").

**Acciones concretas**
| Acción | Responsable | Plazo |
|--------|-------------|-------|
| Probar con un lector de pantalla (por ejemplo NVDA) las pantallas principales | Quien haga las pruebas de accesibilidad | Sprint 4 |
| Usar un glosario único de términos (*Security Hotspots*, *Code Smells*, *Quality Gate*) en todos los informes | Quien documente | Sprint 4 |
| Guardar las capturas y resultados de cada herramienta en una carpeta de evidencias del repositorio | Todo el equipo | Inmediato |

---

## 4. Resumen de la retrospectiva

| Dimensión | Aciertos | Aprendizajes | Acción principal |
|-----------|----------|--------------|------------------|
| **Personas** | Se cumplieron las tres HU | Repartir mejor las tareas y capacitar en seguridad y accesibilidad | Rotar tareas y hacer mini sesión sobre OWASP/WCAG |
| **Relaciones** | Revisión con interesados | Los documentos no coincidían entre sí | Revisión cruzada antes de entregar |
| **Procesos** | *Quality Gate* aprobado, OWASP revisado | Hay 49 incidencias de fiabilidad y 0 % de cobertura | Actualizar la DoD y subir la cobertura |
| **Herramientas** | SonarQube, Lighthouse, axe y WAVE | Falta lector de pantalla y glosario único | Probar con NVDA y unificar términos |

---

## 5. Compromisos para el Sprint 4

1. Añadir calidad, seguridad y accesibilidad a la Definición de Hecho.
2. Hacer revisión cruzada de todos los documentos antes de entregarlos.
3. Subir la cobertura de pruebas y registrarla en SonarQube.
4. Probar con lector de pantalla y guardar las evidencias.

---

**Versión del documento:** 1.0.0
