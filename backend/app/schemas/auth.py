from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Schema de validación para el login."""
    correo: str = Field(..., examples=["A01234567@tec.mx"])
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Respuesta del login con los tokens."""
    access_token: str
    token_type: str = "bearer"


class GoogleNonceResponse(BaseModel):
    """Respuesta con un nonce para Google OAuth."""
    nonce: str = Field(..., description="Nonce UUID para incluir en la request a Google")


class GoogleAuthRequest(BaseModel):
    """Schema para login/registro con Google."""
    id_token: str = Field(..., description="ID Token emitido por Google OAuth")
    nonce: str = Field(..., description="Nonce que fue enviado a Google (requerido para prevenir replay attacks)")


class PreAuthResponse(BaseModel):
    """Respuesta cuando el usuario validó contraseña/Google pero aún debe completar TOTP."""
    status: str = "requires_2fa"
    temp_token: str = Field(..., description="Token temporal para usar en verify-totp")
    totp_qr_code: str | None = Field(None, description="QR code si es primera vez configurando TOTP")


class VerifyTOTPRequest(BaseModel):
    """Schema para verificar código TOTP."""
    temp_token: str = Field(..., description="Token temporal del pre-auth")
    totp_code: str = Field(..., min_length=6, max_length=6, description="Código de 6 dígitos del Authenticator")



class RoleRedirectResponse(BaseModel):
    """Respuesta después de validar TOTP con el rol del usuario."""
    access_token: str
    token_type: str = "bearer"
    rol: str = Field(..., description="Rol: alumno, empresa o admin")
    redirect_url: str = Field(..., description="URL a la que debe redirigirse el frontend")


