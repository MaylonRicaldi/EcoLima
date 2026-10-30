import os
import sys

from sqlalchemy import text

sys.path.insert(
    0,
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"),
)

from app.core.security import hash_password
from app.db.database import SessionLocal


def main():
    password = os.environ.get("CYPRESS_E2E_PASSWORD")

    if not password:
        raise RuntimeError("CYPRESS_E2E_PASSWORD no está configurada.")

    db = SessionLocal()

    try:
        roles = dict(
            db.execute(text("SELECT nombre, id_rol FROM roles")).all()
        )
        test_password_hash = hash_password(password)
        account_ids = {}

        for role in ("ADMIN", "OPERADOR", "CONDUCTOR", "AUDITOR", "CLIENTE"):
            email = (
                "admin@ecolima.com"
                if role == "ADMIN"
                else f"{role.lower()}@ecolima.com"
            )
            account_ids[role] = db.execute(
                text("""
                    INSERT INTO usuarios (
                        id_rol, nombre, email, password_hash, estado
                    )
                    VALUES (
                        :id_rol, :nombre, :email, :password, 'ACTIVO'
                    )
                    RETURNING id_usuario
                """),
                {
                    "id_rol": roles[role],
                    "nombre": f"Cuenta E2E {role}",
                    "email": email,
                    "password": test_password_hash,
                },
            ).scalar_one()

        id_cliente = db.execute(
            text("""
                INSERT INTO clientes (
                    nombre, email, direccion, latitud, longitud,
                    ubicacion, estado
                )
                VALUES (
                    'Cliente semilla E2E', 'semilla@ecolima.com',
                    'Av. Base E2E 100, Lima', -12.015, -77.005,
                    ST_SetSRID(ST_MakePoint(-77.005, -12.015), 4326),
                    'ACTIVO'
                )
                RETURNING id_cliente
            """)
        ).scalar_one()

        id_ventana = db.execute(
            text("""
                INSERT INTO ventanas_tiempo (
                    hora_inicio, hora_fin, tolerancia_minutos,
                    penalizacion_por_minuto
                )
                VALUES ('08:00', '12:00', 15, 0.50)
                RETURNING id_ventana
            """)
        ).scalar_one()

        id_vehiculo = db.execute(
            text("""
                INSERT INTO vehiculos (
                    id_tipo_vehiculo, placa, marca, modelo,
                    capacidad_kg, capacidad_m3, consumo_km_l,
                    factor_co2_kg_km, tipo_combustible
                )
                VALUES (
                    1, 'E2E-123', 'EcoLima', 'Vehículo de prueba',
                    800, 5, 10, 0.9, 'DIESEL'
                )
                RETURNING id_vehiculo
            """)
        ).scalar_one()

        id_conductor = db.execute(
            text("""
                INSERT INTO conductores (
                    id_usuario, dni, nombre, apellido,
                    hora_disponibilidad_inicio,
                    hora_disponibilidad_fin,
                    horas_max_conduccion, ubicacion_inicio, estado
                )
                VALUES (
                    :id_usuario, '00000001', 'Conductor', 'E2E',
                    '05:00', '22:00', 8,
                    ST_SetSRID(ST_MakePoint(-77.005, -12.015), 4326),
                    'DISPONIBLE'
                )
                RETURNING id_conductor
            """),
            {"id_usuario": account_ids["CONDUCTOR"]},
        ).scalar_one()

        db.execute(
            text("""
                INSERT INTO licencias (
                    id_conductor, numero, categoria,
                    fecha_emision, fecha_vencimiento, estado
                )
                VALUES (
                    :id_conductor, 'E2E-0001', 'A-I',
                    CURRENT_DATE - 30, CURRENT_DATE + 365, 'VIGENTE'
                )
            """),
            {"id_conductor": id_conductor},
        )

        db.commit()
        print(
            "Semillas E2E creadas: "
            f"cliente={id_cliente}, ventana={id_ventana}, "
            f"vehiculo={id_vehiculo}, conductor={id_conductor}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
