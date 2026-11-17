from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import AuditLog, CandidateProfile, ProfileSkill, Skill, User
from .security import decode_token
from .services.matching import ProfileData

bearer = HTTPBearer(auto_error=False)


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    uid = decode_token(cred.credentials) if cred else None
    user = db.get(User, uid) if uid else None
    if not user or user.is_blocked:
        raise HTTPException(401, "Требуется авторизация")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Недостаточно прав")
    return user


def audit(db: Session, user_id: int | None, action: str, **details) -> None:
    db.add(AuditLog(user_id=user_id, action=action, details=details))
    db.commit()


def profile_row(db: Session, user: User) -> CandidateProfile:
    p = db.query(CandidateProfile).filter_by(user_id=user.id).one_or_none()
    if p is None:
        p = CandidateProfile(user_id=user.id, weights={})
        db.add(p)
        db.commit()
    return p


def profile_data(db: Session, user: User) -> ProfileData:
    p = profile_row(db, user)
    names = [n for (n,) in db.query(Skill.name).join(ProfileSkill, ProfileSkill.skill_id == Skill.id)
             .filter(ProfileSkill.profile_id == p.id, ProfileSkill.confirmed.is_(True))]
    return ProfileData(goal=p.goal, city=p.city, years=p.years, salary=p.salary_expectation,
                       work_format=p.work_format, skills=names, weights=p.weights or {}, full_name=p.full_name)
