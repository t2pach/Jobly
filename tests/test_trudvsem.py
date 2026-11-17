import asyncio

import httpx
import pytest

from app.integrations.base import ProviderError, SearchParams
from app.integrations.trudvsem import TrudvsemProvider

# Фикстура повторяет структуру ответа, описанную в документации API. Реальный ответ нужно сверить с WADL.
SAMPLE = {"status": "200", "meta": {"total": 1}, "results": {"vacancies": [{"vacancy": {
    "id": "abc-1", "region": {"region_code": "7700000000000", "name": "Город Москва"},
    "company": {"companycode": "1197746306383", "name": "ООО Ромашка"},
    "job-name": "Программист", "salary_min": 60000, "salary_max": 0, "employment": "Полная занятость",
    "schedule": "Удалённая работа", "duty": "Разработка сервисов", "requirement": {"experience": 1, "qualification": "Python"},
    "vac_url": "https://trudvsem.ru/vacancy/card/1197746306383/abc-1", "creation-date": "2025-09-05",
    "addresses": {"address": [{"location": "г Москва"}]}}}]}}


def provider(handler):
    return TrudvsemProvider("https://example.test/api/v1", transport=httpx.MockTransport(handler))


def run(c):
    return asyncio.run(c)


def test_normalize_and_request_params():
    seen = {}

    def handler(req):
        seen["url"] = str(req.url)
        return httpx.Response(200, json=SAMPLE)

    items = run(provider(handler).search_vacancies(SearchParams("python", region_code="7700000000000", experience_max=2)))
    assert "/vacancies/region/7700000000000" in seen["url"] and "text=python" in seen["url"] and "experienceTo=2" in seen["url"]
    v = items[0]
    assert v.external_id == "1197746306383/abc-1" and v.title == "Программист" and v.company == "ООО Ромашка"
    assert v.salary_from == 60000 and v.salary_to is None  # 0 = «не указано», а не нулевая зарплата
    assert v.work_format == "remote" and v.city == "г Москва" and v.published_at.year == 2025
    assert v.description == "Разработка сервисов\n\nPython"  # текст не перерабатывается


def test_unknown_format_stays_none():
    d = SAMPLE["results"]["vacancies"][0]["vacancy"] | {"schedule": "Полный рабочий день"}
    assert provider(lambda r: httpx.Response(200)).normalize_vacancy(d).work_format is None


def test_http_error_becomes_provider_error():
    with pytest.raises(ProviderError):
        run(provider(lambda r: httpx.Response(503)).search_vacancies(SearchParams()))
    with pytest.raises(ProviderError):
        run(provider(lambda r: httpx.Response(200, text="<html>")).search_vacancies(SearchParams()))


def test_health_and_get_vacancy():
    assert run(provider(lambda r: httpx.Response(200, json=SAMPLE)).health_check()).status == "ok"
    assert run(provider(lambda r: httpx.Response(500)).health_check()).status == "error"
    p = provider(lambda r: httpx.Response(200, json=SAMPLE))
    assert run(p.get_vacancy("1197746306383/abc-1")).title == "Программист"
    assert run(p.get_vacancy("bad-id")) is None
    assert not p.get_capabilities().apply_from_app
