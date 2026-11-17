import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app import models as m
from app import security
from app.db import Base, get_db, make_engine
from app.integrations.base import (JobProvider, NormVacancy, ProviderCapabilities, ProviderError, ProviderHealth)
from app.integrations.registry import get_providers
from app.main import app


class FakeProvider(JobProvider):
    def __init__(self, code, items=None, fail=False):
        self.code, self.title, self.items, self.fail = code, code.upper(), items or [], fail

    async def search_vacancies(self, params):
        if self.fail:
            raise ProviderError("boom")
        return self.items

    async def get_vacancy(self, external_id): return None
    def normalize_vacancy(self, data): raise NotImplementedError
    async def health_check(self): return ProviderHealth("error" if self.fail else "ok")
    def get_capabilities(self): return ProviderCapabilities(True, False, [])


def nv(source, ext, title="Python Developer", company="Ромашка", **kw):
    return NormVacancy(source=source, external_id=ext, title=title, company=company, city="Москва",
                       salary_from=100000, salary_to=150000, skills=["Python", "SQL", "Docker"], **kw)


@pytest.fixture()
def client():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with Session() as s:
        s.add_all(m.VacancySource(code=c, title=c, enabled=True) for c in ("trudvsem", "superjob", "hh"))
        s.commit()

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    providers = {
        "trudvsem": FakeProvider("trudvsem", [nv("trudvsem", "1/a"), nv("trudvsem", "1/b", "Аналитик", "Лотос")]),
        "superjob": FakeProvider("superjob", [nv("superjob", "9")]),   # дубликат первой вакансии
        "hh": FakeProvider("hh", fail=True),
    }
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_providers] = lambda: providers
    security._hits.clear()
    with TestClient(app) as c:
        c.Session = Session
        yield c
    app.dependency_overrides.clear()


def register(client, email="a@example.com", pw="correct-horse-1"):
    r = client.post("/auth/register", json={"email": email, "password": pw})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
