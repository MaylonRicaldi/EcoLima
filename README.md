# EcoLima

**Proyecto EcoLogística Lima – Sistema de Gestión y Optimización de Rutas Sostenibles para DistriRápido S.A.C.**

EcoLima es una plataforma web orientada a mejorar la gestión de las operaciones logísticas y optimizar las rutas de distribución de última milla. El proyecto busca facilitar la administración de pedidos, clientes, vehículos y conductores, incorporando criterios de optimización operativa y sostenibilidad ambiental.

El sistema se desarrolla como parte de la asignatura **Taller de Proyectos 2**, del programa académico de Ingeniería de Sistemas e Informática.

---

## Información general del proyecto

| Campo | Información |
|---|---|
| Nombre del proyecto | EcoLogística Lima |
| Nombre del sistema | EcoLima |
| Empresa de referencia | DistriRápido S.A.C. |
| Tipo de proyecto | Desarrollo de software |
| Solución propuesta | Plataforma web de gestión logística y optimización de rutas |
| Ámbito | Distribución y logística de última milla |
| Ubicación del escenario | Lima Metropolitana, Perú |
| Metodología de desarrollo | Enfoque híbrido con ejecución mediante Scrum |
| Herramienta de gestión | Jira |
| Control de versiones | Git y GitHub |
| Repositorio oficial | [MaylonRicaldi/EcoLima](https://github.com/MaylonRicaldi/EcoLima) |
| Rama principal | main |

## Equipo de desarrollo

El proyecto es desarrollado por los siguientes integrantes:

1. **Maylon Amilcar Ricaldi Solis**
2. **David Stwart Solorzano Quintana**
3. **Jerico Owen Calderon Huamán**
4. **Diego Marlon Quispe Povis**
5. **Josi Angie Pizarro Pacheco**

## Descripción del sistema

EcoLima propone una solución tecnológica para apoyar las operaciones de distribución de la empresa de referencia DistriRápido S.A.C., considerando las dificultades que se presentan durante la planificación y ejecución de las entregas urbanas.

El escenario del proyecto contempla una operación de más de 250 entregas diarias, una flota de 15 camionetas y distribución en los distritos de San Juan de Lurigancho, El Agustino, Santa Anita y Ate.

Ante esta situación, el sistema plantea centralizar la información logística y facilitar la administración de los recursos necesarios para realizar las entregas.

Asimismo, incorpora la optimización de rutas mediante el enfoque Green Vehicle Routing Problem with Time Windows (Green VRPTW), considerando aspectos como las distancias, los tiempos de desplazamiento, la capacidad de los vehículos, las ventanas horarias y las emisiones de CO₂.

De esta manera, EcoLima busca contribuir a una distribución más organizada, eficiente y sostenible.

## Objetivo general

Desarrollar una plataforma web que permita gestionar las operaciones logísticas y optimizar las rutas de distribución de última milla de DistriRápido S.A.C., considerando las restricciones operativas y los criterios de sostenibilidad ambiental, con la finalidad de mejorar la eficiencia de las entregas y reducir el impacto ambiental del transporte.

## Principales funcionalidades del sistema

El alcance funcional de EcoLima contempla los siguientes módulos:

- **Autenticación y control de acceso:** inicio de sesión, validación de credenciales, bloqueo temporal de cuentas y expiración de sesiones.
- **Gestión de usuarios:** administración de usuarios, roles y permisos de acceso.
- **Gestión de flota:** registro y administración de vehículos.
- **Gestión de conductores:** administración de información y disponibilidad de conductores.
- **Gestión de pedidos:** registro, consulta y administración de pedidos.
- **Gestión de clientes:** administración de información de clientes y destinatarios.
- **Optimización de rutas:** planificación de recorridos considerando restricciones de distribución.
- **Visualización geográfica:** representación de rutas y puntos de entrega en mapas.
- **Reoptimización de rutas:** actualización de recorridos ante cambios en las condiciones operativas.
- **Indicadores logísticos:** seguimiento de información relacionada con las operaciones de distribución.
- **Sostenibilidad ambiental:** estimación de emisiones de CO₂ e indicadores de impacto ambiental.

El desarrollo de estas funcionalidades se organiza mediante historias de usuario, prioridades y entregas incrementales registradas en Jira.

## Usuarios del sistema

EcoLima considera los siguientes perfiles de usuario:

| Usuario | Descripción |
|---|---|
| Administrador | Gestiona usuarios, roles, permisos y configuraciones generales del sistema. |
| Operador / Técnico Logístico | Administra pedidos, vehículos, conductores y operaciones de distribución. |
| Conductor | Consulta las rutas y entregas asignadas y registra información relacionada con su recorrido. |
| Auditor Externo | Consulta información e indicadores autorizados del sistema. |
| Cliente | Consulta información relacionada con sus pedidos y entregas. |

## Tecnologías del proyecto

La selección tecnológica se encuentra documentada en el artefacto de Stack Tecnológico. Entre las tecnologías identificadas en el repositorio y la arquitectura seleccionada se encuentran:

| Componente | Tecnología |
|---|---|
| Frontend | React, JavaScript y Vite |
| Navegación | React Router |
| Mapas | Leaflet y OpenStreetMap |
| Backend | Python y FastAPI (stack seleccionado en la documentación) |
| Base de datos | PostgreSQL 16 |
| Extensión geoespacial | PostGIS 3.4 |
| Infraestructura local | Docker y Docker Compose |
| Gestión del proyecto | Jira |
| Control de versiones | Git y GitHub |
| Calidad de código | SonarQube |
| Seguridad | OWASP Top 10 2025 |
| Accesibilidad | WCAG 2.1 Nivel AA |

**Nota:** La tabla identifica la selección tecnológica y los componentes documentados. La integración efectiva de cada herramienta debe verificarse en el código fuente y en la configuración del proyecto.

## Organización del repositorio

El repositorio se encuentra organizado para separar el código fuente, la infraestructura, la base de datos y la documentación del proyecto.

```text
EcoLima/
│
├── backend/
│   └── Código fuente del backend
│
├── frontend/
│   └── Código fuente del frontend
│
├── database/
│   └── Archivos de base de datos
│
├── docs/
│   │
│   ├── 01 Inicio/
│   │
│   ├── 02 Planificación/
│   │
│   └── 03 Implementación/
│       ├── Sprint 01/
│       ├── Sprint 02/
│       └── Sprint 03/
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Fase 01: Inicio

Los siguientes artefactos documentan la fase de inicio del proyecto, incluyendo la definición del enfoque, constitución, visión, interesados, requisitos, reglas de negocio, tecnologías y arquitectura.

- [01. Selección del enfoque del proyecto V_1_0_0](docs/01%20Inicio/01.%20Selecci%C3%B3n%20del%20enfoque%20del%20proyecto%20V_1_0_0.md)
- [02. Acta de constitución V_1_0_0](docs/01%20Inicio/02.%20Acta%20de%20constituci%C3%B3n%20V_1_0_0.md)
- [03. Declaración de la visión V_1_0_0](docs/01%20Inicio/03.%20Declaraci%C3%B3n%20de%20la%20visi%C3%B3n%20V_1_0_0.md)
- [04. Registro de supuestos y restricciones V_1_0_0](docs/01%20Inicio/04.%20Registro%20de%20supuestos%20y%20restricciones%20V_1_0_0.md)
- [05. Registro de interesados V_1_0_0](docs/01%20Inicio/05.%20Registro%20de%20interesados%20V_1_0_0.md)
- [06. Requisitos funcionales V_1_0_0](docs/01%20Inicio/06.%20Requisitos%20funcionales%20V_1_0_0.md)
- [07. Requisitos no funcionales V_1_0_0](docs/01%20Inicio/07.%20Requisitos%20no%20funcionales%20V_1_0_0.md)
- [08. Usuarios V_1_0_0](docs/01%20Inicio/08.%20Usuarios%20V_1_0_0.md)
- [09. Reglas de negocio V_1_0_0](docs/01%20Inicio/09.%20Reglas%20de%20negocio%20V_1_0_0.md)
- [10. Stack tecnológico V_1_0_0](docs/01%20Inicio/10.%20Stack%20tecnol%C3%B3gico%20V_1_0_0.md)
- [11. Base de datos V_1_0_0](docs/01%20Inicio/11.%20Base%20de%20datos%20V_1_0_0.md)
- [12. Modelo C4 V_1_0_0](docs/01%20Inicio/12.%20Modelo%20C4%20V_1_0_0.md)
- [13. Restricciones V_1_0_0](docs/01%20Inicio/13.%20Restricciones%20V_1_0_0.md)

## Fase 02: Planificación

Los siguientes artefactos documentan la planificación del proyecto, la adopción del enfoque ágil, la organización del trabajo mediante Jira, la gestión de riesgos y el presupuesto.

- [01. Transformando a Ágil V_1_0_0](docs/02%20Planificaci%C3%B3n/01%20Transformando%20a%20%C3%A1gil%20V_1_0_0.md)
- [02. Artefactos Jira V_1_0_0](docs/02%20Planificaci%C3%B3n/02%20Artefactos%20Jira%20V_1_0_0.md)
- [03. Registro de Riesgos V_1_0_0](docs/02%20Planificaci%C3%B3n/03%20Registro%20de%20riesgos%20V_1_0_0.md)
- [04. Presupuesto del Proyecto V_1_0_0](docs/02%20Planificaci%C3%B3n/04%20Presupuesto%20del%20proyecto%20V_1_0_0.md)

## Fase 03: Implementación

Esta fase reúne los documentos correspondientes al desarrollo incremental del sistema, el seguimiento de las historias de usuario, las revisiones de los Sprints y las evaluaciones de calidad, seguridad y accesibilidad.

### Sprint 01

Documentación de la primera iteración del proyecto.

- [01. Informe de Estado del Proyecto V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/01%20Informe%20de%20Estado%20del%20Proyecto%20V_1_1_0.md)
- [02. Registro de Impedimentos V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/02%20Registro%20de%20Impedimentos%20V_1_1_0.md)
- [03. Revisión del Sprint V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/03%20Revisi%C3%B3n%20del%20Sprint%20V_1_1_0.md)
- [04. Retrospectiva del Sprint V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/04%20Retrospectiva%20del%20Sprint%20V_1_1_0.md)

### Sprint 02

Documentación de la segunda iteración del proyecto.

- [01. Informe de Estado del Proyecto V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/01%20Informe%20de%20Estado%20del%20Proyecto%20V_1_1_0.md)
- [02. Registro de Impedimentos V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/02%20Registro%20de%20Impedimentos%20V_1_1_0.md)
- [03. Revisión del Sprint V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/03%20Revisi%C3%B3n%20del%20Sprint%20V_1_1_0.md)
- [04. Retrospectiva del Sprint V_1_1_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/04%20Retrospectiva%20del%20Sprint%20V_1_1_0.md)

### Sprint 03

**Implementación, Calidad de Código y Evaluación**

Documentación correspondiente a la revisión del incremento, retrospectiva del equipo, evaluación de calidad mediante SonarQube, evaluación de seguridad con OWASP Top 10 2025 y evaluación de accesibilidad WCAG.

- [01. Revisión del Sprint V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/01%20Revisi%C3%B3n%20del%20Sprint%20V_1_0_0.md)
- [02. Retrospectiva del Sprint V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/02%20Retrospectiva%20del%20Sprint%20V_1_0_0.md)
- [03. Calidad de código V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/03%20Calidad%20de%20c%C3%B3digo%20V_1_0_0.md)
- [04. Evaluación OWASP V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/04%20OWASP%20V_1_0_0.md)
- [05. Evaluación WCAG V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/05%20WCAG%20V_1_0_0.md)

---

## Estado del proyecto

El proyecto EcoLima cuenta con las fases de inicio y planificación documentadas, así como con tres iteraciones de implementación organizadas en el repositorio.

Al finalizar el Sprint 3, la documentación contempla también la evaluación de calidad del código, seguridad y accesibilidad, con el propósito de verificar el estado técnico del producto y registrar las oportunidades de mejora identificadas.

El estado de las historias de usuario, las funcionalidades implementadas y los resultados de las evaluaciones se encuentran respaldados por Jira, el código fuente y los documentos de revisión correspondientes.

## Repositorio oficial

**GitHub:** [https://github.com/MaylonRicaldi/EcoLima](https://github.com/MaylonRicaldi/EcoLima)

**Rama principal:** `main`

---

**EcoLima – EcoLogística Lima**

*Proyecto académico | Taller de Proyectos 2*

*Ingeniería de Sistemas e Informática*
