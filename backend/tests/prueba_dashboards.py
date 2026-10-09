"""Valida que cada rol entre y vea exactamente lo que le corresponde.

Uso: python tests/prueba_dashboards.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado

from app.core.jwt import create_access_token
from app.db.database import SessionLocal
from sqlalchemy import text

CONTRASENA = "Demo1234"


def main():
    r = Resultado("Dashboards por rol")

    db = SessionLocal()

    usuarios = db.execute(
        text("""
            SELECT u.id_usuario, r.nombre AS rol, u.email
            FROM usuarios u
            INNER JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.estado = 'ACTIVO'
            ORDER BY r.id_rol
        """)
    ).mappings().all()

    db.close()

    print(f"       probando {len(usuarios)} usuarios\n")

    # Qué ve cada rol: (ruta, 200 sí / 403 no)
    ESPERADO = {
        "ADMIN": {
            "/dashboard": True, "/usuarios": True,
            "/vehiculos": True, "/conductores": True,
            "/clientes": True, "/pedidos": True,
            "/rutas": True, "/reportes": True,
        },
        "OPERADOR": {
            "/dashboard": True, "/usuarios": False,
            "/vehiculos": True, "/conductores": True,
            "/clientes": True, "/pedidos": True,
            "/rutas": True, "/reportes": True,
        },
        "CONDUCTOR": {
            "/dashboard": False, "/usuarios": False,
            "/vehiculos": True, "/conductores": False,
            "/clientes": False, "/pedidos": True,
            "/rutas": True, "/reportes": False,
        },
        "AUDITOR": {
            "/dashboard": True, "/usuarios": True,
            "/vehiculos": True, "/conductores": True,
            "/clientes": True, "/pedidos": True,
            "/rutas": True, "/reportes": True,
        },
        "CLIENTE": {
            "/dashboard": False, "/usuarios": False,
            "/vehiculos": False, "/conductores": False,
            "/clientes": False, "/pedidos": True,
            "/rutas": False, "/reportes": False,
        },
    }

    for u in usuarios:
        rol = u["rol"]

        api = Api(create_access_token(
            usuario_id=u["id_usuario"], rol=rol
        ))

        st, me = api.get("/auth/me")

        r.check(
            f"{rol:<10} ({u['email']}) autentica",
            st == 200 and me["rol"] == rol,
            f"status {st}, rol {me['rol'] if st == 200 else '-'}"
        )

        esperado = ESPERADO.get(rol, {})

        for ruta, permitido in esperado.items():
            st, _ = api.get(ruta)

            if permitido:
                ok = st == 200
                detalle = f"status {st}"
            else:
                ok = st == 403
                detalle = f"status {st} (se esperaba 403)"

            r.check(
                f"{rol:<10} {'ve' if permitido else 'NO ve'} "
                f"{ruta}",
                ok,
                detalle
            )

        print()

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)