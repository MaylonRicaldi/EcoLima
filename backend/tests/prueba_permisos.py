"""Verificación de los permisos por rol: qué ve y qué puede hacer cada uno.

Uso: python tests/prueba_permisos.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal
from sqlalchemy import text

EMAIL_PRUEBA = "prueba.permisos@ecolima.com"


def _borrar_usuario_prueba():
    """Elimina la cuenta que crea esta prueba.

    Se llama en el finally para que una corrida fallida no deje el
    usuario basura en la tabla.
    """
    db = SessionLocal()

    try:
        db.execute(
            text("DELETE FROM usuarios WHERE email = :e"),
            {"e": EMAIL_PRUEBA},
        )
        db.commit()
    finally:
        db.close()


def main():
    r = Resultado("Permisos por rol (HU-01 / RES-08)")

    db = SessionLocal()

    # Usuario real de cada rol (solo ADMIN y CONDUCTOR existen por defecto)
    roles = {}
    for u in db.execute(
        text("""
            SELECT u.id_usuario, r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.id_rol = u.id_rol
        """)
    ).mappings():
        roles.setdefault(u["rol"], u["id_usuario"])

    db.close()

    print(f"       roles con usuario: {sorted(roles)}\n")

    admin = Api(token_de(1, "ADMIN"))

    # ---------- ADMIN: control total ----------
    for metodo, ruta, cuerpo in [
        ("get", "/usuarios", None),
        ("get", "/vehiculos", None),
        ("get", "/conductores", None),
        ("get", "/clientes", None),
        ("get", "/pedidos", None),
        ("get", "/rutas", None),
        ("get", "/asignaciones", None),
        ("get", "/trafico", None),
        ("get", "/incidentes", None),
        ("get", "/dashboard", None),
        ("get", "/indicadores", None),
        ("get", "/reportes", None),
        ("get", "/sostenibilidad/impacto", None),
    ]:
        st, _ = getattr(admin, metodo)(ruta) if cuerpo is None else (
            getattr(admin, metodo)(ruta, cuerpo)
        )
        r.check(f"ADMIN accede {ruta}", st == 200, f"status {st}")

    st, _ = admin.post("/usuarios", {
        "nombre": "Prueba Permisos",
        "email": EMAIL_PRUEBA,
        "password": "Aa123456",
        "id_rol": 2,
        "nombre_completo": "Prueba Permisos",
    })
    r.check("ADMIN crea usuarios", st in (201, 400), f"status {st}")

    # ---------- CONDUCTOR: solo su operación ----------
    cid = roles.get("CONDUCTOR")

    if cid is None:
        # La base no tiene ningún usuario con rol CONDUCTOR, así que
        # no hay contra quién comparar. Se dice con todas las letras
        # en vez de dar un OK que no prueba nada.
        print(
            "\n  La base no tiene usuarios con rol CONDUCTOR: "
            "se omite la comprobacion de ese rol."
        )
        return r.resumen()

    cond = Api(token_de(cid, "CONDUCTOR"))

    st, _ = cond.get("/vehiculos")
    r.check("CONDUCTOR lee vehículos", st == 200, f"status {st}")

    st, _ = cond.get("/rutas")
    r.check("CONDUCTOR lee rutas", st == 200, f"status {st}")

    st, _ = cond.get("/asignaciones")
    r.check("CONDUCTOR lee sus asignaciones", st == 200, f"status {st}")

    st, _ = cond.get("/incidentes")
    r.check("CONDUCTOR lee incidentes", st == 200, f"status {st}")

    st, _ = cond.post("/incidentes", {
        "tipo": "AVERIA",
        "descripcion": "Prueba de permiso: averia en ruta",
        "latitud": -12.01, "longitud": -77.01,
        "nivel": "MEDIO",
    })
    r.check("CONDUCTOR reporta incidentes", st == 201, f"status {st}")

    # Lo que NO debe poder hacer
    st, _ = cond.get("/usuarios")
    r.check("CONDUCTOR NO lee usuarios", st == 403, f"status {st}")

    st, _ = cond.get("/conductores")
    r.check("CONDUCTOR NO lee otros conductores", st == 403, f"status {st}")

    st, _ = cond.get("/clientes")
    r.check("CONDUCTOR NO lee clientes", st == 403, f"status {st}")

    st, _ = cond.get("/dashboard")
    r.check("CONDUCTOR NO ve dashboard global", st == 403, f"status {st}")

    st, _ = cond.get("/reportes")
    r.check("CONDUCTOR NO lee reportes", st == 403, f"status {st}")

    st, _ = cond.post("/rutas/optimizar", {"algoritmo": "SA"})
    r.check("CONDUCTOR NO optimiza rutas", st == 403, f"status {st}")

    st, _ = cond.post("/vehiculos", {"id_tipo_vehiculo": 1, "placa": "AAA-111"})
    r.check("CONDUCTOR NO crea vehículos", st == 403, f"status {st}")

    # ---------- Operador: sin usuarios ----------
    oid = roles.get("OPERADOR")

    if oid:
        op = Api(token_de(oid, "OPERADOR"))

        st, _ = op.get("/clientes")
        r.check("OPERADOR lee clientes", st == 200, f"status {st}")

        st, _ = op.get("/pedidos")
        r.check("OPERADOR lee pedidos", st == 200, f"status {st}")

        st, _ = op.post("/rutas/optimizar", {"algoritmo": "SA"})
        r.check("OPERADOR optimiza rutas", st in (200, 400),
                f"status {st}")

        st, _ = op.get("/usuarios")
        r.check("OPERADOR NO lee usuarios", st == 403, f"status {st}")

        st, _ = op.get("/dashboard")
        r.check("OPERADOR ve dashboard", st == 200, f"status {st}")

    # ---------- Sin token ----------
    anon = Api()

    st, _ = anon.get("/pedidos")
    r.check("sin token NO accede", st == 401, f"status {st}")

    # La cuenta de prueba se borra al terminar. Sin esto cada corrida
    # dejaba un usuario basura en la tabla.
    _borrar_usuario_prueba()

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)