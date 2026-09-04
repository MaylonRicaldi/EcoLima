from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..models.vehiculo import Vehiculo
from ..models.tipos_vehiculo import TipoVehiculoCat
from ..schemas.vehiculo import VehiculoCreate, VehiculoResponse, VehiculoUpdate
from ..database import get_db

router = APIRouter(prefix="/api/vehiculos", tags=["Flota - RF-01 / ER VEHICULOS"])

def get_or_create_tipo(db: Session, nombre: str) -> TipoVehiculoCat:
    # Normalizar furgón sin tilde
    nombre_norm = nombre.strip().lower()
    mapping = {"furgon": "furgón", "camioneta": "camioneta", "moto": "moto"}
    nombre_norm = mapping.get(nombre_norm, nombre_norm)
    tipo = db.query(TipoVehiculoCat).filter(TipoVehiculoCat.nombre == nombre_norm).first()
    if not tipo:
        tipo = TipoVehiculoCat(nombre=nombre_norm, descripcion=f"Tipo {nombre_norm} - RF-01")
        db.add(tipo)
        db.flush()  # para obtener id_tipo sin commit
    return tipo

def to_response(v: Vehiculo) -> dict:
    # Mapear modelo UML a schema RF-01
    return {
        "placa": v.placa,
        "tipo": v.tipo.nombre if v.tipo else "camioneta",
        "capacidad_carga_kg": float(v.capacidad_kg),
        "consumo_combustible_km_l": float(v.consumo_km_l),
        "factor_emision_co2_kg_km": float(v.factor_co2_kg_km),
        "anio_fabricacion": v.anio_fabricacion,
        "marca": v.marca,
        "modelo": v.modelo,
        "capacidad_m3": float(v.capacidad_m3) if v.capacidad_m3 else None,
        "tipo_combustible": v.tipo_combustible,
        "id": v.id_vehiculo,
        "id_vehiculo": v.id_vehiculo,
        "estado": v.estado,
    }

@router.post("/", response_model=VehiculoResponse, status_code=201, summary="RF-01: Registrar vehículo (ER VEHICULOS + TIPOS_VEHICULO)")
def crear_vehiculo(payload: VehiculoCreate, db: Session = Depends(get_db)):
    if db.query(Vehiculo).filter(Vehiculo.placa == payload.placa).first():
        raise HTTPException(status_code=409, detail=f"Placa {payload.placa} ya registrada")
    tipo = get_or_create_tipo(db, payload.tipo)
    vehiculo = Vehiculo(
        id_tipo_vehiculo=tipo.id_tipo,
        placa=payload.placa,
        marca=payload.marca,
        modelo=payload.modelo,
        anio_fabricacion=payload.anio_fabricacion,
        capacidad_kg=payload.capacidad_carga_kg,
        capacidad_m3=payload.capacidad_m3,
        consumo_km_l=payload.consumo_combustible_km_l,
        factor_co2_kg_km=payload.factor_emision_co2_kg_km,
        tipo_combustible=payload.tipo_combustible or ("diésel" if payload.tipo != "moto" else "gasolina"),
        estado="disponible",
    )
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    # Cargar relación tipo
    db.refresh(tipo)
    vehiculo.tipo = tipo
    return to_response(vehiculo)

@router.get("/", response_model=List[VehiculoResponse], summary="Listar flota (ER VEHICULOS)")
def listar_vehiculos(db: Session = Depends(get_db)):
    vehiculos = db.query(Vehiculo).all()
    # Cargar tipos
    for v in vehiculos:
        _ = v.tipo
    return [to_response(v) for v in vehiculos]

@router.get("/{vehiculo_id}", response_model=VehiculoResponse)
def obtener_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    v = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == vehiculo_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return to_response(v)

@router.patch("/{vehiculo_id}", response_model=VehiculoResponse)
def actualizar_vehiculo(vehiculo_id: int, payload: VehiculoUpdate, db: Session = Depends(get_db)):
    v = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == vehiculo_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "tipo" in data:
        tipo = get_or_create_tipo(db, data.pop("tipo"))
        v.id_tipo_vehiculo = tipo.id_tipo
    # Mapear nombres RF-01 a columnas UML
    mapping = {
        "capacidad_carga_kg": "capacidad_kg",
        "consumo_combustible_km_l": "consumo_km_l",
        "factor_emision_co2_kg_km": "factor_co2_kg_km",
    }
    for k, val in data.items():
        col = mapping.get(k, k)
        setattr(v, col, val)
    db.commit()
    db.refresh(v)
    return to_response(v)

@router.delete("/{vehiculo_id}", status_code=204)
def eliminar_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    v = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == vehiculo_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    db.delete(v)
    db.commit()
    return None

@router.get("/{vehiculo_id}/estimacion/{distancia_km}", summary="Estimar combustible y CO2")
def estimar(vehiculo_id: int, distancia_km: float, db: Session = Depends(get_db)):
    v = db.query(Vehiculo).filter(Vehiculo.id_vehiculo == vehiculo_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {
        "placa": v.placa,
        "distancia_km": distancia_km,
        "combustible_l": round(v.calcular_combustible(distancia_km), 2),
        "emisiones_kgco2": round(v.calcular_emisiones(distancia_km), 3),
        "consumo_km_l": float(v.consumo_km_l),
        "factor_kgco2_km": float(v.factor_co2_kg_km),
    }
