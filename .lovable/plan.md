## Scope

ဒီ update မှာ ၅ ခု လုပ်မယ်:

### 1. Admin Access Lock
- `acagaming75@gmail.com` တစ်ခုတည်းကိုသာ admin ဖြစ်စေမယ်
- Migration: တခြား admin role အားလုံး remove + trigger ထည့်ပြီး တခြား email ဖြင့် admin role insert မရအောင် ကာကွယ်

### 2. Feature Health Check & Fix
- Subscription, Payment approval, Premium expire, Journal entry, Chart upload, Psychology, Prop Firm, Risk Calc, Leaderboard, MT4/MT5 import — တစ်ခုချင်း test ပြီး error/broken link တွေ ပြင်
- Console + network logs စစ်ပြီး fix

### 3. AI Chart Analysis Upgrade (SMC × ICT + RR 1:3)
- `supabase/functions/analyze-chart` edge function ကို prompt overhaul
- System prompt: SMC concepts (Order Block, FVG, BOS/CHoCH, Liquidity) + ICT concepts (Killzones, PD Array, OTE, Judas Swing) + macro news context
- Output schema (structured): `bias`, `entry`, `stop_loss`, `take_profit` (RR≥1:3 enforced), `confidence` (0-100), `reasoning` (အသေးစိတ်), `confluences[]`, `invalidation`
- Confidence < 60 ဆိုရင် "No valid setup — wait" ပြန်ပေး, random signal မပေး
- Model: `google/gemini-3-flash-preview`

### 4. News Feature (Forex Factory)
- New table: `news_events` (title, currency, impact: low/medium/high, event_time, actual, forecast, previous, source_url)
- Edge function: `fetch-forex-news` — Forex Factory weekly JSON scrape (`https://nfs.faireconomy.media/ff_calendar_thisweek.json`) — Firecrawl မလို၊ direct fetch
- Scheduled: pg_cron hourly
- New page: `/news` — High impact ကို 🔴 red highlight, Medium 🟠, Low ⚪
- High impact event မတိုင်ခင် ၃၀ မိနစ်အလို auto push notification

### 5. Push Notifications (Web Push / PWA)
- VAPID keys generate (server secret)
- Service worker: `public/sw.js` (push event handler)
- Manifest update for installability
- New table: `push_subscriptions` (user_id, endpoint, p256dh, auth)
- Edge function: `send-push` — admin က user/all ကို message ပို့လို့ရ
- Edge function: `notify-news` — high impact news ၃၀ မိနစ်အလို auto trigger (pg_cron)
- Admin panel မှာ "Send Notification" tab — recipient (all/premium/specific user) + title + body
- User app မှာ "Enable Notifications" button

## Technical Details

**Files to create:**
- `supabase/functions/fetch-forex-news/index.ts`
- `supabase/functions/send-push/index.ts`
- `supabase/functions/notify-news/index.ts`
- `public/sw.js` (push handler only — no offline cache to avoid preview breaking)
- `src/pages/NewsPage.tsx`
- `src/components/admin/SendNotificationTab.tsx`
- `src/components/EnablePushButton.tsx`
- `src/lib/push.ts` (subscribe helper)

**Files to edit:**
- `supabase/functions/analyze-chart/index.ts` — prompt + structured output
- `src/pages/AdminPanel.tsx` — add notification tab + news management
- `src/App.tsx` — `/news` route
- `src/components/Layout.tsx` (nav link)
- `index.html` — service worker register (guarded for preview)

**Migrations:**
1. Lock admin to single email + cleanup
2. `news_events` table + RLS
3. `push_subscriptions` table + RLS  
4. `notification_logs` table (admin sent history)
5. pg_cron jobs for fetch-forex-news (hourly) + notify-news (every 5 min)

**Secrets needed:**
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (auto-generate)

**Output (AI):** structured JSON enforced via Zod, RR check server-side; if `(tp-entry)/(entry-sl) < 3` → reject and regenerate or return "no setup".

ဒီ plan အတည်ပြုပါ — အတည်ပြုပြီးရင် ချက်ချင်း စပြီး အကုန်လုပ်ပေးပါမယ်။
