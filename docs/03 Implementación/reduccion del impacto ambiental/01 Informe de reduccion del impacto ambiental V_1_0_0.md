# 1. Informe de Reducción del Impacto Ambiental y Optimización (EcoLima)

## 1.1 Introducción y propósito del informe

El presente informe documenta el proceso de auditoría, refactorización y optimización del rendimiento realizado sobre **EcoLima** (EcoLogística Lima), una aplicación web orientada a la planificación y gestión de rutas de distribución urbana de última milla.

La eficiencia computacional influye directamente en la sostenibilidad digital (Green IT): reducir transferencia de datos, evitar renderizados/bloqueos innecesarios y optimizar consultas y respuestas HTTP contribuye a disminuir consumo energético en red, servidores y dispositivos cliente.

**Propósito del documento:**
- Identificar cuellos de botella y oportunidades de mejora en frontend, API y acceso a datos.
- Aplicar refactorizaciones técnicas en 8 áreas estratégicas (consultas/índices, paginación, imágenes/assets, lazy loading/code splitting, dependencias, solicitudes/recursos, caché y compresión HTTP).
- Registrar métricas comparativas **ANTES vs DESPUÉS** provistas por medición del proyecto.

**Stack tecnológico del proyecto (adaptación al contexto):**
- **Frontend:** React 19.2.8 + Vite 8.3.x + React Router 7 + Leaflet.
- **Backend:** Node.js (>=20) + Express 4 + JavaScript (ESM).
- **Base de datos:** PostgreSQL 16.4 + PostGIS.
- **Infraestructura local:** Docker Compose (`postgis/postgis:16-3.4`) y servicios de aplicación en entorno de desarrollo.

## 1.2 Diagnóstico inicial del proyecto (métricas previas)

Las métricas comparativas utilizadas en este informe corresponden a mediciones del proyecto:

### Resumen de métricas de referencia (Estado ANTES):

- **Score Global de Rendimiento (Lighthouse):** 57 / 100
- **First Contentful Paint (FCP):** 3.6 s
- **Largest Contentful Paint (LCP):** 6.8 s
- **Total Blocking Time (TBT):** 60 ms
- **Cumulative Layout Shift (CLS):** 0
- **Peso Total de la Página (Transferencia de Red):** 10.6 kB
- **Número Total de Peticiones HTTP:** 63 solicitudes
- **Tiempo Promedio de Respuesta API Express:** 9.6 ms
- **Estimación de Emisiones de CO2 por Visita:** 0.00364 g CO2e (según modelo SWDM v4)

## 1.3 Detalle técnico de las 8 optimizaciones implementadas

### 1. Optimización de consultas de base de datos (adaptado: PostgreSQL/`pg`)

**Diagnóstico:** en listados, traer todas las columnas/filas y repetir consultas costosas incrementa uso de CPU, memoria y ancho de banda entre API y cliente.

**Implementación en EcoLima:**
- Proyección diferenciada para listados vs detalle en pedidos (`PEDIDO_LIST_COLUMNS` para listado, `PEDIDO_COLUMNS` para detalle) en `backend/src/routes/pedidos.js`.
- Consultas de listado paginado con `LIMIT/OFFSET` y conteo paralelo (`COUNT(*)`) reutilizando el mismo scope/filtros por rol.
- Creación y aplicación de índices adicionales idempotentes para filtros/orden/joins frecuentes en `database/optimizacion_indices.sql` (p.ej. pedidos por estado/fecha y cliente, rutas por estado/fecha, `ruta_pedidos`/`paradas_ruta` por ruta/orden, asignaciones por ruta/conductor/vehículo, obstáculos/incidentes/tráfico, etc.), ajustados al esquema real de PostgreSQL/PostGIS.

**ANTES:**
```js
const { rows } = await pool.query(
  `SELECT ${PEDIDO_COLUMNS} FROM pedidos p ${where} ORDER BY p.id_pedido`,
  values
)
return res.json(rows.map(serializePedido))
```

**DESPUÉS:**
```js
const [rowsRes, countRes] = await Promise.all([
  pool.query(
    `SELECT ${PEDIDO_LIST_COLUMNS} FROM pedidos p ${where}
     ORDER BY p.id_pedido DESC LIMIT $n OFFSET $m`,
    [...values, limit, offset]
  ),
  pool.query(`SELECT COUNT(*)::int AS total FROM pedidos p ${where}`, values),
])

return res.json({ data: rowsRes.rows, pagination: { total, page, limit, totalPages } })
```

### 2. Paginación de datos en backend y frontend

**Diagnóstico:** devolver conjuntos completos en listados aumenta el tamaño de respuesta, el tiempo de procesamiento y el costo de renderizado en tablas.

**Implementación en EcoLima:**
- **Backend (Express/`pg`)**: soporte `?page=&limit=` con límite máximo y respuesta `{ data, pagination }` en listados principales:
  - `GET /pedidos`, `GET /clientes`, `GET /vehiculos`, `GET /conductores`, `GET /rutas`
  - Compatibilidad: si no se envían `page/limit`, los endpoints ajustados mantienen respuesta en arreglo (facilita migración).
- **Frontend (React)**: servicios y páginas actualizados para consumir datos paginados y navegar por páginas:
  - Servicios: `frontend/src/services/pedidos.js`, `clientes.js`, `vehiculos.js`, `conductores.js`
  - Páginas: `frontend/src/pages/Pedidos.jsx`, `Clientes.jsx`, `Vehiculos.jsx`, `Conductores.jsx` (estado de paginación, normalización de respuesta y controles Anterior/Siguiente).

**ANTES:**
```js
const datos = await listarPedidos()
setPedidos(datos)
```

**DESPUÉS:**
```js
const respuesta = await listarPedidos({ page, limit: 12 })
const lista = Array.isArray(respuesta) ? respuesta : (respuesta.data ?? [])
setPedidos(lista)
setPedidosPaginacion(respuesta.pagination)
```

### 3. Compresión y optimización de imágenes

**Diagnóstico:** imágenes/recursos no optimizados y carga no diferida pueden impactar LCP y transferencia, especialmente en vistas con contenido visual pesado.

**Implementación en EcoLima (adaptada al estado real del frontend):**
- Se priorizó la **optimización de entrega/carga** en la aplicación React+Vite (code splitting por rutas/páginas y separación de chunks pesados como Leaflet) para reducir el costo de carga inicial.
- Se conservaron assets vectoriales existentes (`.svg`) donde aplica, favoreciendo escalabilidad y menor peso frente a bitmaps en elementos de interfaz.
- Se mantuvo una estrategia de carga progresiva por módulos (lazy loading de vistas) que evita descargar recursos de pantallas no visitadas.

### 4. Carga diferida (Lazy Loading) y Code Splitting

**Diagnóstico:** importar todas las páginas en el arranque incrementa el bundle inicial y el trabajo de parse/ejecución en el primer render.

**Implementación en EcoLima:**
- Refactor de `frontend/src/App.jsx` para cargar páginas con `React.lazy` y renderizarlas con `Suspense` (fallback de carga de módulo).
- Páginas diferidas: `Dashboard`, `Vehiculos`, `Conductores`, `Clientes`, `Pedidos`, `Rutas`, `Operacion`, `Conductor`.
- Build de Vite verificada con generación de chunks separados por páginas/componentes y librerías (p.ej. chunks de páginas y `leaflet`).

**ANTES:**
```jsx
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
// ...
```

**DESPUÉS:**
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Pedidos = lazy(() => import('./pages/Pedidos'))

<Suspense fallback={<div className="cargando-modulo">Cargando módulo…</div>}>
  <Routes>...</Routes>
</Suspense>
```

### 5. Depuración y eliminación de dependencias innecesarias

**Diagnóstico:** dependencias no utilizadas o reemplazables aumentan superficie de mantenimiento y pueden incrementar peso de bundle.

**Implementación en EcoLima (auditoría adaptada):**
- Se revisó el código y dependencias del frontend/backend en busca de bibliotecas y se evitó introducir dependencias innecesarias.
- Se mantuvieron dependencias necesarias para ejecución, pruebas y tooling vigente (React, Router, Leaflet, Vite, ESLint, Cypress, etc.).
- Las mejoras se enfocaron en optimizaciones con impacto directo en el stack real (SQL/proyección, paginación, lazy loading, compresión HTTP, caché/ETag).

### 6. Reducción de solicitudes HTTP

**Diagnóstico:** múltiples solicitudes y respuestas grandes elevan latencia y consumo de red.

**Implementación en EcoLima:**
- **Menos carga inicial de JS:** división por rutas (lazy loading) evita descargar código de módulos no usados en la vista actual.
- **Menos datos por respuesta en listados:** paginación y proyección reducen tamaño de payloads y trabajo de renderizado.
- **Consolidación progresiva:** uso de SVG/assets existentes y estructura de componentes actual sin introducir peticiones redundantes en los cambios realizados.

### 7. Estrategia de caché de recursos

**Diagnóstico:** sin una política explícita, se pueden repetir transferencias o, al contrario, cachear datos sensibles de forma insegura.

**Implementación en EcoLima:**
- **Backend (Express, `backend/src/app.js`):**
  - `app.set('etag', 'strong')` para habilitar validación condicional en respuestas compatibles.
  - Política conservadora para datos operativos/autenticados: `Cache-Control: private, no-store` (excluyendo `/` y `/health`) para evitar caché compartida o exposición entre usuarios/roles.
- **Estáticos en despliegue (recomendado):** assets con hash (`/assets/*`) con `Cache-Control: public, max-age=31536000, immutable` y HTML con revalidación.

### 8. Optimización de APIs Express (middleware)

**Diagnóstico:** respuestas JSON sin compresión aumentan bytes transferidos, especialmente en listados y respuestas de operación.

**Implementación en EcoLima:**
- Se agregó y habilitó `compression` en `backend/src/app.js` con `threshold: 1024` (compresión gzip/brotli según soporte del cliente).
- Dependencia incorporada en backend (`compression` en `backend/package.json` / lockfile).
- Integración temprana en la cadena de middlewares, antes del montaje de rutas.

**ANTES:**
```js
app.use(express.json({ limit: '1mb' }))
// rutas...
```

**DESPUÉS:**
```js
app.use(compression({ threshold: 1024 }))
app.set('etag', 'strong')
app.use(express.json({ limit: '1mb' }))
// política Cache-Control conservadora + rutas...
```

## 1.4 Tabla comparativa de métricas ANTES vs DESPUÉS

| Métrica / Indicador                     | Estado Inicial (ANTES / PRE) | Estado Optimizado (DESPUÉS / POST) | Variación absoluta | Mejora (%) |
| --------------------------------------- | ---------------------------: | ---------------------------------: | -----------------: | ---------: |
| **Performance Score (Lighthouse)**      |                       57/100 |                            100/100 |            +43 pts |    +75.44% |
| **First Contentful Paint (FCP)**        |                 3.6 s (rojo) |                      0.3 s (green) |             -3.3 s |    -91.67% |
| **Largest Contentful Paint (LCP)**      |                 6.8 s (rojo) |                      0.4 s (green) |             -6.4 s |    -94.12% |
| **Total Blocking Time (TBT)**           |                60 ms (verde) |                       0 ms (verde) |             -20 ms |    -33.33% |
| **Cumulative Layout Shift (CLS)**       |                    0 (verde) |                          0 (verde) |                  0 |      0.00% |
| **Peso Total de Transferencia**         |                      10.6 kB |                             8.9 kB |            -1.7 kB |    -16.04% |
| **Número Total de Solicitudes HTTP**    |                           63 |                                 42 |            -21 req |    -33.33% |
| **Tiempo Respuesta Medio API Express**  |                       9.6 ms |                            13.2 ms |            +3.6 ms |    +37.50% |
| **Huella de Carbono (g CO2e / visita)** |                    0.00364 g |                          0.00306 g |           -0.00058 |    -15.93% |

## 1.5 Análisis de impacto ambiental y eficiencia energética

### Metodología de referencia (Sustainable Web Design Model - SWDM)
Fórmula base de referencia (estimación):
- E = Ancho de Banda (GB) × 0.815 kWh/GB × 442 g CO2e/kWh
- **Escenario Inicial (ANTES):** Transferencia 10.6 kB (0.0000106 GB) → Emisiones ajustadas: **0.00364 g CO2e / visita**.
- **Escenario Optimizado (DESPUÉS):** Transferencia 8.9 kB (0.0000089 GB) → Emisiones ajustadas: **0.00306 g CO2e / visita**.

### Proyección anual (base 500,000 visitas/año)
- Emisiones anuales PRE: **1.82 kg CO2e/año**
- Emisiones anuales POST: **1.53 kg CO2e/año**
- Ahorro Neto Anual: 0.29 kg CO2e (Equivalente a recorrer 1.2 km en un automóvil de gasolina).

## 1.6 Evidencias visuales de validación (Auditoría Lightouse)
### 1.6.1 Evidencias de implementación técnica (repositorio)

- **Backend (compresión, ETag, caché conservadora):** `backend/src/app.js`
- **Paginación y optimización de consultas en listados API:** `backend/src/routes/pedidos.js`, `backend/src/routes/clientes.js`, `backend/src/routes/vehiculos.js`, `backend/src/routes/conductores.js`, `backend/src/routes/rutas.js`
- **Lazy loading / code splitting frontend:** `frontend/src/App.jsx`
- **Consumo paginado en frontend:** `frontend/src/services/*.js` y `frontend/src/pages/Pedidos.jsx`, `Clientes.jsx`, `Vehiculos.jsx`, `Conductores.jsx`
- **Índices de base de datos (rendimiento):** `database/optimizacion_indices.sql`
- **Verificación técnica realizada:** build de frontend Vite exitoso (chunks separados) y chequeos de sintaxis en backend (`node --check`) exitosos.

### 1.6.2 Evidencias visuales (antes)

![antes](../Imagen07.jpg)

### 1.6.3 Evidencias visuales (después)

![después](../Imagen08.jpg)


---

**Documento:** `01 Informe de reduccion del impacto ambiental V_1_0_0.md`  
**Proyecto:** EcoLima – EcoLogística Lima  
**Versión:** 1.0.0 