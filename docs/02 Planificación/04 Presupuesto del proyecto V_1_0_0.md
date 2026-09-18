← Volver al README Principal
# 04 Presupuesto del Proyecto — PMV "EcoLogística Lima"

**Proyecto:** Ecologistica Lima – Optimizador de Rutas Sostenibles para DistriRápido SAC 

---

## 1. Costo de Recursos Humanos (CAPEX)

Cálculo: **Costo = Horas Asignadas × Tarifa Hora (USD)**

| Rol | Horas Asignadas | Tarifa Hora (USD) | Costo Total (USD) |
|---|---|---|---|
| Project Manager / Scrum Master | 96 h | $ 25.00 | $ 2,400.00 |
| Software Architect | 120 h | $ 30.00 | $ 3,600.00 |
| Senior Developer (Backend) | 144 h | $ 22.00 | $ 3,168.00 |
| Junior Developer (Frontend) | 144 h | $ 15.00 | $ 2,160.00 |
| QA Engineer | 96 h | $ 18.00 | $ 1,728.00 |
| UI/UX Designer | 60 h | $ 17.00 | $ 1,020.00 |
| **Subtotal CAPEX** | **660 h** | — | **$ 14,076.00** |

---

## 2. Costo de Licenciamiento y Herramientas

| Herramienta | Plan / Detalle | Costo (USD) |
|---|---|---|
| Atlassian Jira Software | Plan Free (hasta 10 usuarios) | $ 0.00 |
| Figma | Plan Profesional, 1 asiento x 3 meses | $ 36.00 |
| SonarQube Cloud | Plan equipo pequeño x 3 meses | $ 30.00 |
| IDE (JetBrains / VS Code) | Licencia estudiantil / Open Source | $ 0.00 |
| **Subtotal Licenciamiento** | | **$ 66.00** |

---

## 3. Costo de Infraestructura Cloud y Servicios (OPEX)

| Servicio | Detalle | Costo (USD) |
|---|---|---|
| Cómputo (AWS EC2 t3.micro) | 3 meses | $ 45.00 |
| Base de Datos Gestionada (RDS db.t3.micro) | 3 meses | $ 35.00 |
| Dominio (.com) | 1 año | $ 15.00 |
| Certificado SSL | Let's Encrypt (gratuito) | $ 0.00 |
| CI/CD (GitHub Actions) | Plan gratuito | $ 0.00 |
| **Subtotal OPEX** | | **$ 95.00** |

---

## 4. Reserva de Contingencia (Imprevistos)

Se aplica un **12%** sobre el subtotal del proyecto, en línea con los riesgos identificados en el Registro de Riesgos (RSK-01, RSK-02).

---

## 5. Tabla Resumen Financiera

| Categoría | Costo Subtotal (USD) | Porcentaje del Total |
|---|---|---|
| 1. Recursos Humanos (CAPEX) | $ 14,076.00 | 98.87% |
| 2. Licenciamiento de Software | $ 66.00 | 0.46% |
| 3. Infraestructura Cloud (OPEX) | $ 95.00 | 0.67% |
| **SUBTOTAL DE PROYECTO** | **$ 14,237.00** | **100.0%** |
| 4. Reserva de Contingencia (12%) | $ 1,708.44 | N/A |
| **PRESUPUESTO TOTAL ESTIMADO** | **$ 15,945.44** | **100.0%** |

---

## 6. Justificación del Presupuesto

El presupuesto estimado considera los recursos necesarios para desarrollar el PMV de EcoLogística Lima durante un periodo de 12 semanas. El mayor porcentaje corresponde a los recursos humanos, debido a que el desarrollo de la plataforma requiere actividades de gestión, arquitectura, programación backend y frontend, pruebas de calidad y diseño de interfaz.

Los costos de licenciamiento e infraestructura corresponden a las herramientas y servicios necesarios para gestionar el proyecto, desarrollar la solución, realizar pruebas y mantener los servicios disponibles durante el periodo estimado. Finalmente, se considera una reserva de contingencia del 12% para cubrir posibles imprevistos relacionados con los riesgos identificados en el proyecto.

---

## 7. Supuestos del Presupuesto

- La duración estimada del proyecto es de 12 semanas.
- Los costos están expresados en dólares estadounidenses (USD).
- Las horas corresponden al esfuerzo estimado de cada rol durante el desarrollo del PMV.
- Las herramientas con planes gratuitos tienen un costo estimado de $0.00.
- La infraestructura Cloud se ha estimado para el periodo inicial de implementación.
- La reserva de contingencia corresponde al 12% del subtotal del proyecto.

---

**Versión del documento:** 1.0.0

