# Pruebas de EcoLima

## Ejecución segura

Desde la raíz del repositorio, ejecutar en PowerShell:

```powershell
.\tests\run-safe-tests.ps1
```

El runner ejecuta lint y build del frontend, compila los módulos Python y
ejecuta la prueba unitaria del optimizador. No escribe datos en PostgreSQL.

Para la suite de navegador e integración con datos aislados:

```powershell
.\tests\run-e2e.ps1
```

Este comando requiere Docker con el contenedor `ecolima-postgres` activo y
los puertos 8000/5173 libres. Crea una base temporal nueva, inicializa el
esquema, levanta API y frontend, ejecuta Cypress y dos pruebas de integración
del backend y elimina la base temporal al terminar. Nunca apunta a la base
`ecolima` ni reutiliza sus credenciales.

## Pruebas existentes

Las pruebas históricas de backend están en `backend/tests/`. La mayoría son
scripts funcionales que dependen de la API y de PostgreSQL; varios crean,
actualizan o eliminan registros. Deben ejecutarse solamente contra una base
de datos de pruebas aislada, no contra una base compartida o con datos reales.

`backend/tests/prueba_optimizador.py` utiliza casos en memoria. No se
encontraron configuraciones previas de Cypress, Selenium, pytest o Vitest;
Cypress se configuró para pruebas E2E del frontend.

## Niveles y evidencia

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario | Script Python existente | Cálculos, restricciones y asignación del optimizador |
| Estático | ESLint, compilación Vite y `compileall` | Calidad básica y sintaxis |
| Humo de API | HTTP local | Salud de API/BD, endpoint raíz y rechazo sin autenticación |
| Navegador | Playwright integrado en la sesión | Pantalla de acceso, validación HTML, etiquetas, teclado y ancho móvil |
| Integración / CRUD | Scripts de `backend/tests/` | No ejecutados en esta corrida; requieren aislamiento de datos |
| Accesibilidad | Inspección exploratoria en navegador | Comprobaciones parciales; no reemplaza axe, Lighthouse ni evaluación WCAG completa |
| Seguridad / calidad | SonarQube | Análisis bloqueado por autenticación; métricas no disponibles |

## Resultados observados el 2026-10-30

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Finalizó sin errores; reportó 3 advertencias de dependencias de hooks |
| `npm run build` | Compilación correcta; Vite advirtió que el bundle JS supera 500 kB |
| `python -m compileall -q app` | Correcto |
| `backend/tests/prueba_optimizador.py` | 31/31 comprobaciones correctas |
| API `/health` | HTTP 200; base de datos conectada |
| API `/` | HTTP 200 |
| API `/clientes` y `/pedidos` sin sesión | HTTP 401 en ambos casos |
| Navegador: formulario vacío | Los dos campos obligatorios impiden enviar el formulario |
| Navegador: móvil 390 px | Los campos tienen etiqueta; orden de teclado email, contraseña y botón; sin desbordamiento horizontal |

Estos resultados cubren las comprobaciones indicadas y no implican que todas
las historias de usuario, navegadores, roles, criterios WCAG ni escenarios de
producción hayan sido aprobados.
