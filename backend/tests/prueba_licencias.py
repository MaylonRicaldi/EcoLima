"""Verifica la habilitación de conductores por tipo de vehículo.

Usa la clasificación del MTC: clase A para autos, camionetas,
camiones y buses; clase B para motos y mototaxis. Las clases nunca
se cruzan: un brevete A-I es de auto, no habilita para una moto.
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from sqlalchemy import text

from cliente_http import Api, Resultado, token_de

from app.core import licencias as LIC
from app.db.database import SessionLocal


def admin_api():
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

    return Api(token_de(usuario, "ADMIN"))


def main():
    r = Resultado("Habilitación de conductores por licencia")

    # ---------- Clase A: autos, camionetas, furgones ----------
    for categoria in ('A-I', 'A-IIA', 'A-IIB', 'A-IIIA', 'A-IIIB', 'A-IIIC'):
        r.check(
            f"{categoria} habilita camioneta",
            LIC.habilitado(categoria, 'CAMIONETA'),
        )

        r.check(
            f"{categoria} habilita furgon",
            LIC.habilitado(categoria, 'FURGON'),
        )

    # ---------- Clase B: motos ----------
    # B-IIb es la de motos lineales de dos ruedas, que es el tipo
    # MOTO del catálogo. B-I (baja cilindrada) y B-IIa (bicimotos y
    # adaptadas) no habilitan una moto normal. B-IIc, que es de
    # tres ruedas, sí la cubre por ser de categoría superior.
    r.check(
        "B-IIb habilita moto de dos ruedas",
        LIC.habilitado('B-IIB', 'MOTO'),
    )

    r.check(
        "B-IIc (mototaxis) cubre tambien la moto",
        LIC.habilitado('B-IIC', 'MOTO'),
    )

    r.check(
        "B-I (baja cilindrada) NO habilita moto normal",
        not LIC.habilitado('B-I', 'MOTO'),
    )

    r.check(
        "B-IIa (bicimotos) NO habilita moto normal",
        not LIC.habilitado('B-IIA', 'MOTO'),
    )

    # ---------- Las clases no se cruzan ----------
    for categoria in ('A-I', 'A-IIA', 'A-IIB', 'A-IIIA', 'A-IIIB', 'A-IIIC'):
        r.check(
            f"{categoria} (clase A) NO habilita moto",
            not LIC.habilitado(categoria, 'MOTO'),
        )

    for categoria in ('B-I', 'B-IIA', 'B-IIB', 'B-IIC'):
        r.check(
            f"{categoria} (clase B) NO habilita camioneta",
            not LIC.habilitado(categoria, 'CAMIONETA'),
        )

    # ---------- Casos límite ----------
    r.check("A-I no es habilitante para moto", not LIC.habilitado('A-I', 'MOTO'))
    r.check("B-I no habilita para furon", not LIC.habilitado('B-I', 'FURGON'))
    r.check("categoria desconocida no habilita", not LIC.habilitado('A-ZZZ', 'CAMIONETA'))
    r.check("tipo sin requisito no habilita", not LIC.habilitado('B-IIC', 'HELICOPTERO'))
    r.check("sin tipo no habilita", not LIC.habilitado('A-IIIC', None))

    # ---------- Motivos ----------
    r.check(
        "el motivo de un brevete de auto sobre moto es correcto",
        'no sirve para un MOTO' in LIC.motivo_bloqueo('A-I', 'MOTO')
        and 'autos y camiones' in LIC.motivo_bloqueo('A-I', 'MOTO')
        and 'B-IIb' in LIC.motivo_bloqueo('A-I', 'MOTO'),
        LIC.motivo_bloqueo('A-I', 'MOTO'),
    )

    r.check(
        "el motivo de brevete de moto sobre camioneta es correcto",
        'no sirve para un CAMIONETA' in LIC.motivo_bloqueo('B-IIB', 'CAMIONETA')
        and 'motos y mototaxis' in LIC.motivo_bloqueo('B-IIB', 'CAMIONETA')
        and 'A-I' in LIC.motivo_bloqueo('B-IIB', 'CAMIONETA'),
        LIC.motivo_bloqueo('B-IIB', 'CAMIONETA'),
    )

    r.check(
        "el motivo de brevete B-I sobre moto pide B-IIb",
        'B-IIb' in LIC.motivo_bloqueo('B-I', 'MOTO'),
        LIC.motivo_bloqueo('B-I', 'MOTO'),
    )

    r.check(
        "el motivo de brevete de moto sobre camioneta pide clase B",
        'B' in LIC.motivo_bloqueo('B-IIB', 'CAMIONETA'),
        LIC.motivo_bloqueo('B-IIB', 'CAMIONETA'),
    )

    r.check(
        "sin bloqueo no hay motivo",
        LIC.motivo_bloqueo('A-I', 'CAMIONETA') == '',
    )

    # ---------- Autor ----------
    r.check(
        "mejor_categoria ordena por nivel",
        LIC.mejor_categoria(['A-I', 'A-IIB', 'A-IIA']) == 'A-IIB',
    )

    r.check(
        "mejor_categoria sin licencias devuelve None",
        LIC.mejor_categoria([]) is None,
    )

    r.check(
        "mejor_categoria para moto ignora las de clase A",
        LIC.mejor_categoria_para(['A-IIIC', 'B-IIA'], 'MOTO') == 'B-IIA',
    )

    r.check(
        "mejor_categoria para moto sin clase B devuelve None",
        LIC.mejor_categoria_para(['A-IIIC'], 'MOTO') is None,
    )

    r.check(
        "habilita_alguno con varias licencias",
        LIC.habilita_alguno(['A-I', 'B-IIB'], 'MOTO'),
    )

    # ---------- La base acepta clases B ----------
    db = SessionLocal()

    try:
        db.execute(text("""
            INSERT INTO conductores (
                id_usuario, dni, nombre, apellido, anios_experiencia,
                hora_disponibilidad_inicio, hora_disponibilidad_fin
            ) VALUES (
                NULL, '11111111', 'Prueba', 'Licencia', 3,
                '06:00', '18:00'
            )
        """))

        conductor_id = db.execute(
            text("SELECT max(id_conductor) FROM conductores")
        ).scalar_one()

        for categoria in ('B-I', 'B-IIA', 'B-IIB', 'B-IIC'):
            db.execute(text("""
                INSERT INTO licencias (
                    id_conductor, numero, categoria,
                    fecha_emision, fecha_vencimiento, estado
                ) VALUES (
                    :c, :n, :cat, CURRENT_DATE,
                    CURRENT_DATE + INTERVAL '3 years', 'VIGENTE'
                )
            """), {'c': conductor_id, 'n': f'PR-{categoria}', 'cat': categoria})

        db.commit()

    finally:
        db.close()

    # ---------- Endpoint ----------
    api = admin_api()

    st, datos = api.get(
        f"/conductores/{conductor_id}/vehiculos-compatibles"
    )

    r.check("endpoint responde 200", st == 200, f"st={st}")

    r.check(
        "el conductor se creó sin cuenta de usuario",
        datos.get('categorias_licencia') and
        'B-IIB' in datos['categorias_licencia'],
        str(datos.get('categorias_licencia')),
    )

    if st == 200:
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
        db.execute(
            text("DELETE FROM licencias WHERE numero LIKE 'PR-%'")
        )
        db.execute(
            text("DELETE FROM conductores WHERE dni = '11111111'")
        )
        db.commit()
    finally:
        db.close()

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)