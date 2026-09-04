from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Reporte(Base):
    __tablename__ = "reportes"
    id_reporte = Column(Integer, primary_key=True, autoincrement=True)
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), nullable=False)
    usuario_generador = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    tipo = Column(String(50), nullable=False)  # sostenibilidad, operativo, etc.
    fecha_generacion = Column(TIMESTAMP, nullable=True)
    ruta_archivo = Column(Text, nullable=True)

    ruta = relationship("Ruta", backref="reportes")
    usuario = relationship("Usuario", backref="reportes_generados")
