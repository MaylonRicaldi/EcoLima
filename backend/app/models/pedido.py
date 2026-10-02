from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    id_cliente: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "clientes.id_cliente",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    id_ventana_tiempo: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "ventanas_tiempo.id_ventana",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    direccion_entrega: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    referencia: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    latitud: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    longitud: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    # La columna ubicacion es PostGIS.
    # No se mapea aquí porque la gestionaremos directamente
    # mediante SQL en el endpoint.

    peso_kg: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    volumen_m3: Mapped[Decimal] = mapped_column(
        Numeric,
        nullable=False,
    )

    prioridad: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ESTANDAR",
    )

    tipo_producto: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDIENTE",
    )

    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )