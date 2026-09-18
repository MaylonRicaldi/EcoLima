[← Volver al README Principal](../../README.md)

# 01. Transformando a Ágil

## 1. Introducción

El presente documento describe la transformación de la línea base de requisitos del proyecto EcoLima hacia una estructura de trabajo ágil utilizando Scrum.

La transformación establece una relación entre los requerimientos funcionales, los requerimientos no funcionales, las épicas, las historias de usuario y las historias técnicas (Enablers). Esta estructura permite organizar el trabajo del producto y posteriormente gestionarlo mediante Jira Software.

## 2. Metodología de Transformación

### 2.1 Requerimientos Funcionales

Los requerimientos funcionales de EcoLima se transforman en Épicas, que representan grandes módulos funcionales del sistema.

Posteriormente, cada épica se descompone en Historias de Usuario, las cuales representan funcionalidades concretas que generan valor para los usuarios del sistema.

La relación establecida es:

**Requerimiento Funcional → Épica → Historia de Usuario**

### 2.2 Requerimientos No Funcionales

Los requerimientos no funcionales relacionados con seguridad, rendimiento, arquitectura, calidad y despliegue se transforman en Historias Técnicas o Enablers.

Estos elementos permiten preparar y mantener la infraestructura técnica necesaria para que las historias funcionales puedan desarrollarse y operar adecuadamente.

La relación establecida es:

**Requerimiento No Funcional → Enabler / Historia Técnica**

Algunos requerimientos no funcionales también se consideran transversalmente como criterios de aceptación y parte de la Definition of Done del proyecto.

## 3. Estructura de Épicas

A partir de los requerimientos funcionales del sistema EcoLima se establecieron las siguientes épicas:

| ID | Épica | Descripción |
| --- | --- | --- |
| EP-01 | Gestión de acceso y usuarios | Gestiona el acceso de los usuarios al sistema y el control de sus sesiones. |
| EP-02 | Gestión de flota y conductores | Permite administrar la información de vehículos y conductores de la operación logística. |
| EP-03 | Gestión de pedidos | Permite registrar y gestionar los pedidos que serán considerados en la planificación logística. |
| EP-04 | Optimización y planificación de rutas | Permite generar rutas optimizadas considerando los pedidos registrados. |
| EP-05 | Visualización y seguimiento de rutas | Permite visualizar las rutas generadas mediante un mapa interactivo. |

## 4. Historias de Usuario

### US-001 – Login con bloqueo y expiración de sesión

**ID:** US-001  
**Jira:** HU-01  
**Título:** Login con bloqueo y expiración de sesión  
**Épica Relacionada:** EP-01 Gestión de acceso y usuarios

**Redacción:**

Como usuario del sistema,

quiero iniciar sesión mediante mis credenciales y contar con mecanismos de bloqueo y expiración de sesión,

para acceder al sistema de forma segura y evitar accesos no autorizados.

#### Criterios de Aceptación

**Escenario 1: Inicio de sesión exitoso**

**Dado** que el usuario tiene credenciales válidas,

**Cuando** ingresa correctamente su usuario y contraseña,

**Entonces** el sistema debe permitirle ingresar al sistema.

**Escenario 2: Bloqueo por intentos incorrectos**

**Dado** que el usuario ingresa credenciales incorrectas de manera consecutiva,

**Cuando** alcanza el límite de intentos establecido,

**Entonces** el sistema debe bloquear temporalmente el acceso de la cuenta.

### US-002 – Registrar vehículo de flota

**ID:** US-002  
**Jira:** HU-02  
**Título:** Registrar vehículo de flota  
**Épica Relacionada:** EP-02 Gestión de flota y conductores

**Redacción:**

Como responsable de la gestión de flota,

quiero registrar los vehículos utilizados en la operación logística,

para mantener actualizada la información de la flota disponible.

#### Criterios de Aceptación

**Escenario 1: Registro de vehículo válido**

**Dado** que el responsable se encuentra en el módulo de gestión de flota,

**Cuando** ingresa correctamente los datos requeridos del vehículo,

**Entonces** el sistema debe registrar el vehículo y mostrarlo en la lista de flota.

**Escenario 2: Validación de datos obligatorios**

**Dado** que el responsable intenta registrar un vehículo,

**Cuando** omite uno o más datos obligatorios,

**Entonces** el sistema debe mostrar un mensaje indicando los campos que deben ser completados.

### US-003 – Registrar conductor con validación legal

**ID:** US-003  
**Jira:** HU-04  
**Título:** Registrar conductor con validación legal  
**Épica Relacionada:** EP-02 Gestión de flota y conductores

**Redacción:**

Como responsable de la gestión de conductores,

quiero registrar conductores validando la información legal requerida,

para asegurar que los conductores registrados cuenten con la información necesaria para realizar la operación logística.

#### Criterios de Aceptación

**Escenario 1: Registro de conductor válido**

**Dado** que el responsable se encuentra en el módulo de conductores,

**Cuando** ingresa los datos requeridos y estos cumplen las validaciones establecidas,

**Entonces** el sistema debe registrar al conductor correctamente.

**Escenario 2: Datos legales no válidos**

**Dado** que el responsable intenta registrar un conductor,

**Cuando** la información legal requerida no cumple las validaciones establecidas,

**Entonces** el sistema debe impedir el registro y mostrar el motivo del rechazo.

### US-004 – Registrar pedido con referencia y GPS

**ID:** US-004  
**Jira:** HU-05  
**Título:** Registrar pedido con referencia y GPS  
**Épica Relacionada:** EP-03 Gestión de pedidos

**Redacción:**

Como usuario responsable de gestionar pedidos,

quiero registrar un pedido con su referencia y ubicación GPS,

para disponer de la información necesaria para su posterior planificación y generación de rutas.

#### Criterios de Aceptación

**Escenario 1: Registro de pedido válido**

**Dado** que el usuario se encuentra en el módulo de pedidos,

**Cuando** registra la información requerida junto con la referencia y ubicación GPS,

**Entonces** el sistema debe guardar correctamente el pedido.

**Escenario 2: Ubicación GPS no válida**

**Dado** que el usuario intenta registrar un pedido,

**Cuando** la ubicación GPS ingresada no cumple el formato o validación establecida,

**Entonces** el sistema debe solicitar una ubicación válida y no completar el registro.

### US-005 – Generar rutas optimizadas

**ID:** US-005  
**Jira:** HU-07  
**Título:** Generar rutas optimizadas  
**Épica Relacionada:** EP-04 Optimización y planificación de rutas

**Redacción:**

Como responsable de la planificación logística,

quiero generar rutas optimizadas utilizando los pedidos registrados,

para organizar de manera eficiente el recorrido de los vehículos.

#### Criterios de Aceptación

**Escenario 1: Generación de una ruta**

**Dado** que existen pedidos registrados con ubicaciones válidas,

**Cuando** el responsable solicita generar una ruta,

**Entonces** el sistema debe procesar la información y generar una ruta para los pedidos seleccionados.

**Escenario 2: Sin pedidos disponibles**

**Dado** que no existen pedidos disponibles para planificar,

**Cuando** el responsable solicita generar una ruta,

**Entonces** el sistema debe informar que no existen pedidos disponibles para realizar la planificación.

### US-006 – Visualización de rutas en mapa interactivo

**ID:** US-006  
**Jira:** HU-09  
**Título:** Visualización de rutas en mapa interactivo  
**Épica Relacionada:** EP-05 Visualización y seguimiento de rutas

**Redacción:**

Como usuario responsable de la operación logística,

quiero visualizar las rutas generadas en un mapa interactivo,

para consultar gráficamente los recorridos planificados.

#### Criterios de Aceptación

**Escenario 1: Visualización de una ruta**

**Dado** que existe una ruta generada,

**Cuando** el usuario accede a la visualización de rutas,

**Entonces** el sistema debe mostrar el recorrido correspondiente en el mapa.

**Escenario 2: Selección de una ruta**

**Dado** que existen varias rutas disponibles,

**Cuando** el usuario selecciona una ruta,

**Entonces** el sistema debe mostrar en el mapa el recorrido correspondiente a la ruta seleccionada.

## 5. Historias Técnicas / Enablers

Los requerimientos no funcionales se transforman en historias técnicas que permiten garantizar las condiciones técnicas necesarias para el funcionamiento del sistema.

### EN-001 – Seguridad de autenticación y sesiones

**Tipo:** Enabler  
**Relacionado con:** EP-01 Gestión de acceso y usuarios

**Objetivo:**

Implementar mecanismos técnicos para proteger la autenticación, las sesiones y el acceso a los recursos del sistema.

#### Criterios de Aceptación

**Escenario 1: Protección de credenciales**

**Dado** que un usuario utiliza el sistema de autenticación,

**Cuando** se procesan sus credenciales,

**Entonces** estas deben gestionarse mediante mecanismos seguros y no almacenarse de forma expuesta.

**Escenario 2: Expiración de sesión**

**Dado** que un usuario mantiene una sesión activa,

**Cuando** se cumple el tiempo establecido para la expiración,

**Entonces** el sistema debe solicitar nuevamente la autenticación.

### EN-002 – Calidad y pruebas automatizadas

**Tipo:** Enabler  
**Relacionado con:** Todas las épicas

**Objetivo:**

Establecer una base de pruebas automatizadas que permita verificar la calidad del software desarrollado.

#### Criterios de Aceptación

**Escenario 1: Ejecución de pruebas**

**Dado** que existe código implementado,

**Cuando** se ejecuta la suite de pruebas automatizadas,

**Entonces** las pruebas deben ejecutarse correctamente y reportar sus resultados.

**Escenario 2: Cobertura mínima**

**Dado** que se ejecutan las pruebas unitarias del proyecto,

**Cuando** se genera el reporte de cobertura,

**Entonces** la cobertura debe ser igual o superior al 80 %.

### EN-003 – Análisis estático y seguridad del código

**Tipo:** Enabler  
**Relacionado con:** Todas las épicas

**Objetivo:**

Incorporar análisis estático del código para identificar problemas de calidad y seguridad antes de la integración del trabajo.

#### Criterios de Aceptación

**Escenario 1: Análisis del código**

**Dado** que existe una nueva modificación del código,

**Cuando** se ejecuta el análisis estático,

**Entonces** el código debe ser evaluado respecto a las reglas de calidad y seguridad definidas.

**Escenario 2: Vulnerabilidades críticas**

**Dado** que se ejecuta el análisis estático,

**Cuando** se genera el resultado del análisis,

**Entonces** no deben existir vulnerabilidades críticas pendientes para considerar el trabajo terminado.

### EN-004 – Integración y despliegue en ambiente de pruebas

**Tipo:** Enabler  
**Relacionado con:** Todas las épicas

**Objetivo:**

Establecer un proceso automatizado que permita integrar y desplegar el sistema en un ambiente de pruebas o staging.

#### Criterios de Aceptación

**Escenario 1: Integración del código**

**Dado** que existe una modificación aprobada,

**Cuando** se integra el código al repositorio,

**Entonces** debe ejecutarse el proceso automatizado de validación correspondiente.

**Escenario 2: Despliegue**

**Dado** que las validaciones automatizadas finalizan correctamente,

**Cuando** se ejecuta el proceso de despliegue,

**Entonces** la aplicación debe quedar disponible en el ambiente de pruebas.

### EN-005 – Documentación técnica y API

**Tipo:** Enabler  
**Relacionado con:** Todas las épicas

**Objetivo:**

Mantener actualizada la documentación técnica y la documentación de las interfaces de programación utilizadas por el sistema.

#### Criterios de Aceptación

**Escenario 1: Actualización de documentación**

**Dado** que se implementa o modifica una funcionalidad,

**Cuando** se completa el desarrollo correspondiente,

**Entonces** la documentación técnica relacionada debe actualizarse.

**Escenario 2: Documentación de API**

**Dado** que existe una API utilizada por el sistema,

**Cuando** se incorpora o modifica un endpoint,

**Entonces** su documentación debe mantenerse actualizada mediante una especificación como OpenAPI/Swagger.

## 6. Mapeo de Requisitos hacia el Trabajo Ágil

La transformación de los requisitos se resume de la siguiente manera:

| Elemento | Tipo | Épica | Trabajo Ágil |
| --- | --- | --- | --- |
| RF-01 | Funcional | EP-01 | US-001 / HU-01 |
| RF-02 | Funcional | EP-02 | US-002 / HU-02 |
| RF-03 | Funcional | EP-03 | US-003 / HU-04 |
| RF-04 | Funcional | EP-04 | US-004 / HU-05 |
| RF-05 | Funcional | EP-05 | US-005 / HU-07 |
| RF-06 | Funcional | EP-06 | US-006 / HU-09 |
| RNF-01 | No funcional / Seguridad | Transversal | EN-001 |
| RNF-02 | No funcional / Calidad | Transversal | EN-002 |
| RNF-03 | No funcional / Seguridad | Transversal | EN-003 |
| RNF-04 | No funcional / Despliegue | Transversal | EN-004 |
| RNF-05 | No funcional / Documentación | Transversal | EN-005 |

## 7. Definition of Done (DoD) Global

Una Historia de Usuario se considera Done cuando cumple todos los criterios técnicos y funcionales establecidos por el equipo.

La Definition of Done global del proyecto EcoLima comprende:

- La funcionalidad cumple con todos sus criterios de aceptación.
- Se han realizado las pruebas correspondientes.
- La cobertura de pruebas unitarias es ≥ 80 %.
- El análisis estático de código no presenta vulnerabilidades críticas.
- Se realizó Peer Review mediante Pull Request.
- El Pull Request fue aprobado por al menos un par técnico.
- El código se encuentra integrado correctamente en el repositorio.
- El despliegue automatizado puede ejecutarse en un ambiente de Staging / Pruebas.
- La funcionalidad ha sido validada en el ambiente correspondiente.
- La documentación técnica y de código se encuentra actualizada.
- La documentación de API mediante OpenAPI/Swagger se encuentra actualizada cuando corresponde.
- No existen errores críticos pendientes relacionados con la funcionalidad.

## 8. Relación con Jira Software

La transformación realizada en este documento se implementa posteriormente en Jira Software mediante la siguiente jerarquía:

**Épica → Historia de Usuario / Enabler → Subtarea**

Las cinco épicas definidas en este documento corresponden a las épicas configuradas en el proyecto Eco-Lima de Jira.

Las historias de usuario priorizadas para el Sprint 1 son:

| Jira | Historia de Usuario | Story Points | Épica |
| --- | --- | --- | --- |
| HU-01 | Login con bloqueo y expiración de sesión | 5 | Gestión de acceso y usuarios |
| HU-02 | Registrar vehículo de flota | 5 | Gestión de acceso y conductores |
| HU-04 | Registrar conductor con validación legal | 5 | Gestión de acceso y conductores |
| HU-05 | Registrar pedido con referencia y GPS | 8 | Gestión de pedidos |
| HU-07 | Generar rutas optimizadas | 8 | Optimización y planificación de rutas |
| HU-09 | Visualización de rutas en mapa interactivo | 5 | Visualización y seguimiento de rutas |

**Total del Sprint 1: 36 Story Points.**

## 9. Conclusión

La transformación ágil permite convertir la línea base de requisitos de EcoLima en elementos de trabajo gestionables mediante Scrum.

Los requerimientos funcionales se organizaron en cinco épicas y se descompusieron en historias de usuario. Los requerimientos no funcionales se transformaron en Enablers técnicos relacionados con seguridad, calidad, pruebas, despliegue y documentación.

Esta estructura constituye la base para la planificación y gestión del proyecto en Jira Software, donde posteriormente se organizan el backlog, el Sprint 1, el tablero Scrum y el release del producto.

---

**Versión del documento:** 1.0.0

