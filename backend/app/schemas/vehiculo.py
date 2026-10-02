from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class VehiculoBase(BaseModel):
    id_tipo_vehiculo: int = Field(gt=0)
    placa: str = Field(min_length=2, max_length=15)
    marca: str | None = Field(default=None, max_length=50)
    modelo: str | None = Field(default=None, max_length=50)

    anio_fabricacion: int | None = Field(
        default=None,
        ge=1990,
        le=2026,
    )

    capacidad_kg: Decimal = Field(gt=0)
    capacidad_m3: Decimal = Field(gt=0)
    consumo_km_l: Decimal = Field(gt=0)
    factor_co2_kg_km: Decimal = Field(gt=0)

    tipo_combustible: str

    costo_adquisicion: Decimal | None = Field(
        default=None,
        ge=0,
    )

    valor_actual: Decimal | None = Field(
        default=None,
        ge=0,
    )

    depreciacion_anual: Decimal | None = Field(
        default=None,
        ge=0,
    )

    costo_soat_anual: Decimal | None = Field(
        default=None,
        ge=0,
    )

    costo_seguro_anual: Decimal | None = Field(
        default=None,
        ge=0,
    )

    estado: str = "ACTIVO"

    @field_validator("placa")
    @classmethod
    def validar_placa(cls, value: str) -> str:
        value = value.upper().strip()

        import re

        if not re.fullmatch(r"[A-Z0-9]{2,3}-[0-9]{3,4}", value):
            raise ValueError(
                "La placa debe tener el formato ABC-123 o AB-1234"
            )

        return value

    @field_validator("tipo_combustible")
    @classmethod
    def validar_combustible(cls, value: str) -> str:
        value = value.upper().strip()

        combustibles = {
            "DIESEL",
            "GNV",
            "GASOLINA",
            "ELECTRICO",
        }

        if value not in combustibles:
            raise ValueError(
                "Tipo de combustible no válido"
            )

        return value

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        estados = {
            "ACTIVO",
            "MANTENIMIENTO",
            "BAJA",
        }

        if value not in estados:
            raise ValueError(
                "Estado no válido"
            )

        return value


class VehiculoCreate(VehiculoBase):
    pass


class VehiculoUpdate(VehiculoBase):
    pass


class VehiculoEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        estados = {
            "ACTIVO",
            "MANTENIMIENTO",
            "BAJA",
        }

        if value not in estados:
            raise ValueError(
                "Estado no válido"
            )

        return value


class VehiculoResponse(VehiculoBase):
    id_vehiculo: int

    model_config = {
        "from_attributes": True
    }