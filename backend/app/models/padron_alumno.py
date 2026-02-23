from sqlalchemy import Column, String
from app.db.base import Base

class PadronAlumno(Base):
    """
    Representa el padrón oficial de alumnos autorizados para registrarse.
    Se usa para validar que la matrícula y el nombre coincidan con los registros oficiales.
    """
    __tablename__ = "padron_alumnos"

    id_matricula = Column(String(10), primary_key=True, index=True)
    nombre_completo = Column(String(200), nullable=False)
