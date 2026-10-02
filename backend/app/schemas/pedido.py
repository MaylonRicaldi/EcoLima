from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


ESTADOS_PEDIDO = {
    "PENDIENTE",
    "ASIGNADO",
    "EN_RUTA",
    "ENTREGADO",
    "CANCELADO",
    "FALLIDO",
}

PRIORIDADES_PEDIDO = {
    "EXPRESS",
    "ESTANDAR",
    "ECONOMICO",
}

TIPOS_PRODUCTO = {
    "PERECEDERO",
    "NO_PERECEDERO",
    "QUIMICO",
}


class PedidoBase(BaseModel):
    id_cliente: int = Field(gt=0)
    id_ventana_tiempo: int = Field(gt=0)

    direccion_entrega: str = Field(
        min_length=1,
        max_length=500,
    )

    referencia: str | None = Field(
        default=None,
        max_length=500,
    )

    latitud: Decimal
    longitud: Decimal

    peso_kg: Decimal = Field(gt=0)
    volumen_m3: Decimal = Field(gt=0)

    prioridad: str = "ESTANDAR"
    tipo_producto: str
    estado: str = "PENDIENTE"

    @field_validator("direccion_entrega")
    @classmethod
    def validar_direccion(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "La dirección de entrega no puede estar vacía"
            )

        return value

    @field_validator("referencia")
    @classmethod
    def validar_referencia(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()

        return value if value else None

    @field_validator("latitud")
    @classmethod
    def validar_latitud(cls, value: Decimal) -> Decimal:
        if value < Decimal("-13") or value > Decimal("-11"):
            raise ValueError(
                "La latitud debe estar entre -13 y -11"
            )

        return value

    @field_validator("longitud")
    @classmethod
    def validar_longitud(cls, value: Decimal) -> Decimal:
        if value < Decimal("-78") or value > Decimal("-76"):
            raise ValueError(
                "La longitud debe estar entre -78 y -76"
            )

        return value

    @field_validator("prioridad")
    @classmethod
    def validar_prioridad(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in PRIORIDADES_PEDIDO:
            raise ValueError(
                "Prioridad de pedido no válida"
            )

        return value

    @field_validator("tipo_producto")
    @classmethod
    def validar_tipo_producto(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in TIPOS_PRODUCTO:
            raise ValueError(
                "Tipo de producto no válido"
            )

        return value

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_PEDIDO:
            raise ValueError(
                "Estado de pedido no válido"
            )

        return value


class PedidoCreate(PedidoBase):
    pass


class PedidoUpdate(PedidoBase):
    pass


class PedidoEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_PEDIDO:
            raise ValueError(
                "Estado de pedido no válido"
            )

        return value


class PedidoResponse(PedidoBase):
    id_pedido: int
    fecha_registro: datetime

    model_config = {
        "from_attributes": True,
    }