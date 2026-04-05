# Fase 2: Seguridad y Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password recovery flow, password strength validation, rate limiting with Redis, and frontend screens for forgot/reset password with strength indicator.

**Architecture:** New model `PasswordResetToken` in DB, two new auth endpoints (forgot + reset), password validation function in security.py, SlowAPI Redis storage, frontend screens integrated into AuthWizard.

**Tech Stack:** FastAPI, SQLAlchemy async, SlowAPI + Redis, React + Tailwind

---

## File Structure

### New files (backend)
- `app/models/password_reset_token.py` — SQLAlchemy model for reset tokens
- `app/services/password_service.py` — forgot/reset business logic
- `migrations/versions/xxxx_add_password_reset_tokens.py` — Alembic migration

### Modified files (backend)
- `app/core/security.py` — add `validate_password_strength()`, `generate_reset_token()`, `hash_reset_token()`
- `app/schemas/auth.py` — add `ForgotPasswordRequest`, `ResetPasswordRequest`
- `app/routers/auth.py` — add forgot-password and reset-password endpoints
- `app/services/auth_service.py` — apply password validation in `registrar_alumno()`
- `app/services/email_service.py` — add `enviar_correo_reset_password()`
- `app/core/limiter.py` — migrate to Redis storage
- `app/db/models_import.py` — import new model

### New files (frontend)
- `src/pages/ForgotPassword.jsx` — request reset email screen
- `src/pages/ResetPassword.jsx` — new password form screen
- `src/components/ui/password-strength.jsx` — strength indicator component

### Modified files (frontend)
- `src/App.jsx` — add routes for /forgot-password and /reset-password
- `src/pages/AuthWizard.jsx` — wire "Olvidaste tu contrasena?" link

---

## Task 1: Password strength validation

**Files:**
- Modify: `backend/app/core/security.py`

- [ ] **Step 1: Add validate_password_strength function**

Add after the `verify_password` function:

```python
import re

def validate_password_strength(password: str) -> None:
    """
    Validates password meets strength requirements.
    Raises ValueError with descriptive message if not.
    """
    errors = []
    if len(password) < 8:
        errors.append("Debe tener al menos 8 caracteres")
    if not re.search(r"[A-Z]", password):
        errors.append("Debe incluir al menos una letra mayuscula")
    if not re.search(r"[a-z]", password):
        errors.append("Debe incluir al menos una letra minuscula")
    if not re.search(r"\d", password):
        errors.append("Debe incluir al menos un numero")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password):
        errors.append("Debe incluir al menos un caracter especial")
    if errors:
        raise ValueError(". ".join(errors))
```

- [ ] **Step 2: Add reset token helpers**

Add after the pre-auth token functions:

```python
def generate_reset_token() -> str:
    """Generate a password reset token. URL-safe, 32 bytes."""
    return secrets.token_urlsafe(32)

def hash_reset_token(raw_token: str) -> str:
    """Hash a reset token with SHA-256 for DB storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/security.py
git commit -m "feat: add password strength validation and reset token helpers"
```

---

## Task 2: Apply password validation to registration

**Files:**
- Modify: `backend/app/services/auth_service.py`

- [ ] **Step 1: Import and apply validation**

Add import at top:
```python
from app.core.security import validate_password_strength
```

In `registrar_alumno()`, add before "4. Crear usuario" (before `nuevo_usuario = Usuario(...)`):

```python
    # Validar fuerza de contrasena
    try:
        validate_password_strength(datos.password)
    except ValueError as e:
        raise RegistroError(str(e))
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/auth_service.py
git commit -m "feat: enforce password strength on registration"
```

---

## Task 3: PasswordResetToken model

**Files:**
- Create: `backend/app/models/password_reset_token.py`
- Modify: `backend/app/db/models_import.py`

- [ ] **Step 1: Create model**

```python
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PasswordResetToken(Base):
    """Stores hashed password reset tokens."""
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    id_matricula: Mapped[str] = mapped_column(
        String(20), ForeignKey("usuarios.id_matricula", ondelete="CASCADE"), nullable=False
    )
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 2: Register in models_import.py**

Add import line to `backend/app/db/models_import.py`:
```python
from app.models.password_reset_token import PasswordResetToken  # noqa: F401
```

- [ ] **Step 3: Generate Alembic migration**

```bash
cd backend && uv run alembic revision --autogenerate -m "add password_reset_tokens table"
```

- [ ] **Step 4: Run migration**

```bash
uv run alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/password_reset_token.py backend/app/db/models_import.py backend/migrations/
git commit -m "feat: add PasswordResetToken model and migration"
```

---

## Task 4: Password reset service

**Files:**
- Create: `backend/app/services/password_service.py`

- [ ] **Step 1: Create the service**

```python
"""
Password reset business logic.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_reset_token,
    hash_password,
    hash_reset_token,
    validate_password_strength,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.services.auth_service import LoginError, _log, _normalizar_identificador_login


RESET_TOKEN_EXPIRE_MINUTES = 15


async def request_password_reset(db: AsyncSession, correo: str, ip_origen: str | None = None) -> str | None:
    """
    Generate a password reset token for the given email.
    Returns the raw token if user exists, None otherwise.
    Always succeeds silently (don't reveal if email exists).
    """
    correo_normalizado = _normalizar_identificador_login(correo)

    result = await db.execute(select(Usuario).where(Usuario.correo == correo_normalizado))
    usuario = result.scalar_one_or_none()

    if not usuario:
        await _log(db, "RESET_SOLICITADO_NO_EXISTE", ip_origen=ip_origen, detalle=f"correo: {correo_normalizado}")
        await db.commit()
        return None

    raw_token = generate_reset_token()
    token_hash = hash_reset_token(raw_token)
    expira_en = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    db.add(PasswordResetToken(
        token_hash=token_hash,
        id_matricula=usuario.id_matricula,
        expira_en=expira_en,
        usado=False,
    ))

    await _log(db, "RESET_SOLICITADO", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
    await db.commit()
    return raw_token


async def reset_password(db: AsyncSession, raw_token: str, new_password: str, ip_origen: str | None = None) -> None:
    """
    Reset user password using a valid reset token.
    Raises LoginError if token is invalid/expired/used or password is weak.
    """
    # Validate password strength
    try:
        validate_password_strength(new_password)
    except ValueError as e:
        raise LoginError(str(e), status_code=400)

    # Find token
    token_hash = hash_reset_token(raw_token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.usado == False,  # noqa: E712
            PasswordResetToken.expira_en > now,
        )
    )
    reset_record = result.scalar_one_or_none()

    if not reset_record:
        raise LoginError("El enlace es invalido o ha expirado. Solicita uno nuevo.", status_code=400)

    # Update password
    result = await db.execute(
        select(Usuario).where(Usuario.id_matricula == reset_record.id_matricula)
    )
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise LoginError("Usuario no encontrado", status_code=404)

    usuario.password_hash = hash_password(new_password)
    usuario.failed_login_attempts = 0
    usuario.locked_until = None

    # Mark token as used
    reset_record.usado = True

    # Revoke all refresh tokens (force re-login)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.id_matricula == usuario.id_matricula, RefreshToken.revocado == False)  # noqa: E712
        .values(revocado=True)
    )

    await _log(db, "PASSWORD_RESET", id_matricula=usuario.id_matricula, ip_origen=ip_origen)
    await db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/password_service.py
git commit -m "feat: add password reset service with token validation"
```

---

## Task 5: Reset password email template

**Files:**
- Modify: `backend/app/services/email_service.py`

- [ ] **Step 1: Add reset email function**

Add after `enviar_correo_baja`:

```python
def enviar_correo_reset_password(to_email: str, nombre_alumno: str, reset_link: str):
    """Envia un correo con el enlace para restablecer la contrasena."""
    asunto = "Restablecer tu contrasena — Feria Servicio Social"

    esc_alumno = html.escape(nombre_alumno)
    esc_link = html.escape(reset_link)

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #003865;">Feria del Servicio Social - TEC CCM</h2>
        </div>
        <p>Hola <strong>{esc_alumno}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contrasena. Haz clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{esc_link}" style="background-color: #003865; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer contrasena</a>
        </div>
        <p style="color: #666; font-size: 14px;">Este enlace expira en <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        {TEC_FOOTER_HTML}
      </body>
    </html>
    """
    _enviar_html(to_email, asunto, html_content)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/email_service.py
git commit -m "feat: add password reset email template"
```

---

## Task 6: Auth schemas and endpoints for password reset

**Files:**
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/routers/auth.py`

- [ ] **Step 1: Add schemas**

Add to `backend/app/schemas/auth.py`:

```python
class ForgotPasswordRequest(BaseModel):
    correo: str = Field(..., examples=["A01234567@tec.mx"])

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
```

- [ ] **Step 2: Add endpoints to auth router**

Add imports at top of `backend/app/routers/auth.py`:

```python
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.password_service import request_password_reset, reset_password
from app.services.email_service import enviar_correo_reset_password
```

Add endpoints before the Google OAuth section:

```python
@router.post("/api/v1/auth/forgot-password", tags=["Autenticacion"], summary="Solicitar reset de contrasena")
@limiter.limit("3/minute")
async def api_forgot_password(request: Request, datos: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    raw_token = await request_password_reset(db, datos.correo, ip)

    if raw_token:
        # Build reset link
        from app.core.config import settings
        frontend_url = settings.ALLOWED_ORIGINS[0] if settings.ALLOWED_ORIGINS else "http://localhost:5173"
        reset_link = f"{frontend_url}/reset-password?token={raw_token}"

        # Find user name for email
        from sqlalchemy import select
        from app.models.usuario import Usuario
        from app.services.auth_service import _normalizar_identificador_login
        correo_norm = _normalizar_identificador_login(datos.correo)
        result = await db.execute(select(Usuario).where(Usuario.correo == correo_norm))
        usuario = result.scalar_one_or_none()
        nombre = usuario.nombre if usuario else "Usuario"

        from fastapi import BackgroundTasks
        # Send email in background
        enviar_correo_reset_password(correo_norm, nombre, reset_link)

    # Always return success (don't reveal if email exists)
    return {"message": "Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena."}


@router.post("/api/v1/auth/reset-password", tags=["Autenticacion"], summary="Restablecer contrasena")
@limiter.limit("5/minute")
async def api_reset_password(request: Request, datos: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    ip = request.client.host if request.client else None
    try:
        await reset_password(db, datos.token, datos.new_password, ip)
        return {"message": "Contrasena actualizada exitosamente. Ya puedes iniciar sesion."}
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/auth.py backend/app/routers/auth.py
git commit -m "feat: add forgot-password and reset-password endpoints"
```

---

## Task 7: Rate limiting with Redis storage

**Files:**
- Modify: `backend/app/core/limiter.py`

- [ ] **Step 1: Update limiter to use Redis**

Replace entire content of `backend/app/core/limiter.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Use Redis for rate limit storage when available, fallback to memory
_storage_uri = settings.REDIS_URL if settings.REDIS_URL else None

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/limiter.py
git commit -m "feat: migrate rate limiting storage to Redis"
```

---

## Task 8: Frontend — Password strength indicator component

**Files:**
- Create: `frontend/src/components/ui/password-strength.jsx`

- [ ] **Step 1: Create component**

```jsx
import { useMemo } from "react";

const RULES = [
  { label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una letra mayuscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una letra minuscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un numero", test: (p) => /\d/.test(p) },
  { label: "Un caracter especial", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(p) },
];

const LEVELS = [
  { max: 1, label: "Muy debil", color: "bg-red-500", width: "w-1/5" },
  { max: 2, label: "Debil", color: "bg-orange-500", width: "w-2/5" },
  { max: 3, label: "Regular", color: "bg-yellow-500", width: "w-3/5" },
  { max: 4, label: "Buena", color: "bg-lime-500", width: "w-4/5" },
  { max: 5, label: "Fuerte", color: "bg-green-500", width: "w-full" },
];

export function PasswordStrengthIndicator({ password = "" }) {
  const results = useMemo(
    () => RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );

  const passed = results.filter((r) => r.passed).length;
  const level = LEVELS[Math.max(0, passed - 1)] || LEVELS[0];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${level.color} ${level.width}`}
          />
        </div>
        <span className="text-xs text-white/60 whitespace-nowrap">{level.label}</span>
      </div>
      <ul className="space-y-0.5">
        {results.map((rule, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs">
            <span className={rule.passed ? "text-green-400" : "text-white/30"}>
              {rule.passed ? "✓" : "○"}
            </span>
            <span className={rule.passed ? "text-white/70" : "text-white/40"}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/password-strength.jsx
git commit -m "feat: add password strength indicator component"
```

---

## Task 9: Frontend — Forgot password page

**Files:**
- Create: `frontend/src/pages/ForgotPassword.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create ForgotPassword page**

Create `frontend/src/pages/ForgotPassword.jsx` — a simple page with:
- Same dark bg as AuthWizard (bg-slate-950)
- Input for email
- Submit button that POSTs to `/api/v1/auth/forgot-password`
- Success state shows "Revisa tu correo @tec.mx"
- Error handling
- Link to go back to login

- [ ] **Step 2: Add route in App.jsx**

Add import and route for `/forgot-password`.

- [ ] **Step 3: Wire link in AuthWizard**

The "Olvidaste tu contrasena?" button already exists but does nothing. Make it navigate to `/forgot-password`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ForgotPassword.jsx frontend/src/App.jsx frontend/src/pages/AuthWizard.jsx
git commit -m "feat: add forgot password page with email submission"
```

---

## Task 10: Frontend — Reset password page

**Files:**
- Create: `frontend/src/pages/ResetPassword.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create ResetPassword page**

Create `frontend/src/pages/ResetPassword.jsx` — page with:
- Reads `token` from URL query params
- Two password inputs (new + confirm)
- PasswordStrengthIndicator component
- Submit POSTs to `/api/v1/auth/reset-password`
- Success: redirect to login with message
- Error: show "token invalido/expirado" with link to request new one

- [ ] **Step 2: Add route in App.jsx**

Add route for `/reset-password`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ResetPassword.jsx frontend/src/App.jsx
git commit -m "feat: add reset password page with strength indicator"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Password strength validation | None |
| 2 | Apply validation to registration | Task 1 |
| 3 | PasswordResetToken model + migration | None |
| 4 | Password reset service | Tasks 1, 3 |
| 5 | Reset email template | None |
| 6 | Auth endpoints (forgot + reset) | Tasks 4, 5 |
| 7 | Rate limiting with Redis | None |
| 8 | Password strength component (frontend) | None |
| 9 | Forgot password page (frontend) | None |
| 10 | Reset password page (frontend) | Task 8 |

**Parallelizable groups:**
- Independent: Tasks 1, 3, 5, 7, 8, 9
- After Task 1: Task 2
- After Tasks 1+3: Task 4
- After Tasks 4+5: Task 6
- After Task 8: Task 10
