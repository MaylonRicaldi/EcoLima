from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Literal, Optional
import re

class VehiculoBase(BaseModel):
    """RF-01 + ER UML: placa, tipo FK tipos_vehiculo, capacidad, consumo, factor, año. Sin lat/long base."""
    model_config = ConfigDict(extra="forbid")
    placa: str = Field(..., description="Placa según MTC Perú", examples=["ABC-123", "B7C-890"])
    tipo: Literal["camioneta", "furgón", "moto"] = Field(..., description="Tipo (FK tipos_vehiculo.nombre)")
    capacidad_carga_kg: float = Field(..., gt=0, description="Capacidad de carga en kg -> vehiculos.capacidad_kg")
    consumo_combustible_km_l: float = Field(..., gt=0, le=100, description="Consumo km/L -> vehiculos.consumo_km_l")
    factor_emision_co2_kg_km: float = Field(..., gt=0, lt=1, description="Factor kgCO2/km -> vehiculos.factor_co2_kg_km")
    anio_fabricacion: int = Field(..., ge=1990, le=2026, description="Año fabricación")
    # Campos UML adicionales opcionales (0 datos por defecto, no exigidos RF-01)
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    capacidad_m3: Optional[float] = Field(None, gt=0)
    tipo_combustible: Optional[Literal["diésel", "diesel", "GNV", "eléctrico", "electrico", "gasolina"]] = None

    @field_validator("placa")
    @classmethod
    def validar_placa(cls, v: str) -> str:
        v = v.strip().upper()
        if not re.match(r"^[A-Z0-9]{2,3}-[0-9]{3,4}$", v):
            raise ValueError("Formato de placa inválido. Ej: ABC-123")
        return v

    @field_validator("consumo_combustible_km_l")
    @classmethod
    def validar_consumo_por_tipo(cls, v: float, info):
        tipo = info.data.get("tipo")
        if tipo == "moto" and not (20 <= v <= 60):
            raise ValueError("Moto: consumo esperado 20-60 km/L")
        if tipo == "camioneta" and not (5 <= v <= 15):
            raise ValueError("Camioneta: consumo esperado 5-15 km/L")
        if tipo == "furgón" and not (4 <= v <= 12):
            raise ValueError("Furgón: consumo esperado 4-12 km/L")
        return v

class VehiculoCreate(VehiculoBase):
    pass

class VehiculoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tipo: Optional[Literal["camioneta", "furgón", "moto"]] = None
    capacidad_carga_kg: Optional[float] = Field(None, gt=0)
    consumo_combustible_km_l: Optional[float] = Field(None, gt=0, le=100)
    factor_emision_co2_kg_km: Optional[float] = Field(None, gt=0, lt=1)
    anio_fabricacion: Optional[int] = Field(None, ge=1990, le=2026)
    marca: Optional[str] = None
    modelo: Optional[str] = None
    capacidad_m3: Optional[float] = Field(None, gt=0)
    tipo_combustible: Optional[str] = None
    estado: Optional[str] = None

class VehiculoResponse(VehiculoBase):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    # Campos UML visibles en respuesta
    id_vehiculo: Optional[int] = None
    estado: Optional[str] = None
