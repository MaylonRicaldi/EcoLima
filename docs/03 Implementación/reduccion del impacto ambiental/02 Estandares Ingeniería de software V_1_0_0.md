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

### W3C Web Sustainability Guidelines (WSG) – lineamientos aplicados

- **Diseño/experiencia y contenido (UI/Assets):** priorizar carga progresiva, assets eficientes y evitar descargas innecesarias en vistas iniciales.
- **Arquitectura y código:** code splitting por rutas, reutilización de componentes/servicios y contratos claros para paginación.
- **Red y datos:** compresión HTTP (Brotli/gzip), paginación de listados, proyección de datos, y políticas de caché/validación (ETag, Cache-Control).

## 2.2 Buenas prácticas y guía de desarrollo verde (EcoLima)

### 2.2.1 Normas Backend (Node.js / Express / PostgreSQL / PostGIS)

#### Consultas y acceso a datos (`pg`)
-  **Proyección explícita por caso de uso:** seleccionar solo columnas necesarias en listados (evitar `SELECT *` implícito en respuestas de tabla).
- **Paginación obligatoria en listados:** usar `page/limit` (o cursor en escenarios de alto volumen) con `LIMIT/OFFSET` y `COUNT(*)` controlado.
- **Índices alineados a filtros/orden:** crear índices B-tree/GiST según patrones reales (`WHERE`, `JOIN`, `ORDER BY`, geoespaciales).
- **Evitar N+1 y cargas redundantes:** consolidar consultas, usar `Promise.all` cuando aplique y reutilizar condiciones de alcance por rol.
- **Respuestas consistentes:** contratos claros para detalle vs listado y para respuestas paginadas (`data`, `pagination`).

#### API Express (middleware y red)
- **Compresión HTTP:** habilitar `compression` con umbral razonable (p.ej. `threshold: 1024`) para JSON/texto.
- **Validación condicional/caché:** usar `ETag` y `Cache-Control` apropiados.
- **Caché segura por defecto en datos sensibles/operativos:** `private, no-store` para endpoints autenticados o con alcance por rol (salvo excepciones justificadas).

#### Base de datos y migraciones
- **Migraciones idempotentes para índices:** `CREATE INDEX IF NOT EXISTS` cuando sea posible.

### 2.2.2 Normas Frontend (React + Vite + React Router)

#### Rendimiento de carga y ejecución
- **Code splitting por rutas:** usar `React.lazy` + `Suspense` en vistas/páginas.
- **Cargar solo lo necesario por pantalla:** diferir módulos pesados (mapas, componentes de operación/reportes) cuando no son visibles.
- **Paginación en tablas/listados:** consumir endpoints paginados y evitar renderizar grandes volúmenes simultáneamente.

#### Recursos y medios
- **Preferir SVG para iconografía/vectoriales** cuando sea viable.

#### Datos en cliente
- **Consumo paginado y normalización de respuestas** (`data`, `pagination`).

### 2.2.3 Integración CI/CD y control de calidad

```yaml
.github/workflows/green-audit.yml
name: Green IT & Performance Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Build frontend
        working-directory: frontend
        run: npm run build

      - name: Run Lighthouse CI
        working-directory: frontend
        run: |
          npm install -g @lhci/cli
          lhci autorun --config=../lighthouserc.json --upload.target=temporary-public-storage || true
```

## 2.3 Matriz de mapeo directo: estándares vs optimizaciones aplicadas en EcoLima

| #   | Optimización técnica aplicada (EcoLima)                                                                                                                            | ISO/IEC 25010                                                                  | Principio Green Software (GSF)      | Lineamiento W3C WSG (adaptado)                      | Evidencia en repositorio                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Optimización de consultas PostgreSQL/`pg`: proyección de columnas, conteo paralelo y paginación en listados; índices de rendimiento                                | Eficiencia de desempeño (comportamiento temporal, utilización de recursos)     | Eficiencia energética / de cómputo  | Reducción de transferencia y procesamiento de datos | `backend/src/routes/pedidos.js`, `backend/src/routes/clientes.js`, `backend/src/routes/vehiculos.js`, `backend/src/routes/conductores.js`, `backend/src/routes/rutas.js`, `database/optimizacion_indices.sql` |
| 2   | Paginación backend + frontend (`page/limit`, `data/pagination`, controles de navegación)                                                                           | Eficiencia de desempeño (capacidad, comportamiento temporal)                   | Eficiencia energética               | UX eficiente / transferencia progresiva de datos    | Rutas backend listadas + `frontend/src/services/*.js`, `frontend/src/pages/Pedidos.jsx`, `Clientes.jsx`, `Vehiculos.jsx`, `Conductores.jsx`                                                                   |
| 3   | Optimización de entrega de recursos visuales (carga diferida por módulos, chunks separados, uso de SVG existentes; estrategia de assets para despliegue)           | Eficiencia de desempeño (comportamiento temporal)                              | Eficiencia de carbono / hardware    | Optimización de medios y carga progresiva           | `frontend/src/App.jsx`, build Vite con chunks, assets en `frontend/src/assets` y `frontend/public`                                                                                                            |
| 4   | Lazy loading y code splitting de páginas con `React.lazy` + `Suspense`                                                                                             | Mantenibilidad (modularidad), eficiencia de desempeño                          | Eficiencia de hardware / energética | Arquitectura y carga diferida de código             | `frontend/src/App.jsx`                                                                                                                                                                                        |
| 5   | Depuración/auditoría de dependencias y adopción de mejoras sin librerías innecesarias (adaptado al stack real)                                                     | Mantenibilidad (analizabilidad, modificabilidad)                               | Eficiencia energética               | Código limpio y control de dependencias             | Cambios focalizados en backend/frontend; sin incorporación de libs no requeridas                                                                                                                              |
| 6   | Reducción de solicitudes/transferencia efectiva (chunks por demanda, listados paginados/proyectados)                                                               | Eficiencia de desempeño (comportamiento temporal)                              | Eficiencia de carbono               | Minimización de transferencia y costo de red        | `frontend/src/App.jsx`, servicios/páginas paginadas, rutas backend optimizadas                                                                                                                                |
| 7   | Estrategia de caché: `ETag` fuerte y `Cache-Control` conservador (`private, no-store`) para datos operativos; lineamientos para estáticos inmutables en despliegue | Eficiencia de desempeño (comportamiento temporal), seguridad de datos en caché | Eficiencia energética               | Estrategias de caché y validación                   | `backend/src/app.js`                                                                                                                                                                                          |
| 8   | Middleware de compresión HTTP en Express (`compression`, `threshold: 1024`)                                                                                        | Eficiencia de desempeño (capacidad, utilización de red)                        | Eficiencia de carbono               | Optimización de transferencia de red                | `backend/src/app.js`, `backend/package.json`, `backend/package-lock.json`                                                                                                                                     |

---

**Documento:** `02 Estandares Ingeniería de software V_1_0_0.md`  
**Proyecto:** EcoLima – EcoLogística Lima  
**Versión:** 1.0.0  
