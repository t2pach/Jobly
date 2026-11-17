"""Аналитика по кэшу вакансий (раздел 11 ТЗ). Всегда показывает размер выборки и период."""
from __future__ import annotations

from collections import Counter
from statistics import median


def _mid(v) -> float | None:
    if v.currency != "RUB":
        return None
    if v.salary_from and v.salary_to:
        return (v.salary_from + v.salary_to) / 2
    return v.salary_to or v.salary_from  # None, если зарплата не указана: нулём не подменяем


def market_stats(vacs: list, expectation: int | None = None) -> dict:
    n = len(vacs)
    mids = [m for m in (_mid(v) for v in vacs) if m]
    dates = [v.published_at or v.fetched_at for v in vacs if (v.published_at or v.fetched_at)]
    skills = Counter(s for v in vacs for s in (v.skills or []))
    gross = {v.salary_gross for v in vacs if _mid(v)}
    notes = []
    if n < 30:
        notes.append("Выборка мала и не репрезентативна: используйте цифры как ориентир.")
    if gross == {None} or None in gross:
        notes.append("Не у всех вакансий известно, указана ли зарплата до или после налогов.")
    if skills == Counter():
        notes.append("Источники не дают структурированных навыков, рейтинг навыков недоступен.")
    res = {
        "sample_size": n, "with_salary": len(mids),
        "salary": {"median": median(mids) if mids else None, "min": min(mids) if mids else None,
                   "max": max(mids) if mids else None, "basis": "середина указанной вилки, RUB"},
        "formats": dict(Counter(v.work_format or "unknown" for v in vacs)),
        "top_skills": skills.most_common(10),
        "period": {"from": min(dates).isoformat() if dates else None, "to": max(dates).isoformat() if dates else None},
        "notes": notes,
    }
    if expectation and mids:
        res["vs_expectation"] = {"expectation": expectation, "median": res["salary"]["median"],
                                 "above_median": expectation > res["salary"]["median"]}
    return res
