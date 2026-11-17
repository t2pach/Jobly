from ..config import settings
from .base import JobProvider
from .stubs import HHProvider, SuperJobProvider
from .trudvsem import TrudvsemProvider


def build_providers() -> dict[str, JobProvider]:
    return {
        "trudvsem": TrudvsemProvider(settings.trudvsem_base_url, settings.provider_timeout_s),
        "hh": HHProvider(settings.hh_enabled, bool(settings.hh_client_id and settings.hh_client_secret)),
        "superjob": SuperJobProvider(settings.superjob_enabled, bool(settings.superjob_app_secret)),
    }


DEFAULT_ENABLED = {"trudvsem": settings.trudvsem_enabled, "hh": settings.hh_enabled, "superjob": settings.superjob_enabled}

_providers: dict[str, JobProvider] | None = None


def get_providers() -> dict[str, JobProvider]:
    global _providers
    if _providers is None:
        _providers = build_providers()
    return _providers
