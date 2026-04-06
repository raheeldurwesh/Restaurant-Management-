# 🍽️ TableServe — Supabase Migration

Migrated from Firebase → Supabase (PostgreSQL + Storage + Auth).

---

## What changed

| Area                 | Before (Firebase)                      | After (Supabase)                        |
|----------------------|----------------------------------------|-----------------------------------------|
| Database             | Firestore (NoSQL, real-time)           | PostgreSQL via Supabase Realtime        |
| Storage              | Firebase Storage                       | Supabase Storage (`menu-images` bucket) |
| Auth                 | Firebase Authentication                | Supabase Auth (email/password)          |
| Real-time            | `onSnapshot()`                         | `postgres_changes` channel              |
| Currency             | `$` (USD)                              | `₹` (Indian Rupees)                     |

---

## New files / folder structure

```
src/
  supabase/
    client.js               ← Supabase client (replaces firebase/config.js)
  services/
    menuService.js          ← Menu CRUD + image upload
    orderService.js         ← Orders CRUD + real-time subscription
    storageService.js       ← Storage usage stats
    configService.js        ← Global restaurant config
  hooks/
    useMenu.js              ← Updated (calls menuService)
    useOrders.js            ← Updated (calls orderService; adds deleteOrder)
    useConfig.js            ← NEW — replaces useSettings.js
    useKeepAlive.js         ← NEW — 4-min ping + wake-up detection
  components/
    WakeUp.jsx              ← NEW — "Waking up server…" overlay
supabase-schema.sql         ← Run this once in Supabase SQL Editor
```

---

## Setup (5 minutes)

### 1. Create Supabase project
Go to [supabase.com](https://supabase.com) → New project.

### 2. Run schema
Paste the contents of `supabase-schema.sql` into:
**Supabase Dashboard → SQL Editor → New query → Run**

### 3. Enable Realtime
**Database → Replication → Source tables → Toggle ON: `menu`, `orders`, `config`**

### 4. Create Storage bucket
The SQL schema creates it. Verify it's marked **Public** in:
**Storage → menu-images → bucket settings**

### 5. Create admin user
**Authentication → Users → Add user**

### 6. Configure environment
```bash
cp .env.example .env
# Add your Supabase URL and anon key from:
# Supabase Dashboard → Project Settings → API
```

### 7. Run
```bash
npm install
npm run dev
```

| Route     | Who                          |
|-----------|------------------------------|
| `/?table=3` | Customer at table 3        |
| `/waiter` | Kitchen / wait staff         |
| `/admin`  | Restaurant owner             |

---

## New admin features

### Storage Monitor
Shown at the top of every admin panel page. Displays:
- MB used / 1 GB free tier limit
- File count
- Colour-coded progress bar (green → amber → red)

### Global Config (Settings tab)
Edit restaurant name, tagline, address, phone, GST number, and tax rate — all from one form.
Changes instantly reflect in:
- Customer page header
- PDF report headers (restaurant name, address, GST)
- Tax calculation in cart

### Order Deletion
Each order card has a ✕ delete button.
The "Purge All History" button removes every order from the database — useful for keeping
the free-tier database clean.

### Auto-pause Handling
Supabase free tier pauses after 7 days without traffic.
- The app pings the DB every 4 minutes when open (prevents pause)
- If paused, a friendly "Waking up server…" overlay appears with auto-retry
- Retry is automatic every 8 seconds until the DB is back

---

## Deploy to Vercel
```bash
vercel
# Add env vars in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```
