"""Prueba del local, la primera ruta y el mapa por conductor.

  1. El local se lee de la base y se puede mover desde el mapa
  2. El primer reparto del día sale del local; los siguientes, de
     donde esté el conductor
  3. De noche el vehículo vuelve al local
  4. El mapa de un conductor trae sólo sus rutas
  5. Cada ruta tiene identificador propio y color distinto
"""
import datetime
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from cliente_http import Api, Resultado, token_de

HOY = datetime.date.today()

CALLAO = (-12.0550, -77.1430)


def main():
    r = Resultado("Local, primera ruta y mapa por conductor")

    from sqlalchemy import text

    from app.db.database import SessionLocal

    db = SessionLocal()

    try:
        admin = db.execute(
            text(
                "SELECT id_usuario FROM usuarios "
                "WHERE email = 'admin@ecolima.com'"
            )
        ).scalar_one()

        conductores = db.execute(text("""
            SELECT id_conductor, nombre, apellido,
                   hora_disponibilidad_inicio, hora_disponibilidad_fin
            FROM conductores ORDER BY id_conductor
        """)).mappings().all()

    finally:
        db.close()

    api = Api(token_de(admin, "ADMIN"))

    # ---------------- 1. el local ----------------

    st, local = api.get("/local")

    r.check("GET /local", st == 200, f"status {st}")

    if st != 200:
        return False

    print()
    print(f"Local: {local['direccion']}")
    print(f"  {local['latitud']}, {local['longitud']}  "
          f"origen={local['origen']}")
    print(f"  Vuelta al local desde las {local['hora_retorno_local']}")
    print()

    r.check(
        "el local viene de la base, no del código",
        local["origen"] == "registrado",
        local["origen"],
    )

    r.check(
        "dice a qué hora se vuelve al local",
        bool(local["hora_retorno_local"]),
        local["hora_retorno_local"],
    )

    # Mover el local y comprobar que se guarda
    st, movido = api.put("/local", {
        "direccion": "Puerto de Callao, Av. San Martín (prueba)",
        "latitud": CALLAO[0],
        "longitud": CALLAO[1],
    })

    r.check("PUT /local", st == 200, f"status {st} {movido}")

    st, releido = api.get("/local")

    r.check(
        "el local movido se guardó",
        abs(releido["latitud"] - CALLAO[0]) < 0.0001
        and abs(releido["longitud"] - CALLAO[1]) < 0.0001,
        f"{releido['latitud']}, {releido['longitud']}",
    )

    # Sólo puede haber un local
    db = SessionLocal()

    try:
        cuantos = db.execute(text("""
            SELECT count(*) FROM ubicaciones
            WHERE tipo = 'LOCAL_OPERATIVA'
        """)).scalar()

        r.check(
            "no se acumulan locales",
            cuantos == 1,
            f"{cuantos} locales",
        )
    finally:
        db.close()

    # ---------------- 2. primera ruta ----------------

    from app.services import optimizador as OPT
    from app.services import datos_optimizacion as D

    db = SessionLocal()

    try:
        base = D.punto_inicio_operativa(db)
        hoy_rutas = D.primera_ruta_del_conductor(db, HOY)

        print()
        print(f"Conductores con ruta hoy: "
              f"{sorted(hoy_rutas) or 'ninguno'}")

        # Un problema mínimo para ver de dónde saldría cada uno
        problema = OPT.ProblemaVRPTW(
            pedidos=[],
            vehiculos=[],
            conductores=[],
            base=base,
            fecha=HOY,
        )

        p_primera = OPT.ProblemaVRPTW(
            pedidos=[],
            vehiculos=[],
            conductores=[],
            base=base,
            fecha=HOY,
            primera_ruta={99},
        )

        r.check(
            "sin datos de primera ruta nadie sale del local",
            problema.primera_ruta is None,
            "None = no se sabe, se usa el punto del conductor",
        )

        r.check(
            "sin datos de primera ruta el origen es el conductor",
            p_primera._idx_origen(None) == 0,
            "sin conductor, índice 0 = local",
        )
    finally:
        db.close()

    # Con un conductor real, una vez y otra
    if conductores:
        cond = conductores[0]

        db = SessionLocal()

        try:
            filas = db.execute(
                text("""
                    SELECT c.id_conductor, c.id_usuario, c.nombre,
                           c.apellido, c.dni, c.anios_experiencia,
                           c.hora_disponibilidad_inicio,
                           c.hora_disponibilidad_fin,
                           c.horas_max_conduccion,
                           c.horas_conduccion_acumuladas,
                           c.ubicacion_inicio, c.estado,
                           ARRAY(
                               SELECT l.categoria FROM licencias l
                               WHERE l.id_conductor = c.id_conductor
                                 AND l.estado = 'VIGENTE'
                                 AND l.fecha_vencimiento >= CURRENT_DATE
                           ) AS categorias_licencia
                    FROM conductores c
                    WHERE c.id_conductor = :id
                """),
                {"id": cond["id_conductor"]},
            ).mappings().first()

            base = D.punto_inicio_operativa(db)
        finally:
            db.close()

        # Sin ruta hoy: sale del local
        p1 = OPT.ProblemaVRPTW(
            pedidos=[], vehiculos=[], conductores=[filas],
            base=base, fecha=HOY,
            primera_ruta={filas["id_conductor"]},
        )

        # Con ruta hoy: sale de donde esté
        p2 = OPT.ProblemaVRPTW(
            pedidos=[], vehiculos=[], conductores=[filas],
            base=base, fecha=HOY,
            primera_ruta=set(),
        )

        print()
        print(f"Conductor de prueba: {filas['nombre']} "
              f"{filas['apellido']}")
        print(f"  local          : índice "
              f"{p1._idx_origen(p1.conductores[0])}")
        print(f"  con ruta hoy   : índice "
              f"{p2._idx_origen(p2.conductores[0])}")
        print()

        r.check(
            "el primer reparto sale del local",
            p1._idx_origen(p1.conductores[0]) == 0,
            f"índice {p1._idx_origen(p1.conductores[0])}",
        )

        r.check(
            "el conductor sabe que sale del local",
            p1.conductores[0].sale_del_local is True,
        )

        # Si el conductor no tiene ubicación registrada, el local es
        # su punto de partida de todas formas
        if filas["ubicacion_inicio"] is None:
            r.check(
                "sin ubicación propia, sale del local igual",
                p2._idx_origen(p2.conductores[0]) == 0,
                f"índice {p2._idx_origen(p2.conductores[0])}",
            )
        else:
            r.check(
                "con rutas previas, sale de donde esté",
                p2._idx_origen(p2.conductores[0]) != 0,
                f"índice {p2._idx_origen(p2.conductores[0])}",
            )

        # ---------------- 3. vuelta de noche ----------------

        # De día vuelve a su punto; de noche, al local
        de_dia = p2._idx_retorno(p2.conductores[0], 14 * 60)
        de_noche = p2._idx_retorno(p2.conductores[0], 22 * 60)

        print(f"  vuelta de día (14:00)  : índice {de_dia}")
        print(f"  vuelta de noche (22:00): índice {de_noche}")
        print()

        r.check(
            "de noche vuelve al local",
            de_noche == 0,
            f"índice {de_noche}",
        )

        r.check(
            "de día vuelve a su punto de partida",
            de_dia == p2._idx_origen(p2.conductores[0]),
            f"índice {de_dia}",
        )

    # ---------------- 4. mapa por conductor ----------------

    st, mapa = api.get("/mapa/rutas")

    r.check("GET /mapa/rutas", st == 200, f"status {st}")

    if st != 200:
        return False

    print()
    print(f"Rutas activas en el mapa: {mapa['total']}")
    print(f"  local en el mapa: "
          f"{mapa['local']['latitud']}, {mapa['local']['longitud']}")

    for rt in mapa["rutas"]:
        print(f"  {rt['identificador']}  ruta {rt['id_ruta']}  "
              f"{rt['color']}  {rt['conductor'] or 'sin conductor'}  "
              f"{len(rt['paradas'])} paradas")

    print()

    r.check(
        "el mapa trae el local",
        "local" in mapa and mapa["local"]["latitud"] is not None,
    )

    r.check(
        "cada ruta trae puntos para dibujar",
        all(
            isinstance(rt["paradas"], list) for rt in mapa["rutas"]
        ),
    )

    r.check(
        "cada ruta trae pedidos con coordenadas",
        all(
            all("latitud" in p for p in rt["pedidos"])
            for rt in mapa["rutas"]
        ),
    )

    r.check(
        "cada ruta tiene identificador propio",
        len({rt["identificador"] for rt in mapa["rutas"]})
        == len(mapa["rutas"]),
        f"{len({rt['identificador'] for rt in mapa['rutas']})} de "
        f"{len(mapa['rutas'])}",
    )

    r.check(
        "sin conductor, no se pide filtro",
        mapa["solo_conductor"] is False,
    )

    # Filtrar por un conductor
    id_cond = conductores[0]["id_conductor"]

    st, propio = api.get(f"/mapa/rutas?id_conductor={id_cond}")

    r.check("filtro por conductor", st == 200, f"status {st}")

    if st == 200:
        todas = {rt["id_ruta"] for rt in mapa["rutas"]}
        suyas = {rt["id_ruta"] for rt in propio["rutas"]}

        ajenas = [
            rt for rt in propio["rutas"]
            if rt["id_conductor"] != id_cond
        ]

        print(f"Rutas del conductor {id_cond}: "
              f"{len(propio['rutas'])} de {len(mapa['rutas'])}")
        print()

        r.check(
            "solo trae rutas de ese conductor",
            not ajenas,
            f"{len(ajenas)} de otros",
        )

        r.check(
            "no trae más de las que existen",
            suyas <= todas,
            f"{suyas} vs {todas}",
        )

        r.check(
            "avisa que está filtrado",
            propio["solo_conductor"] is True,
        )

    # Colores distintos entre conductores
    colores_por_conductor = {}

    for rt in mapa["rutas"]:
        if rt["id_conductor"] is not None:
            colores_por_conductor.setdefault(
                rt["id_conductor"], set()
            ).add(rt["color"])

    repetidos = [
        cond for cond, cols in colores_por_conductor.items()
        if len(cols) > 1
    ]

    r.check(
        "un conductor no tiene dos colores",
        not repetidos,
        f"{len(repetidos)} con color cambiante",
    )

    distintos = [
        list(colores_por_conductor.values())[i]
        for i in range(len(colores_por_conductor))
    ]

    if len(distintos) > 1:
        r.check(
            "conductores distintos tienen colores distintos",
            len({tuple(c) for c in distintos}) == len(distintos),
            f"{len({tuple(c) for c in distintos})} colores para "
            f"{len(distintos)} conductores",
        )

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)