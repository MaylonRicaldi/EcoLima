from sqlalchemy import text
from app.db.database import SessionLocal

db = SessionLocal()

try:
    usuarios = db.execute(
        text("""
            SELECT
                u.id_usuario,
                u.nombre,
                u.email,
                r.nombre AS rol,
                u.estado
            FROM usuarios u
            INNER JOIN roles r
                ON r.id_rol = u.id_rol
            ORDER BY u.id_usuario
        """)
    ).mappings().all()

    for usuario in usuarios:
        print(dict(usuario))

finally:
    db.close()