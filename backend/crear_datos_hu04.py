from app.db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    db.execute(text("""
        INSERT INTO clientes (
            nombre,
            documento,
            telefono,
            email,
            direccion,
            referencia,
            latitud,
            longitud,
            ubicacion,
            horario_apertura,
            horario_cierre,
            restricciones_acceso,
            estado
        )
        VALUES (
            'Cliente Prueba HU-04',
            '99999999',
            '999999999',
            'cliente.prueba@ecolima.com',
            'Av. Proceres de la Independencia 1234, San Juan de Lurigancho',
            'Datos de prueba HU-04',
            -12.0100,
            -77.0050,
            ST_SetSRID(
                ST_MakePoint(-77.0050, -12.0100),
                4326
            ),
            '08:00',
            '18:00',
            NULL,
            'ACTIVO'
        )
    """))

    db.execute(text("""
        INSERT INTO ventanas_tiempo (
            hora_inicio,
            hora_fin,
            tolerancia_minutos,
            penalizacion_por_minuto
        )
        VALUES (
            '08:00',
            '12:00',
            15,
            0.50
        )
    """))

    db.commit()

    print("Datos de prueba HU-04 creados correctamente")

except Exception as e:
    db.rollback()
    print("ERROR:", e)

finally:
    db.close()
