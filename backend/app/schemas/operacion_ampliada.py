"""Schemas de obstáculos, saturación y ventanas sugeridas.

Lo que agregan el Sprint 03:

  - Obstaculos: el cono que un conductor coloca en el punto donde hay
    un malestar. Se queda en el mapa hasta que alguien lo quita.
  - Saturacion: si la flota y los conductores dan abasto para una
    ventana concreta, tanto por capacidad como por tráfico.
  - VentanaSugerida: cuando esa ventana está llena, se propone otra
    del catálogo que sí quepa. La propone, no la impone.
"""
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator

TIPOS_OBSTACULO = (
    "CONO",
    "OBRA",
    "ARBOL",
    "BACHE",
    "BLOQUEO_CALLE",
    "OTRO",
)

NIVELES = ("ALTO", "MEDIO", "BAJO")


class ObstaculoBase(BaseModel):
    tipo: str
    descripcion: str
    latitud: float
    longitud: float
    nivel: str = "MEDIO"

    # Opcional: si viene informado, el obstáculo queda ligado al
    # conductor que lo puso. Sirve para saber quién lo.Reportó.
    id_ruta: int | None = Field(default=None, gt=0)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, valor):
        if valor not in TIPOS_OBSTACULO:
            raise ValueError(
                "El tipo de obstáculo debe ser uno de: "
                + ", ".join(TIPOS_OBSTACULO)
            )

        return valor

    @field_validator("nivel")
    @classmethod
    def validar_nivel(cls, valor):
        if valor not in NIVELES:
            raise ValueError(
                "El nivel debe ser ALTO, MEDIO o BAJO"
            )

        return valor

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, valor):
        valor = valor.strip()

        if len(valor) < 5:
            raise ValueError(
                "Describa el obstáculo para que el conductor "
                "reconozca el punto"
            )

        return valor

    @field_validator("latitud")
    @classmethod
    def validar_latitud(cls, valor):
        # RN-011: el servicio opera dentro del área de Lima
        if not -13.0 <= valor <= -11.0:
            raise ValueError("La latitud está fuera del área de Lima")

        return valor

    @field_validator("longitud")
    @classmethod
    def validar_longitud(cls, valor):
        if not -78.0 <= valor <= -76.0:
            raise ValueError("La longitud está fuera del área de Lima")

        return valor


class ObstaculoCreate(ObstaculoBase):
    pass


class ObstaculoResponse(BaseModel):
    id_obstaculo: int
    tipo: str
    descripcion: str
    latitud: float
    longitud: float
    nivel: str
    id_usuario: int | None
    fecha_registro: datetime
    resuelto: bool
    id_ruta: int | None = None
    # Distancia hasta el obstáculo más cercano entre las paradas de
    # las rutas de ese día, para decir si el cono afecta a alguien.
    distancia_conductores_afectados_km: float | None = None


class SaturacionRespuesta(BaseModel):
    """Si la operación da abasto para una ventana concreta.

    Se informa de las dos cosas que pueden saturar:

      - capacidad: vehículos y conductores con horas o carga libres
      - trafico:   congestión registrada sobre las rutas de ese día
    """

    fecha: date
    hora_inicio: time
    hora_fin: time

    # Estado global: HOLGADO, AJUSTADO o SATURADO
    estado: Literal["HOLGADO", "AJUSTADO", "SATURADO"]

    # --- capacidad ---
    conductores_disponibles: int
    conductores_en_ruta: int
    horas_libres_totales: float
    carga_kg_libre: float
    carga_m3_libre: float

    # --- tráfico ---
    tramos_congestionados: int
    tramos_en_ruta_afectados: int
    congestion_maxima: str | None

    motivos: list[str] = Field(default_factory=list)

    # Ventana del catálogo que sí tendría hueco, si la elegida no lo
    # tiene. El frontend la propone y el usuario decide.
    ventana_sugerida: dict | None = None


class VentanaSugeridaRequest(BaseModel):
    fecha: date
    hora_inicio: time
    hora_fin: time
    peso_kg: float = Field(default=0, ge=0)
    volumen_m3: float = Field(default=0, ge=0)