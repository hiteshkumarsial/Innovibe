from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    PROJECT_NAME: str = "BarRaiser AI Interviewer"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./interview_prep.db"

    # LLM Options
    LLM_PROVIDER: Literal["groq", "gemini", "openai", "mock"] = "groq"
    GROQ_API_KEY: str = "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"
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # JWT Authentication
    JWT_SECRET_KEY: str = "raisethebar-secret-jwt-key-2026-production"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
