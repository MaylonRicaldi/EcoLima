from pydantic import BaseModel, Field, field_validator

ROLES = {
    "ADMIN",
    "OPERADOR",
    "CONDUCTOR",
    "AUDITOR",
    "CLIENTE",
}

ESTADOS = {
    "ACTIVO",
    "BLOQUEADO",
    "INACTIVO",
}


class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=8)
    id_rol: int = Field(gt=0)
    estado: str = "ACTIVO"

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío")
        return value

    @field_validator("email")
    @classmethod
    def validar_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS:
            raise ValueError("Estado no válido")

        return value


class UsuarioUpdate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    estado: str = "ACTIVO"

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def validar_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS:
            raise ValueError("Estado no válido")

        return value


class UsuarioEstadoUpdate(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, value: str) -> str:
        value = value.upper().strip()

        if value not in ESTADOS:
            raise ValueError("Estado no válido")

        return value


class UsuarioResponse(BaseModel):
    id_usuario: int
    id_rol: int
    nombre: str
    email: str
    estado: str

    model_config = {"from_attributes": True}