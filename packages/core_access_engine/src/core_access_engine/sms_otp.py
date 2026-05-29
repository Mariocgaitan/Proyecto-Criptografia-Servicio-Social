"""
SMS OTP — generación, envío y verificación de códigos de un solo uso por SMS.

Soporta dos proveedores de SMS intercambiables mediante el Protocol `SmsProvider`:
  - TwilioSmsProvider  — requiere instalar: pip install core-access-engine[twilio]
  - AwsSnsSmsProvider  — usa boto3 (ya incluido como dependencia del paquete)

Patrón de uso (mismo flujo en todos los proyectos):
    1. Generar código + guardarlo como hash SHA-256 en DB con TTL
    2. Enviar el código raw al teléfono del usuario
    3. Usuario ingresa el código en el frontend
    4. Verificar el código recibido contra el hash almacenado
    5. Marcar el código como usado en DB (single-use)

Uso:
    from core_access_engine.sms_otp import (
        generate_sms_code,
        hash_sms_code,
        verify_sms_code,
        send_sms_code,
        TwilioSmsProvider,
        AwsSnsSmsProvider,
    )

    # Generación
    code = generate_sms_code()          # "847291"
    stored = hash_sms_code(code)        # guardar en DB con TTL 10 min

    # Envío
    provider = TwilioSmsProvider(
        account_sid=settings.TWILIO_ACCOUNT_SID,
        auth_token=settings.TWILIO_AUTH_TOKEN,
        from_number=settings.TWILIO_FROM_NUMBER,
    )
    send_sms_code(phone="+5218001234567", code=code, provider=provider, app_name="MiApp")

    # Verificación (cuando el usuario envía su código)
    is_valid = verify_sms_code(code_from_user, stored_hash_from_db)

SEGURIDAD:
  - El código se genera con `secrets.randbelow` (CSPRNG, no `random`).
  - Se almacena en DB SOLO como hash SHA-256 — el código raw nunca se persiste.
  - La verificación usa `secrets.compare_digest` para prevenir timing attacks.
  - El TTL y el single-use los maneja la base de datos de la app consumidora.
"""

from __future__ import annotations

import hashlib
import secrets
from typing import Protocol

__all__ = [
    "SmsProvider",
    "TwilioSmsProvider",
    "AwsSnsSmsProvider",
    "generate_sms_code",
    "hash_sms_code",
    "verify_sms_code",
    "send_sms_code",
]


# ---------------------------------------------------------------------------
# Interfaz / Protocol
# ---------------------------------------------------------------------------

class SmsProvider(Protocol):
    """
    Interfaz que todo proveedor de SMS debe implementar.

    Para agregar un nuevo proveedor (ej. Vonage, MessageBird):
        1. Crear una clase que implemente este Protocol.
        2. No es necesario heredar — Python comprueba la interfaz estructuralmente.
    """

    def send(self, phone: str, message: str) -> None:
        """
        Envía un mensaje SMS.

        Args:
            phone:   Número en formato E.164. Ej: "+5218001234567"
            message: Texto del mensaje (máximo 160 caracteres recomendado).

        Raises:
            SmsDeliveryError: Si el envío falla.
        """
        ...


# ---------------------------------------------------------------------------
# Error personalizado
# ---------------------------------------------------------------------------

class SmsDeliveryError(Exception):
    """Lanzado cuando el envío del SMS falla en el proveedor."""


# ---------------------------------------------------------------------------
# Provider: Twilio
# ---------------------------------------------------------------------------

class TwilioSmsProvider:
    """
    Proveedor SMS usando Twilio Messaging API.

    Requiere instalar la dependencia opcional:
        pip install core-access-engine[twilio]
        # o directamente: pip install twilio>=9.0.0

    Obtén las credenciales en: https://console.twilio.com
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str) -> None:
        """
        Args:
            account_sid:  Account SID de Twilio. Empieza con "AC...".
            auth_token:   Auth Token de Twilio.
            from_number:  Número Twilio en formato E.164. Ej: "+15005550006"
        """
        try:
            from twilio.rest import Client  # type: ignore[import-untyped]
        except ImportError as exc:
            raise ImportError(
                "Twilio no está instalado. "
                "Instala con: pip install core-access-engine[twilio]"
            ) from exc

        self._client = Client(account_sid, auth_token)
        self._from_number = from_number

    def send(self, phone: str, message: str) -> None:
        try:
            self._client.messages.create(
                body=message,
                from_=self._from_number,
                to=phone,
            )
        except Exception as exc:
            raise SmsDeliveryError(f"Twilio: error al enviar SMS a {phone}: {exc}") from exc


# ---------------------------------------------------------------------------
# Provider: AWS SNS
# ---------------------------------------------------------------------------

class AwsSnsSmsProvider:
    """
    Proveedor SMS usando AWS Simple Notification Service (SNS).

    No requiere dependencias adicionales — usa boto3 (ya incluido en el paquete).

    El EC2 / Lambda debe tener un IAM Role con la política:
        sns:Publish  en resource: "*"

    Para configurar el Sender ID (nombre que aparece en el SMS):
        sender_id="MiApp"  (disponible en algunos países, no en todos)
    """

    def __init__(self, region: str = "us-east-1", sender_id: str | None = None) -> None:
        """
        Args:
            region:    Región AWS donde se ejecuta SNS. Default: "us-east-1".
            sender_id: Nombre visible en el SMS (máx 11 caracteres alfanuméricos).
                       No disponible en todos los países (ej. US no lo soporta).
        """
        import boto3

        self._client = boto3.client("sns", region_name=region)
        self._attributes: dict = {}
        if sender_id:
            self._attributes["SenderID"] = {"DataType": "String", "StringValue": sender_id}

    def send(self, phone: str, message: str) -> None:
        try:
            kwargs: dict = {
                "PhoneNumber": phone,
                "Message": message,
            }
            if self._attributes:
                kwargs["MessageAttributes"] = self._attributes

            response = self._client.publish(**kwargs)

            # SNS retorna MessageId si tuvo éxito; si falla, lanza excepción
            if not response.get("MessageId"):
                raise SmsDeliveryError(f"AWS SNS: respuesta sin MessageId para {phone}")
        except SmsDeliveryError:
            raise
        except Exception as exc:
            raise SmsDeliveryError(f"AWS SNS: error al enviar SMS a {phone}: {exc}") from exc


# ---------------------------------------------------------------------------
# Generación y hashing de códigos
# ---------------------------------------------------------------------------

def generate_sms_code(length: int = 6) -> str:
    """
    Genera un código OTP numérico criptográficamente seguro.

    Usa `secrets.randbelow` (CSPRNG del sistema operativo),
    NO `random.randint` que NO es apto para seguridad.

    Args:
        length: Número de dígitos del código. Default: 6.
                Valores válidos: 4, 6, 8.

    Returns:
        String numérico con ceros a la izquierda si aplica. Ej: "047291"
    """
    max_value = 10 ** length
    min_value = 10 ** (length - 1)
    # Garantiza que siempre tenga exactamente `length` dígitos
    code = secrets.randbelow(max_value - min_value) + min_value
    return str(code).zfill(length)


def hash_sms_code(code: str) -> str:
    """
    Hashea un código SMS con SHA-256 para almacenamiento seguro en DB.

    Args:
        code: Código generado por `generate_sms_code`.

    Returns:
        Hex digest SHA-256 (64 caracteres). Guardar esto en DB, nunca el code raw.
    """
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def verify_sms_code(code_from_user: str, stored_hash: str) -> bool:
    """
    Verifica un código SMS ingresado por el usuario contra su hash en DB.

    Usa `secrets.compare_digest` para prevenir timing attacks.

    Args:
        code_from_user: Código ingresado por el usuario en el frontend.
        stored_hash:    Hash SHA-256 guardado en DB al momento de generar el código.

    Returns:
        True si el código coincide, False en caso contrario.

    IMPORTANTE: Esta función solo verifica el código.
    La expiración (TTL) y el single-use los debe manejar la app consumidora
    verificando el timestamp y marcando el código como usado en DB.
    """
    expected_hash = hash_sms_code(code_from_user)
    return secrets.compare_digest(expected_hash, stored_hash)


# ---------------------------------------------------------------------------
# Función de envío de alto nivel
# ---------------------------------------------------------------------------

def send_sms_code(
    phone: str,
    code: str,
    provider: SmsProvider,
    app_name: str = "App",
    expire_minutes: int = 10,
) -> None:
    """
    Formatea y envía el mensaje SMS con el código OTP.

    Args:
        phone:          Número destino en formato E.164. Ej: "+5218001234567"
        code:           Código generado por `generate_sms_code`.
        provider:       Instancia de `TwilioSmsProvider` o `AwsSnsSmsProvider`.
        app_name:       Nombre de la app visible en el SMS. Ej: "Barbería Don Carlos"
        expire_minutes: Minutos de vigencia del código para informar al usuario.

    Raises:
        SmsDeliveryError: Si el proveedor no pudo entregar el mensaje.
    """
    message = (
        f"Tu código de verificación para {app_name} es: {code}. "
        f"Válido por {expire_minutes} minutos. No lo compartas con nadie."
    )
    provider.send(phone=phone, message=message)
