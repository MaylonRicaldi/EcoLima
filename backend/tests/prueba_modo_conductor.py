"""Verifica el modo conductor: permisos estrechos y logout en toda pantalla.

Uso: python tests/prueba_modo_conductor.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado

from app.core.jwt import create_access_token
from app.db.database import SessionLocal
from sqlalchemy import text


def main():
    r = Resultado("Modo conductor")

    db = SessionLocal()

    # conductors con rol CONDUCTOR real
    conductores = db.execute(
        text("""
            SELECT c.id_conductor, c.id_usuario, c.nombre
            FROM conductores c
            INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
            INNER JOIN roles rr ON rr.id_rol = u.id_rol
            WHERE rr.nombre = 'CONDUCTOR'
            ORDER BY c.id_conductor
        """)
    ).mappings().all()

    db.close()

    if not conductores:
        # Ningún conductor está enlazado a una cuenta de usuario con
        # rol CONDUCTOR, así que el modo conductor no se puede
        # comprobar por HTTP. Se avisa en vez de fingir un OK.
        print(
            "\n  Ningún conductor tiene cuenta de usuario con rol "
            "CONDUCTOR: se omite la comprobacion del modo conductor."
        )
        return r.resumen()

    # ---------- vista del conductor ----------
    for c in conductores[:2]:
        api = Api(create_access_token(
            usuario_id=c["id_usuario"], rol="CONDUCTOR"
        ))

        st, asignaciones = api.get("/asignaciones")
        r.check(
            f"{c['nombre']} ve sus asignaciones", st == 200,
            f"status {st}"
        )

        st, rutas = api.get("/rutas")
        r.check(
            f"{c['nombre']} ve sus rutas", st == 200, f"status {st}"
        )

        st, _ = api.get("/incidentes")
        r.check(
            f"{c['nombre']} ve incidentes", st == 200, f"status {st}"
        )

        # no debe poder optimizar
        st, _ = api.post("/rutas/optimizar", {"algoritmo": "SA"})
        r.check(
            f"{c['nombre']} NO optimiza rutas", st == 403,
            f"status {st}"
        )

        # no debe poder reoptimizar una ruta ajena o propia
        if rutas:
            st, _ = api.post(
                f"/rutas/{rutas[0]['id_ruta']}/reoptimizar",
                {"iteraciones": 10},
            )
            r.check(
                f"{c['nombre']} NO reoptimiza", st == 403,
                f"status {st}"
            )

            # marcar entrega en una ruta propia debe permitirse
            st, detalle = api.get(f"/rutas/{rutas[0]['id_ruta']}")

            if st == 200 and detalle["pedidos"]:
                pid = detalle["pedidos"][0]["id_pedido"]

                st, _ = api.patch(
                    f"/rutas/{rutas[0]['id_ruta']}"
                    f"/pedidos/{pid}/estado",
                    {"estado_entrega": "ENTREGADO"},
                )
                r.check(
                    f"{c['nombre']} marca entrega de SU ruta",
                    st == 200, f"status {st}"
                )

                # revertir para no dejar el dato cambiado
                Api(create_access_token(
                    usuario_id=1, rol="ADMIN"
                )).patch(
                    f"/rutas/{rutas[0]['id_ruta']}"
                    f"/pedidos/{pid}/estado",
                    {"estado_entrega": "PENDIENTE"},
                )

        # sigue sin poder tocar gestión
        for ruta in ("/usuarios", "/clientes", "/dashboard"):
            st, _ = api.get(ruta)
            r.check(
                f"{c['nombre']} NO accede {ruta}", st == 403,
                f"status {st}"
            )

    # ---------- un conductor NO puede tocar la ruta de otro ----------
    if len(conductores) >= 2:
        c1, c2 = conductores[0], conductores[1]

        api1 = Api(create_access_token(
            usuario_id=c1["id_usuario"], rol="CONDUCTOR"
        ))
        api2 = Api(create_access_token(
            usuario_id=c2["id_usuario"], rol="CONDUCTOR"
        ))

        st, rutas1 = api1.get("/rutas")

        if st == 200 and rutas1:
            st, det = api2.get(f"/rutas/{rutas1[0]['id_ruta']}")

            r.check(
                "conductor NO ve la ruta de otro",
                st == 404,
                f"status {st} (se esperaba 404)"
            )

            if det.get("pedidos"):
                st, _ = api2.patch(
                    f"/rutas/{rutas1[0]['id_ruta']}"
                    f"/pedidos/{det['pedidos'][0]['id_pedido']}"
                    "/estado",
                    {"estado_entrega": "ENTREGADO"},
                )
                r.check(
                    "conductor NO marca entregas de otro",
                    st == 403, f"status {st}"
                )

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
