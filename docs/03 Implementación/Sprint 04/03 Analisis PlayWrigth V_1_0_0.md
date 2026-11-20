[← Volver al README principal](../../../README.md)

# 03. Análisis de pruebas E2E y monitoreo con Playwright

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.0.0  
**Fecha de revisión del repositorio:** 19 de noviembre de 2026  
**Commit evaluado:** `f345e19` (rama `main`)

---

## 1. Objetivo

Definir y documentar la estrategia de pruebas End-to-End (E2E) para HU-09, HU-10 y HU-11, incluyendo la configuración de Playwright, los flujos críticos, el monitoreo de rendimiento y la verificación de disponibilidad.

## 2. Estado técnico verificado

- Frontend React/Vite y Cypress continúan presentes.
- Playwright `1.65.1` fue agregado como dependencia de desarrollo.
- Existe `frontend/playwright.config.js` con los proyectos `chromium`, `firefox` y `webkit`.
- Las pruebas se encuentran en `frontend/e2e/`: 28 pruebas en 7 archivos (detalle en la sección 3).
- Chromium fue instalado y ejecutado: 27 pruebas aprobadas, 0 fallidas y 1 omitida a propósito (`coverage.spec.js`, que solo corre en el workflow de Sonar).
- Firefox y WebKit están declarados en la configuración y en el workflow de CI (`.github/workflows/e2e.yml`).
- El backend mantiene 45 pruebas Node `node:test` aprobadas al corte.
- La cobertura de Sonar no se modifica: `frontend/e2e/` está fuera de `sonar.sources` y `coverage.spec.js` se conserva sin cambios.

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

Las pruebas de flujos, resiliencia y rendimiento usan una API simulada (`page.route`), por eso dan el mismo resultado en los tres navegadores y en CI, donde no hay backend ni base de datos. Las pruebas `api-backend.spec.js` se ejecutan contra el backend real solo cuando se definen sus variables de entorno (sección 5).

### 3.1. Navegadores

La configuración objetivo debe contemplar:

| Navegador | Motor | Uso |
|---|---|---|
| Chromium | Chromium | Flujo principal y ejecución en CI |
| Firefox | Firefox | Compatibilidad de formularios y vistas |
| WebKit | WebKit | Compatibilidad del motor utilizado por Safari |

La ejecución en los tres navegadores debe confirmarse después de instalar los navegadores de Playwright. Chromium quedó confirmado localmente (sección 4.1). Firefox y WebKit se ejecutan en el workflow `Sprint 04 E2E` con el mismo comando.

### 3.2. Configuración inicial sugerida

Instalar desde la carpeta `frontend`:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Configuración inicial para `frontend/playwright.config.js`:

```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
```

La configuración vigente en el repositorio ya incorpora los tres proyectos, el reporte HTML, trazas y capturas ante fallos, y levanta el frontend con `webServer` cuando no se define `PLAYWRIGHT_BASE_URL`. No fue necesario modificarla para la ampliación de la suite.

## 4. Casos E2E propuestos

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

Los casos que escriben información deben utilizar una base de datos de pruebas y datos controlados. No deben ejecutarse sobre producción si generan registros permanentes.

### 4.1. Resultado de los flujos críticos

Ejecución del 19 de noviembre de 2026 en Chromium, sobre el build de producción del frontend (`vite build`) y un backend local con PostgreSQL 16 + PostGIS de pruebas.

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
| E2E-10 | `flujos-criticos.spec.js` | Navegación por los 7 módulos del administrador | – | Aprobada |
| E2E-11 | `flujos-criticos.spec.js` | La ruta generada se visualiza en el módulo de rutas | – | Aprobada |

**Resumen en Chromium:** 27 pruebas aprobadas, 0 fallidas, 1 omitida (`coverage.spec.js`). Flujos críticos HU-09, HU-10 y HU-11: **100 % de éxito**. Duración total: 35,8 s. Las 15 pruebas de flujos críticos y resiliencia se repitieron 3 veces seguidas (`--repeat-each=3`) sin fallas intermitentes.

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
| `GET /health` | 200 | 2 | 3 | 5 | 5 | Sí |
| `GET /dashboard` | 200 | 5 | 6 | 7 | 7 | Sí |
| `GET /indicadores` | 200 | 3 | 3 | 5 | 5 | Sí |
| `GET /sostenibilidad/impacto` | 200 | 3 | 3 | 4 | 4 | Sí |
| `GET /sostenibilidad/compensacion` | 200 | 3 | 3 | 6 | 6 | Sí |
| `GET /reportes` | 200 | 3 | 4 | 5 | 5 | Sí |
| `GET /reportes/consolidado` | 200 | 3 | 4 | 8 | 8 | Sí |

Ambiente: backend Node.js 22 y PostgreSQL 16 + PostGIS en la misma máquina (red local, sin latencia de internet). En Render y Neon los tiempos serán mayores por la red; para medirlos se ejecuta la misma prueba con `E2E_API_URL` apuntando al backend de pruebas desplegado.

Para ejecutar estas pruebas contra el backend real:

```bash
cd frontend
E2E_API_URL=http://127.0.0.1:8000 E2E_EMAIL=admin@ecolima.com E2E_PASSWORD=<clave> \
E2E_AUDITOR_EMAIL=auditor@ecolima.com E2E_AUDITOR_PASSWORD=<clave> \
E2E_PERMITIR_ESCRITURA=1 npx playwright test e2e/api-backend.spec.js --project=chromium
```

`E2E_PERMITIR_ESCRITURA=1` solo debe usarse con una base de pruebas, porque API-05 y API-06 registran datos. Sin las variables, estas pruebas se omiten.

## 6. Monitoreo de rendimiento

La evaluación debe registrar las siguientes métricas, indicando navegador, ambiente, fecha, número de ejecuciones y condiciones de red:

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
| PERF-01 | Inicio de sesión | Chromium | Build de producción (`vite preview`) | 14 | 176 | 176 | Cumple |
| PERF-02 | Dashboard (HU-09) | Chromium | Build de producción (`vite preview`) | 8 | 244 | 492 | Cumple |
| PERF-01 | Inicio de sesión | Chromium | Servidor de desarrollo Vite (modo CI) | 10 | 492 | 492 | Cumple |
| PERF-02 | Dashboard (HU-09) | Chromium | Servidor de desarrollo Vite (modo CI) | 9 | 488 | 728 | Cumple |

Condiciones: 19 de noviembre de 2026, 3 ejecuciones por página, red local, ventana 1280 × 720 (Desktop Chrome). El servidor de desarrollo sirve los módulos sin empaquetar, por eso su FCP es mayor que el del build. En WebKit, si el motor no expone LCP, la prueba registra `null` para esa métrica y valida TTFB y FCP.

## 7. Disponibilidad y resiliencia

Se deben ejecutar comprobaciones para:

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
| API-07 | Escritura con rol AUDITOR | HTTP 403 | Aprobada |
| RES-01 | Dashboard con la API respondiendo HTTP 500 | Mensaje de error y botón **Reintentar**; al reintentar carga los indicadores | Aprobada |
| RES-02 | Falla de red en Clientes (`route.abort`) | “No se pudo conectar con el servidor” y la navegación sigue funcionando | Aprobada |
| RES-03 | Sesión vencida (HTTP 401) | Vuelve al login (`?sesion=expirada`) y borra el token | Aprobada |
| RES-04 | Error de validación HTTP 422 en reportes | El mensaje se muestra y la pantalla sigue disponible | Aprobada |
| RES-05 | Ruta inexistente del frontend | Redirige a `/dashboard` | Aprobada |
| RES-06 | Respuestas 500 y 503 en Dashboard, Rutas y Operación | 0 errores de JavaScript en el navegador | Aprobada |

No se informa un porcentaje de uptime: las comprobaciones anteriores son puntuales. Para calcularlo se debe programar `GET /health` en un intervalo fijo sobre el backend desplegado y registrar las respuestas.

## 8. Reportes y evidencias

Evidencias visuales capturadas el 19 de noviembre de 2026:

- [Interfaz pública desplegada](./evidencias/frontend-raiz.png)
- [Respuesta de salud del backend](./evidencias/backend-health.png)
- [Reporte HTML de Playwright: resumen de 27 pruebas aprobadas](./evidencias/playwright-reporte-resumen.png)
- [Reporte HTML de Playwright: métricas Web Vitals del Dashboard](./evidencias/playwright-web-vitals-dashboard.png)
- [Reporte HTML de Playwright: tiempos de respuesta de la API](./evidencias/playwright-tiempos-api.png)

![Reporte HTML de Playwright](./evidencias/playwright-reporte-resumen.png)

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
| Tiempos de respuesta de la API | p95 entre 4 y 8 ms, todos < 500 ms |
| Backend Node | 45 pruebas aprobadas |
| Frontend build | Aprobado |
| Firefox y WebKit | Configurados en `playwright.config.js` y en CI; resultado pendiente de la ejecución del workflow `Sprint 04 E2E` |
| Métricas TTFB, FCP y LCP | Medidas en Chromium (sección 6.1), todas dentro de los umbrales |
| Reporte HTML Playwright | Generado; capturas en `evidencias/`; artifacts configurados en CI |

## 10. Conclusión

La suite Playwright quedó ampliada a 28 pruebas: flujos críticos de HU-09, HU-10 y HU-11, resiliencia ante fallos HTTP y de red, Web Vitals y pruebas contra el backend real. En Chromium se aprobaron el 100 % de los flujos críticos, todas las comprobaciones de disponibilidad y resiliencia, y los tiempos de respuesta de la API quedaron muy por debajo de 500 ms. Firefox y WebKit quedaron preparados en configuración y CI; su resultado debe registrarse en este documento después de la ejecución del workflow. Las métricas medidas corresponden a un entorno local; las del entorno desplegado y el SUS requieren mediciones y participantes reales, y no se presentan valores fabricados.

Fuera del alcance de HU-09, HU-10 y HU-11, las pruebas de calidad del sistema completo detectaron defectos que no se corrigieron en este sprint porque requieren cambiar código funcional:

- Registrar pedidos, incidentes, obstáculos o la ubicación del local responde HTTP 500 (`inconsistent types deduced for parameter`) por el uso de `ST_MakePoint` con parámetros sin tipo.
- `POST /rutas/optimizar` responde HTTP 500 (`function st_y(geography) does not exist`) en `backend/src/services/optimizationData.js`.
- En pantallas de celular, el menú lateral queda abierto sobre el contenido porque la animación de entrada mantiene su posición final.

---

**Versión del documento:** 1.0.0
