"""Параллельный поиск по источникам: ошибка одного не ломает остальные (раздел 2.1 ТЗ)."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..integrations.base import JobProvider, NormVacancy, ProviderError, ProviderUnavailable, SearchParams
from ..integrations.registry import DEFAULT_ENABLED
from ..models import Vacancy, VacancySource
from .dedupe import dedupe_key

log = logging.getLogger("jobly.search")


def ensure_sources(db: Session, providers: dict[str, JobProvider]) -> dict[str, VacancySource]:
    rows = {r.code: r for r in db.scalars(select(VacancySource))}
    for code, p in providers.items():
        if code not in rows:
            rows[code] = VacancySource(code=code, title=p.title, enabled=DEFAULT_ENABLED.get(code, False))
            db.add(rows[code])
    db.commit()
    return rows


async def search_sources(providers: dict[str, JobProvider], codes: list[str], params: SearchParams):
    async def one(code: str):
        p = providers[code]
        try:
            items = await asyncio.wait_for(p.search_vacancies(params), settings.provider_timeout_s + 2)
            return code, items, {"status": "ok", "count": len(items)}
        except ProviderUnavailable as e:
            return code, [], {"status": "unavailable", "detail": str(e)}
        except asyncio.TimeoutError:
            return code, [], {"status": "error", "detail": "Таймаут источника"}
        except ProviderError as e:
            return code, [], {"status": "error", "detail": str(e)[:300]}
        except Exception as e:  # граница изоляции: сбой адаптера не должен ронять запрос
            log.exception("provider %s crashed", code)
            return code, [], {"status": "error", "detail": f"Внутренняя ошибка адаптера: {type(e).__name__}"}

    results = await asyncio.gather(*(one(c) for c in codes))
    return [i for _, items, _ in results for i in items], {c: s for c, _, s in results}


def upsert_vacancies(db: Session, items: list[NormVacancy]) -> list[Vacancy]:
    out = []
    now = datetime.now(timezone.utc)
    for n in items:
        if not n.external_id or not n.title:
            continue
        row = db.scalar(select(Vacancy).where(Vacancy.source == n.source, Vacancy.external_id == n.external_id))
        if row is None:
            row = Vacancy(source=n.source, external_id=n.external_id)
            db.add(row)
        for f in ("title", "company", "city", "region", "work_format", "salary_from", "salary_to", "currency",
                  "salary_gross", "experience_years_min", "employment", "schedule", "description", "skills",
                  "url", "published_at"):
            setattr(row, f, getattr(n, f))
        row.fetched_at, row.dedupe_key = now, dedupe_key(n.title, n.company)
        out.append(row)
    db.commit()
    return out


def mark_source(db: Session, code: str, status: dict) -> None:
    src = db.scalar(select(VacancySource).where(VacancySource.code == code))
    if src:
        src.last_sync_at = datetime.now(timezone.utc)
        src.last_status = status["status"]
        src.last_error = status.get("detail", "")[:500]
    db.commit()
