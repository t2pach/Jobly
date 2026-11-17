"""22 сущностей из раздела 19 ТЗ. Все пользовательские таблицы связаны с User для изоляции данных."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def fk(table: str, nullable: bool = False, index: bool = True):
    return mapped_column(Integer, ForeignKey(f"{table}.id", ondelete="CASCADE"), nullable=nullable, index=index)


class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CandidateProfile(Base):
    __tablename__ = "candidate_profile"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True)
    full_name: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    goal: Mapped[str] = mapped_column(String(200), default="")
    years: Mapped[float] = mapped_column(Float, default=0)
    salary_expectation: Mapped[int | None] = mapped_column(Integer, nullable=True)
    work_format: Mapped[str] = mapped_column(String(10), default="any")  # any|remote|hybrid|office
    about: Mapped[str] = mapped_column(Text, default="")
    weights: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Experience(Base):
    __tablename__ = "experience"
    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = fk("candidate_profile")
    company: Mapped[str] = mapped_column(String(200))
    position: Mapped[str] = mapped_column(String(200))
    start: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM
    end: Mapped[str] = mapped_column(String(10), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    achievements: Mapped[list] = mapped_column(JSON, default=list)


class Education(Base):
    __tablename__ = "education"
    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = fk("candidate_profile")
    institution: Mapped[str] = mapped_column(String(200))
    specialty: Mapped[str] = mapped_column(String(200), default="")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Skill(Base):
    __tablename__ = "skill"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    normalized: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class ProfileSkill(Base):
    __tablename__ = "profile_skill"
    __table_args__ = (UniqueConstraint("profile_id", "skill_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = fk("candidate_profile")
    skill_id: Mapped[int] = fk("skill")
    confirmed: Mapped[bool] = mapped_column(Boolean, default=True)  # неподтверждённое не считается фактом


class ResumeDocument(Base):
    __tablename__ = "resume_document"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(255))
    mime: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer, default=0)
    parsed: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Vacancy(Base):
    __tablename__ = "vacancy"
    __table_args__ = (UniqueConstraint("source", "external_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(30), index=True)
    external_id: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[str] = mapped_column(String(300), default="")
    city: Mapped[str] = mapped_column(String(200), default="")
    region: Mapped[str] = mapped_column(String(200), default="")
    work_format: Mapped[str | None] = mapped_column(String(10), nullable=True)  # None = неизвестно
    salary_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(5), default="RUB")
    salary_gross: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    experience_years_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    employment: Mapped[str] = mapped_column(String(100), default="")
    schedule: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")  # хранится как получено, без изменений
    skills: Mapped[list] = mapped_column(JSON, default=list)
    url: Mapped[str] = mapped_column(String(600), default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    dedupe_key: Mapped[str] = mapped_column(String(400), index=True, default="")


class VacancySource(Base):
    __tablename__ = "vacancy_source"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    title: Mapped[str] = mapped_column(String(100))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str] = mapped_column(String(20), default="unknown")
    last_error: Mapped[str] = mapped_column(String(500), default="")


class ProviderAccount(Base):
    __tablename__ = "provider_account"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    provider: Mapped[str] = mapped_column(String(30))
    token_encrypted: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="connected")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ResumeVersion(Base):
    __tablename__ = "resume_version"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("resume_document.id", ondelete="SET NULL"), nullable=True)
    vacancy_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("vacancy.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), default="main")  # original|main|vacancy
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VacancyMatch(Base):
    __tablename__ = "vacancy_match"
    __table_args__ = (UniqueConstraint("user_id", "vacancy_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    vacancy_id: Mapped[int] = fk("vacancy")
    score: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[str] = mapped_column(String(10))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SavedVacancy(Base):
    __tablename__ = "saved_vacancy"
    __table_args__ = (UniqueConstraint("user_id", "vacancy_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    vacancy_id: Mapped[int] = fk("vacancy")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CoverLetter(Base):
    __tablename__ = "cover_letter"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    vacancy_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("vacancy.id", ondelete="SET NULL"), nullable=True)
    tone: Mapped[str] = mapped_column(String(10))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ApplicationTracker(Base):
    """Ручной трекер. Факт отклика подтверждает только пользователь."""
    __tablename__ = "application_tracker"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    vacancy_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("vacancy.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[str] = mapped_column(String(300), default="")
    source: Mapped[str] = mapped_column(String(30), default="")
    url: Mapped[str] = mapped_column(String(600), default="")
    status: Mapped[str] = mapped_column(String(10), default="plan")
    applied_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    resume_version_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("resume_version.id", ondelete="SET NULL"), nullable=True)
    cover_letter_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("cover_letter.id", ondelete="SET NULL"), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    next_action: Mapped[str] = mapped_column(String(300), default="")
    remind_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ApplicationEvent(Base):
    __tablename__ = "application_event"
    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = fk("application_tracker")
    from_status: Mapped[str | None] = mapped_column(String(10), nullable=True)
    to_status: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CareerGoal(Base):
    __tablename__ = "career_goal"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    target_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RoadmapItem(Base):
    __tablename__ = "roadmap_item"
    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = fk("career_goal")
    title: Mapped[str] = mapped_column(String(300))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)


class AIConversation(Base):
    __tablename__ = "ai_conversation"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    title: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AIMessage(Base):
    __tablename__ = "ai_message"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = fk("ai_conversation")
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notification"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = fk("user")
    kind: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(60))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
