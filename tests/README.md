# Pruebas de EcoLima

## Ejecución segura

Desde la raíz del repositorio:

```powershell
.\tests\run-safe-tests.ps1
```

El runner ejecuta ESLint y la compilación del frontend, la suite Node del
backend y la comprobación sintáctica de los archivos JavaScript. No escribe
datos en PostgreSQL.

## Integración y navegador

```powershell
.\tests\run-e2e.ps1
```

Este comando de integración local requiere Docker con el contenedor
`ecolima-postgres` activo, dependencias instaladas con `npm ci` en `backend/`
y los puertos 8000/5173 libres. El despliegue no requiere Docker: usa
PostgreSQL/PostGIS administrado en Render. El runner crea una base temporal, inicializa el esquema,
prepara datos semilla, inicia la API Node y el frontend, y ejecuta Cypress
junto con pruebas de integración. Al terminar, elimina solo la base temporal
creada por la ejecución.

Los scripts auxiliares de API y mantenimiento están en `backend/tools/`.
Algunos crean, actualizan o eliminan datos: ejecútalos únicamente contra una
base de pruebas aislada, nunca contra una base compartida o de producción.

## Alcance

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario y contrato | `node --test` y c8 | Autenticación, permisos, rutas, optimización, cálculos y contratos HTTP |
| Estático | ESLint, Vite y `node --check` | Calidad del frontend y sintaxis JavaScript |
| Humo de API | HTTP local | Salud de API/BD, endpoint raíz y autorización |
| Navegador | Cypress | Flujos E2E del frontend |
| Integración / CRUD | Scripts de `backend/tools/` | Operaciones de API contra base temporal aislada |
| Accesibilidad | Inspección exploratoria en navegador | Comprobaciones parciales; no reemplaza axe, Lighthouse ni evaluación WCAG completa |
| Seguridad / calidad | SonarQube | Importa informes LCOV de cobertura Node y Cypress |

## Verificación de la migración

| Comprobación | Resultado |
|---|---|
| Suite unitaria Node | 32/32 pruebas aprobadas, incluidas rutas usadas por el frontend |
| Cobertura de líneas backend | 43.03%, aún bajo el objetivo de 80%; LCOV generado en `backend/coverage/lcov.info` |
| Sintaxis JavaScript del backend | Correcta |
| Auditoría de dependencias de producción | 0 vulnerabilidades |
| Integración funcional con PostgreSQL/PostGIS y Cypress | Pendiente: PostgreSQL no estaba disponible |

La suite unitaria no sustituye la integración real con PostgreSQL/PostGIS ni
la validación de todos los flujos de navegador y roles.
