from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Licencia(Base):
    __tablename__ = "licencias"
    id_licencia = Column(Integer, primary_key=True, autoincrement=True)
    id_conductor = Column(Integer, ForeignKey("conductores.id_conductor", ondelete="CASCADE"), nullable=False)
    numero = Column(String(30), unique=True, nullable=False)
    categoria = Column(String(20), nullable=False)
    fecha_emision = Column(Date, nullable=True)
    fecha_vencimiento = Column(Date, nullable=True)
    estado = Column(String(20), default="vigente")

    conductor = relationship("Conductor", backref="licencias")
