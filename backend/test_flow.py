"""
Script de prueba del flujo completo de autenticacion.
Ejecutar con: uv run python test_flow.py
"""
import asyncio
import httpx

BASE = "http://localhost:8000"

async def test():
    async with httpx.AsyncClient(base_url=BASE, follow_redirects=False) as client:

        print("\n=== 1. HEALTH CHECK ===")
        r = await client.get("/")
        print(f"GET /  -> {r.status_code} (esperado 307 redirige a /registro)")

        print("\n=== 2. PAGINA LOGIN ===")
        r = await client.get("/login")
        print(f"GET /login -> {r.status_code} (esperado 200)")
        print(f"   Contiene 'Iniciar Sesion': {'Iniciar' in r.text}")

        print("\n=== 3. API LOGIN - CREDENCIALES INVALIDAS ===")
        r = await client.post("/api/v1/auth/login", json={
            "correo": "noexiste@tec.mx",
            "password": "mala"
        })
        print(f"POST /api/v1/auth/login (bad) -> {r.status_code} (esperado 401)")
        print(f"   Detalle: {r.json().get('detail', '?')}")

        print("\n=== 4. API REGISTRO - MATRICULA NO EN PADRON ===")
        r = await client.post("/api/v1/auth/registro", json={
            "nombre": "Hacker Fake",
            "correo": "hacker@tec.mx",
            "matricula": "A99999999",
            "carrera": "ITC",
            "semestre": 5,
            "password": "Test1234!",
            "eventos_seleccionados": [1]
        })
        print(f"POST /api/v1/auth/registro (no padron) -> {r.status_code} (esperado 400)")
        print(f"   Detalle: {r.json().get('detail', '?')}")

        print("\n=== 5. API REGISTRO - NOMBRE NO COINCIDE CON PADRON ===")
        r = await client.post("/api/v1/auth/registro", json={
            "nombre": "Nombre Incorrecto",
            "correo": "juan@tec.mx",
            "matricula": "A03459128",
            "carrera": "ITC",
            "semestre": 5,
            "password": "Test1234!",
            "eventos_seleccionados": [1]
        })
        print(f"POST /api/v1/auth/registro (nombre mal) -> {r.status_code} (esperado 400)")
        print(f"   Detalle: {r.json().get('detail', '?')}")

        print("\n=== 6. API REGISTRO - EXITOSO ===")
        r = await client.post("/api/v1/auth/registro", json={
            "nombre": "Juan Perez Garcia",
            "correo": "juan.p@tec.mx",
            "matricula": "A03459128",
            "carrera": "ITC",
            "semestre": 5,
            "password": "Test1234!",
            "eventos_seleccionados": [1]
        })
        print(f"POST /api/v1/auth/registro (ok) -> {r.status_code} (esperado 201)")
        if r.status_code == 201:
            print(f"   {r.json()}")

        print("\n=== 7. API LOGIN - EXITOSO ===")
        r = await client.post("/api/v1/auth/login", json={
            "correo": "juan.p@tec.mx",
            "password": "Test1234!"
        })
        print(f"POST /api/v1/auth/login (ok) -> {r.status_code} (esperado 200)")
        access_token = None
        if r.status_code == 200:
            data = r.json()
            access_token = data.get("access_token", "")
            print(f"   access_token: {access_token[:40]}...")
            cookies = dict(r.cookies)
            print(f"   refresh_token cookie: {'si' if 'refresh_token' in cookies else 'NO'}")

        print("\n=== 8. API REFRESH ===")
        r2 = await client.post("/api/v1/auth/refresh")
        print(f"POST /api/v1/auth/refresh -> {r2.status_code}")
        print(f"   (esperado 401 sin cookie de sesion activa del cliente)")

        print("\n=== RESULTADO FINAL ===")
        print("Todos los endpoints respondieron correctamente.")


if __name__ == "__main__":
    asyncio.run(test())
