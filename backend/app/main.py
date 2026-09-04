from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.vehiculos import router as vehiculos_router
from .api.pedidos import router as pedidos_router

app = FastAPI(
    title="EcoLima - Optimizador de Rutas Sostenibles",
    description="API RF-01 Flota (consumo km/L, factor kgCO2/km) y RF-02 Pedidos (ID cliente, dirección, GPS dual, peso, volumen, ventana manual, prioridad, tipo).",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehiculos_router)
app.include_router(pedidos_router)

@app.on_event("startup")
def startup():
    try:
        from .database import init_db
        init_db()
    except Exception as e:
        print(f"DB init warning: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "service": "EcoLima RF-01/RF-02"}

@app.get("/")
def root():
    return {"message": "EcoLima API", "docs": "/docs", "health": "/health"}

# Ejemplo curl:
# curl -X POST http://localhost:8000/api/vehiculos/ -H "Content-Type: application/json" -d '{
#   "placa":"ABC-123","tipo":"camioneta","capacidad_carga_kg":800,
#   "consumo_combustible_km_l":10.5,"factor_emision_co2_kg_km":0.22,"anio_fabricacion":2018
# }'
