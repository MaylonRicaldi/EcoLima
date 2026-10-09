"""Inventario de lo necesario para validar licencias contra vehiculos."""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

db = SessionLocal()

def mostrar(titulo, consulta):
    print(f"\n=== {titulo} ===")
    for fila in db.execute(text(consulta)).mappings():
        print("   ", dict(fila))


mostrar(
    "tipos de vehiculo",
    "SELECT id_tipo, nombre, descripcion FROM tipos_vehiculo ORDER BY id_tipo",
)

mostrar(
    "vehiculos",
    """
    SELECT v.id_vehiculo, v.placa, v.capacidad_kg, v.capacidad_m3,
           v.estado, t.nombre AS tipo
    FROM vehiculos v
    JOIN tipos_vehiculo t ON t.id_tipo = v.id_tipo_vehiculo
    ORDER BY v.id_vehiculo
    """,
)

mostrar(
    "licencias vigentes por conductor",
    """
    SELECT c.id_conductor, c.nombre, c.apellido,
           l.categoria, l.estado, l.fecha_vencimiento
    FROM conductores c
    JOIN licencias l ON l.id_conductor = c.id_conductor
    WHERE l.estado = 'VIGENTE'
    ORDER BY c.id_conductor, l.categoria
    """,
)

mostrar(
    "columnas de la tabla clientes",
    """
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'clientes'
    ORDER BY ordinal_position
    """,
)

mostrar(
    "clientes registrados",
    """
    SELECT id_cliente, nombre, documento, estado
    FROM clientes
    ORDER BY id_cliente
    """,
)

db.close()