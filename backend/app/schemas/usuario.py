from pydantic import BaseModel, EmailStr, Field, field_validator


class RegistroRequest(BaseModel):
    """Schema de validación para el formulario de registro de alumno."""
    nombre: str = Field(..., min_length=2, max_length=200, examples=["Juan Pérez García"])
    correo: str = Field(..., examples=["A01234567@tec.mx"])
    matricula: str = Field(..., min_length=5, max_length=20, examples=["A01234567"])
    carrera: str = Field(..., min_length=2, max_length=100, examples=["ITC"])
    semestre: int = Field(..., ge=1, le=12, examples=[6])
    password: str = Field(..., min_length=8, max_length=128)
    eventos_seleccionados: list[int] = Field(
        ...,
        min_length=1,
        max_length=2,
        examples=[[1, 2]],
        description="Lista de 1 o 2 IDs de eventos seleccionados"
    )

    @field_validator("correo")
    @classmethod
    def validar_correo_institucional(cls, v: str) -> str:
        if not v.lower().endswith("@tec.mx"):
            raise ValueError("El correo debe ser institucional (@tec.mx)")
        return v.lower()

    @field_validator("matricula")
    @classmethod
    def validar_matricula(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return v.strip()


class RegistroResponse(BaseModel):
    """Respuesta exitosa del registro."""
    message: str
    matricula: str
    eventos_registrados: int


class EventoDisponibleResponse(BaseModel):
    """Evento disponible para mostrar en el formulario de registro."""
    id_evento: int
    nombre: str
    periodo: str
    anio: int

    model_config = {"from_attributes": True}
