import asyncio
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..db import get_db
from ..deps import admin_user, audit, current_user
from ..integrations.base import ProviderHealth
from ..integrations.registry import get_providers
from ..schemas import BlockIn, SourceToggle
from ..services.search import ensure_sources

router = APIRouter(tags=["integrations"])


async def _health(p) -> ProviderHealth:
    try:
        return await asyncio.wait_for(p.health_check(), settings.provider_timeout_s + 2)
    except Exception as e:
        return ProviderHealth("error", f"{type(e).__name__}")


@router.get("/integrations")
async def integrations(user: m.User = Depends(current_user), db: Session = Depends(get_db), providers=Depends(get_providers)):
    rows = ensure_sources(db, providers)
    health = await asyncio.gather(*(_health(p) for p in providers.values()))
    return [{"code": c, "title": p.title, "enabled": rows[c].enabled,
             "capabilities": asdict(p.get_capabilities()), "health": asdict(h)}
            for (c, p), h in zip(providers.items(), health)]


@router.get("/admin/sources")
def admin_sources(_: m.User = Depends(admin_user), db: Session = Depends(get_db), providers=Depends(get_providers)):
    return [{"code": r.code, "title": r.title, "enabled": r.enabled, "last_sync_at": r.last_sync_at,
             "last_status": r.last_status, "last_error": r.last_error} for r in ensure_sources(db, providers).values()]


@router.patch("/admin/sources/{code}")
def admin_toggle(code: str, body: SourceToggle, admin: m.User = Depends(admin_user), db: Session = Depends(get_db),
                 providers=Depends(get_providers)):
    row = ensure_sources(db, providers).get(code)
    if not row:
        raise HTTPException(404, "Источник не найден")
    row.enabled = body.enabled
    db.commit()
    audit(db, admin.id, "source_toggle", code=code, enabled=body.enabled)
    return {"code": code, "enabled": row.enabled}


@router.get("/admin/users")
def admin_users(_: m.User = Depends(admin_user), db: Session = Depends(get_db)):
    """Только учётные данные. Резюме и личные документы администратору недоступны (раздел 17 ТЗ)."""
    return [{"id": u.id, "email": u.email, "is_admin": u.is_admin, "is_blocked": u.is_blocked,
             "created_at": u.created_at} for u in db.query(m.User).order_by(m.User.id)]


@router.patch("/admin/users/{uid}/block")
def admin_block(uid: int, body: BlockIn, admin: m.User = Depends(admin_user), db: Session = Depends(get_db)):
    u = db.get(m.User, uid)
    if not u or u.id == admin.id:
        raise HTTPException(404 if not u else 400, "Пользователь не найден" if not u else "Нельзя заблокировать себя")
    u.is_blocked = body.is_blocked
    db.commit()
    audit(db, admin.id, "user_block", target=uid, blocked=body.is_blocked)
    return {"id": uid, "is_blocked": u.is_blocked}
