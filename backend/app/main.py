from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from sqlalchemy import text

from .database import Base, engine
from . import models  # noqa: F401  registers tables on Base
from .routers import auth, instagram, preferences, automation, settings



@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all only creates missing *tables*, not new columns on existing
        # ones. Add email_verified to a pre-existing users table. DEFAULT true
        # grandfathers accounts created before verification existed so they keep
        # working; new sign-ups are inserted with False by the ORM regardless.
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "email_verified BOOLEAN NOT NULL DEFAULT true"
            )
        )
    yield


app = FastAPI(title="FeedFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(instagram.router)
app.include_router(preferences.router)
app.include_router(automation.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}