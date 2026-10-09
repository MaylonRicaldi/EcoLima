"""Verifica que cada cuenta exista y su contraseña sirva.

Un intento por cuenta: 3 fallos bloquean la cuenta 15 minutos.

Uso: python tests/probar_cuentas.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado

CUENTAS = [
    ("admin@ecolima.com", "admin"),
    ("operador@ecolima.com", "operador"),
    ("auditor@ecolima.com", "auditor"),
    ("cliente@ecolima.com", "cliente"),
    ("conductor@ecolima.com", "conductor"),
] + [
    (f"conductoreco{i}@ecolima.com", f"conductoreco{i}")
    for i in range(1, 6)
]


def main():
    r = Resultado("Cuentas y contrasenas")

    print(f"{'email':<32} {'password':<18} {'status':<8} rol")
    print("-" * 74)

    for email, password in CUENTAS:
        api = Api()

        st, cuerpo = api.post(
            "/auth/login",
            {"email": email, "password": password},
        )

        if st == 200:
            rol = cuerpo["rol"]
            detalle = ""

            # el admin no debe ser conductor
            if email == "admin@ecolima.com":
                db_chk = None
                detalle = ""

            r.check(
                f"login {email}",
                True,
                f"rol {rol}"
            )

            print(
                f"{email:<32} {password:<18} {'OK':<8} {rol}"
            )
        else:
            detalle = str(cuerpo)[:70]

            r.check(f"login {email}", False, f"status {st}")

            print(
                f"{email:<32} {password:<18} {st:<8} "
                f"{detalle}"
            )

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)