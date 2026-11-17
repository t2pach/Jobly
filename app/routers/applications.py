from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models as m
from ..db import get_db
from ..deps import audit, current_user, profile_data
from ..schemas import ApplicationIn, ApplicationOut, ApplicationPatch, LetterIn, LetterOut
from ..services import letters
from ..services.matching import match

router = APIRouter(tags=["applications"])

# Намеренно нет ни одного эндпоинта автоматической отправки откликов (раздел 20 ТЗ).


@router.post("/cover-letters/generate", response_model=LetterOut)
def generate_letter(body: LetterIn, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    v = db.get(m.Vacancy, body.vacancy_id)
    if not v:
        raise HTTPException(404, "Вакансия не найдена")
    prof = profile_data(db, user)
    res = match(prof, v)
    skills = [x.split(": ", 1)[1] for x in res["matched_requirements"] if x.startswith(("Навык: ", "Упоминается в вакансии: "))]
    text, n = letters.generate(prof, v.title, v.company, skills, body.tone)
    row = m.CoverLetter(user_id=user.id, vacancy_id=v.id, tone=body.tone, text=text)
    db.add(row)
    db.commit()
    return LetterOut(id=row.id, text=text, placeholders_to_fill=n)


def _own(db: Session, user: m.User, aid: int) -> m.ApplicationTracker:
    a = db.query(m.ApplicationTracker).filter_by(id=aid, user_id=user.id).one_or_none()
    if not a:
        raise HTTPException(404, "Отклик не найден")
    return a


def _check_letter(db: Session, user: m.User, lid: int | None) -> None:
    if lid and not db.query(m.CoverLetter).filter_by(id=lid, user_id=user.id).first():
        raise HTTPException(404, "Письмо не найдено")


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(status: str | None = None, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(m.ApplicationTracker).filter_by(user_id=user.id)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(m.ApplicationTracker.updated_at.desc()).all()


@router.post("/applications", response_model=ApplicationOut, status_code=201)
def create_application(body: ApplicationIn, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump()
    if body.vacancy_id:
        v = db.get(m.Vacancy, body.vacancy_id)
        if not v:
            raise HTTPException(404, "Вакансия не найдена")
        data["title"] = data["title"] or v.title
        data["company"] = data["company"] or v.company
        data["source"] = data["source"] or v.source
        data["url"] = data["url"] or v.url
    if not data["title"]:
        raise HTTPException(422, "Укажите vacancy_id или title")
    _check_letter(db, user, body.cover_letter_id)
    if data["status"] == "sent" and not data["applied_at"]:
        data["applied_at"] = date.today()  # пользователь сам отметил отправку
    a = m.ApplicationTracker(user_id=user.id, **data)
    db.add(a)
    db.flush()
    db.add(m.ApplicationEvent(application_id=a.id, from_status=None, to_status=a.status))
    db.commit()
    audit(db, user.id, "application_create", id=a.id)
    return a


@router.patch("/applications/{aid}", response_model=ApplicationOut)
def update_application(aid: int, body: ApplicationPatch, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    a, data = _own(db, user, aid), body.model_dump(exclude_unset=True)
    _check_letter(db, user, data.get("cover_letter_id"))
    old = a.status
    for k, val in data.items():
        setattr(a, k, val)
    if a.status == "sent" and not a.applied_at:
        a.applied_at = date.today()
    if a.status != old:
        db.add(m.ApplicationEvent(application_id=a.id, from_status=old, to_status=a.status))
    db.commit()
    return a


@router.get("/applications/{aid}/events")
def application_events(aid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    _own(db, user, aid)
    return [{"from": e.from_status, "to": e.to_status, "at": e.created_at}
            for e in db.query(m.ApplicationEvent).filter_by(application_id=aid).order_by(m.ApplicationEvent.id)]


@router.delete("/applications/{aid}", status_code=204)
def delete_application(aid: int, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own(db, user, aid))
    db.commit()
