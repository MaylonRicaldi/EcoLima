Ingresa tu texto:03 Registro de Riesgos V_1.0.0

**Proyecto:** EcoLogística Lima – Optimizador de Rutas Sostenibles para "DistriRápido S.A.C."
**Curso:** Taller de Proyectos 2
**Artefacto:** 03 – Registro de Riesgos (PMBOK / CMMI)
**Versión:** 1.0.0
**Fecha:** 14/09/2026

---

## 1. Introducción

El presente documento consolida la gestión de riesgos del proyecto **EcoLogística Lima**, siguiendo los lineamientos de **PMBOK 7ª edición** (área de conocimiento de Gestión de Riesgos) y las prácticas de **CMMI** para la identificación, análisis cuantitativo y planificación de respuesta ante riesgos. Los riesgos identificados abarcan las dimensiones técnica, tecnológica, normativa, económica, social y ambiental propias del contexto de operación en Lima Metropolitana (San Juan de Lurigancho, El Agustino, Santa Anita y Ate), descritas en la consigna del proyecto.

## 2. Fórmula de Cálculo

```
Severidad (Exposición) = Probabilidad (1 a 5) × Impacto (1 a 5)
```

- **Probabilidad:** 1 (Muy baja) a 5 (Muy alta).
- **Impacto:** 1 (Insignificante) a 5 (Catastrófico).
- **Severidad:** Low (1–6), Medium (8–12), High (15–25).

## 3. Escalas de Referencia

### 3.1 Escala de Probabilidad

| Nivel | Descripción | Rango estimado de ocurrencia |
| ----- | ----------- | ---------------------------- |
| 1     | Muy baja    | < 10%                        |
| 2     | Baja        | 10% – 30%                    |
| 3     | Media       | 30% – 50%                    |
| 4     | Alta        | 50% – 70%                    |
| 5     | Muy alta    | > 70%                        |

### 3.2 Escala de Impacto

| Nivel | Descripción    | Efecto sobre el proyecto                                     |
| ----- | -------------- | ------------------------------------------------------------ |
| 1     | Insignificante | Sin efecto perceptible en costo, cronograma o alcance        |
| 2     | Menor          | Retraso o sobrecosto puntual, gestionable con recursos existentes |
| 3     | Moderado       | Afecta un hito o RF/RNF; requiere replanificación local      |
| 4     | Mayor          | Afecta múltiples iteraciones, el presupuesto o la calidad del MVP |
| 5     | Catastrófico   | Pone en riesgo la viabilidad, seguridad o cumplimiento normativo del proyecto |

### 3.3 Matriz de Calor Probabilidad × Impacto

| Probabilidad \ Impacto | 1       | 2           | 3           | 4           | 5           |
| ---------------------- | ------- | ----------- | ----------- | ----------- | ----------- |
| **5**                  | 5 (Low) | 10 (Medium) | 15 (High)   | 20 (High)   | 25 (High)   |
| **4**                  | 4 (Low) | 8 (Medium)  | 12 (Medium) | 16 (High)   | 20 (High)   |
| **3**                  | 3 (Low) | 6 (Low)     | 9 (Medium)  | 12 (Medium) | 15 (High)   |
| **2**                  | 2 (Low) | 4 (Low)     | 6 (Low)     | 8 (Medium)  | 10 (Medium) |
| **1**                  | 1 (Low) | 2 (Low)     | 3 (Low)     | 4 (Low)     | 5 (Low)     |

## 4. Matriz de Evaluación de Riesgos

| ID     | Descripción del Riesgo                                       | Categoría                      | Prob. | Imp. | Severidad  | Plan de Mitigación (Preventivo)                              | Plan de Contingencia (Reactivo)                              | Responsable        |
| ------ | ------------------------------------------------------------ | ------------------------------ | ----- | ---- | ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------ |
| RSK-01 | Indisponibilidad de servicios Cloud por límites de cuota del proveedor (AWS/Azure/GCP). | Técnica / Infraestructura      | 2     | 4    | 8 (Media)  | Monitorear consumo de cuotas e implementar alertas de umbral al 70%. | Migrar temporalmente los contenedores a una cuenta secundaria de respaldo. | DevOps Engineer    |
| RSK-02 | Curva de aprendizaje elevada del equipo en el framework de frontend (React/Vue) o en metaheurísticas. | Recursos Humanos / Capacidades | 3     | 3    | 9 (Media)  | Realizar 2 jornadas de *Pair Programming* y pases de conocimiento al inicio del Sprint. | Reasignar las tareas de mayor complejidad al arquitecto de software. | Scrum Master       |
| RSK-03 | Baja cobertura o precisión de los datos de tráfico en tiempo real (Waze CCP / Google Maps API) en zonas periféricas como San Juan de Lurigancho. | Técnica / Datos                | 4     | 4    | 16 (Alta)  | Implementar un módulo de carga manual/reportes de conductores como fuente complementaria de tráfico. | Conmutar el algoritmo a un modo de "tiempos históricos promedio" cuando la API no responda. | Backend Developer  |
| RSK-04 | El algoritmo metaheurístico (GA, Tabú o ACO) no converge a una solución válida dentro del límite de 45 s (RNF-01) para 150 pedidos y 15 vehículos. | Técnica / Algorítmica          | 3     | 5    | 15 (Alta)  | Definir criterios de parada tempranos (early stopping) y ajustar hiperparámetros mediante pruebas de carga incrementales. | Entregar la mejor solución parcial obtenida al corte de tiempo, marcada como "óptimo aproximado". | Algorithm Engineer |
| RSK-05 | Direcciones sin nomenclatura estándar en San Juan de Lurigancho generan geocodificación incorrecta de pedidos. | Calidad de Datos               | 4     | 3    | 12 (Media) | Habilitar un campo de "punto de referencia" obligatorio y validar coordenadas GPS contra un radio máximo permitido. | Permitir la corrección manual de coordenadas por el operador antes de generar la ruta. | Backend Developer  |
| RSK-06 | Incumplimiento de la Ley N° 29733 (Protección de Datos Personales) en el manejo de datos de clientes y conductores. | Normativo / Legal              | 2     | 5    | 10 (Media) | Aplicar cifrado de datos sensibles, políticas de consentimiento informado y control de accesos por rol desde el diseño. | Suspender temporalmente el módulo afectado y notificar a la Autoridad Nacional de Protección de Datos si corresponde. | Product Owner      |
| RSK-07 | Vulnerabilidades OWASP Top 10 (inyección SQL, XSS, CSRF) presentes en el MVP. | Seguridad                      | 3     | 4    | 12 (Media) | Ejecutar análisis estático (SAST) y pruebas de penetración básicas antes de cada entrega de iteración. | Aplicar parches de emergencia (hotfix) y revocar sesiones activas ante una brecha detectada. | Security Engineer  |
| RSK-08 | Sobrecostos que excedan el presupuesto de S/ 500,000 asignado al desarrollo del MVP. | Económico / Financiero         | 3     | 4    | 12 (Media) | Realizar seguimiento quincenal del *burn rate* frente al presupuesto y priorizar el backlog por valor/costo. | Reducir el alcance a los RF-01 a RF-07 mínimos indispensables (70% de RF) pactados con el cliente. | Project Manager    |
| RSK-09 | Retrasos en el cronograma de 14 semanas por dependencias entre iteraciones (ej. mapa antes de dashboard). | Cronograma / Gestión           | 3     | 3    | 9 (Media)  | Aplicar un diagrama de dependencias (ruta crítica) y colchones de tiempo (buffers) entre iteraciones. | Paralelizar tareas no dependientes reasignando recursos del equipo. | Scrum Master       |
| RSK-10 | Baja adopción por parte de los conductores debido a interfaz poco intuitiva o niveles básicos de alfabetización digital. | Usabilidad / Adopción          | 3     | 4    | 12 (Media) | Diseñar un "modo conductor" simplificado (WCAG 2.1 AA, iconos grandes, alto contraste) y validarlo con usuarios reales. | Brindar capacitación presencial y soporte telefónico dedicado durante las primeras semanas de uso. | UX Designer        |
| RSK-11 | Conectividad limitada (2G/3G) en zonas periféricas afecta el uso de la app durante el reparto. | Infraestructura / Conectividad | 4     | 3    | 12 (Media) | Implementar modo *offline-first* con sincronización diferida de datos de entrega. | Habilitar confirmación de entregas por SMS como canal alterno de respaldo. | Backend Developer  |
| RSK-12 | Parametrización incorrecta de la restricción vehicular (D.S. N° 033-2012-MTC) genera rutas inválidas o sanciones a la flota. | Normativo / Negocio            | 2     | 4    | 8 (Media)  | Validar reglas de restricción por último dígito de placa con un módulo de pruebas unitarias específico y actualización periódica de la norma vigente. | Excluir manualmente el vehículo restringido y reasignar sus pedidos a otro vehículo disponible. | Business Analyst   |
| RSK-13 | Cortes de electricidad en zonas como San Juan de Lurigancho afectan la disponibilidad del sistema en horario operativo (RNF-06). | Infraestructura                | 3     | 3    | 9 (Media)  | Alojar el backend en infraestructura cloud con redundancia geográfica y habilitar caché local en los dispositivos móviles. | Activar el modo de respaldo local (datos precargados) en los dispositivos de los conductores. | DevOps Engineer    |
| RSK-14 | El costo real de los servidores cloud (facturados en USD) supera lo presupuestado por fluctuación del tipo de cambio. | Económico                      | 2     | 3    | 6 (Baja)   | Contratar planes de cloud con tarifa fija o reservada y monitorear el tipo de cambio mensualmente. | Migrar cargas no críticas a instancias de menor costo o de tipo *spot*. | Project Manager    |
| RSK-15 | La neblina y baja visibilidad en invierno (jun.–set., 6:00–8:00 a.m.) no son consideradas por el algoritmo de ruteo, elevando el riesgo de accidentes. | Seguridad Vial / Algorítmico   | 3     | 4    | 12 (Media) | Incorporar un factor de penalización estacional en la función objetivo que priorice vías con mejor iluminación en horario de neblina. | Emitir una alerta al conductor sugiriendo una ruta alterna validada manualmente por el despachador. | Algorithm Engineer |
| RSK-16 | Exposición o fuga de credenciales de APIs de terceros (Google Maps / Waze) en el repositorio público de GitHub. | Seguridad                      | 2     | 5    | 10 (Media) | Gestionar credenciales mediante variables de entorno y `.gitignore`, con escaneo automático de secretos en cada *push*. | Revocar y regenerar de inmediato la credencial expuesta, y auditar el uso indebido registrado. | DevOps Engineer    |

## 5. Resumen de Exposición al Riesgo

| Nivel de Severidad | N.º de Riesgos | Riesgos                                                      |
| ------------------ | -------------- | ------------------------------------------------------------ |
| **Alta (15–25)**   | 2              | RSK-03, RSK-04                                               |
| **Media (8–12)**   | 13             | RSK-01, RSK-02, RSK-05, RSK-06, RSK-07, RSK-08, RSK-09, RSK-10, RSK-11, RSK-12, RSK-13, RSK-15, RSK-16 |
| **Baja (1–6)**     | 1              | RSK-14                                                       |

**Total de riesgos registrados:** 16

Los riesgos de severidad **Alta** (RSK-03 y RSK-04) están directamente ligados al núcleo funcional del proyecto —calidad de datos de tráfico y desempeño del algoritmo de optimización (RF-03/RNF-01)— por lo que requieren revisión semanal por parte del equipo técnico durante las Iteraciones 2 y 3, mientras que los riesgos de severidad Media se revisarán en cada cierre de iteración (cada 3–4 semanas) según el cronograma del proyecto.

## 6. Control de Versiones

| Versión | Fecha      | Descripción                                                  | Autor                    |
| ------- | ---------- | ------------------------------------------------------------ | ------------------------ |
| V_1.0.0 | 14/09/2026 | Versión inicial del Registro de Riesgos con matriz cuantitativa (P × I) y planes de mitigación/contingencia. | Equipo EcoLogística Lima |