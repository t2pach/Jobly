from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models as m
from ..db import get_db
from ..deps import current_user, profile_row
from ..schemas import GoalIn, GoalOut
from ..services.dedupe import merge_duplicates
from ..services.market import market_stats

router = APIRouter(tags=["career"])


@router.get("/career-goals", response_model=list[GoalOut])
def goals(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(m.CareerGoal).filter_by(user_id=user.id).order_by(m.CareerGoal.id).all()


@router.post("/career-goals", response_model=GoalOut, status_code=201)
def create_goal(body: GoalIn, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    g = m.CareerGoal(user_id=user.id, **body.model_dump())
    db.add(g)
    db.commit()
    return g


@router.get("/analytics/market")
def market(query: str = Query("", max_length=200), region: str | None = None,
           user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    """Считается по уже полученным и сохранённым вакансиям, внешние источники не опрашиваются."""
    q = db.query(m.Vacancy)
    if query:
        q = q.filter(m.Vacancy.title.ilike(f"%{query}%"))
    if region:
        q = q.filter(m.Vacancy.region.ilike(f"%{region}%"))
    unique = [v for v, _ in merge_duplicates(q.order_by(m.Vacancy.id).limit(5000).all())]  # дубли не должны искажать статистику
    return market_stats(unique, profile_row(db, user).salary_expectation)
