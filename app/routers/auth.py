from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..db import get_db
from ..deps import audit, current_user, profile_data, profile_row
from ..schemas import LoginIn, MeOut, RegisterIn, TokenOut
from ..security import hash_password, make_token, rate_limit, verify_password

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=TokenOut, status_code=201, dependencies=[Depends(rate_limit(10, 60))])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(m.User).where(m.User.email == email)):
        raise HTTPException(409, "Пользователь с таким email уже существует")
    user = m.User(email=email, password_hash=hash_password(body.password), is_admin=email in settings.admin_set())
    db.add(user)
    db.commit()
    profile_row(db, user)
    audit(db, user.id, "register")
    return TokenOut(access_token=make_token(user.id))


@router.post("/auth/login", response_model=TokenOut, dependencies=[Depends(rate_limit(10, 60))])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(m.User).where(m.User.email == body.email.lower()))
    if not user or user.is_blocked or not verify_password(body.password, user.password_hash):
        audit(db, user.id if user else None, "login_failed")
        raise HTTPException(401, "Неверный email или пароль")  # одно сообщение, чтобы не раскрывать наличие аккаунта
    audit(db, user.id, "login")
    return TokenOut(access_token=make_token(user.id))


@router.get("/me", response_model=MeOut)
def me(user: m.User = Depends(current_user)):
    return user


@router.get("/me/export")
def export_data(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    """Экспорт всех данных пользователя (раздел 22 ТЗ)."""
    def rows(model, **flt):
        return [{c.name: str(getattr(r, c.name)) for c in model.__table__.columns}
                for r in db.scalars(select(model).filter_by(**flt))]
    prof = profile_row(db, user)
    return {"user": {"email": user.email, "created_at": str(user.created_at)},
            "profile": profile_data(db, user).__dict__ | {"about": prof.about},
            "applications": rows(m.ApplicationTracker, user_id=user.id),
            "saved_vacancies": rows(m.SavedVacancy, user_id=user.id),
            "cover_letters": rows(m.CoverLetter, user_id=user.id),
            "career_goals": rows(m.CareerGoal, user_id=user.id)}


@router.delete("/me", status_code=204)
def delete_account(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    """Полное удаление аккаунта и данных. Журнал действий обезличивается."""
    db.execute(delete(m.AuditLog).where(m.AuditLog.user_id == user.id))
    db.delete(user)  # остальное удаляется каскадом (ON DELETE CASCADE)
    db.commit()
    audit(db, None, "account_deleted")
