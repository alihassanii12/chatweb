# Chatweb Frontend

Private cinema UI — synchronized video, chat, media library, and WebRTC calls.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Default API: `http://localhost:8000` (see `.env.local.example`).

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Django REST base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket base (`ws://` or `wss://`) |

Production values are also set in `next.config.ts` for Render backend.

## Project layout

```
app/
  login/          # JWT login
  room/[id]/      # Main cinema room UI
lib/
  api.ts          # Authenticated fetch + auto token refresh
  auth.ts         # Session + refresh helpers
  video.ts        # YouTube / embed URL helpers
```

## Default login (after backend seed)

- `user1@chatweb.com` / `password123`
- `user2@chatweb.com` / `password123`

## Deploy

Build and deploy to Vercel. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to your production backend.
