from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.usuario import RegistroRequest
from app.services.auth_service import RegistroError, obtener_eventos_disponibles, registrar_alumno
from app.core.limiter import limiter

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/registro", response_class=HTMLResponse, name="registro_form")
async def mostrar_formulario_registro(request: Request, db: AsyncSession = Depends(get_db)):
    """Muestra el formulario de registro de alumnos."""
    eventos = await obtener_eventos_disponibles(db)
    return templates.TemplateResponse(
        "auth/registro.html",
        {"request": request, "eventos": eventos, "errores": [], "form_data": {}},
    )


@router.post("/registro", response_class=HTMLResponse, name="registro_submit")
@limiter.limit("5/minute")
async def procesar_registro(
    request: Request,
    db: AsyncSession = Depends(get_db),
    nombre: str = Form(...),
    correo: str = Form(...),
    matricula: str = Form(...),
    carrera: str = Form(...),
    semestre: int = Form(...),
    password: str = Form(...),
    password_confirm: str = Form(...),
    eventos_seleccionados: list[int] = Form(default=[]),
):
    """Procesa el formulario de registro."""
    eventos = await obtener_eventos_disponibles(db)
    form_data = {
        "nombre": nombre,
        "correo": correo,
        "matricula": matricula,
        "carrera": carrera,
        "semestre": semestre,
        "eventos_seleccionados": eventos_seleccionados,
    }

    # Validar contraseñas coinciden
    if password != password_confirm:
        return templates.TemplateResponse(
            "auth/registro.html",
            {
                "request": request,
                "eventos": eventos,
                "errores": ["Las contraseñas no coinciden."],
                "form_data": form_data,
            },
            status_code=400,
        )

    # Validar con Pydantic
    try:
        datos = RegistroRequest(
            nombre=nombre,
            correo=correo,
            matricula=matricula,
            carrera=carrera,
            semestre=semestre,
            password=password,
            eventos_seleccionados=eventos_seleccionados,
        )
    except Exception as e:
        errores = [str(err["msg"]) for err in e.errors()] if hasattr(e, "errors") else [str(e)]
        return templates.TemplateResponse(
            "auth/registro.html",
            {"request": request, "eventos": eventos, "errores": errores, "form_data": form_data},
            status_code=400,
        )

    # Registrar en DB
    try:
        await registrar_alumno(db, datos)
    except RegistroError as e:
        return templates.TemplateResponse(
            "auth/registro.html",
            {
                "request": request,
                "eventos": eventos,
                "errores": [e.message],
                "form_data": form_data,
            },
            status_code=400,
        )

    return RedirectResponse(url=f"/registro/exitoso?nombre={nombre}", status_code=303)


@router.get("/registro/exitoso", response_class=HTMLResponse, name="registro_exitoso")
async def registro_exitoso(request: Request, nombre: str = ""):
    """Página de confirmación tras registro exitoso."""
    return templates.TemplateResponse(
        "auth/registro_exitoso.html",
        {"request": request, "nombre": nombre},
    )


# ── API JSON (para uso programático / tests) ──────────────────────────────────

@router.post("/api/v1/auth/registro")
@limiter.limit("5/minute")
async def api_registro(request: Request, datos: RegistroRequest, db: AsyncSession = Depends(get_db)):
    """Endpoint JSON para registro de alumno."""
    try:
        resultado = await registrar_alumno(db, datos)
        return resultado
    except RegistroError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)
