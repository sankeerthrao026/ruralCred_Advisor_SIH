import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "RuralCred Advisor API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # AI Keys (Primary: GPT, Secondary: NVIDIA NIM Nemotron)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = os.getenv(
        "CHROMA_PERSIST_DIRECTORY",
        str(BASE_DIR / "chroma_db")
    )
    
    # Supabase Auth
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

    # Demo mode: when enabled, header-based pseudo-auth (x-user-id / x-auth-mode) is trusted.
    # When disabled, ALL authenticated requests are rejected with 401. Defaults to true for local/demo evaluation.
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("1", "true", "yes", "on")

    # CORS allow-list (comma-separated string). Applied explicitly instead of "*" so
    # cross-origin browsers are limited to known frontend origins.
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://192.168.29.117:3000",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
    
    # Firebase Firestore
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", ""))
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "")
    
    # Data directory
    DATA_DIR: Path = PROJECT_ROOT / "data"

    model_config = SettingsConfigDict(
        env_file=[".env", ".env.local", str(BASE_DIR / ".env")],
        extra="ignore"
    )

settings = Settings()
