"""
Script de seed — Inserta los datos iniciales necesarios para que el sistema funcione.

Pobla TODAS las tablas del sistema de forma reproducible:
  - eventos          (4 períodos)
  - padron_alumnos   (25 alumnos autorizados)
  - empresas         (6 empresas participantes)
  - proyectos        (1-2 proyectos por empresa ligados al evento activo)
  - usuarios         (25 alumnos registrados, espejo del padrón)
  - usuario_eventos  (cada alumno vinculado al evento activo)
  - logs_auditoria   (1 log de sistema por arranque de seed)

Las tablas refresh_tokens e inscripciones se omiten intencionalmente:
  - refresh_tokens: se generan en tiempo de ejecución (login).
  - inscripciones:  son acción de los alumnos, no datos de arranque.

Uso:
    uv run python seed.py           # Idempotente: omite datos existentes
    uv run python seed.py --force   # Borra TODO y re-inserta desde cero
"""

import argparse
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt

from app.db.models_import import (  # noqa: registra todos los modelos en SQLAlchemy
    Base,
    Empresa,
    Evento,
    LogAuditoria,
    PadronAlumno,
    Proyecto,
    Usuario,
    UsuarioEvento,
)
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, text


# ────────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    """Hashea una contraseña con bcrypt (igual que la app)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ────────────────────────────────────────────────────────────────────────────────
# Datos de seed
# ────────────────────────────────────────────────────────────────────────────────

EVENTOS_DATA = [
    {"nombre": "Invierno 2026",         "periodo": "INVIERNO", "anio": 2026, "activo": False},
    {"nombre": "Febrero-Junio 2026",    "periodo": "FEB_JUN",  "anio": 2026, "activo": True},
    {"nombre": "Verano 2026",           "periodo": "VERANO",   "anio": 2026, "activo": False},
    {"nombre": "Agosto-Diciembre 2026", "periodo": "AGO_DIC",  "anio": 2026, "activo": False},
]

# 25 alumnos — matrícula + nombre completo (padrón oficial)
PADRON_DATA = [
    {"id_matricula": "A03459128", "nombre_completo": "Juan Pérez García"},
    {"id_matricula": "A01659147", "nombre_completo": "Luis Alan Morales Castillo"},
    {"id_matricula": "A01234567", "nombre_completo": "María Fernanda López Torres"},
    {"id_matricula": "A01345678", "nombre_completo": "Carlos Eduardo Ramírez Vega"},
    {"id_matricula": "A01456789", "nombre_completo": "Ana Sofía Hernández Cruz"},
    {"id_matricula": "A01567890", "nombre_completo": "Diego Alejandro Soto Mendoza"},
    {"id_matricula": "A01678901", "nombre_completo": "Valeria Guadalupe Martínez Ruiz"},
    {"id_matricula": "A01789012", "nombre_completo": "Andrés Felipe Jiménez Salinas"},
    {"id_matricula": "A01890123", "nombre_completo": "Daniela Paola Gutiérrez Flores"},
    {"id_matricula": "A01901234", "nombre_completo": "Roberto Carlos Díaz Espinoza"},
    {"id_matricula": "A02012345", "nombre_completo": "Sofía Elena Vargas Moreno"},
    {"id_matricula": "A02123456", "nombre_completo": "Miguel Ángel Reyes Campos"},
    {"id_matricula": "A02234567", "nombre_completo": "Isabela Cristina Fuentes Aguilar"},
    {"id_matricula": "A02345678", "nombre_completo": "Pablo Enrique Castillo Rivera"},
    {"id_matricula": "A02456789", "nombre_completo": "Camila Alejandra Ortega Blanco"},
    {"id_matricula": "A02567890", "nombre_completo": "Sebastián Iván Torres Medina"},
    {"id_matricula": "A02678901", "nombre_completo": "Natalia Berenice Romero Ávila"},
    {"id_matricula": "A02789012", "nombre_completo": "Emilio Rodrigo Chávez Peña"},
    {"id_matricula": "A02890123", "nombre_completo": "Luna Patricia Delgado Soria"},
    {"id_matricula": "A02901234", "nombre_completo": "Óscar Manuel Ibarra Sandoval"},
    {"id_matricula": "A03012345", "nombre_completo": "Mariana del Rocío Vidal Leal"},
    {"id_matricula": "A03123456", "nombre_completo": "Rodrigo Javier Esquivel Garza"},
    {"id_matricula": "A03234567", "nombre_completo": "Ariadna Lizbeth Molina Cisneros"},
    {"id_matricula": "A03345678", "nombre_completo": "Héctor Guillermo Paredes Ríos"},
    {"id_matricula": "A03456789", "nombre_completo": "Fernanda Isabel Cabrera Zuniga"},
]

# 6 empresas participantes
EMPRESAS_DATA = [
    {"nombre_empresa": "Cemex",              "logo_url": None},
    {"nombre_empresa": "Grupo Bimbo",        "logo_url": None},
    {"nombre_empresa": "FEMSA",              "logo_url": None},
    {"nombre_empresa": "Banorte",            "logo_url": None},
    {"nombre_empresa": "Arca Continental",   "logo_url": None},
    {"nombre_empresa": "Axtel (TotalPlay)",  "logo_url": None},
]

# Proyectos por empresa (se asignarán al evento activo FEB_JUN 2026)
# Formato: (nombre_empresa, nombre_proyecto, descripcion, capacidad_max, lista_espera_max)
PROYECTOS_TEMPLATE = [
    ("Cemex",             "Optimización logística con IA",              "Aplicación de machine learning para rutas de distribución.",              5, 3),
    ("Cemex",             "Gestión de inventario digital",              "Sistema ERP para plantas cementeras.",                                    4, 2),
    ("Grupo Bimbo",       "Análisis de cadena de suministro",           "Modelado matemático de flujos de producción y distribución.",              6, 3),
    ("Grupo Bimbo",       "Automatización de líneas de empaque",        "Integración de visión artificial en líneas industriales.",                 4, 2),
    ("FEMSA",             "Digitalización de puntos de venta OXXO",    "App interna de gestión para tiendas de conveniencia.",                     5, 2),
    ("FEMSA",             "Plataforma de lealtad y datos",              "Sistema de analítica de comportamiento de clientes.",                      5, 3),
    ("Banorte",           "Detección de fraude en tiempo real",         "Modelos predictivos sobre transacciones bancarias.",                       4, 2),
    ("Banorte",           "Open Banking API",                           "Desarrollo de endpoints seguros para integración de terceros.",            3, 2),
    ("Arca Continental",  "Transformación digital de distribuidoras",   "Modernización de sistemas legados para red de distribución.",              5, 3),
    ("Arca Continental",  "Dashboard de ventas y KPIs",                 "Plataforma BI con datos en tiempo real.",                                  5, 2),
    ("Axtel (TotalPlay)", "Automatización de redes de fibra óptica",   "Herramientas de monitoreo y gestión de infraestructura.",                  4, 2),
    ("Axtel (TotalPlay)", "Portal de atención a clientes",              "Sistema multicanal de soporte técnico y facturación.",                     4, 2),
]

# Carreras disponibles para los usuarios semilla
_CARRERAS = [
    "Ingeniería en Tecnologías Computacionales",
    "Ingeniería en Sistemas Computacionales",
    "Ingeniería en Ciberseguridad",
    "Ingeniería en Inteligencia Artificial",
    "Ingeniería Industrial y de Sistemas",
    "Ingeniería Mecatrónica",
]


# ────────────────────────────────────────────────────────────────────────────────
# Funciones de seed
# ────────────────────────────────────────────────────────────────────────────────

async def seed_eventos() -> dict[str, "Evento"]:
    """Inserta eventos. Devuelve un mapa nombre→objeto."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Evento))
        existentes = result.scalars().all()

        if existentes:
            print(f"ℹ️  Ya existen {len(existentes)} eventos. Omitiendo inserción.")
            for e in existentes:
                print(f"   - [{e.id_evento}] {e.nombre} ({'ACTIVO' if e.activo else 'inactivo'})")
            return {e.nombre: e for e in existentes}

        eventos = [Evento(**d) for d in EVENTOS_DATA]
        db.add_all(eventos)
        await db.commit()
        for e in eventos:
            await db.refresh(e)
        print(f"✅ {len(eventos)} eventos insertados.")
        for e in eventos:
            print(f"   - [{e.id_evento}] {e.nombre} ({'ACTIVO' if e.activo else 'inactivo'})")
        return {e.nombre: e for e in eventos}


async def seed_padron() -> None:
    """Inserta el padrón oficial de 25 alumnos."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PadronAlumno))
        if result.scalars().first():
            print("ℹ️  Padrón ya existe. Omitiendo inserción.")
            return

        alumnos = [PadronAlumno(**d) for d in PADRON_DATA]
        db.add_all(alumnos)
        await db.commit()
        print(f"✅ {len(alumnos)} alumnos insertados en el padrón.")


async def seed_empresas() -> dict[str, "Empresa"]:
    """Inserta 6 empresas. Devuelve un mapa nombre→objeto."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Empresa))
        existentes = result.scalars().all()

        if existentes:
            print(f"ℹ️  Ya existen {len(existentes)} empresas. Omitiendo inserción.")
            return {e.nombre_empresa: e for e in existentes}

        empresas = [Empresa(**d) for d in EMPRESAS_DATA]
        db.add_all(empresas)
        await db.commit()
        for e in empresas:
            await db.refresh(e)
        print(f"✅ {len(empresas)} empresas insertadas:")
        for e in empresas:
            print(f"   - [{e.id_empresa}] {e.nombre_empresa}")
        return {e.nombre_empresa: e for e in empresas}


async def seed_proyectos(
    evento_activo: "Evento",
    empresas: dict[str, "Empresa"],
) -> None:
    """Inserta proyectos vinculados al evento activo y a las empresas."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Proyecto))
        if result.scalars().first():
            print("ℹ️  Proyectos ya existen. Omitiendo inserción.")
            return

        proyectos = []
        for nombre_empresa, nombre_proj, desc, cap, espera in PROYECTOS_TEMPLATE:
            empresa = empresas.get(nombre_empresa)
            if not empresa:
                print(f"⚠️  Empresa '{nombre_empresa}' no encontrada, saltando proyecto.")
                continue
            proyectos.append(
                Proyecto(
                    id_empresa=empresa.id_empresa,
                    id_evento=evento_activo.id_evento,
                    nombre_proyecto=nombre_proj,
                    descripcion=desc,
                    capacidad_max=cap,
                    cupo_actual=0,
                    capacidad_espera_max=espera,
                )
            )

        db.add_all(proyectos)
        await db.commit()
        print(f"✅ {len(proyectos)} proyectos insertados para el evento '{evento_activo.nombre}'.")


async def seed_usuarios(evento_activo: "Evento") -> None:
    """
    Inserta 25 usuarios (espejo del padrón) con:
      - contraseña: 'Seed1234!' (cambiable en producción)
      - totp_secret: cadena vacía de 32 chars (placeholder — el alumno lo configura al ingresar)
      - carrera y semestre rotados cíclicamente
    Y vincula cada usuario al evento activo en usuario_eventos.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario))
        if result.scalars().first():
            print("ℹ️  Usuarios ya existen. Omitiendo inserción.")
            return

    # Contraseña fija para el seed — cambiar en producción
    DEFAULT_PASSWORD = "Seed1234!"
    hashed_pw = _hash(DEFAULT_PASSWORD)

    usuarios = []
    for i, p in enumerate(PADRON_DATA):
        matricula = p["id_matricula"]
        nombre = p["nombre_completo"]
        correo = f"{matricula.lower()}@tec.mx"
        carrera = _CARRERAS[i % len(_CARRERAS)]
        semestre = (i % 8) + 3  # semestres del 3 al 10, rotando

        usuarios.append(
            Usuario(
                id_matricula=matricula,
                nombre=nombre,
                correo=correo,
                carrera=carrera,
                semestre=semestre,
                password_hash=hashed_pw,
                totp_secret="A" * 32,  # placeholder; el alumno configura su TOTP al ingresar
            )
        )

    async with AsyncSessionLocal() as db:
        db.add_all(usuarios)
        await db.flush()  # obtener los IDs antes de commit

        # Vincular cada usuario al evento activo
        usuario_eventos = [
            UsuarioEvento(
                id_matricula=u.id_matricula,
                id_evento=evento_activo.id_evento,
            )
            for u in usuarios
        ]
        db.add_all(usuario_eventos)
        await db.commit()

    print(f"✅ {len(usuarios)} usuarios insertados (contraseña: '{DEFAULT_PASSWORD}').")
    print(f"✅ {len(usuario_eventos)} registros usuario_eventos creados para '{evento_activo.nombre}'.")


async def seed_log_sistema() -> None:
    """Inserta un log de auditoría que documenta la ejecución del seed."""
    async with AsyncSessionLocal() as db:
        log = LogAuditoria(
            id_log=uuid.uuid4(),
            tipo_evento="SEED_EJECUTADO",
            id_matricula=None,
            ip_origen="127.0.0.1",
            detalle=(
                "Seed inicial ejecutado: 4 eventos, 25 alumnos en padrón, "
                "6 empresas, 12 proyectos, 25 usuarios, 25 usuario_eventos."
            ),
        )
        db.add(log)
        await db.commit()
        print("✅ Log de auditoría 'SEED_EJECUTADO' registrado.")


# ────────────────────────────────────────────────────────────────────────────────
# Punto de entrada
# ────────────────────────────────────────────────────────────────────────────────

async def truncate_all() -> None:
    """
    Elimina todos los datos en orden correcto (respetando FK).
    Reinicia los contadores de secuencia (IDENTITY).
    """
    tablas = [
        "inscripciones",
        "usuario_eventos",
        "refresh_tokens",
        "logs_auditoria",
        "usuarios",
        "proyectos",
        "empresas",
        "padron_alumnos",
        "eventos",
    ]
    async with AsyncSessionLocal() as db:
        for tabla in tablas:
            await db.execute(text(f"TRUNCATE TABLE {tabla} RESTART IDENTITY CASCADE"))
        await db.commit()
    print("🗑️  Todas las tablas limpiadas correctamente.\n")


async def main(force: bool = False) -> None:
    if force:
        print("\n⚠️  Modo --force: borrando datos existentes...")
        await truncate_all()
    print("\n🌱 Ejecutando seed de datos iniciales...\n")

    # 1. Eventos (independiente)
    print("── Eventos ──────────────────────────────")
    eventos_map = await seed_eventos()

    # 2. Padrón (independiente)
    print("\n── Padrón de alumnos ────────────────────")
    await seed_padron()

    # 3. Empresas (independiente)
    print("\n── Empresas ─────────────────────────────")
    empresas_map = await seed_empresas()

    # 4. Proyectos (depende de evento activo y empresas)
    evento_activo = next(
        (e for e in eventos_map.values() if e.activo), None
    )
    if evento_activo is None:
        print("⚠️  No hay evento activo. Proyectos y usuarios NO se insertarán.")
    else:
        print(f"\n── Proyectos (evento: {evento_activo.nombre}) ──")
        await seed_proyectos(evento_activo, empresas_map)

        # 5. Usuarios + usuario_eventos (depende de evento activo)
        print("\n── Usuarios & usuario_eventos ───────────")
        await seed_usuarios(evento_activo)

    # 6. Log de auditoría
    print("\n── Log de auditoría ─────────────────────")
    await seed_log_sistema()

    print("\n✅ Seed completado exitosamente.\n")


if __name__ == "__main__":
    from app.core.config import settings
    from app.db.ssh_manager import ssh_tunnel_manager

    parser = argparse.ArgumentParser(description="Seed de datos iniciales")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Borra todos los datos existentes antes de insertar (re-seed completo)",
    )
    args = parser.parse_args()

    if settings.USE_SSH_TUNNEL:
        ssh_tunnel_manager.start()

    try:
        asyncio.run(main(force=args.force))
    finally:
        if settings.USE_SSH_TUNNEL:
            ssh_tunnel_manager.stop()
