# Backend EcoLima (Node.js)

La API de EcoLima está implementada en JavaScript con Express y PostgreSQL.
Este es el único directorio del backend de la aplicación.

## Requisitos

- Node.js 20 o superior.
- PostgreSQL con el esquema EcoLima y PostGIS ya instalado.
- Variables `DATABASE_URL`, `JWT_SECRET_KEY` y opcionalmente
  `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `PORT` y `CORS_ORIGIN`.
  Si no se exportan, el entorno local carga `backend/.env`.

## Desarrollo

```powershell
cd backend
npm install
npm test
npm run dev
```

La implementación incluye autenticación y las rutas de usuarios, vehículos,
conductores, clientes, pedidos, operación, rutas y asignaciones, indicadores,
sostenibilidad, reportes, locales y mapas. También incluye el optimizador,
persistencia de rutas, permisos por rol y alcance por conductor/cliente.

El arranque normal es `npm start` o `iniciar_backend.bat` desde Windows.
Las pruebas unitarias y de contrato se ejecutan con `npm test`; las
integraciones y pruebas de navegador se inician desde `tests/run-e2e.ps1`
contra una base temporal aislada.

La suite verifica que los endpoints consumidos por el frontend estén
montados, exijan autenticación y permitan el preflight CORS desde
`http://localhost:5173`. La compatibilidad de datos requiere además ejecutar
las pruebas E2E e integración con PostgreSQL/PostGIS disponible.

Los scripts auxiliares de datos, verificación y pruebas de API están en
`tools/`. Los comandos que modifican datos requieren una base de pruebas
aislada; no ejecutes herramientas de limpieza contra datos reales.

## Despliegue: API en Render y frontend en Vercel

El archivo `render.yaml` configura el servicio Express con `backend/` como
directorio raíz, `npm ci` como build, `npm start` como comando de arranque y
`/health` como health check. Desde Render puedes crear el servicio mediante
**New > Blueprint** y conectar este repositorio.

Configura en Render las variables solicitadas por el Blueprint:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL interna de PostgreSQL si la base está en Render y en la misma región; de lo contrario, URL SSL del proveedor |
| `JWT_SECRET_KEY` | Render la genera automáticamente; no reutilices una clave local |
| `CORS_ORIGIN` | URL HTTPS exacta del frontend publicado en Vercel; admite varios orígenes separados por comas |

Puedes crear PostgreSQL desde Render y habilitar PostGIS ejecutando
`CREATE EXTENSION IF NOT EXISTS postgis;` en esa base antes de aplicar
`database/ecolima_ddl.sql`. Render soporta PostGIS; verifica la extensión en
la versión elegida de PostgreSQL.

En Vercel crea un proyecto separado con **Root Directory** `frontend` y
preset Vite. Configura `VITE_API_URL` con la URL HTTPS del servicio Render,
sin barra final (por ejemplo, `https://ecolima-api.onrender.com`). Esta
variable se publica en el código del navegador y no debe contener secretos.
Después de cambiar variables `VITE_*`, vuelve a desplegar el frontend.

No se requiere Docker para alojar la API ni la base de datos con este esquema.
