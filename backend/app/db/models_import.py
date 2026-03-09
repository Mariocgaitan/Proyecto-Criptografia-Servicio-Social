"""
Importa todos los modelos aquí para que Alembic los detecte automáticamente
al generar migraciones.
"""
from app.db.base import Base  # noqa: F401
from app.models.usuario import Usuario  # noqa: F401
from app.models.evento import Evento  # noqa: F401
from app.models.usuario_evento import UsuarioEvento  # noqa: F401
from app.models.padron_alumno import PadronAlumno  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401
from app.models.log_auditoria import LogAuditoria  # noqa: F401
from app.models.empresa import Empresa  # noqa: F401
from app.models.proyecto import Proyecto  # noqa: F401
from app.models.inscripcion import Inscripcion  # noqa: F401
from app.models.lista_espera import ListaEspera  # noqa: F401
