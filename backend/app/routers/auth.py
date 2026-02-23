from fastapi import APIRouter, Cookie, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import RegistroRequest
from app.services.auth_service import (
    LoginError,
    RegistroError,
    login_alumno,
    logout_alumno,
    obtener_eventos_disponibles,
    refresh_session,
    registrar_alumno,
)

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# Duración cookie refresh token en segundos (8 horas)
REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60


# ═══════════════════════════════════════════════════════════════════════════════
#  FORMULARIOS HTML
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/registro", response_class=HTMLResponse, name="registro_form")
async def mostrar_formulario_registro(request: Request, db: AsyncSession = Depends(get_db)):
    eventos = await obtener_eventos_disponibles(db)
    return templates.TemplateResponse(
        "auth/registro.html",
        {"request": request, "eventos": eventos, "errores": [], "form_data": {}},
    )


@router.post("/registro", response_class=HTMLResponse, name="registro_submit")
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
    eventos = await obtener_eventos_disponibles(db)
    form_data = {
        "nombre": nombre, "correo": correo, "matricula": matricula,
        "carrera": carrera, "semestre": semestre,
        "eventos_seleccionados": eventos_seleccionados,
    }

    if password != password_confirm:
        return templates.TemplateResponse(
            "auth/registro.html",
            {"request": request, "eventos": eventos,
             "errores": ["Las contraseñas no coinciden."], "form_data": form_data},
            status_code=400,
        )

    try:
        datos = RegistroRequest(
            nombre=nombre, correo=correo, matricula=matricula,
            carrera=carrera, semestre=semestre, password=password,
            eventos_seleccionados=eventos_seleccionados,
        )
    except Exception as e:
        errores = [str(err["msg"]) for err in e.errors()] if hasattr(e, "errors") else [str(e)]
        return templates.TemplateResponse(
            "auth/registro.html",
            {"request": request, "eventos": eventos, "errores": errores, "form_data": form_data},
            status_code=400,
        )

    try:
        await registrar_alumno(db, datos)
    except RegistroError as e:
        return templates.TemplateResponse(
            "auth/registro.html",
            {"request": request, "eventos": eventos,
             "errores": [e.message], "form_data": form_data},
            status_code=400,
        )

    return RedirectResponse(url=f"/registro/exitoso?nombre={nombre}", status_code=303)


@router.get("/registro/exitoso", response_class=HTMLResponse, name="registro_exitoso")
async def registro_exitoso(request: Request, nombre: str = ""):
    return templates.TemplateResponse(
        "auth/registro_exitoso.html",
        {"request": request, "nombre": nombre},
    )


@router.get("/login", response_class=HTMLResponse, name="login_form")
async def mostrar_formulario_login(request: Request):
    return templates.TemplateResponse(
        "auth/login.html",
        {"request": request, "error": None},
    )


@router.post("/login", response_class=HTMLResponse, name="login_submit")
async def procesar_login(
    request: Request,
    db: AsyncSession = Depends(get_db),
    correo: str = Form(...),
    password: str = Form(...),
):
    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, correo, password, ip)
    except LoginError as e:
        return templates.TemplateResponse(
            "auth/login.html",
            {"request": request, "error": e.message, "correo": correo},
            status_code=401,
        )

    # Login exitoso → redirigir al dashboard con cookie de refresh
    response = RedirectResponse(url="/dashboard", status_code=303)
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False,       # True en producción (HTTPS)
        samesite="strict",
        max_age=REFRESH_COOKIE_MAX_AGE,
    )
    # Access token en cookie también (para SSR, el JS lo leerá desde aquí)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,     # Accesible por JS para incluirlo en headers
        secure=False,
        samesite="strict",
        max_age=15 * 60,    # 15 minutos
    )
    return response


@router.get("/logout", name="logout_html")
async def logout_html(
    request: Request,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        await logout_alumno(db, refresh_token)
    response = RedirectResponse(url="/login", status_code=303)
    response.delete_cookie("refresh_token")
    response.delete_cookie("access_token")
    return response


# ═══════════════════════════════════════════════════════════════════════════════
#  API JSON
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/api/v1/auth/registro", status_code=201)
async def api_registro(datos: RegistroRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await registrar_alumno(db, datos)
    except RegistroError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/api/v1/auth/login", response_model=TokenResponse)
async def api_login(datos: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    try:
        access_token, raw_refresh = await login_alumno(db, datos.correo, datos.password, ip)
    except LoginError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=e.status_code, detail=e.message)

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=REFRESH_COOKIE_MAX_AGE,
    )
    return response


@router.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def api_refresh(
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    from fastapi import HTTPException
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token no encontrado")
    try:
        new_token = await refresh_session(db, refresh_token)
        return {"access_token": new_token, "token_type": "bearer"}
    except LoginError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/api/v1/auth/logout")
async def api_logout(
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        await logout_alumno(db, refresh_token)
    response = JSONResponse(content={"message": "Sesión cerrada exitosamente"})
    response.delete_cookie("refresh_token")
    return response
