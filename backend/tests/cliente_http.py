"""Cliente HTTP mínimo para probar la API sin instalar dependencias extra.

Usa urllib de la biblioteca estándar. Reemplaza a requests/httpx que
no están en el .venv del proyecto.
"""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


class Api:
    def __init__(self, token=None):
        self.token = token

    def _headers(self):
        h = {"Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def request(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            BASE + path, data=data, method=method, headers=self._headers()
        )
        try:
            with urllib.request.urlopen(req) as resp:
                crudo = resp.read().decode()
                return resp.status, (json.loads(crudo) if crudo else None)
        except urllib.error.HTTPError as e:
            crudo = e.read().decode()
            try:
                return e.code, json.loads(crudo)
            except json.JSONDecodeError:
                return e.code, crudo

    def get(self, path):
        return self.request("GET", path)

    def post(self, path, body):
        return self.request("POST", path, body)

    def put(self, path, body):
        return self.request("PUT", path, body)

    def patch(self, path, body):
        return self.request("PATCH", path, body)


class Resultado:
    """Acumula resultados y calcula el veredicto."""

    def __init__(self, titulo):
        self.titulo = titulo
        self.items = []

    def check(self, nombre, condicion, detalle=""):
        self.items.append((nombre, bool(condicion), detalle))
        marca = "OK  " if condicion else "FALLA"
        print(f"  [{marca}] {nombre}" + (f"  -> {detalle}" if detalle else ""))
        return bool(condicion)

    @property
    def ok(self):
        return all(c for _, c, _ in self.items)

    def resumen(self):
        ok = sum(1 for _, c, _ in self.items if c)
        total = len(self.items)
        print(f"\n{self.titulo}: {ok}/{total} OK")
        for nombre, cond, detalle in self.items:
            if not cond:
                print(f"   FALLA: {nombre}  {detalle}")
        return self.ok


def token_de(usuario_id, rol):
    """Genera un JWT con el mismo código del backend."""
    from app.core.jwt import create_access_token

    return create_access_token(usuario_id=usuario_id, rol=rol)