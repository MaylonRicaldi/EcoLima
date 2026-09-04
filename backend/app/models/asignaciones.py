from sqlalchemy import Column, Integer, TIMESTAMP, DECIMAL, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Asignacion(Base):
    __tablename__ = "asignaciones"
    id_asignacion = Column(Integer, primary_key=True, autoincrement=True)
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), nullable=False)
    id_vehiculo = Column(Integer, ForeignKey("vehiculos.id_vehiculo", ondelete="RESTRICT"), nullable=False)
    id_conductor = Column(Integer, ForeignKey("conductores.id_conductor", ondelete="RESTRICT"), nullable=False)
    fecha_asignacion = Column(TIMESTAMP, nullable=True)
    hora_salida = Column(TIMESTAMP, nullable=True)
    hora_retorno = Column(TIMESTAMP, nullable=True)
    horas_conduccion = Column(DECIMAL(6, 2), nullable=True)
    horas_descanso = Column(DECIMAL(6, 2), nullable=True)
    descanso_requerido = Column(Boolean, default=False)
    estado = Column(String(20), default="asignada")

    ruta = relationship("Ruta", backref="asignaciones")
    vehiculo = relationship("Vehiculo", backref="asignaciones")
    conductor = relationship("Conductor", backref="asignaciones")
