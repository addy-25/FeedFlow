from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/feedflow"

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, v: str) -> str:
        
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

    # SMTP for password-reset verification emails. Defaults target Gmail.
    # Leave smtp_user / smtp_password empty to run in dev mode (the code is
    # printed to the backend console instead of emailed).
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Instagram logs in fine from a residential IP (your laptop) but rejects
    # datacenter IPs (Railway, AWS, ...) outright. Routing instagrapi through a
    # residential/mobile proxy makes the cloud login look like a real phone.
    # Format: "http://user:pass@host:port" (or socks5://...). Empty = no proxy.
    ig_proxy: str = ""


settings = Settings() # type: ignore