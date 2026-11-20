[← Volver al README principal](../../../README.md)

# 03. Análisis de pruebas E2E y monitoreo con Playwright

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.1.0  
**Fecha de revisión del repositorio:** 20 de noviembre de 2026  
**Commit evaluado:** `81ecf55` (rama `main`), con el parche de correcciones de defectos aplicado en un ambiente de verificación (sección 6.2)

---

## 1. Objetivo

Definir y documentar la estrategia de pruebas End-to-End (E2E) para HU-09, HU-10 y HU-11, incluyendo la configuración de Playwright, los flujos críticos, el monitoreo de rendimiento y la verificación de disponibilidad.

## 2. Estado técnico verificado

- Frontend React/Vite y Cypress continúan presentes.
- Playwright `1.65.1` fue agregado como dependencia de desarrollo.
- Existe `frontend/playwright.config.js` con los proyectos `chromium`, `firefox` y `webkit`.
- Las pruebas se encuentran en `frontend/e2e/`: 28 pruebas en 7 archivos (detalle en la sección 3).
- Chromium fue ejecutado el 20 de noviembre de 2026: 27 pruebas aprobadas, 0 fallidas y 1 omitida a propósito (`coverage.spec.js`, que solo corre en el workflow de Sonar).
- Firefox y WebKit están declarados en la configuración y en el workflow de CI (`.github/workflows/e2e.yml`). Su ejecución está pendiente (sección 3.1).
- El backend mantiene 45 pruebas Node `node:test` aprobadas en la última ejecución.
- La cobertura de Sonar no se modifica: `frontend/e2e/` está fuera de `sonar.sources` y `coverage.spec.js` se conserva sin cambios.

### 2.1. Elementos que no se modificaron

Según lo acordado por el equipo, estos archivos se conservan sin cambios en la ampliación de la suite:

- `frontend/playwright.config.js`: solo se usa la configuración vigente (sección 3.2).
- `frontend/e2e/coverage.spec.js` y `frontend/e2e/auth.spec.js`, `frontend/e2e/dashboard.spec.js`.
- `sonar-project.properties` y la configuración de Cypress.
- `.github/workflows/e2e.yml` (workflow `Sprint 04 E2E`).

## 3. Arquitectura de las pruebas

La suite se ubica dentro del frontend, separada del código de producción:

```text
frontend/
├── e2e/
│   ├── auth.spec.js              # login sin credenciales (existente)
│   ├── dashboard.spec.js         # protección de /dashboard (existente)
│   ├── coverage.spec.js          # cobertura Istanbul para Sonar (existente, sin cambios)
│   ├── flujos-criticos.spec.js   # E2E-01 a E2E-11: HU-09, HU-10 y HU-11
│   ├── resiliencia.spec.js       # RES-01 a RES-06: fallos HTTP y de red
│   ├── rendimiento.spec.js       # PERF-01 y PERF-02: TTFB, FCP y LCP
│   ├── api-backend.spec.js       # API-01 a API-08: backend real y tiempos de respuesta
│   └── support/
│       └── api-simulada.js       # API simulada con datos controlados
├── playwright.config.js
└── package.json
```

Las pruebas de flujos, resiliencia y rendimiento usan una API simulada (`page.route`), por eso dan el mismo resultado en los tres navegadores y en CI, donde no hay backend ni base de datos. Las pruebas `api-backend.spec.js` se ejecutan contra el backend real solo cuando se definen sus variables de entorno (sección 5.1).

### 3.1. Navegadores evaluados y tasas de éxito/fallo

| Navegador | Motor | Uso | Ejecución | Tasa de éxito | Tasa de fallo |
|---|---|---|---|---|---|
| Chromium | Chromium | Flujo principal y ejecución en CI | 27 de 28 (1 omitida) | 100 % (27/27 ejecutadas) | 0 % |
| Firefox | Firefox | Compatibilidad de formularios y vistas | Pendiente | No medida | No medida |
| WebKit | WebKit | Compatibilidad del motor utilizado por Safari | Pendiente | No medida | No medida |

**Tasa global de la suite:** 96,4 % (27 aprobadas de 28 declaradas). Ninguna prueba falló en Chromium.

Firefox y WebKit no se pudieron instalar en el ambiente de verificación porque el proxy de salida bloqueó la descarga de sus binarios. Se ejecutarán en el workflow `Sprint 04 E2E` con el mismo comando que Chromium. Sus resultados deben registrarse en esta tabla al terminar la ejecución.

### 3.2. Configuración de Playwright

Instalar desde la carpeta `frontend`:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Configuración vigente en `frontend/playwright.config.js`. Es la que se ejecutó en la revisión y reemplaza a la configuración sugerida de la versión 1.0.0:

```javascript
/* global process */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
```

La configuración incluye los tres proyectos de navegador, el reporte HTML, trazas y capturas ante fallos, y levanta el frontend con `webServer` cuando no se define `PLAYWRIGHT_BASE_URL`. Si se define `PLAYWRIGHT_BASE_URL`, las pruebas se ejecutan contra la URL indicada, por ejemplo un despliegue en Vercel.

## 4. Casos E2E

### 4.1. Casos de prueba críticos

Los casos cubren autenticación, flujos de negocio de HU-09, HU-10 y HU-11, y validaciones. E2E-03 y E2E-06 se verifican en las pruebas de resiliencia y de API.

| ID | Historia | Caso | Resultado esperado |
|---|---|---|---|
| E2E-01 | Acceso | Iniciar sesión con usuario válido | El sistema permite el ingreso y muestra la vista autorizada. |
| E2E-02 | HU-09 | Abrir el Dashboard | Se cargan indicadores y no aparece el estado de error. |
| E2E-03 | HU-09 | Simular indisponibilidad de API | Se presenta un mensaje de error y la opción de reintentar. |
| E2E-04 | HU-10 | Consultar reportes | Se presenta la lista o el mensaje de ausencia de registros. |
| E2E-05 | HU-10 | Solicitar un tipo de reporte permitido | El backend registra el tipo solicitado y responde correctamente. |
| E2E-06 | HU-10 | Solicitar un tipo no permitido | El backend devuelve validación HTTP 422. |
| E2E-07 | HU-11 | Consultar impacto ambiental | Se muestran emisiones y equivalencia de árboles. |
| E2E-08 | HU-11 | Calcular compensación con permiso de escritura | Se registra el plan y se actualiza la lista. |
| E2E-09 | HU-11 | Intentar escribir sin permiso | El backend rechaza la operación según la política de autorización. |
| E2E-10 | Navegación | Recorrer los módulos principales del administrador | Cada módulo carga sin error. |
| E2E-11 | HU-11 | Visualizar la ruta generada | La ruta aparece en el módulo de rutas. |
| AUTH-01 | Acceso | Enviar el login sin credenciales | La aplicación permanece en la pantalla de acceso. |
| AUTH-02 | Acceso | Abrir `/dashboard` sin sesión | La aplicación muestra la protección de acceso. |
| VAL-01 | HU-10 | Enviar un tipo de reporte no válido por API | El backend devuelve HTTP 422 con el detalle del error. |
| VAL-02 | HU-11 | Escribir plan de compensación sin permiso (rol AUDITOR) | El backend devuelve HTTP 403. |

Los casos que escriben información deben utilizar una base de datos de pruebas y datos controlados. No deben ejecutarse sobre producción si generan registros permanentes.

### 4.2. Resultado de los flujos críticos

Ejecución del 20 de noviembre de 2026 en Chromium, con el servidor de desarrollo de Vite (`webServer` de la configuración) y un backend local con PostgreSQL 16 + PostGIS de pruebas.

| ID | Prueba automatizada | Interfaz (Playwright) | Backend real | Resultado |
|---|---|---|---|---|
| E2E-01 | `flujos-criticos.spec.js` | Login con usuario válido redirige a `/dashboard` y guarda el token | – | Aprobada |
| E2E-02 | `flujos-criticos.spec.js` | Se ven las secciones de indicadores y no aparece el estado de error | `GET /dashboard` 200 | Aprobada |
| E2E-03 | `resiliencia.spec.js` (RES-01) | HTTP 500 muestra el error y el botón **Reintentar** recupera el Dashboard | – | Aprobada |
| E2E-04 | `flujos-criticos.spec.js` | Se muestra “No hay reportes generados.” | `GET /reportes` 200 | Aprobada |
| E2E-05 | `flujos-criticos.spec.js` / API-05 | El reporte de sostenibilidad aparece en la lista | `POST /reportes?tipo=SOSTENIBILIDAD` 201 | Aprobada |
| E2E-06 | `resiliencia.spec.js` (RES-04) / API-04 | El mensaje de validación se muestra sin romper la pantalla | `POST /reportes?tipo=NO_PERMITIDO` 422 | Aprobada |
| E2E-07 | `flujos-criticos.spec.js` | Se muestran “CO₂ emitido” y “Árboles equivalentes” | `GET /sostenibilidad/impacto` 200 | Aprobada |
| E2E-08 | `flujos-criticos.spec.js` / API-06 | El plan se registra y aparece en la tabla | `POST /sostenibilidad/compensacion` 201 (200 si ya existe ese día) | Aprobada |
| E2E-09 | `flujos-criticos.spec.js` / API-07 | Con rol AUDITOR se muestra el rechazo | `POST /sostenibilidad/compensacion` 403 | Aprobada |
| E2E-10 | `flujos-criticos.spec.js` | Navegación por los módulos principales del administrador | – | Aprobada |
| E2E-11 | `flujos-criticos.spec.js` | La ruta generada se visualiza en el módulo de rutas | – | Aprobada |

**Resumen en Chromium:** 27 pruebas aprobadas, 0 fallidas, 1 omitida (`coverage.spec.js`). Duración total: 42,5 s con un solo worker. Los flujos críticos HU-09, HU-10 y HU-11 quedaron en **100 % de éxito**.

La repetición de las pruebas (`--repeat-each`) no se ejecutó en esta revisión. Queda como mejora para detectar fallas intermitentes.

### 4.3. Código fuente relevante

Las pruebas de flujos, resiliencia y rendimiento usan `e2e/support/api-simulada.js`, que responde en el navegador las peticiones al backend con datos controlados. Ejemplo de la prueba RES-01, que simula un HTTP 500 y verifica el botón de reintento:

```javascript
test('RES-01 E2E-03 con la API caída (HTTP 500) el Dashboard avisa y permite reintentar', async ({ page }) => {
  await sesionIniciada(page)
  let fallar = true
  await apiSimulada(page, {
    '/dashboard': (_peticion, datos) => (fallar
      ? { status: 500, json: { detail: 'Error interno del servidor' } }
      : { status: 200, json: datos['/dashboard'] }),
  })
  await page.goto('/dashboard')

  await expect(page.getByText('No se pudieron cargar los indicadores.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()

  fallar = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Operación logística' })).toBeVisible()
})
```

### 4.4. Cobertura de validaciones de formularios

La cobertura de validaciones es parcial:

- **En la interfaz:** AUTH-01 envía el login sin credenciales. La prueba confirma que la página sigue visible, pero no verifica un mensaje de error específico.
- **En la API:** VAL-01 y API-04 comprueban el rechazo de un tipo de reporte no permitido (HTTP 422). VAL-02 y API-07 comprueban el rechazo por permisos (HTTP 403).
- **Pendiente:** no hay pruebas que llenen formularios de creación de pedidos, clientes o vehículos con datos inválidos y verifiquen el mensaje de cada campo.

## 5. Endpoints que deben verificarse

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/dashboard` | Indicadores generales. |
| GET | `/indicadores` | Indicadores asociados a rutas. |
| GET | `/sostenibilidad/impacto` | Emisiones y equivalencia ambiental. |
| GET | `/sostenibilidad/compensacion` | Listado de planes. |
| POST | `/sostenibilidad/compensacion` | Registro de un plan calculado. |
| GET | `/reportes` | Listado de reportes. |
| POST | `/reportes?tipo=SOSTENIBILIDAD&id_ruta=1` | Registro de reporte para una ruta existente. |
| GET | `/reportes/consolidado` | Totales y detalle consolidado de rutas. |
| GET | `/health` | Estado del backend y conexión con PostgreSQL. |

Las rutas protegidas requieren un token válido y permisos adecuados. El identificador de ruta del ejemplo debe reemplazarse por uno existente en la base de pruebas.

### 5.1. Tiempos de respuesta de la API

`api-backend.spec.js` (API-08) llama 10 veces a cada endpoint de lectura con un token válido y mide la duración desde Playwright. Límite: **p95 < 500 ms**.

| Endpoint | HTTP | Mín. (ms) | Promedio (ms) | p95 (ms) | Máx. (ms) | Cumple < 500 ms |
|---|---|---|---|---|---|---|
| `GET /health` | 200 | 2 | 3 | 4 | 4 | Sí |
| `GET /dashboard` | 200 | 5 | 6 | 9 | 9 | Sí |
| `GET /indicadores` | 200 | 3 | 3 | 5 | 5 | Sí |
| `GET /sostenibilidad/impacto` | 200 | 3 | 3 | 4 | 4 | Sí |
| `GET /sostenibilidad/compensacion` | 200 | 3 | 4 | 6 | 6 | Sí |
| `GET /reportes` | 200 | 3 | 4 | 5 | 5 | Sí |
| `GET /reportes/consolidado` | 200 | 3 | 4 | 6 | 6 | Sí |

Ambiente: backend Node.js 22 y PostgreSQL 16 + PostGIS en la misma máquina (red local, sin latencia de internet). En Render y Neon los tiempos serán mayores por la red. Para medirlos se ejecuta la misma prueba con `E2E_API_URL` apuntando al backend de pruebas desplegado.

Para ejecutar estas pruebas contra el backend real:

```bash
cd frontend
E2E_API_URL=http://127.0.0.1:8000 E2E_EMAIL=admin@ecolima.com E2E_PASSWORD=<clave> \
E2E_AUDITOR_EMAIL=auditor@ecolima.com E2E_AUDITOR_PASSWORD=<clave> \
E2E_PERMITIR_ESCRITURA=1 npx playwright test e2e/api-backend.spec.js --project=chromium
```

`E2E_PERMITIR_ESCRITURA=1` solo debe usarse con una base de pruebas, porque API-05 y API-06 registran datos. Sin las variables, estas pruebas se omiten.

## 6. Monitoreo de rendimiento

La evaluación registra las siguientes métricas, indicando navegador, ambiente, fecha, número de ejecuciones y condiciones de red:

| Métrica | Qué representa | Método de medición |
|---|---|---|
| TTFB | Tiempo hasta el primer byte de respuesta | Resource Timing / Navigation Timing |
| FCP | Primera representación de contenido | PerformanceObserver |
| LCP | Representación del elemento de contenido principal | PerformanceObserver |
| API response time | Duración de las solicitudes a la API | Tiempos de solicitudes observados por Playwright |
| HTTP status | Código de respuesta de cada endpoint | Eventos de respuesta de Playwright |

### 6.1. Resultados de Web Vitals

`rendimiento.spec.js` carga cada página 3 veces y reporta la mediana. Umbrales “buenos” de Google: TTFB ≤ 800 ms, FCP ≤ 1800 ms, LCP ≤ 2500 ms. Cada ejecución adjunta `metricas-web-vitals.json` al reporte HTML.

| Prueba | Página | Navegador | Ambiente | TTFB (ms) | FCP (ms) | LCP (ms) | Resultado |
|---|---|---|---|---|---|---|---|
| PERF-01 | Inicio de sesión | Chromium | Build de producción (`vite preview`), 19/11 | 14 | 176 | 176 | Cumple |
| PERF-02 | Dashboard (HU-09) | Chromium | Build de producción (`vite preview`), 19/11 | 8 | 244 | 492 | Cumple |
| PERF-01 | Inicio de sesión | Chromium | Servidor de desarrollo Vite (modo CI), 19/11 | 10 | 492 | 492 | Cumple |
| PERF-02 | Dashboard (HU-09) | Chromium | Servidor de desarrollo Vite (modo CI), 19/11 | 9 | 488 | 728 | Cumple |
| PERF-01 | Inicio de sesión | Chromium | Servidor de desarrollo Vite (webServer), 20/11 | 8 | 468 | 468 | Cumple |
| PERF-02 | Dashboard (HU-09) | Chromium | Servidor de desarrollo Vite (webServer), 20/11 | 6 | 464 | 752 | Cumple |

Condiciones: 19 y 20 de noviembre de 2026, 3 ejecuciones por página, red local, ventana 1280 × 720 (Desktop Chrome). El servidor de desarrollo sirve los módulos sin empaquetar, por eso su FCP es mayor que el del build. En WebKit, si el motor no expone LCP, la prueba registra `null` para esa métrica y valida TTFB y FCP.

### 6.2. Verificación de las correcciones de defectos (20/11)

Para comprobar los defectos de la sección 10, se ejecutaron dos peticiones reales contra el backend de pruebas, con el parche de correcciones aplicado sobre `main`:

| Defecto | Petición | Antes | Después |
|---|---|---|---|
| D1 – `ST_MakePoint` sin tipo | `POST /pedidos` con datos válidos | HTTP 500 | HTTP 201 |
| D2 – `ST_Y` sobre geography | `POST /rutas/optimizar` con 1 pedido pendiente | HTTP 500 | HTTP 200, una ruta planificada |

El log del backend no registró errores SQL durante la suite. Las correcciones están en un parche verificado localmente; todavía no están en la rama `main`.

## 7. Disponibilidad y resiliencia

Se ejecutan comprobaciones para:

- Confirmar que `GET /health` responda HTTP 200 cuando el backend y PostgreSQL estén disponibles.
- Confirmar que una ruta inexistente responda HTTP 404.
- Verificar que una solicitud sin autenticación no acceda a recursos protegidos.
- Verificar que los errores de validación respondan con el código correspondiente.
- Simular una falla de red y comprobar que la interfaz informe el problema sin bloquearse.
- Registrar el tiempo de respuesta y la disponibilidad durante el periodo de observación.

El uptime debe calcularse a partir de un intervalo de monitoreo definido y de registros reales. Una única consulta satisfactoria no permite afirmar un porcentaje de disponibilidad.

### 7.1. Resultado de las comprobaciones

| ID | Comprobación | Resultado obtenido | Estado |
|---|---|---|---|
| API-01 | `GET /health` con backend y PostgreSQL disponibles | HTTP 200 `{"status":"ok","database":"connected"}` | Aprobada |
| API-02 | Ruta inexistente del backend | HTTP 404 | Aprobada |
| API-03 | Solicitudes sin token a los 6 endpoints protegidos | HTTP 401 en todos | Aprobada |
| API-04 | Tipo de reporte no permitido | HTTP 422 | Aprobada |
| API-05 | Tipo de reporte permitido | HTTP 201 | Aprobada |
| API-06 | Plan de compensación | HTTP 201 (200 si ya existe ese día) | Aprobada |
| API-07 | Escritura con rol AUDITOR | HTTP 403 | Aprobada |
| API-08 | Tiempos de respuesta de los endpoints de lectura | p95 entre 4 y 9 ms, todos < 500 ms | Aprobada |
| RES-01 | Dashboard con la API respondiendo HTTP 500 | Mensaje de error y botón **Reintentar**; al reintentar carga los indicadores | Aprobada |
| RES-02 | Falla de red en Clientes (`route.abort`) | “No se pudo conectar con el servidor” y la navegación sigue funcionando | Aprobada |
| RES-03 | Sesión vencida (HTTP 401) | Vuelve al login (`?sesion=expirada`) y borra el token | Aprobada |
| RES-04 | Error de validación HTTP 422 en reportes | El mensaje se muestra y la pantalla sigue disponible | Aprobada |
| RES-05 | Ruta inexistente del frontend | Redirige a `/dashboard` | Aprobada |
| RES-06 | Respuestas 500 y 503 en Dashboard, Rutas y Operación | 0 errores de JavaScript en el navegador | Aprobada |

### 7.2. Disponibilidad en el entorno desplegado

No se reporta un porcentaje de uptime. Las comprobaciones de las secciones 7.1 y 5.1 son puntuales y no permiten afirmar disponibilidad.

Desde el ambiente de verificación, tres intentos a cada URL desplegada no obtuvieron respuesta (código HTTP 000):

- `https://ecolima-backend.onrender.com/health` (Render): 3 de 3 intentos sin respuesta.
- `https://ecolima-frontend-seven.vercel.app/` (Vercel): 3 de 3 intentos sin respuesta.

Ese resultado indica que el ambiente de verificación no tiene salida a esas URL. No prueba que los servicios estén caídos.

**Protocolo propuesto para medir uptime:** consultar `GET /health` cada 5 minutos durante 7 días desde una red con acceso, registrar cada respuesta con su hora y calcular `uptime = respuestas HTTP 200 / total de consultas`. El resultado se agrega en esta sección cuando termine el periodo de observación.

## 8. Reportes y evidencias

Evidencias visuales capturadas el 19 de noviembre de 2026:

- [Interfaz pública desplegada](./evidencias/frontend-raiz.png)
- [Respuesta de salud del backend](./evidencias/backend-health.png)
- [Reporte HTML de Playwright: resumen de 27 pruebas aprobadas](./evidencias/playwright-reporte-resumen.png)
- [Reporte HTML de Playwright: métricas Web Vitals del Dashboard](./evidencias/playwright-web-vitals-dashboard.png)
- [Reporte HTML de Playwright: tiempos de respuesta de la API](./evidencias/playwright-tiempos-api.png)

![Reporte HTML de Playwright](./evidencias/playwright-reporte-resumen.png)

Evidencias de la revisión del 20 de noviembre de 2026, incluidas en la entrega junto con este documento:

- `reporte-html-playwright.zip`: reporte HTML completo de la ejecución en Chromium (27 aprobadas, 1 omitida). Abrir `index.html`.
- Captura del resumen del reporte HTML, con la lista de pruebas y los contadores.
- Captura del detalle de API-08, con los 10 llamados a cada endpoint y sus tiempos.
- Captura de los pasos de E2E-05, la generación de un reporte de sostenibilidad.

Después de incorporar y ejecutar Playwright:

```bash
npx playwright test
npx playwright show-report
```

Se debe conservar como evidencia:

- Reporte HTML de Playwright.
- Capturas de los casos fallidos o de los pasos relevantes.
- Trazas de las pruebas que presenten errores.
- Resumen de pruebas aprobadas, fallidas y omitidas.
- Métricas de rendimiento por navegador.
- Fecha, ambiente y versión del commit evaluado.

Los directorios `playwright-report/` y `test-results/` deben mantenerse fuera del control de versiones si se generan localmente; en CI deben publicarse como artifacts. Ambos ya están en `.gitignore`, y el workflow `Sprint 04 E2E` publica `frontend/playwright-report/` como artifact.

## 9. Resultado de la revisión

| Aspecto | Estado verificado |
|---|---|
| Frontend React/Vite | Presente |
| Cypress | Conservado |
| Playwright | Instalado (`1.65.1`) |
| Configuración Playwright | Implementada (Chromium, Firefox y WebKit) |
| Prueba de protección de `/dashboard` | Aprobada en Chromium |
| Prueba de autenticación visual | Aprobada en Chromium |
| Flujos críticos HU-09, HU-10 y HU-11 (E2E-01 a E2E-11) | 100 % aprobados en Chromium |
| Resiliencia ante fallos HTTP y de red (RES-01 a RES-06) | Aprobada en Chromium |
| Backend real: códigos HTTP y permisos (API-01 a API-07) | Aprobado |
| Tiempos de respuesta de la API | p95 entre 4 y 9 ms, todos < 500 ms |
| Backend Node | 45 pruebas aprobadas |
| Frontend build | Aprobado |
| Firefox y WebKit | Configurados en `playwright.config.js` y en CI; resultado pendiente de la ejecución del workflow `Sprint 04 E2E` |
| Métricas TTFB, FCP y LCP | Medidas en Chromium (sección 6.1), todas dentro de los umbrales |
| Defectos D1 y D2 | Corregidos en el parche verificado (sección 6.2); pendientes de incorporar a `main` |
| Uptime en entorno desplegado | No medido; protocolo propuesto en la sección 7.2 |
| Reporte HTML Playwright | Generado; capturas en `evidencias/`; artifacts configurados en CI |

## 10. Conclusión

La suite Playwright quedó ampliada a 28 pruebas: flujos críticos de HU-09, HU-10 y HU-11, autenticación, validaciones de API, resiliencia ante fallos HTTP y de red, Web Vitals y pruebas contra el backend real. En Chromium se aprobaron 27 de 27 pruebas ejecutadas. Los flujos críticos, las comprobaciones de disponibilidad y resiliencia, y los tiempos de respuesta de la API quedaron dentro de sus umbrales.

Firefox y WebKit quedaron preparados en configuración y CI, pero su resultado todavía no se registró. Debe agregarse a la tabla de la sección 3.1 después de la ejecución del workflow. Las métricas medidas corresponden a un entorno local; las del entorno desplegado y el SUS requieren mediciones y participantes reales, y no se presentan valores fabricados.

Las validaciones de formularios cubren el login sin credenciales y los rechazos de la API (422 y 403). Falta cubrir el mensaje de error por campo en los formularios de pedidos, clientes y vehículos.

Fuera del alcance de HU-09, HU-10 y HU-11, las pruebas de calidad del sistema completo detectaron los siguientes defectos:

- **D1 (corregido en el parche):** registrar pedidos, incidentes, obstáculos o la ubicación del local respondía HTTP 500 (`inconsistent types deduced for parameter`) por el uso de `ST_MakePoint` con parámetros sin tipo. Ahora `POST /pedidos` responde 201.
- **D2 (corregido en el parche):** `POST /rutas/optimizar` respondía HTTP 500 (`function st_y(geography) does not exist`) en `backend/src/services/optimizationData.js`. Ahora responde 200.
- **D3 (cerrado por el equipo):** la vista de Operación esperaba un arreglo y recibía `{data: [...]}`.
- **D4 (corrección aplicada, sin verificación visual):** en pantallas de celular, el menú lateral queda abierto sobre el contenido porque la animación de entrada mantiene su posición final. El cambio está en `BarraLateral.css`. Falta comprobarlo en un viewport móvil.

---

## Historial de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 19/11/2026 | Versión inicial de la suite y del análisis. |
| 1.1.0 | 20/11/2026 | Resultados de la reejecución en Chromium; configuración vigente de Playwright; tasas de éxito y fallo por navegador; casos de autenticación y validación; código fuente relevante; verificación de D1 y D2; estado de uptime en el entorno desplegado; evidencias del 20/11. |

**Versión del documento:** 1.1.0

