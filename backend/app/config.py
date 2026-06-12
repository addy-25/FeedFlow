from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/feedflow"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7
    anthropic_api_key: str


settings = Settings()