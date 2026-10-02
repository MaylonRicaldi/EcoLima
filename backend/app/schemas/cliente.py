import datetime

from pydantic import BaseModel, Field, field_validator


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