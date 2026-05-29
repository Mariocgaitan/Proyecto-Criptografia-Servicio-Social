"""
Logging estructurado — configuración de structlog para producción y desarrollo.

En producción: salida JSON (una línea por evento, fácil de ingestar en
CloudWatch, Datadog, Loki, etc.).
En desarrollo: salida coloreada en consola con nivel y timestamp legibles.

Uso:
    from core_access_engine.logging import setup_logging
    import structlog

    setup_logging(app_env="production", sentry_dsn="https://...")

    logger = structlog.get_logger(__name__)
    logger.info("usuario_inscrito", matricula="A01234567", proyecto_id=42)

Inicialización de Sentry:
    Si `sentry_dsn` es un string no vacío, `setup_logging` también inicializa
    el SDK de Sentry con sample rate 20% para traces de performance.
    Si es vacío o None, Sentry no se activa (comportamiento seguro en dev).
"""

__all__ = ["setup_logging"]

import logging

import structlog


def setup_logging(app_env: str = "development", sentry_dsn: str = "") -> None:
    """
    Configura structlog y el logging estándar de Python.

    Debe llamarse UNA VEZ al arranque de la aplicación, idealmente justo
    después de `load_secrets()` y antes de instanciar Settings.

    Args:
        app_env:    Entorno de ejecución. "production" activa JSON renderer
                    y desactiva el renderer de consola coloreado.
        sentry_dsn: DSN de Sentry. Si está vacío, Sentry no se inicializa.

    Efectos secundarios:
        - Configura el logger raíz de Python con el handler de structlog.
        - Silencia loggers ruidosos (uvicorn.access, sqlalchemy.engine, paramiko).
        - Inicializa el SDK de Sentry si `sentry_dsn` no está vacío.
    """
    is_production = app_env == "production"

    if sentry_dsn:
        import sentry_sdk
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=app_env,
            traces_sample_rate=0.2 if is_production else 1.0,
            send_default_pii=False,
        )

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer = (
        structlog.processors.JSONRenderer()
        if is_production
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO if is_production else logging.DEBUG)

    # Silenciar loggers ruidosos
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.WARNING if is_production else logging.INFO
    )
    logging.getLogger("paramiko.transport").setLevel(logging.WARNING)
