# Jobly Frontend

Веб-интерфейс для Jobly API: поиск вакансий, оценка совпадения, сопроводительные письма, трекер откликов, профиль, карьерные цели, аналитика рынка, источники и администрирование.

Стек: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query, Recharts.

## Запуск

```bash
# 1. Бэкенд (из корня репозитория)
uvicorn app.main:app --reload --port 8000

# 2. Фронтенд
cd frontend
cp .env.example .env.local   # при необходимости поменяйте JOBLY_API_URL
npm install
npm run dev                  # http://localhost:3000
```

Браузер обращается к `/api/*`, Next.js проксирует запросы на `JOBLY_API_URL` (по умолчанию `http://localhost:8000`), поэтому CORS настраивать не нужно.

## Сборка

```bash
npm run build && npm start
```

`output: "standalone"` — можно упаковать `.next/standalone` в Docker-образ. `JOBLY_API_URL` читается во время сборки.

## Структура

- `src/app/(auth)` — вход и регистрация
- `src/app/(app)` — защищённые страницы приложения
- `src/components` — UI-компоненты и модальные окна
- `src/lib` — API-клиент, авторизация, типы, форматирование

JWT хранится в `localStorage` (`jobly_token`). Автоматическая отправка откликов не поддерживается: пользователь откликается на сайте источника и отмечает статус в трекере.
