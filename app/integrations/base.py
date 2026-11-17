"""Общий контракт адаптеров (раздел 18.1 ТЗ). Адаптер заявляет только реальные возможности платформы."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone


class ProviderError(Exception):
    """Источник вернул ошибку или недоступен. Не должен ломать остальные источники."""


class ProviderUnavailable(ProviderError):
    """Источник не настроен или доступ к нему не получен."""


@dataclass
class SearchParams:
    query: str = ""
    region_code: str | None = None      # для «Работы России»: код региона
    experience_max: float | None = None
    page: int = 0
    per_page: int = 20


@dataclass
class NormVacancy:
    source: str
    external_id: str
    title: str
    company: str = ""
    city: str = ""
    region: str = ""
    work_format: str | None = None      # remote|hybrid|office; None, если источник не сообщает
    salary_from: int | None = None
    salary_to: int | None = None
    currency: str = "RUB"
    salary_gross: bool | None = None
    experience_years_min: float | None = None
    employment: str = ""
    schedule: str = ""
    description: str = ""
    skills: list[str] = field(default_factory=list)
    url: str = ""
    published_at: datetime | None = None


@dataclass
class ProviderCapabilities:
    search: bool
    get_by_id: bool
    server_filters: list[str]            # какие фильтры источник применяет сам
    apply_from_app: bool = False         # всегда False: автоотклики запрещены ТЗ
    commercial_use_verified: bool = False  # право коммерческого использования надо подтверждать отдельно


@dataclass
class ProviderHealth:
    status: str                          # ok | degraded | not_configured | error
    detail: str = ""
    checked_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class JobProvider(ABC):
    code: str
    title: str

    @abstractmethod
    async def search_vacancies(self, params: SearchParams) -> list[NormVacancy]: ...

    @abstractmethod
    async def get_vacancy(self, external_id: str) -> NormVacancy | None: ...

    @abstractmethod
    def normalize_vacancy(self, data: dict) -> NormVacancy: ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth: ...

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities: ...
