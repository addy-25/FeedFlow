from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://localhost/feedflow"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"


settings = Settings()