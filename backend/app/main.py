from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.vehiculos import router as vehiculos_router

app = FastAPI(
    title="EcoLima - Gestión de Flota",
    description="API RF-01: Gestión de vehículos con consumo (km/L) y factor emisión (kgCO2/km). Sin latitud_base/longitud_base en registro.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehiculos_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "EcoLima Flota"}

# Ejemplo curl:
# curl -X POST http://localhost:8000/api/vehiculos/ -H "Content-Type: application/json" -d '{
#   "placa":"ABC-123","tipo":"camioneta","capacidad_carga_kg":800,
#   "consumo_combustible_km_l":10.5,"factor_emision_co2_kg_km":0.22,"anio_fabricacion":2018
# }'
