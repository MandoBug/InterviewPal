from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    app_env: str = "development"
    secret_key: str = "change-me"
    allowed_origins: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+asyncpg://interviewpal:localdev@localhost:5432/interviewpal"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = "interviewpal-recordings"
    aws_region: str = "us-west-2"

    # Email
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "noreply@interviewpal.app"
    mail_from_name: str = "InterviewPal"
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_enabled: bool = False

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
