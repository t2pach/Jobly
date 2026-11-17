from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    database_url: str = "sqlite:///./jobly.db"
    jwt_secret: str = "change-me"
    jwt_ttl_minutes: int = 60 * 24
    secrets_key: str = ""
    cors_origins: str = "http://localhost:3000"
    admin_emails: str = ""
    provider_timeout_s: float = 8.0

    trudvsem_enabled: bool = True
    trudvsem_base_url: str = "https://opendata.trudvsem.ru/api/v1"
    superjob_enabled: bool = False
    superjob_app_secret: str = ""
    hh_enabled: bool = False
    hh_client_id: str = ""
    hh_client_secret: str = ""

    def admin_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    def validate_for_prod(self) -> None:
        if self.app_env == "prod" and (
            self.jwt_secret == "change-me" or len(self.jwt_secret) < 32 or not self.secrets_key
        ):
            raise RuntimeError("В prod нужны JWT_SECRET (от 32 символов) и SECRETS_KEY")


settings = Settings()
