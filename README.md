# EcoLima – EcoLogística Lima

**Optimizador de Rutas Sostenibles para DistriRápido S.A.C.**

Sistema orientado a la planificación, optimización y seguimiento de rutas de distribución urbana de última milla, considerando restricciones operativas, ventanas de tiempo, capacidad vehicular, tráfico y criterios de sostenibilidad ambiental.

---

## 1. Información del proyecto

| Dato | Descripción |
|---|---|
| Nombre del proyecto | EcoLogística Lima (EcoLima) |
| Organización de referencia | DistriRápido S.A.C. |
| Curso | Taller de Proyectos 2 |
| Carrera | Ingeniería de Sistemas e Informática |
| Universidad | Universidad Continental |
| Metodología | Enfoque híbrido: predictivo y ágil |
| Gestión del proyecto | Scrum y Jira |
| Base de datos | PostgreSQL 16.4 y PostGIS |
| Repositorio | [GitHub – EcoLima](https://github.com/MaylonRicaldi/EcoLima) |

### Integrantes del equipo

- Maylon Amilcar Ricaldi Solis
- David Stwart Solorzano Quintana
- Jerico Owen Calderon Huamán
- Diego Marlon Quispe Povis
- Josi Angie Pizarro Pacheco

## 2. Descripción del proyecto

EcoLima es una propuesta de solución tecnológica para mejorar la gestión de las operaciones de distribución urbana de última milla. El proyecto busca facilitar la planificación de rutas de reparto, la asignación de vehículos y conductores, el seguimiento de pedidos y la evaluación del impacto ambiental de las operaciones logísticas.

El escenario operativo considerado comprende los distritos de San Juan de Lurigancho, El Agustino, Santa Anita y Ate, en Lima Metropolitana.

La solución contempla el uso de información geográfica para representar ubicaciones de clientes, pedidos, paradas, incidentes y obstáculos. También considera restricciones de capacidad de los vehículos, disponibilidad de conductores, ventanas de tiempo y condiciones del tráfico.

El proyecto incorpora criterios de sostenibilidad para evaluar indicadores como distancia recorrida, consumo de combustible, costos operativos y emisiones de dióxido de carbono (CO₂).

## 3. Objetivos

### Objetivo general

Desarrollar un sistema de información que permita optimizar la planificación y gestión de rutas de distribución urbana, considerando criterios operativos, geográficos y ambientales.

### Objetivos específicos

- Gestionar usuarios y controlar el acceso según sus roles.
- Administrar clientes, pedidos y ventanas de tiempo.
- Gestionar vehículos, conductores y licencias.
- Planificar rutas considerando restricciones operativas y geográficas.
- Facilitar la asignación de vehículos y conductores.
- Registrar paradas, entregas e incidencias durante las operaciones.
- Considerar información de tráfico y obstáculos en la planificación.
- Generar indicadores relacionados con costos, distancias y emisiones.
- Registrar información sobre compensación de carbono.
- Facilitar la generación de reportes para el seguimiento de las operaciones.

## 4. Funcionalidades contempladas

### 4.1. Gestión de usuarios y seguridad

- Administración de usuarios del sistema.
- Asignación de roles y permisos.
- Registro de intentos fallidos de inicio de sesión.
- Bloqueo temporal de usuarios según las reglas de seguridad.
- Control del estado de las cuentas.

### 4.2. Gestión de clientes y pedidos

- Registro y administración de clientes.
- Registro de pedidos y sus características.
- Asociación de pedidos con clientes.
- Registro de direcciones y coordenadas geográficas.
- Clasificación de pedidos según prioridad y tipo de producto.
- Gestión de ventanas de tiempo para las entregas.

### 4.3. Gestión de flota

- Administración de tipos de vehículos.
- Registro de vehículos y sus capacidades.
- Registro de conductores.
- Administración de licencias.
- Control de disponibilidad y estado de los recursos.
- Registro de información de consumo y emisiones de los vehículos.

### 4.4. Planificación y gestión de rutas

- Registro de rutas de distribución.
- Asociación de pedidos con rutas.
- Organización de las paradas según el orden de visita.
- Asignación de vehículos y conductores.
- Registro de tiempos estimados y reales.
- Seguimiento del estado de las entregas.
- Registro de distancia, duración, costos y consumo de combustible.

### 4.5. Gestión de incidencias y tráfico

- Registro de accidentes, averías, robos, bloqueos y condiciones climáticas.
- Registro de obstáculos en las vías.
- Clasificación de niveles de incidencia.
- Registro de información de tráfico.
- Identificación de segmentos con diferentes niveles de congestión.
- Registro de fuentes de información como Waze, SIMAT y reportes manuales.

### 4.6. Sostenibilidad y reportes

- Registro de indicadores ambientales por ruta.
- Cálculo de emisiones de CO₂.
- Registro de información de compensación de carbono.
- Estimación de árboles necesarios para compensar emisiones.
- Generación de reportes de sostenibilidad, costos, compensación y auditoría.

**Importante:** estas funcionalidades representan el alcance funcional contemplado en el proyecto y el modelo de datos. Su disponibilidad efectiva debe verificarse mediante la implementación y las pruebas de cada módulo.

## 5. Roles del sistema

La base de datos contempla cinco roles principales:

| Rol | Responsabilidad |
|---|---|
| ADMIN | Administración general y gestión de usuarios. |
| OPERADOR | Gestión y seguimiento de las operaciones logísticas. |
| CONDUCTOR | Actividades relacionadas con las rutas y entregas asignadas. |
| AUDITOR | Consulta de información para revisión y auditoría. |
| CLIENTE | Acceso a las funcionalidades que correspondan a su atención como cliente. |

Los permisos específicos de cada rol deben corresponder a las reglas de autorización implementadas en el backend.

## 6. Arquitectura y tecnologías

El proyecto considera una arquitectura separada por componentes para facilitar el mantenimiento y la evolución del sistema.

### 6.1. Tecnologías del frontend

| Tecnología | Uso |
|---|---|
| React 19.2.8 | Desarrollo de la interfaz de usuario. |
| Vite 8.3.0 | Herramienta de desarrollo y compilación. |
| React Router 7.18.4 | Navegación entre vistas. |
| Leaflet 1.9.4 | Representación de mapas y ubicaciones geográficas. |
| ESLint 10.10.0 | Análisis estático del código JavaScript. |

### 6.2. Tecnologías del backend

La arquitectura documentada contempla las siguientes tecnologías:

| Tecnología | Uso previsto |
|---|---|
| Python | Lenguaje de programación del backend. |
| FastAPI | Desarrollo de servicios y API REST. |
| Redis | Almacenamiento en memoria y soporte para tareas. |
| Celery | Ejecución de tareas en segundo plano. |

La configuración efectiva de estas tecnologías debe comprobarse en los archivos del backend y en el despliegue del proyecto.

### 6.3. Base de datos

| Tecnología | Uso |
|---|---|
| PostgreSQL 16.4 | Gestión de información relacional. |
| PostGIS | Manejo de información geográfica y operaciones espaciales. |
| GiST | Índices espaciales para mejorar las consultas geográficas. |
| pgcrypto | Funciones criptográficas disponibles en PostgreSQL. |

### 6.4. Infraestructura y herramientas

- Docker y Docker Compose para la administración de servicios en contenedores.
- Git y GitHub para el control de versiones.
- Visual Studio Code como entorno de desarrollo.
- Jira para la planificación, seguimiento y gestión de historias de usuario.
- OpenStreetMap como fuente cartográfica contemplada para la representación de mapas.

**Diferenciación importante:** las tecnologías descritas en la arquitectura no necesariamente están todas instaladas o conectadas en la versión actual. Por ejemplo, la configuración de Docker Compose revisada incluye el servicio de PostgreSQL/PostGIS, pero no incorpora Redis ni Celery.

## 7. Diseño de la base de datos

La base de datos de EcoLima utiliza PostgreSQL 16.4 con PostGIS para administrar información relacional y geográfica.

El modelo de datos compartido contiene **20 tablas principales**, organizadas de acuerdo con las áreas funcionales del sistema.

### 7.1. Extensiones utilizadas

El dump de la base de datos contempla las siguientes extensiones:

| Extensión | Finalidad |
|---|---|
| fuzzystrmatch | Funciones de comparación y coincidencia aproximada de cadenas. |
| pgcrypto | Funciones criptográficas. |
| postgis | Administración y procesamiento de información geográfica. |
| postgis_tiger_geocoder | Funcionalidades de geocodificación TIGER. |
| postgis_topology | Administración de datos geográficos topológicos. |

También se contemplan los esquemas `tiger`, `tiger_data` y `topology`, relacionados con las funcionalidades adicionales de PostGIS.

### 7.2. Tablas principales

Las 20 tablas se encuentran agrupadas de la siguiente manera:

**A. Seguridad y usuarios**

1. `roles`: almacena los roles disponibles en el sistema.
2. `usuarios`: registra las cuentas de usuario, credenciales y estados de acceso.

La tabla `usuarios` contempla campos relacionados con el correo electrónico, hash de contraseña, estado de la cuenta, intentos fallidos, fecha de bloqueo y último acceso.

**B. Clientes y pedidos**

3. `clientes`: almacena información de los clientes, datos de contacto, direcciones y ubicaciones geográficas.
4. `pedidos`: registra los pedidos, sus características, prioridades, productos, estados y ubicación de entrega.
5. `ventanas_tiempo`: almacena los horarios permitidos para realizar las entregas, incluyendo tolerancias y penalizaciones.

**C. Gestión de flota**

6. `tipos_vehiculo`: registra las categorías de vehículos.
7. `vehiculos`: almacena placas, marca, modelo, año, capacidades, consumo, combustible, costos y factor de emisiones.
8. `conductores`: registra información de los conductores, experiencia, disponibilidad y horas de conducción.
9. `licencias`: almacena información relacionada con las licencias de los conductores.

**D. Planificación y ejecución de rutas**

10. `rutas`: registra las rutas, fechas, distancias, duración, costos, consumo, emisiones y algoritmo utilizado.
11. `ruta_pedidos`: relaciona los pedidos con las rutas y registra su orden de atención y estado de entrega.
12. `paradas_ruta`: almacena las paradas de cada ruta, coordenadas, horarios estimados y reales, tiempos de servicio y espera.
13. `asignaciones`: registra la asignación de rutas a vehículos y conductores, además de información de conducción y descanso.

**E. Incidencias, tráfico e información geográfica**

14. `incidentes`: registra accidentes, averías, robos, bloqueos y eventos climáticos.
15. `obstaculos`: almacena obstáculos identificados en las vías, su nivel y estado de resolución.
16. `trafico`: registra información de congestión, velocidad y fuente de los datos de tráfico.
17. `ubicaciones`: almacena puntos geográficos como ubicaciones de entrega, referencias, zonas de riesgo, reservas ecológicas y locales operativos.

**F. Indicadores, sostenibilidad y reportes**

18. `indicadores_ruta`: almacena métricas de distancia, combustible, emisiones, costos, ahorros y cumplimiento de ventanas de tiempo.
19. `compensacion_carbono`: registra las emisiones que deben compensarse, el factor de captura de carbono, los árboles calculados y los proyectos de compensación.
20. `reportes`: registra los reportes generados, su tipo, ruta asociada, usuario responsable y archivo correspondiente.

### 7.3. Relaciones principales

El modelo de datos contempla las siguientes relaciones:

- `roles` se relaciona con `usuarios` para determinar el rol de cada cuenta.
- `usuarios` se relaciona con `conductores` para asociar las cuentas con los conductores.
- `conductores` se relaciona con `licencias` para administrar sus licencias.
- `tipos_vehiculo` se relaciona con `vehiculos` para clasificar la flota.
- `clientes` se relaciona con `pedidos` para identificar a quién corresponde cada pedido.
- `ventanas_tiempo` se relaciona con `pedidos` para establecer las condiciones horarias de entrega.
- `rutas` se relaciona con `ruta_pedidos` para registrar los pedidos incluidos en cada ruta.
- `rutas` se relaciona con `paradas_ruta` para almacenar su secuencia de paradas.
- `rutas` se relaciona con `asignaciones` para registrar los recursos asignados.
- `asignaciones` se relaciona con `vehiculos` y `conductores`.
- `rutas` se relaciona con `indicadores_ruta` para almacenar sus resultados operativos y ambientales.
- `reportes` se relaciona con `rutas` y `usuarios` para identificar la ruta reportada y el usuario que genera el documento.
- `obstaculos` se relaciona con `usuarios` para registrar al usuario asociado al reporte del obstáculo.

### 7.4. Características geoespaciales

Una característica importante de EcoLima es el uso de PostGIS para administrar ubicaciones geográficas.

El modelo contempla columnas de tipo `geography(Point,4326)` en las tablas:

- `clientes`
- `pedidos`
- `paradas_ruta`
- `incidentes`
- `obstaculos`

La tabla `ubicaciones` contempla un campo geométrico para almacenar información espacial.

Estas estructuras permiten representar coordenadas geográficas y realizar consultas espaciales necesarias para las operaciones de distribución.

Además, se utilizan índices espaciales GiST para optimizar las consultas relacionadas con las ubicaciones.

### 7.5. Automatización geográfica

El dump contempla la función `fn_sync_geography()`, encargada de sincronizar la información geográfica a partir de los valores de latitud y longitud.

Esta función se encuentra asociada a triggers de tipo `BEFORE INSERT OR UPDATE` en las tablas:

- `clientes`
- `pedidos`
- `paradas_ruta`

De esta manera, se busca mantener sincronizada la información de coordenadas con sus respectivos campos geográficos cuando se insertan o actualizan registros.

### 7.6. Restricciones e integridad de datos

La base de datos incorpora restricciones para mantener la consistencia de la información:

- Claves primarias para identificar los registros.
- Claves foráneas para establecer relaciones entre las tablas.
- Restricciones `UNIQUE` para evitar duplicidad en campos específicos.
- Restricciones `CHECK` para validar estados, tipos y rangos de valores.
- Validaciones para evitar valores negativos en campos que representan cantidades, costos o medidas.
- Restricciones geográficas para coordenadas dentro de rangos aproximados de Lima.

También se contemplan restricciones particulares:

- Un pedido solo puede estar asociado a una ruta a la vez mediante el índice único `uq_ruta_pedidos_pedido`.
- Una ruta puede tener una sola asignación mediante la restricción única de `asignaciones.id_ruta`.
- Una ruta puede tener un único registro de indicadores mediante la restricción única de `indicadores_ruta.id_ruta`.

### 7.7. Compensación de carbono

La tabla `compensacion_carbono` contempla el cálculo de árboles necesarios para compensar las emisiones generadas.

Se utiliza un factor de captura de carbono predeterminado de **22 kg de CO₂ por árbol al año**.

El campo `arboles_necesarios` está definido como una columna generada a partir de la siguiente operación:

`round(co2_a_compensar_kg / factor_captura_arbol_kg, 2)`

Esto permite obtener una estimación de la cantidad de árboles necesarios según las emisiones que se deben compensar y el factor de captura establecido.

### 7.8. Seguridad en la base de datos

La tabla `usuarios` contempla información para administrar el estado de las cuentas:

- Correo electrónico único.
- Hash de contraseña.
- Estado de la cuenta: ACTIVO, BLOQUEADO o INACTIVO.
- Cantidad de intentos fallidos.
- Fecha y hora hasta la cual permanece bloqueada una cuenta.
- Fecha del último acceso.

Estos campos permiten almacenar información necesaria para implementar controles de acceso y bloqueo de cuentas.

La expiración de sesiones, la administración de tokens y el registro detallado de auditoría de accesos deben verificarse en el backend, ya que el dump compartido no contiene una tabla independiente de sesiones o tokens.

### 7.9. Alcance del modelo de datos

La descripción anterior corresponde a la estructura del dump SQL revisado. La existencia de tablas, funciones, índices y restricciones no significa automáticamente que todos los módulos estén conectados o funcionando desde la interfaz del sistema.

La integración entre frontend, backend y base de datos debe comprobarse mediante pruebas de funcionamiento. Asimismo, el dump de estructura compartido no permite afirmar que todas las tablas ya contienen registros de información real.

## 8. Estructura del repositorio

El repositorio se organiza en las siguientes carpetas principales:

```text
EcoLima/
│
├── backend/
│   └── Servicios y lógica del servidor
│
├── database/
│   └── Archivos relacionados con la base de datos
│
├── docs/
│   ├── 01 Inicio/
│   ├── 02 Planificación/
│   └── 03 Implementación/
│       ├── Sprint 01/
│       ├── Sprint 02/
│       └── Sprint 03/
│
├── frontend/
│   └── Aplicación web
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 9. Documentación del proyecto

La documentación se encuentra organizada por etapas del proyecto:

### Fase 01: Inicio

Documentación inicial, visión, alcance, interesados, requisitos y arquitectura.

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

### Fase 02: Planificación

Planificación del proyecto, organización del trabajo y artefactos de gestión.

- [01. Transformando a Ágil V_1_0_0](docs/02%20Planificaci%C3%B3n/01%20Transformando%20a%20%C3%A1gil%20V_1_0_0.md)
- [02. Artefactos Jira V_1_0_0](docs/02%20Planificaci%C3%B3n/02%20Artefactos%20Jira%20V_1_0_0.md)
- [03. Registro de Riesgos V_1_0_0](docs/02%20Planificaci%C3%B3n/03%20Registro%20de%20riesgos%20V_1_0_0.md)
- [04. Presupuesto del Proyecto V_1_0_0](docs/02%20Planificaci%C3%B3n/04%20Presupuesto%20del%20proyecto%20V_1_0_0.md)

### Fase 03: Implementación

Documentación de los sprints y evidencias de implementación.

#### Sprint 01

- [01. Informe de Estado del Proyecto V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/01%20Informe%20de%20Estado%20del%20Proyecto%20V_2_0_0.md)
- [02. Registro de Impedimentos V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/02%20Registro%20de%20Impedimentos%20V_2_0_0.md)
- [03. Revisión del Sprint V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/03%20Revisi%C3%B3n%20del%20Sprint%20V_2_0_0.md)
- [04. Retrospectiva del Sprint V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2001/04%20Retrospectiva%20del%20Sprint%20V_2_0_0.md)

#### Sprint 02

- [01. Informe de Estado del Proyecto V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/01%20Informe%20de%20Estado%20del%20Proyecto%20V_2_0_0.md)
- [02. Registro de Impedimentos V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/02%20Registro%20de%20Impedimentos%20V_2_0_0.md)
- [03. Revisión del Sprint V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/03%20Revisi%C3%B3n%20del%20Sprint%20V_2_0_0.md)
- [04. Retrospectiva del Sprint V_2_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2002/04%20Retrospectiva%20del%20Sprint%20V_2_0_0.md)

#### Sprint 03

- [01. Revisión del Sprint V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/01%20Revisi%C3%B3n%20del%20Sprint%20V_1_0_0.md)
- [02. Retrospectiva del Sprint V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/02%20Retrospectiva%20del%20Sprint%20V_1_0_0.md)
- [03. Calidad de código V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/03%20Calidad%20de%20c%C3%B3digo%20V_1_0_0.md)
- [04. Evaluación OWASP V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/04%20OWASP%20V_1_0_0.md)
- [05. Evaluación WCAG V_1_0_0](docs/03%20Implementaci%C3%B3n/Sprint%2003/05%20WCAG%20V_1_0_0.md)

## 10. Instalación y ejecución

### 10.1. Requisitos previos

Para trabajar con el proyecto se consideran las siguientes herramientas:

- Git.
- Visual Studio Code.
- Node.js y npm.
- Python.
- Docker Desktop.
- Docker Compose.
- PostgreSQL 16 con PostGIS.

### 10.2. Clonar el repositorio

```bash
git clone https://github.com/MaylonRicaldi/EcoLima.git
cd EcoLima
```

### 10.3. Configurar la base de datos

El proyecto contempla el uso de Docker Compose para ejecutar PostgreSQL con PostGIS.

Para iniciar los servicios definidos en el archivo de configuración:

```bash
docker compose up -d
```

Para verificar los contenedores:

```bash
docker compose ps
```

La configuración de conexión debe obtenerse del archivo `docker-compose.yml` y de las variables de entorno correspondientes.

No se deben publicar contraseñas, claves privadas ni credenciales de acceso en el repositorio.

### 10.4. Ejecutar el frontend

```bash
cd frontend
npm install
npm run dev
```

La dirección local que utiliza Vite por defecto es:

```text
http://localhost:5173
```

**Nota:** los comandos de ejecución del backend deben confirmarse con su configuración y archivos de dependencias actuales.

## 11. Gestión del proyecto

El desarrollo de EcoLima utiliza un enfoque híbrido que combina planificación predictiva y prácticas ágiles.

La gestión de actividades se realiza mediante Jira, donde se organizan las épicas, historias de usuario, tareas, prioridades y seguimiento del trabajo.

Se consideran las siguientes actividades:

- Organización del backlog.
- Definición de historias de usuario.
- Estimación de Story Points.
- Planificación de sprints.
- Seguimiento del avance.
- Revisión de resultados.
- Retrospectivas del equipo.
- Registro de evidencias y documentación.

La documentación de cada sprint debe reflejar el estado real de las actividades y los resultados obtenidos, sin asumir como terminadas las funcionalidades que todavía no han sido verificadas.

## 12. Seguridad y buenas prácticas

Para mantener la seguridad y calidad del proyecto se consideran las siguientes prácticas:

- No publicar credenciales ni archivos `.env` en GitHub.
- Utilizar variables de entorno para la configuración sensible.
- Validar los datos recibidos por el backend.
- Aplicar controles de autorización según los roles.
- Mantener la integridad referencial de la base de datos.
- Evitar consultas SQL inseguras.
- Gestionar adecuadamente los errores de la aplicación.
- Revisar las dependencias utilizadas.
- Realizar pruebas antes de integrar cambios a la rama principal.
- Mantener actualizada la documentación técnica.

## 13. Estado y alcance del proyecto

EcoLima se desarrolla de manera progresiva mediante historias de usuario y sprints.

El repositorio contiene los componentes principales del proyecto, la documentación y la configuración de la base de datos. El avance de cada funcionalidad debe revisarse en Jira y contrastarse con el código implementado.

La estructura de la base de datos descrita en este documento corresponde al dump SQL compartido y revisado. La disponibilidad de cada funcionalidad en el sistema depende de su implementación, integración y validación correspondiente.

## 14. Repositorio oficial

**GitHub:** [https://github.com/MaylonRicaldi/EcoLima](https://github.com/MaylonRicaldi/EcoLima)

---

**EcoLima – EcoLogística Lima**

*Proyecto académico desarrollado en el curso Taller de Proyectos 2 de la carrera de Ingeniería de Sistemas e Informática, Universidad Continental.*
