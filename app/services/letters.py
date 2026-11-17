"""Сопроводительные письма из данных профиля. Ничего не выдумывает: недостающее оставляется в [скобках]."""
from __future__ import annotations

from .matching import ProfileData

TONES = {"short", "standard", "bold"}


def _years(n: float) -> str:
    i = int(n)
    word = "год" if i % 10 == 1 and i % 100 != 11 else "года" if 2 <= i % 10 <= 4 and not 12 <= i % 100 <= 14 else "лет"
    return f"{n:g} {word}" if n != i else f"{i} {word}"


def generate(p: ProfileData, title: str, company: str, matched_skills: list[str], tone: str) -> tuple[str, int]:
    name = p.full_name or "[ваше имя]"
    skills = ", ".join(matched_skills) if matched_skills else "[укажите навыки из вашего профиля]"
    exp = f"Мой опыт работы — {_years(p.years)}. " if p.years > 0 else ""
    if tone == "short":
        text = (f"Здравствуйте!\n\nМеня зовут {name}. Рассматриваю вакансию «{title}» в компании {company}. "
                f"По требованиям у меня есть: {skills}.\n\nБуду рад обсудить детали.\n\nС уважением,\n{name}")
    elif tone == "bold":
        text = (f"Здравствуйте!\n\nВакансия «{title}» соответствует моему профилю. {exp}"
                f"Из ваших требований я закрываю: {skills}.\n\n"
                f"Ключевой результат на прошлом месте: [добавьте свой подтверждённый результат].\n\n"
                f"Готов обсудить, чем могу быть полезен команде {company}.\n\nС уважением,\n{name}")
    else:
        text = (f"Здравствуйте!\n\nМеня зовут {name}, откликаюсь на вакансию «{title}». {exp}"
                f"Моя цель — {p.goal or '[карьерная цель]'}.\n\nПо требованиям вакансии у меня есть опыт и навыки: "
                f"{skills}. Резюме прилагаю.\n\nБуду рад рассказать подробнее на собеседовании.\n\nС уважением,\n{name}")
    return text, text.count("[")
