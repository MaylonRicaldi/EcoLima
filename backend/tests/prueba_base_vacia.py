"""Comprueba que la API responde correctamente con la base vacía.

Con los datos borrados no hay pedidos, conductores ni clientes, así
que las pruebas funcionales no aplican. Lo que sí importa es que
ningún listado devuelva un error 500 y que las validaciones sigan
funcionando.

Uso (desde backend/):

    ECOLIMA_API=http://127.0.0.1:8000 python tests/prueba_base_vacia.py
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from sqlalchemy import text

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal

# Endpoints que devuelven una lista y, con la base vacía, deben
# estar vacíos. Los maestros (vehículos, ventanas) se conservan al
# vaciar, así que no se comprueban aquí.
LISTADOS_VACIOS = [
    "/pedidos",
    "/rutas",
    "/asignaciones",
    "/incidentes",
    "/conductores",
]

# Endpoints que deben responder 200 sí o sí, aunque devuelvan datos
# de los maestros o un objeto en vez de una lista.
ENDPOINTS_200 = [
    "/dashboard",
    "/indicadores",
    "/vehiculos",
    "/clientes",
    "/clientes/ventanas-tiempo",
    "/clientes/ventanas-tiempo/disponibles",
    "/reportes",
    "/reportes/consolidado",
    "/sostenibilidad/impacto",
    "/sostenibilidad/compensacion",
    "/trafico",
]


def main():
    r = Resultado("API con la base vacía")

    db = SessionLocal()

    try:
        usuario = db.execute(
            text(
                "SELECT id_usuario FROM usuarios "
                "WHERE email = 'admin@ecolima.com'"
            )
        ).scalar_one()
    finally:
        db.close()

    api = Api(token_de(usuario, "ADMIN"))

    # ---------- Listados que deben estar vacíos ----------
    for ruta in LISTADOS_VACIOS:
        status, cuerpo = api.get(ruta)

        r.check(
            f"{ruta} responde 200",
            status == 200,
            f"status {status}: {str(cuerpo)[:90]}",
        )

        r.check(
            f"{ruta} devuelve una lista vacía",
            cuerpo == [],
            f"recibido {str(cuerpo)[:70]}",
        )

    # ---------- Endpoints que solo no deben fallar ----------
    for ruta in ENDPOINTS_200:
        status, cuerpo = api.get(ruta)

        r.check(
            f"{ruta} responde 200",
            status == 200,
            f"status {status}: {str(cuerpo)[:90]}",
        )

    # ---------- El optimizador dice que no hay pedidos ----------
    status, cuerpo = api.post("/rutas/optimizar", {"algoritmo": "SA"})

    r.check(
        "optimizar sin pedidos responde 400 con motivo",
        status == 400 and 'pedido' in str(cuerpo).lower(),
        f"status {status}: {str(cuerpo)[:90]}",
    )

    # ---------- Las validaciones siguen activas ----------
    status, _ = api.post(
        "/clientes/ventanas-tiempo",
        {"hora_inicio": "04:00", "hora_fin": "08:00"},
    )

    r.check(
        "una ventana fuera de horario se rechaza",
        status == 422,
        f"status {status}",
    )

    status, _ = api.post("/clientes", {
        "nombre": "Prueba base vacía",
        "direccion": "Dirección de prueba",
        "latitud": -12.0,
        "longitud": -77.0,
        "estado": "ACTIVO",
    })

    r.check(
        "registrar un cliente sigue funcionando",
        status == 201,
        f"status {status}",
    )

    # ---------- Conductor sin cuenta de usuario ----------
    status, conductor = api.post("/conductores", {
        "dni": "45678912",
        "nombre": "Sin",
        "apellido": "Cuenta",
        "anios_experiencia": 2,
        "hora_disponibilidad_inicio": "06:00",
        "hora_disponibilidad_fin": "14:00",
        "horas_max_conduccion": 8,
        "horas_conduccion_acumuladas": 0,
        "estado": "DISPONIBLE",
    })

    r.check(
        "conductor sin id_usuario se registra",
        status == 201,
        f"status {status}: {str(conductor)[:90]}",
    )

    if status == 201:
        r.check(
            "el conductor guardado no tiene cuenta",
            conductor.get('id_usuario') is None,
            str(conductor.get('id_usuario')),
        )

        r.check(
            "el conductor guardado trae su id",
            isinstance(conductor.get('id_conductor'), int),
        )

        # Licencia de clase B, que antes la base no aceptaba
        status, licencia = api.post(
            f"/conductores/{conductor['id_conductor']}/licencias",
            {
                # El id va también en el cuerpo: así lo espera el
                # schema de la API.
                "id_conductor": conductor['id_conductor'],
                "numero": "BX-9999",
                "categoria": "B-IIB",
                "fecha_emision": "2026-01-10",
                "fecha_vencimiento": "2031-01-10",
                "estado": "VIGENTE",
            },
        )

        r.check(
            "se puede registrar una licencia de clase B",
            status == 201,
            f"status {status}: {str(licencia)[:90]}",
        )

        status, datos = api.get(
            f"/conductores/{conductor['id_conductor']}"
            "/vehiculos-compatibles"
        )

        if status == 200:
            moto = next(
                v for v in datos['vehiculos']
                if v['tipo_vehiculo'] == 'MOTO'
            )

            r.check(
                "con B-IIb la moto queda habilitada",
                moto['habilitado'],
                moto['motivo'],
            )

            camioneta = next(
                v for v in datos['vehiculos']
                if v['tipo_vehiculo'] == 'CAMIONETA'
            )

            r.check(
                "solo con clase B la camioneta no habilita",
                not camioneta['habilitado'],
                camioneta['motivo'],
            )

    # ---------- Limpieza ----------
    db = SessionLocal()

    try:
        db.execute(text("DELETE FROM licencias WHERE numero = 'BX-9999'"))
        db.execute(
            text("DELETE FROM conductores WHERE dni = '45678912'")
        )
        db.execute(
            text("DELETE FROM clientes WHERE direccion = 'Dirección de prueba'")
        )
        db.commit()
    finally:
        db.close()

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)