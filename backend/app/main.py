from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from .database import Base, engine
from . import models  # noqa: F401  registers tables on Base
from .routers import auth, instagram, preferences, automation



@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/health")
async def health():
    return {"status": "ok"}