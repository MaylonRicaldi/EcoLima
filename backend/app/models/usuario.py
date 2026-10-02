from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    id_rol: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("roles.id_rol"),
        nullable=False,
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVO",
    )

    fecha_creacion: Mapped[DateTime] = mapped_column(
        DateTime,
        nullable=False,
    )

    ultimo_acceso: Mapped[DateTime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    intentos_fallidos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    bloqueado_hasta: Mapped[DateTime | None] = mapped_column(
        DateTime,
        nullable=True,
    )