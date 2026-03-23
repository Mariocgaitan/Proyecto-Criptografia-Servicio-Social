from pydantic import BaseModel, Field, field_validator
import re


class RegistroRequest(BaseModel):
    """Schema de validación para el formulario de registro de alumno."""
    nombre: str = Field(..., min_length=2, max_length=200, examples=["Juan Pérez García"])
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

    @field_validator("matricula")
    @classmethod
    def validar_matricula(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        from app.core.profanity import PROHIBITED_WORDS

        v = v.strip()
        
        # 1. Validar que no tenga números
        if any(char.isdigit() for char in v):
            raise ValueError("El nombre no puede contener números.")
        
        # 2. Validar caracteres especiales (permitir solo letras, espacios y acentos)
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v):
            raise ValueError("El nombre solo puede contener letras y espacios.")

        # 3. Validar palabras prohibidas
        palabras = v.lower().split()
        for palabra in palabras:
            if palabra in PROHIBITED_WORDS:
                raise ValueError(f"El nombre contiene una palabra no permitida.")
        
        # 4. Validar formato (Al menos dos palabras)
        if len(palabras) < 2:
            raise ValueError("Por favor, ingresa tu nombre completo (nombre y al menos un apellido).")

        return v

    @field_validator("carrera")
    @classmethod
    def validar_carrera(cls, v: str) -> str:
        carrera = v.strip().upper()
        if not re.fullmatch(r"[A-Z]{2,5}", carrera):
            raise ValueError("La carrera debe capturarse con siglas (ej. ITC).")
        return carrera


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
