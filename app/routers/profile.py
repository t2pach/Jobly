from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models as m
from ..db import get_db
from ..deps import audit, current_user, profile_data, profile_row
from ..schemas import ProfilePatch

router = APIRouter(tags=["profile"])


def _out(db: Session, user: m.User) -> dict:
    p, d = profile_row(db, user), profile_data(db, user)
    return {"full_name": p.full_name, "city": p.city, "goal": p.goal, "years": p.years,
            "salary_expectation": p.salary_expectation, "work_format": p.work_format, "about": p.about,
            "weights": p.weights, "skills": d.skills,
            "experience": [{"company": e.company, "position": e.position, "start": e.start, "end": e.end,
                            "description": e.description, "achievements": e.achievements}
                           for e in db.query(m.Experience).filter_by(profile_id=p.id)],
            "education": [{"institution": e.institution, "specialty": e.specialty, "year": e.year}
                          for e in db.query(m.Education).filter_by(profile_id=p.id)]}


@router.get("/profile")
def get_profile(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return _out(db, user)


@router.patch("/profile")
def patch_profile(body: ProfilePatch, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    p = profile_row(db, user)
    data = body.model_dump(exclude_unset=True)
    for f in ("full_name", "city", "goal", "years", "salary_expectation", "work_format", "about", "weights"):
        if f in data:
            setattr(p, f, data[f])
    if "skills" in data:
        db.query(m.ProfileSkill).filter_by(profile_id=p.id).delete()
        for name in dict.fromkeys(s.strip() for s in data["skills"] if s.strip()):
            norm = name.lower()
            sk = db.query(m.Skill).filter_by(normalized=norm).one_or_none()
            if sk is None:
                sk = m.Skill(name=name, normalized=norm)
                db.add(sk)
                db.flush()
            db.add(m.ProfileSkill(profile_id=p.id, skill_id=sk.id, confirmed=True))
    if "experience" in data:
        db.query(m.Experience).filter_by(profile_id=p.id).delete()
        db.add_all(m.Experience(profile_id=p.id, **e) for e in data["experience"])
    if "education" in data:
        db.query(m.Education).filter_by(profile_id=p.id).delete()
        db.add_all(m.Education(profile_id=p.id, **e) for e in data["education"])
    db.commit()
    audit(db, user.id, "profile_update", fields=sorted(data))
    return _out(db, user)
