from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Licencia(Base):
    __tablename__ = "licencias"

    id_licencia: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    id_conductor: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(
            "conductores.id_conductor",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    numero: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    categoria: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    fecha_emision: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    fecha_vencimiento: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )