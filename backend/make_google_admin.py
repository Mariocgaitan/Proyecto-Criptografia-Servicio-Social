"""
Script para convertir un usuario de Google en administrador.

Uso:
    uv run python make_google_admin.py <correo>
    
Ejemplo:
    uv run python make_google_admin.py a01659147@tec.mx
"""

import argparse
import asyncio
import uuid
from sqlalchemy import select

from app.db.models_import import Usuario  # noqa: registra todos los modelos
from app.db.session import AsyncSessionLocal


async def make_google_admin(correo: str, create_if_missing: bool = False) -> None:
    """
    Convierte un usuario de Google en administrador.
    
    Args:
        correo: Email del usuario (@tec.mx)
        create_if_missing: Si True, crea el usuario si no existe
    """
    correo = correo.lower().strip()
    
    async with AsyncSessionLocal() as db:
        # Buscar usuario por correo
        result = await db.execute(
            select(Usuario).where(Usuario.correo == correo)
        )
        usuario = result.scalar_one_or_none()
        
        if not usuario:
            if create_if_missing:
                # Crear usuario nuevo como admin
                # Generar matrícula temporal (usar correo como base)
                temp_matricula = f"ADM-{uuid.uuid4().hex[:8].upper()}"
                
                usuario = Usuario(
                    id_matricula=temp_matricula,
                    nombre="Administrador",
                    correo=correo,
                    carrera="ITC",
                    semestre=1,
                    password_hash=None,  # Google login, sin contraseña
                    is_google_login=True,
                    totp_secret="",  # Se generará al primer login
                    rol="admin",  # ✅ ADMIN DESDE EL COMIENZO
                )
                db.add(usuario)
                await db.commit()
                
                print(f"✅ Nuevo usuario admin creado:")
                print(f"   Correo: {usuario.correo}")
                print(f"   Matricula: {usuario.id_matricula}")
                print(f"   Rol: {usuario.rol}")
                print()
                print("👤 Instrucciones:")
                print("   1. Inicia sesión con Google usando: " + correo)
                print("   2. Se te pedirá configurar autenticación 2FA (TOTP)")
                print("   3. ¡Acceso a panel de admin automáticamente!")
            else:
                print(f"❌ No se encontró usuario con correo: {correo}")
                print()
                print("📝 Opciones:")
                print("   a) Si ya tienes cuenta: ejecuta sin --create")
                print("   b) Si no tienes cuenta: ejecuta con --create")
                print()
                print("     uv run python make_google_admin.py " + correo + " --create")
            return
        
        # Usuario existe: cambiar rol a admin
        usuario_rol_anterior = usuario.rol
        usuario.rol = "admin"
        
        # Guardar cambios
        await db.commit()
        
        print(f"✅ Usuario actualizado exitosamente:")
        print(f"   Correo: {usuario.correo}")
        print(f"   Matricula: {usuario.id_matricula}")
        print(f"   Nombre: {usuario.nombre}")
        print(f"   Rol anterior: {usuario_rol_anterior}")
        print(f"   Rol nuevo: {usuario.rol}")
        print()
        print("👤 Ahora que eres admin, puedes acceder al panel de administración:")
        print("   - Gestionar usuarios")
        print("   - Ver estadísticas")
        print("   - Configurar empresas y proyectos")
        print("   - Auditoría del sistema")


async def main():
    parser = argparse.ArgumentParser(
        description="Convertir un usuario de Google en administrador",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  # Convertir usuario existente en admin
  uv run python make_google_admin.py a01659147@tec.mx
  
  # Crear nuevo usuario como admin (antes de que inicie sesión)
  uv run python make_google_admin.py a01659147@tec.mx --create
        """
    )
    parser.add_argument(
        "correo",
        help="Correo institucional del usuario (@tec.mx)"
    )
    parser.add_argument(
        "--create",
        action="store_true",
        help="Crear usuario como admin si no existe"
    )
    
    args = parser.parse_args()
    
    # Validar que sea correo institucional
    if not args.correo.lower().endswith("@tec.mx"):
        print(f"❌ Error: Solo se aceptan correos institucionales (@tec.mx)")
        print(f"   Recibido: {args.correo}")
        return
    
    await make_google_admin(args.correo, create_if_missing=args.create)


if __name__ == "__main__":
    asyncio.run(main())
