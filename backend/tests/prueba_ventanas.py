"""Prueba del CRUD de ventanas de tiempo y sus validaciones (RN-005/RN-012)."""
import sys

sys.path.insert(0, "tests")
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal
from sqlalchemy import text


def _usuario_de_prueba(rol):
    """Crea una cuenta temporal con el rol pedido y devuelve su id.

    Las pruebas de permisos necesitan usuarios reales de cada rol,
    porque el backend vuelve a leer el rol desde la base en cada
    petición: un token con otro rol no sirve. Se crean aquí y se
    borran al terminar, para no dejar cuentas basura.
    """
    db = SessionLocal()

    correo = f"prueba.ventanas.{rol.lower()}@ecolima.com"

    try:
        existente = db.execute(
            text("SELECT id_usuario FROM usuarios WHERE email = :c"),
            {"c": correo},
        ).scalar()

        if existente:
            return existente, correo

        # La contraseña es la del admin: esta cuenta no se usa para
        # entrar, solo para comprobar permisos por HTTP.
        hash_admin = db.execute(
            text("SELECT password_hash FROM usuarios WHERE id_usuario = 1")
        ).scalar()

        id_usuario = db.execute(
            text("""
                INSERT INTO usuarios (
                    email, password_hash, nombre, id_rol, estado
                )
                SELECT :c, :hash, 'Prueba Ventanas', r.id_rol, 'ACTIVO'
                FROM roles r
                WHERE r.nombre = :rol
                RETURNING id_usuario
            """),
            {
                "c": correo,
                "hash": hash_admin,
                "rol": rol,
            },
        ).scalar_one()

        db.commit()

        return id_usuario, correo

    finally:
        db.close()


def _borrar_usuarios_de_prueba():
    db = SessionLocal()

    try:
        db.execute(
            text("DELETE FROM usuarios WHERE email LIKE 'prueba.ventanas.%'")
        )
        db.commit()
    finally:
        db.close()


ID_OPERADOR, _ = _usuario_de_prueba("OPERADOR")
ID_AUDITOR, _ = _usuario_de_prueba("AUDITOR")
ID_CLIENTE, _ = _usuario_de_prueba("CLIENTE")

r = Resultado("Ventanas de tiempo")

api = Api(token_de(1, "ADMIN"))

# Los ids se resuelven desde la base: el rol del JWT se ignora y el
# backend vuelve a leerlo del usuario, asi que un id equivocado
# probaria el permiso de otra persona.
API_OPERADOR = Api(token_de(ID_OPERADOR, "X"))
API_AUDITOR = Api(token_de(ID_AUDITOR, "X"))
API_CLIENTE = Api(token_de(ID_CLIENTE, "X"))

# --- listado ------------------------------------------------------------
st, lista = api.get("/clientes/ventanas-tiempo")

r.check("listar ventanas devuelve 200", st == 200, f"st={st}")
r.check(
    "la respuesta incluye pedidos_asociados",
    all("pedidos_asociados" in v for v in lista),
)

# --- validacion RN-012 --------------------------------------------------
st, r_body = api.post(
    "/clientes/ventanas-tiempo",
    {"hora_inicio": "04:00", "hora_fin": "08:00"},
)
r.check(
    "rechaza ventana antes de 05:00 (horario de atencion)",
    st == 422 and "horario de atención" in str(r_body),
    f"st={st}",
)

st, r_body = api.post(
    "/clientes/ventanas-tiempo",
    {"hora_inicio": "18:00", "hora_fin": "23:00"},
)
r.check(
    "rechaza ventana despues de 22:00 (horario de atencion)",
    st == 422 and "horario de atención" in str(r_body),
    f"st={st}",
)

st, _ = api.post(
    "/clientes/ventanas-tiempo",
    {"hora_inicio": "12:00", "hora_fin": "11:00"},
)
r.check("rechaza hora_fin anterior a hora_inicio", st == 422, f"st={st}")

st, _ = api.post(
    "/clientes/ventanas-tiempo",
    {"hora_inicio": "10:00", "hora_fin": "14:00", "tolerancia_minutos": -5},
)
r.check("rechaza tolerancia negativa", st == 422, f"st={st}")

st, _ = api.post(
    "/clientes/ventanas-tiempo",
    {
        "hora_inicio": "10:00",
        "hora_fin": "14:00",
        "penalizacion_por_minuto": -1,
    },
)
r.check("rechaza penalizacion negativa", st == 422, f"st={st}")

# --- crear --------------------------------------------------------------
st, nueva = api.post(
    "/clientes/ventanas-tiempo",
    {
        "hora_inicio": "10:00",
        "hora_fin": "14:00",
        "tolerancia_minutos": 15,
        "penalizacion_por_minuto": 0.50,
    },
)
r.check("crear ventana devuelve 201", st == 201, f"st={st} {nueva}")

nuevo_id = nueva.get("id_ventana") if isinstance(nueva, dict) else None

r.check(
    "la ventana creada trae HH:MM",
    nueva.get("hora_inicio") == "10:00"
    and nueva.get("hora_fin") == "14:00",
    f"{nueva.get('hora_inicio')} - {nueva.get('hora_fin')}",
)
r.check(
    "penalizacion por defecto es S/0.50 (RN-005)",
    str(nueva.get("penalizacion_por_minuto")) == "0.50",
    str(nueva.get("penalizacion_por_minuto")),
)

st, listado = api.get("/clientes/ventanas-tiempo")
r.check(
    "la nueva ventana aparece en el listado",
    any(v["id_ventana"] == nuevo_id for v in listado),
)

# --- actualizar ---------------------------------------------------------
st, act = api.put(
    f"/clientes/ventanas-tiempo/{nuevo_id}",
    {
        "hora_inicio": "11:00",
        "hora_fin": "16:00",
        "tolerancia_minutos": 30,
        "penalizacion_por_minuto": 0.75,
    },
)
r.check("actualizar devuelve 200", st == 200, f"st={st}")
r.check(
    "los cambios se guardan",
    act["hora_inicio"] == "11:00" and act["hora_fin"] == "16:00",
    f"{act.get('hora_inicio')} - {act.get('hora_fin')}",
)
r.check(
    "la tolerancia y la penalizacion se guardan",
    act["tolerancia_minutos"] == 30
    and float(act["penalizacion_por_minuto"]) == 0.75,
)

st, _ = api.put(
    "/clientes/ventanas-tiempo/999999",
    {"hora_inicio": "10:00", "hora_fin": "12:00"},
)
r.check("actualizar inexistente devuelve 404", st == 404, f"st={st}")

st, _ = api.put(
    f"/clientes/ventanas-tiempo/{nuevo_id}",
    {"hora_inicio": "06:00", "hora_fin": "23:00"},
)
r.check(
    "actualizar respeta RN-012",
    st == 422,
    f"st={st}",
)

# --- permisos -----------------------------------------------------------
st, _ = API_OPERADOR.get("/clientes/ventanas-tiempo")
r.check("operador puede listar", st == 200, f"st={st}")

st, _ = API_AUDITOR.post(
    "/clientes/ventanas-tiempo",
    {"hora_inicio": "15:00", "hora_fin": "17:00"},
)
r.check("auditor NO puede crear (403)", st == 403, f"st={st}")

st, _ = API_CLIENTE.get("/clientes/ventanas-tiempo")
r.check("cliente NO puede listar (403)", st == 403, f"st={st}")

st, _ = API_AUDITOR.get("/clientes/ventanas-tiempo")
r.check("auditor SI puede listar", st == 200, f"st={st}")

# --- borrar en uso ------------------------------------------------------
st, clientes = api.get("/clientes")
st, ventanas_disp = api.get("/clientes/ventanas-tiempo/disponibles")

if clientes and ventanas_disp:
    vid = ventanas_disp[0]["id_ventana"]

    st, pedido = api.post(
        "/pedidos",
        {
            "id_cliente": clientes[0]["id_cliente"],
            "id_ventana_tiempo": vid,
            "direccion_entrega": "Prueba de ventana en uso",
            "latitud": -12.0,
            "longitud": -77.0,
            "peso_kg": 5.0,
            "volumen_m3": 0.5,
            "prioridad": "ESTANDAR",
            "tipo_producto": "NO_PERECEDERO",
            "estado": "PENDIENTE",
        },
    )

    if pedido.get("id_pedido"):
        pid = pedido["id_pedido"]

        st, detalle = api.get(f"/clientes/ventanas-tiempo/{vid}")
        r.check(
            "el conteo de pedidos refleja el uso",
            detalle["pedidos_asociados"] >= 1,
            str(detalle.get("pedidos_asociados")),
        )

        st, cuerpo = api.request("DELETE", f"/clientes/ventanas-tiempo/{vid}")
        r.check(
            "borrar una ventana en uso devuelve 409",
            st == 409,
            f"st={st}",
        )

        db = SessionLocal()
        db.execute(
            text("DELETE FROM pedidos WHERE id_pedido = :p"),
            {"p": pid},
        )
        db.commit()
        db.close()

# --- borrar libre -------------------------------------------------------
st, resp = api.request("DELETE", f"/clientes/ventanas-tiempo/{nuevo_id}")
r.check("borrar ventana libre devuelve 200", st == 200, f"st={st}")

st, _ = api.request("DELETE", f"/clientes/ventanas-tiempo/{nuevo_id}")
r.check("borrar de nuevo devuelve 404", st == 404, f"st={st}")

st, listado = api.get("/clientes/ventanas-tiempo")
r.check(
    "la ventana borrada ya no esta",
    not any(v["id_ventana"] == nuevo_id for v in listado),
)

# --- no se rompio disponibles -----------------------------------------
st, disp = api.get("/clientes/ventanas-tiempo/disponibles")
r.check(
    "el endpoint de pedidos sigue funcionando",
    st == 200 and isinstance(disp, list),
    f"st={st}",
)

print()
print(f"{r.resumen()}")

# Las cuentas que creó esta prueba no se quedan en la base.
_borrar_usuarios_de_prueba()

sys.exit(0 if r.ok else 1)