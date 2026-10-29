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


class EncargarPedidoRequest(BaseModel):
    """Encargar a un conductor un pedido que estaba suelto.

    El pedido entra en la ruta que ya está haciendo, al final de la
    secuencia. El orden no se cambia aquí: esto sólo lo mete en la
    lista y devuelve la recomendación.
    """

    id_pedido: int = Field(gt=0)


class ReoptimizacionRespuesta(BaseModel):
    """Resultado de corregir el recorrido de una ruta (HU-08).

    La reoptimización no reparte los pedidos entre toda la flota:
    conserva el vehículo y el conductor que la ruta ya tenía y solo
    vuelve a calcular el orden de visita.
    """

    id_ruta: int
    vehiculo: str
    id_vehiculo: int
    conductor: str
    id_conductor: int

    # Los mismos pedidos, en el nuevo orden
    pedidos: list[int]
    orden_anterior: list[int]
    orden_nuevo: list[int]
    orden_cambio: bool

    distancia_km: float
    duracion_minutos: float
    costo_total: float
    co2_kg: float
    cumplimiento_ventanas_pct: float | None

    # Cuánto mejoró cada cosa respecto al recorrido anterior
    cambio: dict[str, float | None]

    motivo: str | None = None
    segundos_resueltos: float
    calles_reales: bool = True
    advertencias: list[str] = Field(default_factory=list)


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