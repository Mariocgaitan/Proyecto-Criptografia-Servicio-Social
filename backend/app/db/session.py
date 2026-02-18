from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Motor asíncrono — pool de conexiones a PostgreSQL
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Muestra SQL en consola en modo desarrollo
    pool_pre_ping=True,   # Verifica conexiones antes de usarlas
    pool_size=10,
    max_overflow=20,
)

# Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Evita queries extra tras commit en contexto async
)


async def get_db() -> AsyncSession:
    """
    Dependency de FastAPI para inyectar una sesión de DB por request.
    Garantiza que la sesión se cierre al terminar el request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
