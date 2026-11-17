from types import SimpleNamespace as NS

from app.services.matching import ProfileData, match


def vac(**kw):
    base = dict(title="Junior Python Developer", description="", skills=["Python", "SQL", "Docker"],
                experience_years_min=1, salary_from=90000, salary_to=130000, work_format="remote", city="Москва")
    return NS(**{**base, **kw})


P = ProfileData(goal="Junior Python Developer", city="Москва", years=1, salary=90000,
                work_format="any", skills=["Python", "SQL", "Git"])


def test_structure_and_explanation():
    r = match(P, vac())
    assert set(r) >= {"score", "confidence", "matched_requirements", "missing_requirements",
                      "uncertain_requirements", "risks", "recommendations", "breakdown"}
    assert "Навык: Python" in r["matched_requirements"] and "Навык: Docker" in r["missing_requirements"]
    assert 0 <= r["score"] <= 100


def test_unknown_criteria_are_not_mismatches():
    full = match(P, vac())
    sparse = match(P, vac(experience_years_min=None, salary_from=None, salary_to=None, work_format=None, city=""))
    assert sparse["confidence"] == "low" and full["confidence"] in ("high", "medium")
    nones = [b for b in sparse["breakdown"] if b["value"] is None]
    assert {b["key"] for b in nones} >= {"exp", "salary", "fmt", "edu"}
    assert sparse["score"] > 0  # отсутствие данных не обнуляет оценку


def test_no_structured_skills_does_not_invent_missing():
    r = match(P, vac(skills=[], description="Нужен Python и опыт с Kubernetes"))
    assert r["missing_requirements"] == []
    assert "Упоминается в вакансии: Python" in r["matched_requirements"]


def test_salary_risk_and_weights():
    low = match(P, vac(salary_from=40000, salary_to=50000))
    assert any("ниже вашего ориентира" in x for x in low["risks"])
    only_skills = ProfileData(**{**P.__dict__, "weights": {"skills": 100, "exp": 0, "title": 0, "salary": 0, "fmt": 0, "edu": 0}})
    assert match(only_skills, vac())["score"] == round(2 / 3 * 100)


def test_no_data_at_all_is_zero_low():
    empty = ProfileData()
    r = match(empty, vac(skills=[], experience_years_min=None, salary_from=None, salary_to=None, work_format=None, city=""))
    assert r["confidence"] == "low"
