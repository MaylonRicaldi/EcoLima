from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Literal
import re

class VehiculoBase(BaseModel):
    """Schema base para RF-01. No incluye latitud_base/longitud_base."""
    model_config = ConfigDict(extra="forbid")
    placa: str = Field(..., description="Placa según MTC Perú", examples=["ABC-123", "B7C-890"])
    tipo: Literal["camioneta", "furgón", "moto"] = Field(..., description="Tipo de vehículo")
    capacidad_carga_kg: float = Field(..., gt=0, description="Capacidad de carga en kg")
    consumo_combustible_km_l: float = Field(..., gt=0, le=100, description="Consumo de combustible en km/L")
    factor_emision_co2_kg_km: float = Field(..., gt=0, lt=1, description="Factor de emisión en kg CO2/km")
    anio_fabricacion: int = Field(..., ge=1990, le=2026, description="Año de fabricación")

    # NOTA: latitud_base y longitud_base eliminados intencionalmente (no requeridos por RF-01)

    @field_validator("placa")
    @classmethod
    def validar_placa(cls, v: str) -> str:
        v = v.strip().upper()
        # Formato peruano: ABC-123 o AB-1234, alfanumérico con guion
        if not re.match(r"^[A-Z0-9]{2,3}-[0-9]{3,4}$", v):
            raise ValueError("Formato de placa inválido. Ej: ABC-123")
        return v

    @field_validator("consumo_combustible_km_l")
    @classmethod
    def validar_consumo_por_tipo(cls, v: float, info):
        # Validación suave por tipo si está disponible
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
    tipo: Literal["camioneta", "furgón", "moto"] | None = None
    capacidad_carga_kg: float | None = Field(None, gt=0)
    consumo_combustible_km_l: float | None = Field(None, gt=0, le=100)
    factor_emision_co2_kg_km: float | None = Field(None, gt=0, lt=1)
    anio_fabricacion: int | None = Field(None, ge=1990, le=2026)

class VehiculoResponse(VehiculoBase):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    id: int
