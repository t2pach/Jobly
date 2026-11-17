from sqlalchemy import select

from app import models as m
from app import security
from tests.conftest import register


def test_auth_flow(client):
    assert client.get("/me").status_code == 401
    h = register(client)
    assert client.get("/me", headers=h).json()["email"] == "a@example.com"
    assert client.post("/auth/register", json={"email": "A@example.com", "password": "correct-horse-1"}).status_code == 409
    assert client.post("/auth/register", json={"email": "b@example.com", "password": "short"}).status_code == 422
    bad = client.post("/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert bad.status_code == 401
    assert client.post("/auth/login", json={"email": "a@example.com", "password": "correct-horse-1"}).status_code == 200


def test_login_rate_limit(client):
    codes = [client.post("/auth/login", json={"email": "x@example.com", "password": "nope-nope-1"}).status_code
             for _ in range(12)]
    assert codes[-1] == 429


def test_profile_and_search_with_isolated_sources(client):
    h = register(client)
    r = client.patch("/profile", headers=h, json={"goal": "Python Developer", "years": 1, "city": "Москва",
                                                  "skills": ["Python", "sql", "Python"], "salary_expectation": 90000})
    assert r.json()["skills"] == ["Python", "sql"]
    res = client.get("/vacancies", headers=h, params={"query": "python"}).json()
    assert res["sources"]["trudvsem"]["status"] == "ok"
    assert res["sources"]["hh"]["status"] == "error"          # сбой одного источника
    assert len(res["items"]) == 2                              # дубликат объединён
    top = res["items"][0]
    assert top["title"] == "Python Developer" and sorted(top["also_on"]) == ["superjob"]
    assert top["match_score"] >= res["items"][1]["match_score"]


def test_match_save_letter_and_applications(client):
    h = register(client)
    client.patch("/profile", headers=h, json={"full_name": "Анна", "years": 1, "skills": ["Python"]})
    vid = client.get("/vacancies", headers=h).json()["items"][0]["id"]
    mt = client.post(f"/vacancies/{vid}/match", headers=h).json()
    assert {"score", "confidence", "matched_requirements", "missing_requirements"} <= set(mt)
    assert client.post(f"/vacancies/{vid}/save", headers=h).status_code == 204
    assert len(client.get("/saved-vacancies", headers=h).json()) == 1
    letter = client.post("/cover-letters/generate", headers=h, json={"vacancy_id": vid, "tone": "bold"}).json()
    assert "[добавьте свой подтверждённый результат]" in letter["text"] and letter["placeholders_to_fill"] >= 1

    a = client.post("/applications", headers=h, json={"vacancy_id": vid, "cover_letter_id": letter["id"]}).json()
    assert a["status"] == "plan" and a["title"] == "Python Developer"
    up = client.patch(f"/applications/{a['id']}", headers=h, json={"status": "sent"}).json()
    assert up["applied_at"] is not None
    ev = client.get(f"/applications/{a['id']}/events", headers=h).json()
    assert [e["to"] for e in ev] == ["plan", "sent"]
    assert client.patch(f"/applications/{a['id']}", headers=h, json={"status": "nonsense"}).status_code == 422
    manual = client.post("/applications", headers=h, json={"title": "Вручную", "company": "X"})
    assert manual.status_code == 201
    assert client.post("/applications", headers=h, json={}).status_code == 422


def test_user_data_isolation(client):
    ha, hb = register(client, "a@example.com"), register(client, "b@example.com")
    aid = client.post("/applications", headers=ha, json={"title": "Секрет"}).json()["id"]
    assert client.get("/applications", headers=hb).json() == []
    assert client.patch(f"/applications/{aid}", headers=hb, json={"note": "x"}).status_code == 404
    assert client.delete(f"/applications/{aid}", headers=hb).status_code == 404
    lid = client.post("/cover-letters/generate", headers=ha, json={"vacancy_id": 1}).status_code
    assert lid in (200, 404)
    # чужое письмо нельзя привязать
    vid = client.get("/vacancies", headers=ha).json()["items"][0]["id"]
    l = client.post("/cover-letters/generate", headers=ha, json={"vacancy_id": vid}).json()["id"]
    assert client.post("/applications", headers=hb, json={"title": "t", "cover_letter_id": l}).status_code == 404


def test_no_auto_apply_endpoints(client):
    paths = " ".join(client.get("/openapi.json").json()["paths"]).lower()
    for word in ("apply", "respond", "autoapply", "submit"):
        assert word not in paths


def test_admin_access_and_source_toggle(client, monkeypatch):
    h = register(client, "user@example.com")
    assert client.get("/admin/users", headers=h).status_code == 403
    with client.Session() as s:
        u = s.scalar(select(m.User).where(m.User.email == "user@example.com"))
        u.is_admin = True
        s.commit()
    assert client.patch("/admin/sources/hh", headers=h, json={"enabled": False}).json()["enabled"] is False
    res = client.get("/vacancies", headers=h).json()
    assert "hh" not in res["sources"]                          # отключённый источник не опрашивается
    assert all("resume" not in k for k in client.get("/admin/users", headers=h).json()[0])
    assert client.get("/integrations", headers=h).json()[0]["capabilities"]["apply_from_app"] is False


def test_market_and_export_and_delete_account(client):
    h = register(client)
    client.patch("/profile", headers=h, json={"salary_expectation": 200000})
    client.get("/vacancies", headers=h)
    mk = client.get("/analytics/market", headers=h, params={"query": "python"}).json()
    assert mk["sample_size"] == 1 and mk["salary"]["median"] == 125000 and mk["vs_expectation"]["above_median"]
    assert mk["notes"]                                         # предупреждение о малой выборке
    client.post("/applications", headers=h, json={"title": "T"})
    exp = client.get("/me/export", headers=h).json()
    assert exp["user"]["email"] == "a@example.com" and len(exp["applications"]) == 1
    assert client.delete("/me", headers=h).status_code == 204
    with client.Session() as s:
        assert s.scalar(select(m.User)) is None
        assert s.scalar(select(m.ApplicationTracker)) is None
        assert s.scalar(select(m.CandidateProfile)) is None
    assert client.get("/me", headers=h).status_code == 401


def test_secret_encryption(monkeypatch):
    from cryptography.fernet import Fernet
    monkeypatch.setattr(security.settings, "secrets_key", Fernet.generate_key().decode())
    enc = security.encrypt_secret("token-123")
    assert enc != "token-123" and security.decrypt_secret(enc) == "token-123"
