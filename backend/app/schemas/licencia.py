from datetime import date

from pydantic import BaseModel, Field, field_validator


CATEGORIAS_LICENCIA = {
    "A-I",
    "A-IIA",
    "A-IIB",
    "A-IIIA",
    "A-IIIB",
    "A-IIIC",
}


ESTADOS_LICENCIA = {
    "VIGENTE",
    "VENCIDA",
    "SUSPENDIDA",
}


class LicenciaBase(BaseModel):
    id_conductor: int = Field(gt=0)

    numero: str = Field(
        min_length=1,
        max_length=50,
    )

    categoria: str

    fecha_emision: date

    fecha_vencimiento: date

    estado: str = "VIGENTE"


    @field_validator("numero")
    @classmethod
    def validar_numero(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "El número de licencia no puede estar vacío"
            )

        return value


    @field_validator("categoria")
    @classmethod
    def validar_categoria(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in CATEGORIAS_LICENCIA:
            raise ValueError(
                "Categoría de licencia no válida"
            )

        return value


    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_LICENCIA:
            raise ValueError(
                "Estado de licencia no válido"
            )

        return value


    @field_validator("fecha_vencimiento")
    @classmethod
    def validar_fecha_vencimiento(
        cls,
        value: date,
        info,
    ) -> date:

        fecha_emision = info.data.get(
            "fecha_emision"
        )

        if (
            fecha_emision is not None
            and value <= fecha_emision
        ):
            raise ValueError(
                "La fecha de vencimiento debe ser posterior a la fecha de emisión"
            )

        return value


class LicenciaCreate(LicenciaBase):
    pass


class LicenciaUpdate(LicenciaBase):
    pass


class LicenciaEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS_LICENCIA:
            raise ValueError(
                "Estado de licencia no válido"
            )

        return value


class LicenciaResponse(LicenciaBase):
    id_licencia: int

    model_config = {
        "from_attributes": True
    }