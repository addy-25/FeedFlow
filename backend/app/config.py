from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/feedflow"

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, v: str) -> str:
        # Managed Postgres (Railway/Render/Heroku) hands out a postgres:// or
        # postgresql:// URL, but the async app needs the asyncpg driver. Rewrite
        # it so the cloud-provided URL can be pasted in as-is.
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7

    # OpenAI-compatible AI provider (OpenAI, AIcredits, OpenRouter, ...).
    openai_api_key: str
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"


settings = Settings() # type: ignore