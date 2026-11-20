[← Volver al README principal](../../../README.md)

# 03. Análisis de pruebas E2E y monitoreo con Playwright

**Proyecto:** EcoLogística Lima – EcoLima  
**Sprint:** Sprint 4  
**Versión:** 1.0.0  
**Fecha de revisión del repositorio:** 19 de noviembre de 2026

---

## 1. Objetivo

Definir y documentar la estrategia de pruebas End-to-End (E2E) para HU-09, HU-10 y HU-11, incluyendo la configuración de Playwright, los flujos críticos, el monitoreo de rendimiento y la verificación de disponibilidad.

## 2. Estado técnico verificado

- Frontend React/Vite y Cypress continúan presentes.
- Playwright fue agregado como dependencia de desarrollo.
- Existe `frontend/playwright.config.js`.
- Las pruebas se encuentran en `frontend/e2e/`.
- Chromium fue instalado y ejecutado.
- Firefox y WebKit están declarados en la configuración y en el workflow de CI.
- El backend mantiene 34 pruebas Node `node:test` aprobadas al corte.

## 3. Arquitectura propuesta para las pruebas

La suite debe ubicarse dentro del frontend, separada del código de producción:

```text
frontend/
├── e2e/
│   ├── auth.spec.js
│   ├── dashboard.spec.js
│   ├── reportes.spec.js
│   └── compensacion.spec.js
├── playwright.config.js
└── package.json
```

### 3.1. Navegadores

La configuración objetivo debe contemplar:

| Navegador | Motor | Uso |
|---|---|---|
| Chromium | Chromium | Flujo principal y ejecución en CI |
| Firefox | Firefox | Compatibilidad de formularios y vistas |
| WebKit | WebKit | Compatibilidad del motor utilizado por Safari |

La ejecución en los tres navegadores debe confirmarse después de instalar los navegadores de Playwright.

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

La configuración es una propuesta para incorporar al proyecto; todavía no forma parte de los archivos verificados del repositorio.

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

## 6. Monitoreo de rendimiento

La evaluación debe registrar las siguientes métricas, indicando navegador, ambiente, fecha, número de ejecuciones y condiciones de red:

| Métrica | Qué representa | Método de medición |
|---|---|---|
| TTFB | Tiempo hasta el primer byte de respuesta | Resource Timing / Navigation Timing |
| FCP | Primera representación de contenido | PerformanceObserver |
| LCP | Representación del elemento de contenido principal | PerformanceObserver |
| API response time | Duración de las solicitudes a la API | Tiempos de solicitudes observados por Playwright |
| HTTP status | Código de respuesta de cada endpoint | Eventos de respuesta de Playwright |

No se consignan valores numéricos porque todavía no se dispone de una ejecución Playwright verificable en este repositorio. Los resultados deben registrarse después de ejecutar las pruebas en el entorno seleccionado.

## 7. Disponibilidad y resiliencia

Se deben ejecutar comprobaciones para:

- Confirmar que `GET /health` responda HTTP 200 cuando el backend y PostgreSQL estén disponibles.
- Confirmar que una ruta inexistente responda HTTP 404.
- Verificar que una solicitud sin autenticación no acceda a recursos protegidos.
- Verificar que los errores de validación respondan con el código correspondiente.
- Simular una falla de red y comprobar que la interfaz informe el problema sin bloquearse.
- Registrar el tiempo de respuesta y la disponibilidad durante el periodo de observación.

El uptime debe calcularse a partir de un intervalo de monitoreo definido y de registros reales. Una única consulta satisfactoria no permite afirmar un porcentaje de disponibilidad.

## 8. Reportes y evidencias

Evidencias visuales capturadas el 19 de noviembre de 2026:

- [Interfaz pública desplegada](./evidencias/frontend-raiz.png)
- [Respuesta de salud del backend](./evidencias/backend-health.png)

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

Los directorios `playwright-report/` y `test-results/` deben mantenerse fuera del control de versiones si se generan localmente; en CI deben publicarse como artifacts.

## 9. Resultado de la revisión

| Aspecto | Estado verificado |
|---|---|
| Frontend React/Vite | Presente |
| Cypress | Conservado |
| Playwright | Instalado |
| Configuración Playwright | Implementada |
| Prueba de protección de `/dashboard` | Aprobada en Chromium |
| Prueba de autenticación visual | Aprobada en Chromium |
| Backend Node | 34 pruebas aprobadas |
| Frontend build | Aprobado |
| Firefox y WebKit | Configurados para CI; ejecución local completa pendiente |
| Métricas TTFB, FCP y LCP | Pendientes de medición externa repetida |
| Reporte HTML Playwright | Generable con `npm run test:e2e`; artifacts configurados en CI |

## 10. Conclusión

La suite Playwright quedó configurada y dos pruebas locales críticas fueron aprobadas en Chromium. La cobertura HU-09/HU-10/HU-11 debe ampliarse con datos y cuentas de Neon de pruebas antes de declarar las historias completas. Firefox y WebKit quedaron preparados en configuración y CI. Las métricas Web Vitals y el SUS requieren mediciones y participantes reales; no se presentan valores fabricados.

---

**Versión del documento:** 1.0.0
