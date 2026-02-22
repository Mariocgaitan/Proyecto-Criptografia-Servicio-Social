import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.evento import Evento
from app.models.usuario import Usuario
from app.models.usuario_evento import UsuarioEvento
from app.schemas.usuario import RegistroRequest


class RegistroError(Exception):
    """Error de negocio durante el registro."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def obtener_eventos_disponibles(db: AsyncSession) -> list[Evento]:
    """Retorna todos los eventos disponibles para selección en el registro."""
    result = await db.execute(select(Evento).order_by(Evento.anio, Evento.id_evento))
    return list(result.scalars().all())


async def registrar_alumno(db: AsyncSession, datos: RegistroRequest) -> dict:
    """
    Registra un nuevo alumno en el sistema.

    Raises:
        RegistroError: Si la matrícula/correo ya existe, los eventos no son válidos, etc.
    """
    from app.models.padron_alumno import PadronAlumno

    # 0. Verificar que la matrícula existe en el padrón y el nombre coincide
    padron_result = await db.execute(
        select(PadronAlumno).where(PadronAlumno.id_matricula == datos.matricula)
    )
    alumno_padron = padron_result.scalar_one_or_none()
    
    if not alumno_padron:
        raise RegistroError("La matrícula no se encuentra en el padrón oficial de alumnos.")
    
    # Validación de coincidencia de nombre (ignorar mayúsculas/minúsculas y espacios extra)
    nombre_padron = " ".join(alumno_padron.nombre_completo.lower().split())
    nombre_ingresado = " ".join(datos.nombre.lower().split())
    
    if nombre_padron != nombre_ingresado:
        # Podríamos ser más flexibles aquí con Levenshtein, pero por ahora pedimos coincidencia exacta de palabras
        raise RegistroError(f"El nombre no coincide con el registrado para esta matrícula. Asegúrate de ingresar tu nombre completo como aparece en tu credencial.")

    # 1. Verificar que la matrícula no exista ya como usuario registrado
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == datos.matricula)
    )
    if result.scalar_one_or_none():
        raise RegistroError("La matrícula ya está registrada en el sistema.")

    # 2. Verificar que el correo no exista
    result = await db.execute(
        select(Usuario).where(Usuario.correo == datos.correo)
    )
    if result.scalar_one_or_none():
        raise RegistroError("El correo ya está registrado en el sistema.")

    # 3. Validar que los eventos existen
    eventos_ids = list(set(datos.eventos_seleccionados))  # Eliminar duplicados
    if len(eventos_ids) == 0 or len(eventos_ids) > 2:
        raise RegistroError("Debes seleccionar entre 1 y 2 eventos distintos.")

    result = await db.execute(
        select(Evento).where(Evento.id_evento.in_(eventos_ids))
    )
    eventos_encontrados = list(result.scalars().all())

    if len(eventos_encontrados) != len(eventos_ids):
        raise RegistroError("Uno o más eventos seleccionados no existen.")

    # 4. Crear el usuario
    nuevo_usuario = Usuario(
        id_matricula=datos.matricula,
        nombre=datos.nombre,
        correo=datos.correo,
        carrera=datos.carrera,
        semestre=datos.semestre,
        password_hash=hash_password(datos.password),
        totp_secret=pyotp.random_base32(),
    )
    db.add(nuevo_usuario)
    await db.flush()  # Obtener el ID sin hacer commit aún

    # 5. Crear las relaciones usuario-evento
    for id_evento in eventos_ids:
        usuario_evento = UsuarioEvento(
            id_matricula=datos.matricula,
            id_evento=id_evento,
        )
        db.add(usuario_evento)

    await db.commit()

    return {
        "message": "Registro exitoso",
        "matricula": datos.matricula,
        "eventos_registrados": len(eventos_ids),
    }
