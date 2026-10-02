from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id_cliente: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    documento: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    telefono: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    direccion: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    referencia: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    latitud: Mapped[float] = mapped_column(
        Numeric(10, 7),
        nullable=False,
    )

    longitud: Mapped[float] = mapped_column(
        Numeric(10, 7),
        nullable=False,
    )

    horario_apertura: Mapped[str | None] = mapped_column(
        Time,
        nullable=True,
    )

    horario_cierre: Mapped[str | None] = mapped_column(
        Time,
        nullable=True,
    )

    restricciones_acceso: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVO",
    )