"""hh.ru и SuperJob: адаптеры не реализованы, пока не подтверждены права доступа (раздел 2.1 ТЗ).
Они честно сообщают своё состояние вместо демонстрационных данных (раздел 26 ТЗ)."""
from __future__ import annotations

from .base import (JobProvider, NormVacancy, ProviderCapabilities, ProviderHealth, ProviderUnavailable, SearchParams)


class _Pending(JobProvider):
    reason = ""

    def __init__(self, enabled: bool, configured: bool):
        self.enabled, self.configured = enabled, configured

    async def search_vacancies(self, params: SearchParams) -> list[NormVacancy]:
        raise ProviderUnavailable(f"{self.title}: {self.reason}")

    async def get_vacancy(self, external_id: str) -> NormVacancy | None:
        raise ProviderUnavailable(f"{self.title}: {self.reason}")

    def normalize_vacancy(self, data: dict) -> NormVacancy:
        raise ProviderUnavailable(f"{self.title}: {self.reason}")

    async def health_check(self) -> ProviderHealth:
        if not self.configured:
            return ProviderHealth("not_configured", "Не заданы ключи доступа")
        return ProviderHealth("degraded", self.reason)

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(search=False, get_by_id=False, server_filters=[])


class HHProvider(_Pending):
    code, title = "hh", "hh.ru"
    reason = "адаптер не реализован: нужны регистрация приложения на dev.hh.ru и проверка условий API"


class SuperJobProvider(_Pending):
    code, title = "superjob", "SuperJob"
    reason = "адаптер не реализован: нужны ключ приложения и проверка условий API"
