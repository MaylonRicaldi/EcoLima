from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def create_access_token(
    usuario_id: int,
    rol: str,
) -> str:
    ahora = datetime.now(timezone.utc)

    expiracion = ahora + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )

    payload = {
        "sub": str(usuario_id),
        "rol": rol,
        "iat": ahora,
        "exp": expiracion,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )