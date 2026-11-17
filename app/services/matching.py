"""Объяснимая оценка совместимости (раздел 6 ТЗ). Детерминированная, без LLM.

Критерии без данных не считаются несовпадением: они исключаются из расчёта и снижают уверенность.
Формат результата соответствует разделу 21.2 ТЗ.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

DEFAULT_WEIGHTS = {"skills": 35, "exp": 20, "title": 15, "salary": 10, "fmt": 10, "edu": 10}
LABELS = {"skills": "Навыки", "exp": "Опыт работы", "title": "Должность",
          "salary": "Зарплата", "fmt": "Формат и место", "edu": "Образование"}


@dataclass
class ProfileData:
    goal: str = ""
    city: str = ""
    years: float = 0
    salary: int | None = None
    work_format: str = "any"
    skills: list[str] = field(default_factory=list)
    weights: dict = field(default_factory=dict)
    full_name: str = ""


def _mentioned(skill: str, text: str) -> bool:
    return re.search(rf"(?<!\w){re.escape(skill)}(?!\w)", text, re.I) is not None


def match(p: ProfileData, v) -> dict:
    """v: объект с атрибутами Vacancy (ORM или NormVacancy)."""
    w = {**DEFAULT_WEIGHTS, **{k: float(x) for k, x in (p.weights or {}).items() if k in DEFAULT_WEIGHTS}}
    pskills = {s.lower(): s for s in p.skills}
    text = f"{v.title}\n{v.description}"
    matched, missing, uncertain, risks, recs = [], [], [], [], []

    # навыки
    if v.skills:
        vs = {s.lower(): s for s in v.skills}
        has = [vs[k] for k in vs if k in pskills]
        miss = [vs[k] for k in vs if k not in pskills]
        s_skills: float | None = len(has) / len(vs)
        matched += [f"Навык: {x}" for x in has]
        missing += [f"Навык: {x}" for x in miss]
    else:
        s_skills = None
        found = [orig for k, orig in pskills.items() if _mentioned(orig, text)]
        matched += [f"Упоминается в вакансии: {x}" for x in found]
        uncertain.append("Навыки: требования в вакансии не структурированы, полный список не проверен")

    # опыт
    if v.experience_years_min is None:
        s_exp = None
        uncertain.append("Опыт: требование не указано")
    else:
        s_exp = 1.0 if p.years >= v.experience_years_min else max(0.0, p.years / v.experience_years_min)
        (matched if s_exp == 1 else risks).append(
            f"Опыт: требуется от {v.experience_years_min:g} лет, у вас {p.years:g}")

    # должность
    gt = [t for t in re.findall(r"\w+", p.goal.lower()) if len(t) > 2]
    tl = v.title.lower()
    s_title = (sum(1 for t in gt if t[:5] in tl) / len(gt)) if gt else None
    if s_title is None:
        uncertain.append("Должность: не задана карьерная цель")

    # зарплата
    top = v.salary_to or v.salary_from
    if top and p.salary:
        s_sal: float | None = 1.0 if p.salary <= top else top / p.salary
        if s_sal < 1:
            risks.append(f"Зарплата в вакансии (до {top:,} ₽) ниже вашего ориентира ({p.salary:,} ₽)".replace(",", " "))
    else:
        s_sal = None
        uncertain.append("Зарплата: " + ("не указана в вакансии" if not top else "не задан ваш ориентир"))

    # формат и место
    subs = []
    if v.work_format is not None:
        subs.append(1.0 if p.work_format in ("any", v.work_format) else 0.3)
    if v.work_format == "remote":
        subs.append(1.0)
    elif v.city and p.city:
        a, b = p.city.lower(), v.city.lower()
        subs.append(1.0 if (a in b or b in a) else 0.3)
    s_fmt = sum(subs) / len(subs) if subs else None
    if s_fmt is None:
        uncertain.append("Формат и место: недостаточно данных")

    uncertain.append("Образование и дополнительные требования: нет данных в вакансии")
    scores = {"skills": s_skills, "exp": s_exp, "title": s_title, "salary": s_sal, "fmt": s_fmt, "edu": None}
    known = {k: s for k, s in scores.items() if s is not None and w[k] > 0}
    tw, total = sum(w[k] for k in known), sum(w.values()) or 1
    score = round(sum(w[k] * s for k, s in known.items()) / tw * 100) if tw else 0
    share = tw / total
    confidence = "high" if share >= 0.85 else "medium" if share >= 0.6 else "low"

    if score >= 75:
        recs.append("Вакансия подходит: подготовьте резюме с акцентом на совпавшие навыки.")
    elif score >= 50:
        recs.append("Вакансия подходит частично: проверьте риски и недостающие требования.")
    else:
        recs.append("Совпадение слабое: рассмотрите, только если вас привлекают условия.")
    if missing:
        recs.append("Если недостающие навыки у вас есть, добавьте их в профиль; если нет, честно отметьте это.")
    if confidence == "low":
        recs.append("Оценка приблизительная: в вакансии мало данных для сравнения.")

    return {
        "score": score, "confidence": confidence,
        "matched_requirements": matched, "missing_requirements": missing,
        "uncertain_requirements": uncertain, "risks": risks, "recommendations": recs,
        "breakdown": [{"key": k, "label": LABELS[k], "weight": w[k],
                       "value": None if s is None else round(s, 3)} for k, s in scores.items()],
    }
