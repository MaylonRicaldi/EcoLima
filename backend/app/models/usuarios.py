from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    id_rol = Column(Integer, ForeignKey("roles.id_rol", ondelete="RESTRICT"), nullable=False)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    estado = Column(String(20), default="activo")
    fecha_creacion = Column(TIMESTAMP, nullable=True)
    ultimo_acceso = Column(TIMESTAMP, nullable=True)

    rol = relationship("Rol", backref="usuarios")
