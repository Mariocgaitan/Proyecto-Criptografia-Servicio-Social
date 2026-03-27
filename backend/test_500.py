import asyncio
from app.db.session import AsyncSessionLocal
from app.db import models_import as _models  # noqa: F401
from app.services.auth_service import login_or_register_google

async def test_error():
    async with AsyncSessionLocal() as db:
        try:
            await login_or_register_google(db, "fake_token", "127.0.0.1")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_error())
