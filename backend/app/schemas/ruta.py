"""Schemas de rutas, asignaciones, paradas e indicadores (HU-06)."""
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class OptimizarRequest(BaseModel):
    """Parámetros de la optimización (RN-017 / RNF-001)."""

    algoritmo: str = "SA"

    iteraciones: int = Field(default=250, ge=1, le=2000)

    semilla: int | None = None

    fecha: date | None = None

    @field_validator("algoritmo")
    @classmethod
    def validar_algoritmo(cls, valor):
        # El DDL restringe rutas.algoritmo_utilizado a estos valores.
        if valor not in ("GA", "TABU", "ACO", "SA"):
            raise ValueError("El algoritmo debe ser GA, TABU, ACO o SA")

        return valor


class RutaResumen(BaseModel):
    id_ruta: int
    fecha: date
    estado: str
    algoritmo_utilizado: str | None
    distancia_km: float
    duracion_minutos: float
    co2_kg: float
    costo_total: float
    cumplimiento_ventanas_pct: float | None


class OptimizacionRespuesta(BaseModel):
    """Resultado de ejecutar el optimizador."""

    rutas_creadas: list[RutaResumen]
    pedidos_planificados: int
    pedidos_no_planificados: list[dict]
    vehiculos_elegibles: int
    conductores_disponibles: int
    segundos_resueltos: float
    advertencias: list[str] = Field(default_factory=list)


class ReoptimizarRequest(BaseModel):
    iteraciones: int = Field(default=200, ge=1, le=2000)
    semilla: int | None = None
    motivo: str | None = None


class RutaEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in (
            'PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA',
            'REOPTIMIZADA',
        ):
            raise ValueError("El estado de la ruta no es válido")

        return valor


class AsignacionCreate(BaseModel):
    id_ruta: int
    id_vehiculo: int
    id_conductor: int
    hora_salida: datetime | None = None


class AsignacionEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in (
            'ASIGNADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA',
        ):
            raise ValueError("El estado de la asignación no es válido")

        return valor


class EntregaEstadoUpdate(BaseModel):
    estado_entrega: str
    hora_llegada_real: datetime | None = None

    @field_validator("estado_entrega")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in (
            'PENDIENTE', 'ENTREGADO', 'FALLIDO', 'REPROGRAMADO',
        ):
            raise ValueError("El estado de la entrega no es válido")

        return valor