from decimal import Decimal
from datetime import time

from sqlalchemy import ForeignKey, Integer, Numeric, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Conductor(Base):
    __tablename__ = "conductores"

    id_conductor: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    id_usuario: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "usuarios.id_usuario",
            ondelete="RESTRICT",
        ),
        unique=True,
        nullable=False,
    )

    dni: Mapped[str] = mapped_column(
        String(8),
        unique=True,
        nullable=False,
    )

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    apellido: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    telefono: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    anios_experiencia: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    hora_disponibilidad_inicio: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    hora_disponibilidad_fin: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    horas_max_conduccion: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    horas_conduccion_acumuladas: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DISPONIBLE",
    )