import re


def dedupe_key(title: str, company: str) -> str:
    return re.sub(r"[^a-zа-я0-9]", "", f"{title}{company}".lower())


def merge_duplicates(items: list) -> list[tuple[object, list[str]]]:
    """Возвращает (вакансия, [другие источники]); первая встреченная остаётся основной."""
    out: dict[str, tuple[object, list[str]]] = {}
    for v in items:
        k = v.dedupe_key or dedupe_key(v.title, v.company)
        if k in out:
            if v.source != out[k][0].source and v.source not in out[k][1]:
                out[k][1].append(v.source)
        else:
            out[k] = (v, [])
    return list(out.values())
