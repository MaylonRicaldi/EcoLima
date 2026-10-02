from datetime import time
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


ESTADOS_CONDUCTOR = {
    "DISPONIBLE",
    "EN_RUTA",
    "DESCANSO",
    "INACTIVO",
}


class ConductorBase(BaseModel):
    id_usuario: int = Field(gt=0)

    dni: str = Field(
        min_length=8,
        max_length=8,
    )

    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    apellido: str = Field(
        min_length=1,
        max_length=100,
    )

    telefono: str | None = Field(
        default=None,
        max_length=30,
    )

    anios_experiencia: int = Field(
        ge=0,
    )

    hora_disponibilidad_inicio: time

    hora_disponibilidad_fin: time

    horas_max_conduccion: Decimal = Field(
        gt=0,
        le=8,
    )

    horas_conduccion_acumuladas: Decimal = Field(
        ge=0,
    )

    estado: str = "DISPONIBLE"


    @field_validator("dni")
    @classmethod
    def validar_dni(cls, value: str) -> str:
        value = value.strip()

        if not value.isdigit() or len(value) != 8:
            raise ValueError(
                "El DNI debe contener exactamente 8 dígitos"
            )

        return value


    @field_validator("nombre", "apellido")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "El campo no puede estar vacío"
            )

        return value


    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_CONDUCTOR:
            raise ValueError(
                "Estado de conductor no válido"
            )

        return value


class ConductorCreate(ConductorBase):
    pass


class ConductorUpdate(ConductorBase):
    pass


class ConductorEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_CONDUCTOR:
            raise ValueError(
                "Estado de conductor no válido"
            )

        return value


class ConductorResponse(ConductorBase):
    id_conductor: int

    model_config = {
        "from_attributes": True
    }