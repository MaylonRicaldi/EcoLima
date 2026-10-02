"""Matriz de permisos por rol (HU-01 / RNF-002 / RES-08).

Fuente de verdad: la definición de roles del proyecto y las funciones
reales de cada módulo. No se inventan permisos: cada permiso corresponde a
una operación que el endpoint ya expone.

Los permisos se aplican SIEMPRE en el backend. Ocultar botones en el
frontend es solo/usabilidad, nunca seguridad.
"""

# Operación sobre un recurso
LECTURA = 'leer'
ESCRITURA = 'escribir'
BORRADO = 'borrar'

# Recursos del sistema
USUARIOS = 'usuarios'
VEHICULOS = 'vehiculos'
CONDUCTORES = 'conductores'
LICENCIAS = 'licencias'
CLIENTES = 'clientes'
PEDIDOS = 'pedidos'
RUTAS = 'rutas'
ASIGNACIONES = 'asignaciones'
TRAFICO = 'trafico'
INCIDENTES = 'incidentes'
INDICADORES = 'indicadores'
REPORTES = 'reportes'
COMPENSACION = 'compensacion'


ADMIN = 'ADMIN'
OPERADOR = 'OPERADOR'
CONDUCTOR = 'CONDUCTOR'
AUDITOR = 'AUDITOR'
CLIENTE = 'CLIENTE'


def _lectura(*recursos):
    return {(r, LECTURA) for r in recursos}


def _escritura(*recursos):
    return {(r, ESCRITURA) for r in recursos}


# --------------------------------------------------------------------------
# ADMIN: administración general del sistema y acceso a lo administrativo.
# --------------------------------------------------------------------------
PERMISOS_ADMIN = (
    _lectura(
        USUARIOS, VEHICULOS, CONDUCTORES, LICENCIAS, CLIENTES, PEDIDOS,
        RUTAS, ASIGNACIONES, TRAFICO, INCIDENTES, INDICADORES,
        REPORTES, COMPENSACION,
    )
    | _escritura(
        USUARIOS, VEHICULOS, CONDUCTORES, LICENCIAS, CLIENTES, PEDIDOS,
        RUTAS, ASIGNACIONES, TRAFICO, INCIDENTES, REPORTES, COMPENSACION,
    )
)

# --------------------------------------------------------------------------
# OPERADOR: gestión de la operación logística y seguimiento de rutas.
# No administra usuarios del sistema ni sus propias credenciales.
# --------------------------------------------------------------------------
PERMISOS_OPERADOR = (
    _lectura(
        VEHICULOS, CONDUCTORES, LICENCIAS, CLIENTES, PEDIDOS, RUTAS,
        ASIGNACIONES, TRAFICO, INCIDENTES, INDICADORES, REPORTES,
        COMPENSACION,
    )
    | _escritura(
        VEHICULOS, CONDUCTORES, LICENCIAS, CLIENTES, PEDIDOS, RUTAS,
        ASIGNACIONES, TRAFICO, INCIDENTES,
    )
)

# --------------------------------------------------------------------------
# CONDUCTOR: sólo la información relacionada con sus rutas, asignaciones,
# paradas y estado de sus entregas.
# --------------------------------------------------------------------------
PERMISOS_CONDUCTOR = (
    _lectura(VEHICULOS, RUTAS, ASIGNACIONES, TRAFICO, INCIDENTES)
    | _escritura(INCIDENTES)
)

# --------------------------------------------------------------------------
# AUDITOR: acceso de consulta para revisar información, indicadores y
# reportes sin modificar la operación.
# --------------------------------------------------------------------------
PERMISOS_AUDITOR = _lectura(
    USUARIOS, VEHICULOS, CONDUCTORES, LICENCIAS, CLIENTES, PEDIDOS,
    RUTAS, ASIGNACIONES, TRAFICO, INCIDENTES, INDICADORES, REPORTES,
    COMPENSACION,
)

# --------------------------------------------------------------------------
# CLIENTE: acceso limitado a la información relacionada con sus propios
# pedidos y entregas. LaFiltración por cliente la aplica cada endpoint.
# --------------------------------------------------------------------------
PERMISOS_CLIENTE = _lectura(PEDIDOS)


MATRIZ_PERMISOS = {
    ADMIN: PERMISOS_ADMIN,
    OPERADOR: PERMISOS_OPERADOR,
    CONDUCTOR: PERMISOS_CONDUCTOR,
    AUDITOR: PERMISOS_AUDITOR,
    CLIENTE: PERMISOS_CLIENTE,
}


def tiene_permiso(rol, recurso, operacion):
    """Devuelve True si el rol tiene el permiso solicitado."""
    permisos = MATRIZ_PERMISOS.get(rol)

    if permisos is None:
        return False

    return (recurso, operacion) in permisos


def roles_con_permiso(recurso, operacion):
    """Devuelve los roles que tienen un permiso. Útil para Require_permiso."""
    return [
        rol
        for rol, permisos in MATRIZ_PERMISOS.items()
        if (recurso, operacion) in permisos
    ]