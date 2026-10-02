"""Schemas de tráfico e incidentes (HU-08).

Respetan los CHECK del DDL:
  trafico.nivel_congestion  IN ('VERDE','AMARILLO','ROJO')
  trafico.fuente            IN ('WAZE','SIMAT','MANUAL')
  incidentes.tipo           IN ('ACCIDENTE','AVERIA','ROBO','BLOQUEO','CLIMA')
  incidentes.nivel          IN ('ALTO','MEDIO','BAJO')
  incidentes.estado         IN ('ACTIVO','RESUELTO','CANCELADO')
"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class TraficoCreate(BaseModel):
    segmento: str = Field(min_length=3, max_length=150)

    latitud: float = Field(ge=-13, le=-11)

    longitud: float = Field(ge=-78, le=-76)

    nivel_congestion: str

    velocidad_kmh: float | None = Field(default=None, ge=0)

    fuente: str = "MANUAL"

    @field_validator("nivel_congestion")
    @classmethod
    def validar_nivel(cls, valor):
        if valor not in ("VERDE", "AMARILLO", "ROJO"):
            raise ValueError(
                "El nivel de congestión debe ser VERDE, AMARILLO o ROJO"
            )

        return valor

    @field_validator("fuente")
    @classmethod
    def validar_fuente(cls, valor):
        if valor not in ("WAZE", "SIMAT", "MANUAL"):
            raise ValueError(
                "La fuente debe ser WAZE, SIMAT o MANUAL"
            )

        return valor


class TraficoResponse(TraficoCreate):
    id_trafico: int
    fecha_hora: datetime


class IncidenteCreate(BaseModel):
    tipo: str

    descripcion: str = Field(min_length=5)

    latitud: float = Field(ge=-13, le=-11)

    longitud: float = Field(ge=-78, le=-76)

    nivel: str

    fuente: str | None = None

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, valor):
        if valor not in (
            "ACCIDENTE", "AVERIA", "ROBO", "BLOQUEO", "CLIMA",
        ):
            raise ValueError("El tipo de incidente no es válido")

        return valor

    @field_validator("nivel")
    @classmethod
    def validar_nivel(cls, valor):
        if valor not in ("ALTO", "MEDIO", "BAJO"):
            raise ValueError("El nivel debe ser ALTO, MEDIO o BAJO")

        return valor


class IncidenteEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in ("ACTIVO", "RESUELTO", "CANCELADO"):
            raise ValueError("El estado no es válido")

        return valor


class IncidenteResponse(BaseModel):
    id_incidente: int
    tipo: str
    descripcion: str
    latitud: float
    longitud: float
    fecha_hora: datetime
    nivel: str
    fuente: str | None
    estado: str


class ReoptimizacionEvaluacion(BaseModel):
    """Resultado de evaluar si una ruta requiere reoptimización (RN-017)."""

    id_ruta: int
    requiere_reoptimizacion: bool
    motivos: list[str]
    incidentes_en_ruta: list[dict]
    tramos_congestionados: list[dict]