from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Schema de validación para el login."""
    correo: str = Field(..., examples=["A01234567@tec.mx"])
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Respuesta del login con los tokens."""
    access_token: str
    token_type: str = "bearer"
