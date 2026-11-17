"""Адаптер «Работа России» (открытые данные Роструда).

Эндпоинты и параметры взяты из официального описания API портала (trudvsem.ru/opendata/api):
  GET /vacancies                              все вакансии
  GET /vacancies/region/{region_code}         вакансии региона
  GET /vacancies/vacancy/{companyCode}/{id}   одна вакансия
  параметры: text, offset, limit (до 100), experienceFrom, experienceTo, modifiedFrom, modifiedTo, industry, source

ВАЖНО: условие использования открытых данных — показывать их пользователю в неизменном виде,
поэтому описание и реквизиты не переписываются и не «улучшаются» (см. docs/LIMITATIONS.md).
Поля ответа читаются осторожно (.get), так как схему нужно сверять с WADL на живом ответе.
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx

from .base import (JobProvider, NormVacancy, ProviderCapabilities, ProviderError, ProviderHealth, SearchParams)


def _int(v) -> int | None:
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None  # 0 в источнике означает «не указано», а не нулевую зарплату


def _dt(v) -> datetime | None:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


class TrudvsemProvider(JobProvider):
    code = "trudvsem"
    title = "Работа России"

    def __init__(self, base_url: str, timeout: float = 8.0, transport: httpx.AsyncBaseTransport | None = None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout, transport=self._transport,
                                 headers={"User-Agent": "Jobly/1.0 (job aggregator)"})

    async def _get(self, path: str, params: dict | None = None) -> dict:
        try:
            async with self._client() as c:
                r = await c.get(f"{self.base_url}{path}", params=params)
            r.raise_for_status()
            return r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise ProviderError(f"trudvsem: {type(e).__name__}: {e}") from e

    @staticmethod
    def _items(data: dict) -> list[dict]:
        res = (data.get("results") or {}).get("vacancies") or []
        return [x.get("vacancy", x) for x in res if isinstance(x, dict)]

    async def search_vacancies(self, params: SearchParams) -> list[NormVacancy]:
        q: dict = {"offset": params.page, "limit": min(max(params.per_page, 1), 100)}
        if params.query:
            q["text"] = params.query
        if params.experience_max is not None:
            q["experienceTo"] = int(params.experience_max)
        path = f"/vacancies/region/{params.region_code}" if params.region_code else "/vacancies"
        data = await self._get(path, q)
        return [self.normalize_vacancy(v) for v in self._items(data)]

    async def get_vacancy(self, external_id: str) -> NormVacancy | None:
        company, _, vid = external_id.partition("/")
        if not (company and vid):
            return None
        items = self._items(await self._get(f"/vacancies/vacancy/{company}/{vid}"))
        return self.normalize_vacancy(items[0]) if items else None

    def normalize_vacancy(self, d: dict) -> NormVacancy:
        company = d.get("company") or {}
        req = d.get("requirement") or {}
        addrs = (d.get("addresses") or {}).get("address") or []
        city = (addrs[0].get("location") if addrs and isinstance(addrs[0], dict) else "") or ""
        schedule = str(d.get("schedule") or "")
        fmt = "remote" if "удал" in schedule.lower() else None  # офис/гибрид источник явно не сообщает
        exp = req.get("experience")
        try:
            exp_years = float(exp) if exp is not None else None
        except (TypeError, ValueError):
            exp_years = None
        duty = str(d.get("duty") or "").strip()
        reqs = str(req.get("qualification") or "").strip()
        return NormVacancy(
            source=self.code,
            external_id=f"{company.get('companycode', '')}/{d.get('id', '')}",
            title=str(d.get("job-name") or "").strip(),
            company=str(company.get("name") or "").strip(),
            city=city,
            region=str((d.get("region") or {}).get("name") or ""),
            work_format=fmt,
            salary_from=_int(d.get("salary_min")),
            salary_to=_int(d.get("salary_max")),
            experience_years_min=exp_years,
            employment=str(d.get("employment") or ""),
            schedule=schedule,
            description="\n\n".join(x for x in (duty, reqs) if x),
            url=str(d.get("vac_url") or ""),
            published_at=_dt(d.get("creation-date")),
        )

    async def health_check(self) -> ProviderHealth:
        try:
            data = await self._get("/vacancies", {"offset": 0, "limit": 1})
        except ProviderError as e:
            return ProviderHealth("error", str(e)[:300])
        return ProviderHealth("ok") if "results" in data else ProviderHealth("degraded", "Неожиданный формат ответа")

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(search=True, get_by_id=True,
                                    server_filters=["query", "region_code", "experience"])
