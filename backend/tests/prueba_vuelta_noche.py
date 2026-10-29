"""Comprueba la vuelta de día y de noche con un conductor que
SI tiene punto de partida propio.

Con los conductores reales de la base la comprobación anterior no
distingía nada: no tienen ubicacion_inicio, así que su origen ya es
el local y día y noche dan el mismo índice. Aquí se fuerza un
conductor located en Comas para ver las dos ramas.
"""
import datetime
import sys

sys.path.insert(0, ".")

from app.core import parametros as P
from app.services import optimizador as OPT

HOY = datetime.date.today()

# El local: Puerto de Callao
LOCAL = {'latitud': -12.055, 'longitud': -77.143}

# El conductor está en Comas, lejos del local
CONDUCTOR = {
    'id_conductor': 1,
    'id_usuario': None,
    'nombre': 'Prueba',
    'apellido': 'Conductor',
    'dni': '00000001',
    'anios_experiencia': 5,
    'hora_disponibilidad_inicio': datetime.time(5, 0),
    'hora_disponibilidad_fin': datetime.time(22, 0),
    'horas_max_conduccion': 8,
    'horas_conduccion_acumuladas': 0,
    'estado': 'DISPONIBLE',
    'categorias_licencia': ['A-IIB'],
}

# Comas
CONDUCTOR['ubicacion_inicio'] = None

print("=" * 66)
print("VUELTA DE DIA Y DE NOCHE")
print("=" * 66)
print()
print(f"Hora de retorno al local: {P.HORA_RETORNO_LOCAL:02d}:00")
print()

fallos = 0


def comprobar(nombre, condicion, detalle=""):
    global fallos

    if not condicion:
        fallos += 1

    print(f"  [{'OK  ' if condicion else 'FALLA'}] {nombre}"
          + (f"  -> {detalle}" if detalle else ""))


# Conductor CON ubicación propia
def conductor_en(lat, lon, id_conductor=1):
    """Fila de conductor con una ubicación de inicio concreta.

    El id es único: el optimizador guarda el índice de origen por
    id de conductor, así que dos filas con el mismo id se pisarían
    y la comprobación de "cada uno desde su sitio" no probaría nada.
    """
    fila = dict(CONDUCTOR)

    fila['id_conductor'] = id_conductor
    fila['dni'] = f'0000000{id_conductor}'

    # El optimizador lee ubicacion_inicio con .y y .x (geometría
    # PostGIS), así que se le da un objeto con esa forma.
    class Punto:
        def __init__(self, lat, lon):
            self.x = lon
            self.y = lat

    fila['ubicacion_inicio'] = Punto(lat, lon)

    return fila


def problema_de(primera, lat_conductor, lon_conductor):
    return OPT.ProblemaVRPTW(
        pedidos=[],
        vehiculos=[],
        conductores=[
            conductor_en(lat_conductor, lon_conductor, id_conductor=1)
        ],
        base=LOCAL,
        fecha=HOY,
        primera_ruta=primera,
    )


COMAS = (-12.030, -76.995)

# --- ya tiene ruta hoy: sale de Comas ---
p = problema_de(set(), *COMAS)
cond = p.conductores[0]

print("Conductor en Comas, ya con ruta hoy:")
print(f"  sale del local : {cond.sale_del_local}")

salida = p._idx_origen(cond)
dia = p._idx_retorno(cond, 14 * 60)
noche = p._idx_retorno(cond, 22 * 60)

print(f"  indice de salida      : {salida}")
print(f"  vuelta a las 14:00    : {dia}")
print(f"  vuelta a las 22:00    : {noche}")
print()

comprobar("sale de su propio punto, no del local", salida != 0)
comprobar("de día vuelve a su punto", dia == salida)
comprobar("de noche vuelve al local", noche == 0)
comprobar("día y noche son distintos", dia != noche)

# --- primer reparto del día: sale del local ---
p1 = problema_de({1}, *COMAS)
cond1 = p1.conductores[0]

print("El mismo conductor en su primer reparto del día:")
print(f"  sale del local : {cond1.sale_del_local}")

salida1 = p1._idx_origen(cond1)
dia1 = p1._idx_retorno(cond1, 14 * 60)

print(f"  indice de salida      : {salida1}")
print(f"  vuelta a las 14:00    : {dia1}")
print()

comprobar("el primer reparto sale del local", salida1 == 0)
comprobar("de día vuelve al local, porque salió de ahí", dia1 == 0)

# --- el umbral ---
print("El umbral de la vuelta:")
print()

for hora in (20, 20, 21, 21, 22):
    p2 = problema_de(set(), *COMAS)

    h = hora * 60 + 30

    destino = p2._idx_retorno(p2.conductores[0], h)

    donde = "local" if destino == 0 else "conductor"

    print(f"  termina a las {hora}:30 -> vuelve al {donde}")

print()

p3 = problema_de(set(), *COMAS)

comprobar(
    "justo antes del umbral sigue volviendo al conductor",
    p3._idx_retorno(p3.conductores[0], P.HORA_RETORNO_LOCAL * 60 - 1)
    == p3._idx_origen(p3.conductores[0]),
)

comprobar(
    "justo en el umbral ya vuelve al local",
    p3._idx_retorno(p3.conductores[0], P.HORA_RETORNO_LOCAL * 60) == 0,
)

# --- dos conductores en la misma Matrix ---
print()
print("Dos conductores, cada uno desde su sitio:")

p4 = OPT.ProblemaVRPTW(
    pedidos=[],
    vehiculos=[],
    conductores=[
            conductor_en(*COMAS, id_conductor=1),
            conductor_en(-12.065, -76.970, id_conductor=2),
        ],
    base=LOCAL,
    fecha=HOY,
    primera_ruta={2},
)

a, b = p4.conductores

print(f"  conductor 1 (Comas)       : sale del indice "
      f"{p4._idx_origen(a)}")
print(f"  conductor 2 (primer dia)  : sale del indice "
      f"{p4._idx_origen(b)}")

comprobar(
    "el que ya tiene ruta sale de su punto",
    p4._idx_origen(a) != 0,
)
comprobar(
    "el de su primer reparto sale del local",
    p4._idx_origen(b) == 0,
)
comprobar(
    "cada uno tiene su punto en la matriz",
    p4._idx_origen(a) != p4._idx_origen(b),
)

print()
print("=" * 66)

if fallos == 0:
    print("Todo correcto.")

else:
    print(f"{fallos} comprobaciones fallaron")

print("=" * 66)

sys.exit(0 if fallos == 0 else 1)