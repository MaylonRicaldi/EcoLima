# 2. Estándares de Ingeniería de Software y Guía de Desarrollo Verde (EcoLima)

## 2.1 Relación de estándares internacionales aplicados

Este documento adapta los estándares y lineamientos de ingeniería de software y sostenibilidad digital al contexto real de **EcoLima** (React + Vite, Node.js + Express, PostgreSQL + PostGIS).

### ISO/IEC 25010 (Calidad del producto de software)

**Características y subcaracterísticas consideradas:**
- **Eficiencia de desempeño**
  - *Comportamiento temporal:* reducción de tiempo de carga percibido (FCP/LCP/TBT) y optimización de respuestas API/listados.
  - *Utilización de recursos:* menor transferencia y menor cómputo innecesario mediante proyección de columnas, paginación, índices y compresión HTTP.
  - *Capacidad:* mejor manejo de volúmenes crecientes de datos al evitar respuestas masivas y escaneos innecesarios.
- **Mantenibilidad**
  - *Modularidad:* división por rutas/páginas con lazy loading y separación de responsabilidades frontend/backend.
  - *Analizabilidad:* consultas y endpoints con estructuras más explícitas (paginación, contratos de respuesta, migraciones de índices).
  - *Modificabilidad:* incorporación de mejoras transversales (middleware de compresión, política de caché, helper de paginación) sin reescritura completa.

### Principios Green Software Foundation (GSF)

- **Eficiencia de carbono:** reducir bytes transferidos y trabajo de procesamiento por interacción.
- **Eficiencia energética:** minimizar cómputo por unidad de trabajo (consultas acotadas, chunks bajo demanda, respuestas comprimidas).
- **Eficiencia de hardware:** disminuir exigencia sobre CPU/memoria/red en cliente y servidor para prolongar vida útil de dispositivos y mejorar escalabilidad.
- **Medición continua:** establecer métricas antes/después y monitoreo periódico (rendimiento web, API, payloads, recursos).

### W3C Web Sustainability Guidelines (WSG) – lineamientos aplicados (adaptación)

- **Diseño/experiencia y contenido (UI/Assets):** priorizar carga progresiva, assets eficientes y evitar descargas innecesarias en vistas iniciales.
- **Arquitectura y código:** code splitting por rutas, reutilización de componentes/servicios y contratos claros para paginación.
- **Red y datos:** compresión HTTP (Brotli/gzip), paginación de listados, proyección de datos, y políticas de caché/validación (ETag, Cache-Control).

> **Nota:** la alineación a WSG se documenta como **adaptación de buenas prácticas**; la conformidad formal por pauta/criterio debe validarse con checklist y evidencia específica.

## 2.2 Buenas prácticas y guía de desarrollo verde (EcoLima)

### 2.2.1 Normas Backend (Node.js / Express / PostgreSQL / PostGIS)

#### Consultas y acceso a datos (`pg`)
- [x] **Proyección explícita por caso de uso:** seleccionar solo columnas necesarias en listados (evitar `SELECT *` implícito en respuestas de tabla).
- [x] **Paginación obligatoria en listados:** usar `page/limit` (o cursor en escenarios de alto volumen) con `LIMIT/OFFSET` y `COUNT(*)` controlado.
- [x] **Índices alineados a filtros/orden:** crear índices B-tree/GiST según patrones reales (`WHERE`, `JOIN`, `ORDER BY`, geoespaciales).
- [x] **Evitar N+1 y cargas redundantes:** consolidar consultas, usar `Promise.all` cuando aplique y reutilizar condiciones de alcance por rol.
- [x] **Respuestas consistentes:** contratos claros para detalle vs listado y para respuestas paginadas (`data`, `pagination`).

#### API Express (middleware y red)
- [x] **Compresión HTTP:** habilitar `compression` con umbral razonable (p.ej. `threshold: 1024`) para JSON/texto.
- [x] **Validación condicional/caché:** usar `ETag` y `Cache-Control` apropiados.
- [x] **Caché segura por defecto en datos sensibles/operativos:** `private, no-store` para endpoints autenticados o con alcance por rol (salvo excepciones justificadas).
- [ ] **PENDIENTE (recomendado):** métricas de observabilidad (p95/p99 por endpoint, tamaño medio de respuesta, tasa de cache hits si aplica).

#### Base de datos y migraciones
- [x] **Migraciones idempotentes para índices:** `CREATE INDEX IF NOT EXISTS` cuando sea posible.
- [ ] **PENDIENTE (recomendado):** validación con `EXPLAIN ANALYZE` en consultas críticas antes/después y registro de resultados.
- [ ] **PENDIENTE (recomendado):** revisión periódica de índices no usados y mantenimiento (vacuum/analyze según operación).

### 2.2.2 Normas Frontend (React + Vite + React Router)

#### Rendimiento de carga y ejecución
- [x] **Code splitting por rutas:** usar `React.lazy` + `Suspense` en vistas/páginas.
- [x] **Cargar solo lo necesario por pantalla:** diferir módulos pesados (mapas, componentes de operación/reportes) cuando no son visibles.
- [x] **Paginación en tablas/listados:** consumir endpoints paginados y evitar renderizar grandes volúmenes simultáneamente.
- [ ] **PENDIENTE (recomendado):** virtualización de listas/tablas muy grandes si el volumen crece.

#### Recursos y medios
- [x] **Preferir SVG para iconografía/vectoriales** cuando sea viable.
- [ ] **PENDIENTE (recomendado):** convertir imágenes raster a formatos modernos (WebP/AVIF), usar `<picture>`/`srcset`/`sizes`, y definir `width/height` para evitar CLS.
- [ ] **PENDIENTE (recomendado):** `loading="lazy"` y `decoding="async"` en imágenes no críticas.

#### Datos en cliente
- [x] **Consumo paginado y normalización de respuestas** (`data`, `pagination`).
- [ ] **PENDIENTE (recomendado):** caché de estado en cliente (TanStack Query/SWR) con `staleTime`, deduplicación y invalidación por mutaciones.
- [ ] **PENDIENTE (recomendado):** cancelación de solicitudes en cambios rápidos de página/filtros (AbortController).

### 2.2.3 Integración CI/CD y control de calidad (guía)

> **Estado en EcoLima:** plantilla de referencia (no aplicada automáticamente en este cambio, sin acciones de Git/CI ejecutadas).

```yaml
# Ejemplo de referencia: .github/workflows/green-audit.yml
name: Green IT & Performance Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      # Frontend build (verifica chunks/code splitting)
      - name: Build frontend
        working-directory: frontend
        run: |
          npm ci
          npm run build

      # Backend checks básicos
      - name: Backend syntax/tests (ajustar según suite)
        working-directory: backend
        run: |
          npm ci
          npm test

      # PENDIENTE: Lighthouse CI / auditoría de rendimiento automatizada
      # - name: Run Lighthouse CI
      #   run: |
      #     npm install -g @lhci/cli
      #     lhci autorun --upload.target=temporary-public-storage || true
```

**Controles recomendados en CI/CD:**
- [ ] Presupuesto de rendimiento (performance budget: tamaño de chunks, LCP/FCP objetivo)
- [ ] Lint + tests unitarios/contrato
- [ ] Revisión de dependencias y vulnerabilidades
- [ ] Auditoría Lighthouse/axe (accesibilidad y rendimiento)
- [ ] Validación de headers de caché/compresión en entorno desplegado

## 2.3 Matriz de mapeo directo: estándares vs optimizaciones aplicadas en EcoLima

| # | Optimización técnica aplicada (EcoLima) | ISO/IEC 25010 | Principio Green Software (GSF) | Lineamiento W3C WSG (adaptado) | Evidencia en repositorio |
|---|---|---|---|---|---|
| 1 | Optimización de consultas PostgreSQL/`pg`: proyección de columnas, conteo paralelo y paginación en listados; índices de rendimiento | Eficiencia de desempeño (comportamiento temporal, utilización de recursos) | Eficiencia energética / de cómputo | Reducción de transferencia y procesamiento de datos | `backend/src/routes/pedidos.js`, `backend/src/routes/clientes.js`, `backend/src/routes/vehiculos.js`, `backend/src/routes/conductores.js`, `backend/src/routes/rutas.js`, `database/optimizacion_indices.sql` |
| 2 | Paginación backend + frontend (`page/limit`, `data/pagination`, controles de navegación) | Eficiencia de desempeño (capacidad, comportamiento temporal) | Eficiencia energética | UX eficiente / transferencia progresiva de datos | Rutas backend listadas + `frontend/src/services/*.js`, `frontend/src/pages/Pedidos.jsx`, `Clientes.jsx`, `Vehiculos.jsx`, `Conductores.jsx` |
| 3 | Optimización de entrega de recursos visuales (carga diferida por módulos, chunks separados, uso de SVG existentes; estrategia de assets para despliegue) | Eficiencia de desempeño (comportamiento temporal) | Eficiencia de carbono / hardware | Optimización de medios y carga progresiva | `frontend/src/App.jsx`, build Vite con chunks, assets en `frontend/src/assets` y `frontend/public` (**PENDIENTE:** conversión WebP/AVIF con evidencia) |
| 4 | Lazy loading y code splitting de páginas con `React.lazy` + `Suspense` | Mantenibilidad (modularidad), eficiencia de desempeño | Eficiencia de hardware / energética | Arquitectura y carga diferida de código | `frontend/src/App.jsx` |
| 5 | Depuración/auditoría de dependencias y adopción de mejoras sin librerías innecesarias (adaptado al stack real) | Mantenibilidad (analizabilidad, modificabilidad) | Eficiencia energética | Código limpio y control de dependencias | Cambios focalizados en backend/frontend; sin incorporación de libs no requeridas (**PENDIENTE:** reporte formal de auditoría) |
| 6 | Reducción de solicitudes/transferencia efectiva (chunks por demanda, listados paginados/proyectados) | Eficiencia de desempeño (comportamiento temporal) | Eficiencia de carbono | Minimización de transferencia y costo de red | `frontend/src/App.jsx`, servicios/páginas paginadas, rutas backend optimizadas (**PENDIENTE:** desglose de requests por tipo) |
| 7 | Estrategia de caché: `ETag` fuerte y `Cache-Control` conservador (`private, no-store`) para datos operativos; lineamientos para estáticos inmutables en despliegue | Eficiencia de desempeño (comportamiento temporal), seguridad de datos en caché | Eficiencia energética | Estrategias de caché y validación | `backend/src/app.js` (**PENDIENTE:** headers de estáticos en plataforma y caché cliente con invalidación) |
| 8 | Middleware de compresión HTTP en Express (`compression`, `threshold: 1024`) | Eficiencia de desempeño (capacidad, utilización de red) | Eficiencia de carbono | Optimización de transferencia de red | `backend/src/app.js`, `backend/package.json`, `backend/package-lock.json` |

## 2.4 Verificación técnica y pendientes de evidencia

### Verificaciones realizadas (implementación)
- [x] **Frontend:** `npm run build` (Vite) exitoso con generación de chunks separados (lazy loading/code splitting).
- [x] **Backend:** validación de sintaxis con `node --check` en archivos modificados (middleware/rutas).
- [x] **Base de datos:** script de índices `database/optimizacion_indices.sql` aplicado/ajustado al esquema real del proyecto.

### Evidencias y tareas pendientes (para completar)
- [ ] **PENDIENTE:** capturas Lighthouse/DevTools (PRE/POST) y metodología exacta de medición.
- [ ] **PENDIENTE:** análisis de `EXPLAIN ANALYZE` para consultas críticas paginadas.
- [ ] **PENDIENTE:** presupuesto de rendimiento (performance budget) y umbrales en CI.
- [ ] **PENDIENTE:** política de caché de estáticos en entorno de despliegue (headers en CDN/plataforma).
- [ ] **PENDIENTE:** evaluación de caché de datos en cliente (TanStack Query/SWR) con invalidación segura.
- [ ] **PENDIENTE:** checklist formal de conformidad WSG y revisión de accesibilidad (WCAG/axe/Lighthouse).

---

**Documento:** `02 Estandares Ingeniería de software V_1_0_0.md`  
**Proyecto:** EcoLima – EcoLogística Lima  
**Versión:** 1.0.0  
**Estado:** Borrador técnico (normas y mapeo adaptados al stack real; pendientes de evidencia y validación formal marcados).  
