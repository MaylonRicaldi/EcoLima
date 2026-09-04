from pydantic import BaseModel, Field, field_validator, ConfigDict, model_validator
from typing import Literal, Optional
from datetime import time
import re

class PedidoBase(BaseModel):
    """RF-02 Gestión de Pedidos. Orden: ID cliente primero, no nombre."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    cliente_id: str = Field(..., min_length=1, max_length=50, description="ID del cliente (ej: CLI-001, 72699993, BODEGA-123)", examples=["CLI-001", "BODEGA-SJL-042"])
    direccion_entrega: str = Field(..., min_length=5, max_length=500, description="Dirección de entrega (soporta nomenclatura no estándar SJL y punto de referencia)", examples=["Av. Próceres 1234, SJL - Altura cuadra 20, Mz C, Lote 5"])
    punto_referencia: Optional[str] = Field(None, max_length=300, description="Punto de referencia opcional (ej: frente a bodega 'El Ahorro')")
    latitud: float = Field(..., ge=-18, le=0, description="Latitud GPS (Lima aprox -12.04)")
    longitud: float = Field(..., ge=-82, le=-68, description="Longitud GPS (Lima aprox -77.02)")
    peso_kg: float = Field(..., gt=0, le=5000, description="Peso en kg")
    volumen_m3: float = Field(..., gt=0, le=30, description="Volumen en m³")
    ventana_inicio: time = Field(..., description="Hora inicio ventana entrega (manual HH:MM)")
    ventana_fin: time = Field(..., description="Hora fin ventana entrega (manual HH:MM)")
    prioridad: Literal["express", "estándar", "estandar", "económico", "economico"] = Field(..., description="Prioridad")
    tipo_producto: Literal["perecedero", "no perecedero", "no_perecedero"] = Field(..., description="Tipo de producto")

    @field_validator("cliente_id")
    @classmethod
    def validar_cliente_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("ID de cliente es obligatorio")
        # Permitir alfanumérico con guiones, no solo nombre
        if len(v) < 2:
            raise ValueError("ID de cliente muy corto")
        return v

    @field_validator("direccion_entrega")
    @classmethod
    def validar_direccion(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Dirección muy corta, use punto de referencia si es necesario")
        return v.strip()

    @field_validator("latitud", "longitud")
    @classmethod
    def validar_coordenadas_lima(cls, v: float, info):
        # Advertencia suave si fuera de Lima Metropolitana (SJL, El Agustino, Santa Anita, Ate)
        # Lima Metropolitana aprox: lat -12.30 a -11.80, lon -77.20 a -76.80
        field = info.field_name
        if field == "latitud" and not (-12.30 <= v <= -11.80):
            # No rechazar, solo permitir pero el frontend avisará si está fuera de zona
            pass
        if field == "longitud" and not (-77.20 <= v <= -76.80):
            pass
        return v

    @model_validator(mode="after")
    def validar_ventana(self):
        if self.ventana_inicio and self.ventana_fin:
            if self.ventana_fin <= self.ventana_inicio:
                raise ValueError("La hora fin debe ser posterior a la hora inicio")
            # Validar duración máxima 12 horas
            inicio_min = self.ventana_inicio.hour * 60 + self.ventana_inicio.minute
            fin_min = self.ventana_fin.hour * 60 + self.ventana_fin.minute
            if fin_min - inicio_min > 12 * 60:
                raise ValueError("Ventana de tiempo no debe exceder 12 horas")
        return self

    @field_validator("prioridad")
    @classmethod
    def normalizar_prioridad(cls, v: str) -> str:
        mapping = {
            "estandar": "estándar",
            "economico": "económico",
            "express": "express",
            "estándar": "estándar",
            "económico": "económico",
        }
        normalized = v.strip().lower()
        if normalized not in mapping:
            raise ValueError("Prioridad debe ser express, estándar o económico")
        return mapping[normalized]

    @field_validator("tipo_producto")
    @classmethod
    def normalizar_tipo(cls, v: str) -> str:
        norm = v.strip().lower().replace("_", " ")
        if norm not in ["perecedero", "no perecedero"]:
            raise ValueError("Tipo debe ser 'perecedero' o 'no perecedero'")
        return norm


class PedidoCreate(PedidoBase):
    pass


class PedidoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    cliente_id: Optional[str] = Field(None, min_length=1, max_length=50)
    direccion_entrega: Optional[str] = Field(None, min_length=5, max_length=500)
    punto_referencia: Optional[str] = Field(None, max_length=300)
    latitud: Optional[float] = Field(None, ge=-18, le=0)
    longitud: Optional[float] = Field(None, ge=-82, le=-68)
    peso_kg: Optional[float] = Field(None, gt=0, le=5000)
    volumen_m3: Optional[float] = Field(None, gt=0, le=30)
    ventana_inicio: Optional[time] = None
    ventana_fin: Optional[time] = None
    prioridad: Optional[Literal["express", "estándar", "estandar", "económico", "economico"]] = None
    tipo_producto: Optional[Literal["perecedero", "no perecedero", "no_perecedero"]] = None


class PedidoResponse(PedidoBase):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
