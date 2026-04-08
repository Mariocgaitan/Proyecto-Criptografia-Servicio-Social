from app.core.config import settings


_ALLOWED_TEST_ROLES = {"admin", "alumno", "empresa"}


def resolve_effective_role(email: str | None, db_role: str) -> str:
    """Resuelve el rol efectivo para pruebas locales sin alterar la BD."""
    if not settings.TEST_ROLE_SWITCH_ENABLED:
        return db_role

    target_email = settings.TEST_ROLE_SWITCH_EMAIL.strip().lower()
    forced_role = settings.TEST_ROLE_SWITCH_ROLE.strip().lower()

    if not email or not target_email or forced_role not in _ALLOWED_TEST_ROLES:
        return db_role

    if email.strip().lower() != target_email:
        return db_role

    return forced_role
