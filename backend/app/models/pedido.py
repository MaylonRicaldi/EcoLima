from sqlalchemy import Column, Integer, String, Text, DECIMAL, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoFallback
    GeoType = Text

class Pedido(Base):
    """
    PEDIDOS según ER UML + compatibilidad RF-02.
    UML: id_pedido, id_cliente FK, id_ventana_tiempo FK, direccion, lat/lon, peso, volumen, prioridad, tipo_producto, estado
    RF-02 campos se mapean: cliente_id -> id_cliente, direccion_entrega, latitud/longitud, peso_kg, volumen_m3, ventana via FK, prioridad, tipo_producto
    """
    __tablename__ = "pedidos"

    id_pedido = Column(Integer, primary_key=True, autoincrement=True)
    id_cliente = Column(Integer, ForeignKey("clientes.id_cliente", ondelete="RESTRICT"), nullable=False)
    id_ventana_tiempo = Column(Integer, ForeignKey("ventanas_tiempo.id_ventana", ondelete="RESTRICT"), nullable=False)
    direccion_entrega = Column(Text, nullable=False)
    referencia = Column(Text, nullable=True)
    latitud = Column(DECIMAL(10, 7), nullable=False)
    longitud = Column(DECIMAL(10, 7), nullable=False)
    ubicacion = Column(GeoType, nullable=True)
    peso_kg = Column(DECIMAL(10, 2), nullable=False)
    volumen_m3 = Column(DECIMAL(10, 2), nullable=False)
    prioridad = Column(String(20), nullable=False)  # express, estándar, económico
    tipo_producto = Column(String(100), nullable=False)  # perecedero, no perecedero
    estado = Column(String(30), default="pendiente")
    fecha_registro = Column(TIMESTAMP, server_default=func.now())

    cliente = relationship("Cliente", backref="pedidos")
    ventana = relationship("VentanaTiempo", backref="pedidos")

    @property
    def id(self):
        return self.id_pedido

    @property
    def cliente_id(self):
        return self.id_cliente
