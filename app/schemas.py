from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

STATUSES = ["plan", "prep", "sent", "seen", "inv", "int", "rej", "offer", "hired", "closed"]
Status = Literal["plan", "prep", "sent", "seen", "inv", "int", "rej", "offer", "hired", "closed"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    is_admin: bool


class ExperienceIn(BaseModel):
    company: str = Field(max_length=200)
    position: str = Field(max_length=200)
    start: str = ""
    end: str = ""
    description: str = ""
    achievements: list[str] = []


class EducationIn(BaseModel):
    institution: str = Field(max_length=200)
    specialty: str = ""
    year: int | None = None


class ProfilePatch(BaseModel):
    full_name: str | None = Field(None, max_length=200)
    city: str | None = Field(None, max_length=120)
    goal: str | None = Field(None, max_length=200)
    years: float | None = Field(None, ge=0, le=60)
    salary_expectation: int | None = Field(None, ge=0)
    work_format: Literal["any", "remote", "hybrid", "office"] | None = None
    about: str | None = None
    weights: dict[str, float] | None = None
    skills: list[str] | None = None
    experience: list[ExperienceIn] | None = None
    education: list[EducationIn] | None = None


class VacancyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: str
    also_on: list[str] = []
    title: str
    company: str
    city: str
    region: str
    work_format: str | None
    salary_from: int | None
    salary_to: int | None
    currency: str
    salary_gross: bool | None
    experience_years_min: float | None
    employment: str
    schedule: str
    description: str
    skills: list[str]
    url: str
    published_at: datetime | None
    match_score: int | None = None
    match_confidence: str | None = None
    saved: bool = False


class LetterIn(BaseModel):
    vacancy_id: int
    tone: Literal["short", "standard", "bold"] = "standard"


class LetterOut(BaseModel):
    id: int
    text: str
    placeholders_to_fill: int


class ApplicationIn(BaseModel):
    vacancy_id: int | None = None
    title: str | None = Field(None, max_length=300)
    company: str = ""
    source: str = ""
    url: str = ""
    status: Status = "plan"
    applied_at: date | None = None
    cover_letter_id: int | None = None
    note: str = ""
    next_action: str = ""
    remind_at: date | None = None


class ApplicationPatch(BaseModel):
    status: Status | None = None
    applied_at: date | None = None
    note: str | None = None
    next_action: str | None = None
    remind_at: date | None = None
    cover_letter_id: int | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vacancy_id: int | None
    title: str
    company: str
    source: str
    url: str
    status: str
    applied_at: date | None
    note: str
    next_action: str
    remind_at: date | None
    cover_letter_id: int | None


class GoalIn(BaseModel):
    title: str = Field(max_length=300)
    description: str = ""
    target_salary: int | None = Field(None, ge=0)


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    target_salary: int | None
    status: str


class SourceToggle(BaseModel):
    enabled: bool


class BlockIn(BaseModel):
    is_blocked: bool
