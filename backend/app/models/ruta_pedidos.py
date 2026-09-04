from sqlalchemy import Column, Integer, TIMESTAMP, DECIMAL, String, ForeignKey, ForeignKeyConstraint
from .base import Base

class RutaPedido(Base):
    __tablename__ = "ruta_pedidos"
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), primary_key=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido", ondelete="CASCADE"), primary_key=True)
    orden_visita = Column(Integer, nullable=False)
    hora_llegada_estimada = Column(TIMESTAMP, nullable=True)
    hora_llegada_real = Column(TIMESTAMP, nullable=True)
    tiempo_espera = Column(Integer, nullable=True)
    penalizacion = Column(DECIMAL(10, 2), nullable=True)
    estado_entrega = Column(String(30), default="pendiente")
