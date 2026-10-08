# AURA TRADE

AURA TRADE is an AI-powered trading journal delivered as a responsive web app and Telegram Mini App.

## Features

- Dashboard and trading journal
- AI chart analysis
- Trading tools, risk calculator, news, psychology, and prop-firm tracking
- Premium and leaderboard experiences
- Admin tools protected by authenticated role checks and Supabase policies

## Local development

```bash
npm install
npm run dev
```

Create a `.env` file with the public Supabase configuration used by the client:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The Supabase Edge Functions used by AI features must keep provider credentials in their server-side function secrets. Never expose service-role keys or AI provider keys in browser code.

## Telegram Mini App

Use the deployed HTTPS URL as the Web App URL in BotFather. The app detects Telegram WebApp at runtime, calls `ready()` and `expand()`, and remains usable in a normal browser.
