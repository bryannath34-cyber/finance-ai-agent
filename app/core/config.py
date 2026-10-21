import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Aplikasi & Prefix
    APP_ENV: str = "production"
    APP_PREFIX: str = "/finance"
    # Keep signing keys out of source control. Startup should fail if deployment
    # secrets are missing instead of silently using a known fallback.
    SECRET_KEY: str
    DEBUG: bool = False

    # Database MySQL DB System
    DB_HOST: str = "10.10.2.202"
    DB_PORT: int = 3306
    DB_USER: str = "fin_bot_app"
    DB_PASSWORD: str
    DB_NAME: str = "personal_finance"
    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    # OCI Native Services & Compartment
    OCI_COMPARTMENT_OCID: str = "ocid1.compartment.oc1..aaaaaaaa34hvajlobh43ab5ah7it4qiqobvryax6gpy7xobhtnsjzepzik3a"
    OCI_REGION_APP: str = "ap-singapore-1"
    OCI_REGION_GENAI: str = "ap-osaka-1"
    OCI_GENAI_ENDPOINT: str = "https://inference.generativeai.ap-osaka-1.oci.oraclecloud.com"
    OCI_GENAI_MODEL_ID: str = "cohere.command-a-03-2025"
    OCI_BUCKET_NAME: str = "pf-speech-exchange"
    OCI_BUCKET_NAMESPACE: str = "axodhetbf5ej"

    # Sesi & Keamanan Web
    SESSION_COOKIE_NAME: str = "pf_session"
    CSRF_COOKIE_NAME: str = "pf_csrf"
    SESSION_EXPIRE_HOURS: int = 24
    ALLOWED_HOSTS: str = "*"
    FFMPEG_PATH: str = "/usr/local/bin/ffmpeg"

    # Email & Pemulihan Kata Sandi (Resend API - Dikonfigurasi lewat file .env)
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "Finance AI Agent <onboarding@resend.dev>"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15
    APP_BASE_URL: str = "https://161.118.216.250"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def allowed_hosts_list(self) -> List[str]:
        if self.ALLOWED_HOSTS == "*":
            return ["*"]
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

settings = Settings()
