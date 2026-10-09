import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)

from app.core.parametros import (
    HORA_OPERATIVA_FIN,
    HORA_OPERATIVA_INICIO,
)


def normalizar_hora(valor):
    """Normaliza una columna TIME de PostgreSQL a texto HH:MM.

    PostgreSQL devuelve datetime.time (o datetime.datetime) y no str.
    Acepta ambos además del texto que mandan los <input type="time">.
    """
    if valor is None:
        return None

    if isinstance(valor, datetime.time):
        return valor.strftime("%H:%M")

    if isinstance(valor, datetime.datetime):
        return valor.strftime("%H:%M")

    if not isinstance(valor, str):
        raise ValueError("El horario debe tener formato HH:MM")

    partes = valor.split(":")

    if len(partes) != 2:
        raise ValueError("El horario debe tener formato HH:MM")

    try:
        hora = int(partes[0])
        minuto = int(partes[1])
    except ValueError as exc:
        raise ValueError("El horario debe tener formato HH:MM") from exc

    if not (0 <= hora <= 23 and 0 <= minuto <= 59):
        raise ValueError("El horario debe estar entre 00:00 y 23:59")

    return f"{hora:02d}:{minuto:02d}"


def en_minutos(hora):
    horas, minuto = hora.split(":")
    return int(horas) * 60 + int(minuto)


class ClienteBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)

    documento: str | None = Field(
        default=None,
        max_length=20,
    )

    telefono: str | None = Field(
        default=None,
        max_length=20,
    )

    email: str | None = Field(
        default=None,
        max_length=150,
    )

    direccion: str = Field(min_length=5)

    referencia: str | None = None

    latitud: float = Field(ge=-13, le=-11)

    longitud: float = Field(ge=-78, le=-76)

    horario_apertura: str | None = None

    horario_cierre: str | None = None

    restricciones_acceso: str | None = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, valor):
        return valor.strip()

    @field_validator("horario_apertura", "horario_cierre", mode="before")
    @classmethod
    def validar_horario(cls, valor):
        # La columna es TIME: PostgreSQL devuelve datetime.time, no str.
        return normalizar_hora(valor)


class ClienteCreate(ClienteBase):
    estado: str = Field(default="ACTIVO")

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in ("ACTIVO", "INACTIVO"):
            raise ValueError("El estado debe ser ACTIVO o INACTIVO")

        return valor


class ClienteUpdate(ClienteBase):
    pass


class ClienteEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor):
        if valor not in ("ACTIVO", "INACTIVO"):
            raise ValueError("El estado debe ser ACTIVO o INACTIVO")

        return valor


class ClienteResponse(ClienteBase):
    id_cliente: int

    estado: str

    model_config = {
        "from_attributes": True,
    }


# ---------------------------------------------------------------------------
# Ventanas de tiempo (RN-005 / RN-012)
#
# La tabla ventanas_tiempo del DDL no tiene columna de estado ni de
# nombre: una ventana es un intervalo [hora_inicio, hora_fin] con su
# tolerancia y su costo de minute de retraso. Eso es exactamente lo
# que estos schemas exponen, sin agregar campos.
# ---------------------------------------------------------------------------


class VentanaTiempoBase(BaseModel):
    hora_inicio: str
    hora_fin: str

    tolerancia_minutos: int = Field(default=0, ge=0)

    # RN-005: penalidad = minutos de tardanza * S/ 0.50 por minuto
    penalizacion_por_minuto: Decimal = Field(
        default=Decimal("0.50"),
        ge=0,
        max_digits=10,
        decimal_places=2,
    )

    @field_validator("hora_inicio", "hora_fin", mode="before")
    @classmethod
    def validar_horario(cls, valor):
        return normalizar_hora(valor)

    @model_validator(mode="after")
    def validar_intervalo(self):
        inicio = en_minutos(self.hora_inicio)
        fin = en_minutos(self.hora_fin)

        # CHECK (hora_fin > hora_inicio) del DDL
        if fin <= inicio:
            raise ValueError(
                "La hora de fin debe ser posterior a la hora de inicio"
            )

        # RN-012: la operación está restringida a 05:00-22:00 y las
        # ventanas deben estar contenidas en el horario operativo.
        # El mensaje va sin el código de la regla porque lo lee el
        # usuario final en el formulario.
        if inicio < HORA_OPERATIVA_INICIO * 60:
            raise ValueError(
                f"La ventana no puede empezar antes de las "
                f"{HORA_OPERATIVA_INICIO:02d}:00, que es el inicio "
                f"del horario de atención"
            )

        if fin > HORA_OPERATIVA_FIN * 60:
            raise ValueError(
                f"La ventana no puede terminar después de las "
                f"{HORA_OPERATIVA_FIN:02d}:00, que es el cierre "
                f"del horario de atención"
            )

        return self

    @property
    def duracion_minutos(self) -> int:
        return en_minutos(self.hora_fin) - en_minutos(self.hora_inicio)


class VentanaTiempoCreate(VentanaTiempoBase):
    pass


class VentanaTiempoUpdate(VentanaTiempoBase):
    pass


class VentanaTiempoResponse(VentanaTiempoBase):
    id_ventana: int

    # Derivado, no es una columna: permite avisar en la interfaz que
    # la ventana ya está usada y por tanto no se puede borrar
    # (ON DELETE RESTRICT en pedidos.id_ventana_tiempo).
    pedidos_asociados: int = 0

    model_config = {
        "from_attributes": True,
    }