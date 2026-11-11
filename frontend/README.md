# EcoLima frontend

Aplicación React/Vite para EcoLima.

## Desarrollo local

```powershell
npm install
npm run dev
```

La API local usa `http://localhost:8000` por defecto. Se puede cambiar con
`VITE_API_URL`; por ejemplo, crea un archivo `.env.local` con la URL del
backend. Reinicia Vite después de modificarla.

## Vercel

Configura la raíz del proyecto Vercel como `frontend` y usa el preset Vite.
Define `VITE_API_URL` con la URL HTTPS del backend desplegado en Render (por
ejemplo, `https://ecolima-api.onrender.com`, sin barra final). En Render,
configura `CORS_ORIGIN` con la URL exacta del frontend Vercel. La API y la
base PostgreSQL/PostGIS se alojan por separado; el frontend no contiene
credenciales de base de datos.
