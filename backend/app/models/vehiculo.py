from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id_vehiculo: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    id_tipo_vehiculo: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tipos_vehiculo.id_tipo"),
        nullable=False,
    )

    placa: Mapped[str] = mapped_column(
        String(15),
        unique=True,
        nullable=False,
    )

    marca: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    modelo: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    anio_fabricacion: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    capacidad_kg: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    capacidad_m3: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    consumo_km_l: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    factor_co2_kg_km: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
    )

    tipo_combustible: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    costo_adquisicion: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    valor_actual: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    depreciacion_anual: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    costo_soat_anual: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    costo_seguro_anual: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVO",
    )