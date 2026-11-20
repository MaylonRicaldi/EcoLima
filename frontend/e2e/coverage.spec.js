/* global process */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { test, expect } from '@playwright/test'

const apiResponses = {
  '/dashboard': {
    conteos: {
      pedidos: 0,
      pendientes: 0,
      entregados: 0,
      rutas: 0,
      rutas_planificadas: 0,
      rutas_en_curso: 0,
      vehiculos: 0,
      vehiculos_activos: 0,
      conductores: 0,
      conductores_disponibles: 0,
      clientes_activos: 0,
      incidentes_activos: 0,
    },
    operacion: {
      distancia_km: 0,
      duracion_minutos: 0,
      combustible_l: 0,
      costo_total: 0,
      co2_kg: 0,
      rutas: 0,
    },
    ahorro: {
      economico: 0,
      reduccion_distancia_pct: 0,
      reduccion_co2_pct: 0,
      co2_kg: 0,
      combustible_l: 0,
    },
    ventanas: { tiene_datos: false, cumplimiento_pct: 0 },
    sostenibilidad: {
      arboles_equivalentes: 0,
      kg_co2_por_arbol_anio: 22,
      mensaje: 'Sin emisiones',
    },
    flota_por_combustible: [],
    pedidos_por_estado: [],
  },
  '/reportes/consolidado': { rutas: [], totales: {} },
  '/sostenibilidad/impacto': { emitido: 0, evitable: 0 },
  '/sostenibilidad/compensacion': [],
  '/reportes': [],
  '/mapa/rutas': { rutas: [] },
  '/operacion/saturacion': {
    estado: 'HOLGADO',
    motivos: [],
    conductores_disponibles: 0,
    horas_libres_totales: 0,
    carga_kg_libre: 0,
    carga_m3_libre: 0,
  },
  '/clientes': { data: [], pagination: { total: 13, page: 1, limit: 12, totalPages: 2 } },
  '/conductores': { data: [], pagination: { total: 13, page: 1, limit: 12, totalPages: 2 } },
  '/pedidos': { data: [], pagination: { total: 13, page: 1, limit: 12, totalPages: 2 } },
  '/vehiculos': { data: [], pagination: { total: 13, page: 1, limit: 12, totalPages: 2 } },
}
const dashboardRoute = {
  id_ruta: 1,
  fecha: '2026-11-20',
  estado: 'PLANIFICADA',
  distancia_km: 10,
  duracion_minutos: 30,
  combustible_litros: 2,
  costo_total: 20,
  co2_kg: 4,
  algoritmo_utilizado: 'SA',
  pedidos: [],
  asignacion: null,
  indicador: null,
}

function mergeCoverage(target, source) {
  for (const [file, current] of Object.entries(source)) {
    if (!target[file]) {
      target[file] = JSON.parse(JSON.stringify(current))
      continue
    }

    for (const kind of ['s', 'f']) {
      for (const key of Object.keys(current[kind])) {
        target[file][kind][key] += current[kind][key]
      }
    }
    for (const key of Object.keys(current.b)) {
      current.b[key].forEach((count, index) => {
        target[file].b[key][index] += count
      })
    }
  }
}

test('collects coverage from authenticated Sprint 04 modules', async ({ page, browserName }, testInfo) => {
  test.skip(process.env.VITE_COVERAGE !== '1', 'Coverage is collected only by Sonar workflow')
  test.skip(browserName !== 'chromium', 'Istanbul coverage runs in Chromium')

  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'sonar-coverage-token')
    localStorage.setItem('usuario', JSON.stringify({
      usuario_id: 1,
      nombre: 'Sonar',
      email: 'sonar@example.test',
      rol: 'ADMIN',
    }))
  })

  let reportData = []
  let dashboardPage = false
  let routeOptimizationComplete = false
  await page.route('**/*', async (interceptedRoute) => {
    const request = interceptedRoute.request()
    const url = new URL(request.url())
    if (url.port !== '8000') {
      await interceptedRoute.continue()
      return
    }

    if (url.pathname.endsWith('/descargar')) {
      await interceptedRoute.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="coverage.csv"',
        },
        body: 'id_ruta,costo_total\r\n1,10\r\n',
      })
      return
    }
    if (url.pathname === '/reportes' && request.method() === 'POST') {
      const report = { id_reporte: 7, tipo: 'SOSTENIBILIDAD', ruta_archivo: 'coverage.csv' }
      reportData = [report]
      await interceptedRoute.fulfill({ json: report })
      return
    }
    if (url.pathname === '/rutas/optimizar' && request.method() === 'POST') {
      routeOptimizationComplete = true
      await interceptedRoute.fulfill({
        json: {
          rutas_creadas: [{ id_ruta: dashboardRoute.id_ruta }],
          pedidos_no_planificados: [{ id_pedido: 8, motivo: 'Sin conductor' }],
          advertencias: ['Cobertura de prueba'],
          segundos_resueltos: 0.1,
        },
      })
      return
    }
    if (url.pathname === '/reportes') {
      await interceptedRoute.fulfill({ json: reportData })
      return
    }
    if (url.pathname === '/sostenibilidad/compensacion' && request.method() === 'POST') {
      await interceptedRoute.fulfill({
        json: { arboles_necesarios: 1, proyecto_reforestacion: 'Huáscar' },
      })
      return
    }
    if (url.pathname === '/rutas/1') {
      await interceptedRoute.fulfill({ json: dashboardRoute })
      return
    }
    if (url.pathname === '/rutas' && (dashboardPage || routeOptimizationComplete)) {
      await interceptedRoute.fulfill({ json: [dashboardRoute] })
      return
    }

    if (apiResponses[url.pathname]?.pagination && request.method() === 'GET') {
      const response = JSON.parse(JSON.stringify(apiResponses[url.pathname]))
      response.pagination.page = Number(url.searchParams.get('page') ?? 1)
      await interceptedRoute.fulfill({ json: response })
      return
    }

    const response = apiResponses[url.pathname] ?? []
    await interceptedRoute.fulfill({ json: response })
  })

  const coverage = {}
  const pages = [
    ['/dashboard', 'Panel general'],
    ['/clientes', 'Gestión de clientes'],
    ['/conductores', 'Gestión de conductores'],
    ['/pedidos', 'Gestión de pedidos'],
    ['/vehiculos', 'Gestión de vehículos'],
    ['/rutas', 'Optimización de rutas'],
    ['/operacion', 'Tráfico e incidentes'],
  ]

  for (const [pathname, heading] of pages) {
    dashboardPage = pathname === '/dashboard'
    await page.goto(pathname)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await page.waitForTimeout(150)

    if (['/clientes', '/conductores', '/pedidos', '/vehiculos'].includes(pathname)) {
      await page.getByRole('button', { name: 'Siguiente' }).click()
      await expect(page.getByText(/2 de 2/)).toBeVisible()
    }

    if (dashboardPage) {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      await page.getByRole('button', { name: 'Calcular plan de compensación' }).click()
      await expect(page.getByText(/Plan generado:/)).toBeVisible()
      await page.getByRole('button', { name: 'Reporte de sostenibilidad' }).click()
      await expect(page.getByText(/Reporte generado:/)).toBeVisible()
      await page.getByLabel('Ruta del reporte').selectOption('1')
      await page.getByRole('button', { name: 'Reporte de TCO' }).click()
      await expect(page.getByText(/Reporte generado:/)).toBeVisible()
      await page.getByRole('button', { name: 'Descargar CSV' }).click()
    }

    if (pathname === '/rutas') {
      await expect(page.getByText(/No hay rutas generadas/)).toBeVisible()
      await page.getByRole('button', { name: 'Optimizar rutas' }).click()
      await expect(page.getByText(/Se generaron 1 ruta/)).toBeVisible()
      await expect(page.getByText(/Pedido 8:/)).toBeVisible()
    }

    await page.waitForTimeout(100)
    const snapshot = await page.evaluate(() => window.__coverage__ ?? null)
    expect(snapshot).toBeTruthy()
    mergeCoverage(coverage, snapshot)
  }

  const outputDirectory = path.join(process.cwd(), '.nyc_output')
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(
    path.join(outputDirectory, `browser-${testInfo.workerIndex}.json`),
    JSON.stringify(coverage),
  )
})
