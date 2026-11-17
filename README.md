# Jobly API (бэкенд)

Бэкенд для AI Career Assistant по ТЗ v1.0: единый поиск вакансий, объяснимая оценка совпадения,
сопроводительные письма, ручной трекер откликов, аналитика, карьерные цели, админ-эндпоинты.
**Автоматической отправки откликов нет и не будет** (раздел 2.3 ТЗ): тест `test_no_auto_apply_endpoints` это проверяет.

Статус: рабочая основа (этапы 1–3 и часть 4–6 из раздела 24 ТЗ). Что не сделано и что нужно проверить: **docs/LIMITATIONS.md**.

## Быстрый старт (локально)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # для локальной работы можно поставить DATABASE_URL=sqlite:///./jobly.db
alembic upgrade head
uvicorn app.main:app --reload   # документация: http://localhost:8000/docs
pytest                          # 18 тестов, внешняя сеть не нужна
```

## Docker

```bash
cp .env.example .env            # задайте JWT_SECRET и SECRETS_KEY
docker compose up --build
```

## Структура

```
app/
  main.py            приложение, CORS, роутеры
  config.py          настройки из переменных окружения
  models.py          22 таблицы из раздела 19 ТЗ
  security.py        argon2, JWT, шифрование токенов (Fernet), лимитер запросов
  deps.py            текущий пользователь, admin, журнал аудита
  routers/           auth, profile, vacancies, applications, career, integrations(+admin)
  integrations/      base.py (контракт JobProvider), trudvsem.py, stubs.py (hh, superjob), registry.py
  services/          matching, letters, dedupe, market, search
migrations/          Alembic (0001: все таблицы)
tests/               matching, адаптер «Работы России», API
```

## Переменные окружения

См. `.env.example`: каждая переменная там прокомментирована. Обязательные для prod: `JWT_SECRET` (от 32 символов)
и `SECRETS_KEY`; приложение не стартует в `APP_ENV=prod` с дефолтными значениями.

## Эндпоинты

Документация OpenAPI: `/docs` (отключена при `APP_ENV=prod`).

| Метод и путь | Назначение |
|---|---|
| POST /auth/register, /auth/login | регистрация, вход (лимит 10 запросов в минуту) |
| GET /me, GET /me/export, DELETE /me | профиль аккаунта, экспорт и полное удаление данных |
| GET, PATCH /profile | профиль, навыки, опыт, образование, веса критериев |
| GET /vacancies | единый поиск по включённым источникам, дедупликация, оценка, статусы источников |
| GET /vacancies/{id}, POST /vacancies/{id}/match | карточка и полный разбор совпадения |
| POST, DELETE /vacancies/{id}/save, GET /saved-vacancies | избранное |
| POST /cover-letters/generate | письмо из данных профиля (без выдуманных фактов) |
| GET, POST /applications, PATCH, DELETE /applications/{id}, GET .../events | ручной трекер и история статусов |
| GET, POST /career-goals | карьерные цели |
| GET /analytics/market | статистика по сохранённым вакансиям |
| GET /integrations | состояние и возможности источников |
| GET, PATCH /admin/sources, GET /admin/users, PATCH /admin/users/{id}/block | администрирование (только роль admin) |

## Как работает поиск

`GET /vacancies` опрашивает включённые источники параллельно. Ответ содержит `sources` со статусом каждого
(`ok`, `unavailable`, `error`): сбой одного не влияет на остальные. Вакансии сохраняются в БД, дубли с разных площадок
объединяются (`also_on`), для каждой считается `match_score`. Вакансии без зарплаты не получают «нулевую» зарплату.

## Добавление нового источника

1. Создайте `app/integrations/<имя>.py` с классом, наследующим `JobProvider`.
2. Честно заполните `get_capabilities()`: только то, что платформа действительно умеет.
3. Добавьте его в `registry.build_providers()` и `DEFAULT_ENABLED`.
4. Напишите тест на нормализацию с фикстурой ответа из официальной документации.
# Jobly
# Jobly
