from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..models.vehiculo import Vehiculo
from ..schemas.vehiculo import VehiculoCreate, VehiculoResponse, VehiculoUpdate
from ..database import get_db

router = APIRouter(prefix="/api/vehiculos", tags=["Flota"])

@router.post("/", response_model=VehiculoResponse, status_code=201, summary="RF-01: Registrar vehículo")
def crear_vehiculo(payload: VehiculoCreate, db: Session = Depends(get_db)):
    """
    RF-01: Registra vehículo sin latitud_base/longitud_base.
    Campos obligatorios: placa, tipo, capacidad_carga_kg,
    consumo_combustible_km_l (km/L), factor_emision_co2_kg_km (kgCO2/km), anio_fabricacion
    """
    if db.query(Vehiculo).filter(Vehiculo.placa == payload.placa).first():
        raise HTTPException(status_code=409, detail=f"Placa {payload.placa} ya registrada")
    vehiculo = Vehiculo(**payload.model_dump())
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo

@router.get("/", response_model=List[VehiculoResponse], summary="Listar flota")
def listar_vehiculos(db: Session = Depends(get_db)):
    return db.query(Vehiculo).all()

@router.get("/{vehiculo_id}", response_model=VehiculoResponse)
def obtener_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    v = db.get(Vehiculo, vehiculo_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return v

@router.patch("/{vehiculo_id}", response_model=VehiculoResponse)
def actualizar_vehiculo(vehiculo_id: int, payload: VehiculoUpdate, db: Session = Depends(get_db)):
    v = db.get(Vehiculo, vehiculo_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v

@router.get("/{vehiculo_id}/estimacion/{distancia_km}", summary="Estimar combustible y CO2 para una ruta")
def estimar(vehiculo_id: int, distancia_km: float, db: Session = Depends(get_db)):
    v = db.get(Vehiculo, vehiculo_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {
        "placa": v.placa,
        "distancia_km": distancia_km,
        "combustible_l": round(v.calcular_combustible(distancia_km), 2),
        "emisiones_kgco2": round(v.calcular_emisiones(distancia_km), 3),
        "consumo_km_l": v.consumo_combustible_km_l,
        "factor_kgco2_km": v.factor_emision_co2_kg_km,
    }
