# PULT server

Минимальный серверный слой на Node + TypeScript + Express.

## Запуск

```bash
cd server
npm install
npm run dev
```

Сервер запускается через `tsx` без шага сборки и слушает порт из `process.env.PORT` (по умолчанию `3000`).

## Эндпоинты

- `GET /` — текст `PULT server is alive`
- `GET /health` — JSON `{ "status": "ok" }`
