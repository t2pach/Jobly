from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models as m
from ..db import get_db
from ..deps import current_user, profile_data
from ..integrations.base import SearchParams
from ..integrations.registry import get_providers
from ..schemas import VacancyOut
from ..services.dedupe import merge_duplicates
from ..services.matching import match
from ..services.search import ensure_sources, mark_source, search_sources, upsert_vacancies

router = APIRouter(tags=["vacancies"])
_MIN = datetime.min.replace(tzinfo=timezone.utc)


def _top(v) -> int:
    return v.salary_to or v.salary_from or 0


def _out(v: m.Vacancy, also_on=(), res: dict | None = None, saved=False) -> VacancyOut:
    o = VacancyOut.model_validate(v)
    o.also_on, o.saved = list(also_on), saved
    if res:
        o.match_score, o.match_confidence = res["score"], res["confidence"]
    return o


def _saved_ids(db: Session, user: m.User) -> set[int]:
    return {i for (i,) in db.query(m.SavedVacancy.vacancy_id).filter_by(user_id=user.id)}


@router.get("/vacancies")
async def search_vacancies(
    query: str = Query("", max_length=200), region_code: str | None = Query(None, max_length=20),
    experience_max: float | None = Query(None, ge=0), salary_from: int | None = Query(None, ge=0),
    city: str | None = None, work_format: Literal["remote", "hybrid", "office"] | None = None,
    source: str | None = None, sort: Literal["match", "salary", "date"] = "match",
    page: int = Query(0, ge=0), per_page: int = Query(20, ge=1, le=100),
    user: m.User = Depends(current_user), db: Session = Depends(get_db), providers=Depends(get_providers),
):
    rows = ensure_sources(db, providers)
    codes = [c for c, r in rows.items() if r.enabled and (not source or c == source)]
    items, statuses = await search_sources(
        providers, codes, SearchParams(query, region_code, experience_max, page, per_page))
    for code, st in statuses.items():
        mark_source(db, code, st)

    def keep(v) -> bool:
        if salary_from and (v.salary_to or v.salary_from or 0) < salary_from:
            return False  # вакансии без зарплаты при таком фильтре скрываются, нулём не подменяются
        if city and v.work_format != "remote" and city.lower() not in v.city.lower():
            return False
        return not work_format or v.work_format == work_format

    stored = upsert_vacancies(db, [v for v in items if keep(v)])
    prof, saved = profile_data(db, user), _saved_ids(db, user)
    scored = [(v, also, match(prof, v)) for v, also in merge_duplicates(stored)]
    key = {"match": lambda t: -t[2]["score"], "salary": lambda t: -_top(t[0]),
           "date": lambda t: -(t[0].published_at or _MIN).timestamp()}[sort]
    scored.sort(key=key)
    return {"items": [_out(v, also, res, v.id in saved) for v, also, res in scored],
            "sources": statuses, "page": page,
            "note": "Данные показываются как получены от источников. Отклик отправляется на сайте источника."}


@router.get("/saved-vacancies", response_model=list[VacancyOut])
def saved(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    vs = db.query(m.Vacancy).join(m.SavedVacancy, m.SavedVacancy.vacancy_id == m.Vacancy.id) \
        .filter(m.SavedVacancy.user_id == user.id).all()
    return [_out(v, saved=True) for v in vs]


def _vacancy(db: Session, vid: int) -> m.Vacancy:
    v = db.get(m.Vacancy, vid)
    if not v:
        raise HTTPException(404, "Вакансия не найдена. Сначала найдите её через поиск")
    return v


@router.get("/vacancies/{vid}", response_model=VacancyOut)
def get_vacancy(vid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    v = _vacancy(db, vid)
    return _out(v, res=match(profile_data(db, user), v), saved=vid in _saved_ids(db, user))


@router.post("/vacancies/{vid}/match")
def match_vacancy(vid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    v = _vacancy(db, vid)
    res = match(profile_data(db, user), v)
    row = db.query(m.VacancyMatch).filter_by(user_id=user.id, vacancy_id=vid).one_or_none()
    if row is None:
        row = m.VacancyMatch(user_id=user.id, vacancy_id=vid)
        db.add(row)
    row.score, row.confidence, row.payload = res["score"], res["confidence"], res
    db.commit()
    return {"vacancy_id": vid, **res}


@router.post("/vacancies/{vid}/save", status_code=204)
def save_vacancy(vid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    _vacancy(db, vid)
    if not db.query(m.SavedVacancy).filter_by(user_id=user.id, vacancy_id=vid).first():
        db.add(m.SavedVacancy(user_id=user.id, vacancy_id=vid))
        db.commit()


@router.delete("/vacancies/{vid}/save", status_code=204)
def unsave_vacancy(vid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    db.query(m.SavedVacancy).filter_by(user_id=user.id, vacancy_id=vid).delete()
    db.commit()
