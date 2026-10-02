"""Prueba de HU-05 (clientes) y de los permisos por rol de HU-01.

Uso:  python tests/prueba_clientes.py   (desde backend/)

No crea datos duplicados innecesarios: al terminar deja la base igual
que la encontró (borra sólo los clientes que crea la prueba).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de


def main():
    admin = Api(token_de(1, "ADMIN"))
    operador = Api(token_de(3, "OPERADOR"))

    r = Resultado("HU-05 clientes + permisos HU-01")

    # ---------------- HU-01: autenticación sigue igual ----------------
    st, cuerpo = admin.post(
        "/auth/login",
        {"email": "admin@ecolima.com", "password": "Admin123"},
    )
    r.check("login sigue funcionando", st == 200, f"status {st}")

    st, _ = admin.get("/auth/me")
    r.check("/auth/me sigue funcionando", st == 200, f"status {st}")

    # ---------------- HU-05: listado ----------------
    st, datos = admin.get("/clientes")
    r.check("GET /clientes lista", st == 200 and isinstance(datos, list),
            f"status {st}, {len(datos) if isinstance(datos, list) else datos}")

    antes = len(datos) if isinstance(datos, list) else 0
    print(f"       clientes existentes: {antes}")

    # ---------------- HU-05: registro ----------------
    nuevo = {
        "nombre": "Bodega Prueba Automatica",
        "documento": "87654321",
        "telefono": "999888777",
        "email": "bodega.prueba.auto@ecolima.com",
        "direccion": "Av. Los Frutales 456, San Juan de Lurigancho",
        "referencia": "Frente a la panaderia",
        "latitud": -12.02,
        "longitud": -77.03,
        "horario_apertura": "06:00",
        "horario_cierre": "21:00",
        "restricciones_acceso": "No entrar por la puerta lateral",
        "estado": "ACTIVO",
    }

    st, creado = admin.post("/clientes", nuevo)
    r.check("POST /clientes crea", st == 201, f"status {st}: {creado}")
    if st != 201:
        return r.resumen()

    id_cliente = creado["id_cliente"]

    r.check("respuesta trae id_cliente", isinstance(id_cliente, int))
    r.check("devuelve horario como HH:MM",
            creado.get("horario_apertura") == "06:00",
            str(creado.get("horario_apertura")))

    # ---------------- HU-05: consulta ----------------
    st, uno = admin.get(f"/clientes/{id_cliente}")
    r.check("GET /clientes/{id} consulta", st == 200 and uno["nombre"] == nuevo["nombre"],
            f"status {st}")

    # ---------------- HU-05: validaciones ----------------
    st, err = admin.post("/clientes", {**nuevo, "email": nuevo["email"],
                                       "latitud": -12.03})
    r.check("rechaza email duplicado", st == 400, f"status {st}: {err}")

    st, err = admin.post("/clientes", {**nuevo, "email": "otro@ecolima.com",
                                       "latitud": -45.5})
    r.check("rechaza latitud fuera de rango (422)", st == 422, f"status {st}")

    st, err = admin.post("/clientes", {**nuevo, "email": "otro2@ecolima.com",
                                       "horario_apertura": "25:00"})
    r.check("rechaza horario invalido", st == 422, f"status {st}")

    st, err = admin.post("/clientes", {**nuevo, "email": "otro3@ecolima.com",
                                       "estado": "PENDIENTE"})
    r.check("rechaza estado invalido", st == 422, f"status {st}")

    # ---------------- HU-05: edición ----------------
    editado = {**nuevo, "nombre": "Bodega Editada", "telefono": "911222333"}
    st, act = admin.put(f"/clientes/{id_cliente}", editado)
    r.check("PUT /clientes/{id} edita",
            st == 200 and act["nombre"] == "Bodega Editada", f"status {st}")

    # ---------------- HU-05: cambio de estado ----------------
    st, camb = admin.patch(f"/clientes/{id_cliente}/estado", {"estado": "INACTIVO"})
    r.check("PATCH estado -> INACTIVO",
            st == 200 and camb["estado"] == "INACTIVO", f"status {st}")

    st, camb = admin.patch(f"/clientes/{id_cliente}/estado", {"estado": "ACTIVO"})
    r.check("PATCH estado -> ACTIVO",
            st == 200 and camb["estado"] == "ACTIVO", f"status {st}")

    # ---------------- HU-01: permisos por rol ----------------
    # OPERADOR puede gestionar clientes
    st, _ = operador.get("/clientes")
    r.check("OPERADOR lee clientes (permitido)", st == 200, f"status {st}")

    # OPERADOR NO puede administrar usuarios
    st, _ = operador.get("/usuarios")
    r.check("OPERADOR NO lee usuarios (403)", st == 403, f"status {st}")

    st, _ = operador.post("/usuarios", {"nombre": "X", "email": "x@x.com",
                                        "password": "Aa123456", "id_rol": 2})
    r.check("OPERADOR NO crea usuarios (403)", st == 403, f"status {st}")

    # Sin token
    anon = Api()
    st, _ = anon.get("/clientes")
    r.check("sin token -> 401", st == 401, f"status {st}")

    # Token de rol inventado no debe existir en la matriz
    # (se valida via /auth/admin-test que ya usaba require_roles)
    conductor = Api(token_de(2, "CONDUCTOR"))
    st, _ = conductor.get("/clientes")
    r.check("CONDUCTOR NO lee clientes (403)", st == 403, f"status {st}")

    st, _ = conductor.get("/vehiculos")
    r.check("CONDUCTOR lee vehiculos (permitido)", st == 200, f"status {st}")

    st, _ = conductor.get("/usuarios")
    r.check("CONDUCTOR NO lee usuarios (403)", st == 403, f"status {st}")

    # ---------------- limpieza ----------------
    print("\n  limpiando cliente de prueba...")
    from app.db.database import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    db.execute(
        text("DELETE FROM clientes WHERE email = :email"),
        {"email": nuevo["email"]},
    )
    db.commit()
    db.close()
    print("  (HU-05 no define DELETE en la API: se borra por SQL)")

    st, finales = admin.get("/clientes")
    r.check("listado vuelve al estado inicial",
            st == 200 and len(finales) == antes,
            f"{len(finales)} vs {antes}")

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)