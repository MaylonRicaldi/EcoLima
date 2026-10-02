from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import test_database_connection
from app.api.auth import router as auth_router
from app.api.vehiculos import router as vehiculos_router
from app.api.conductores import router as conductores_router
from app.api.usuarios import router as usuarios_router
from app.api.clientes import router as clientes_router
from app.api.pedidos import router as pedidos_router
from app.api.rutas import (
    router as rutas_router,
    asignaciones_router,
)
from app.api.operacion import (
    trafico_router,
    incidentes_router,
    evaluacion_router,
)
from app.api.indicadores import (
    router as indicadores_router,
    sostenibilidad_router,
    reportes_router,
)

app = FastAPI(
    title="EcoLogística Lima API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vehiculos_router)
app.include_router(conductores_router)
app.include_router(usuarios_router)
app.include_router(clientes_router)
app.include_router(pedidos_router)
app.include_router(evaluacion_router)
app.include_router(rutas_router)
app.include_router(asignaciones_router)
app.include_router(trafico_router)
app.include_router(incidentes_router)
app.include_router(indicadores_router)
app.include_router(sostenibilidad_router)
app.include_router(reportes_router)

@app.get("/")
def root():
    return {
        "message": "EcoLogistica Lima API funcionando"
    }


@app.get("/health")
def health():
    try:
        test_database_connection()

        return {
            "status": "ok",
            "database": "connected",
        }

    except SQLAlchemyError:
        return {
            "status": "error",
            "database": "disconnected",
        }