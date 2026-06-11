# 🚗 Church Rides

A full-stack ride-coordination app for Sunday services:

- **Discord bot** registers members, posts a weekly "who needs a ride?" message, collects ✅ reactions, auto-assigns riders to drivers along a priority pickup route, and DMs each driver their passenger list (with a Resend email backup).
- **Admin dashboard** (Next.js) for members, drivers, assignments with drag-and-drop overrides, church settings, and history.

Everything runs on free tiers: **Neon** (Postgres) · **Vercel** (web) · **Railway** (bot) · **Resend** (email) · Discord (free).

## Monorepo layout

```
/apps
  /web       → Next.js admin dashboard + API routes  (deploy: Vercel)
  /bot       → Discord.js bot + node-cron scheduler  (deploy: Railway)
/packages
  /db        → Prisma schema + shared client + assignment algorithm
  /types     → Shared TypeScript types (route order, phone validation, dates)
```

## Weekly lifecycle (all times server-local)

| When | What |
|---|---|
| Configurable (default **Friday 6:00 PM**) | Bot posts the weekly message to `#rides-this-week` and adds ✅ |
| Until **Saturday 10:00 AM** | ✅ reactions become `ride_requests`; unregistered reactors get a DM pointing them to `#rides-signup` |
| **Saturday 11:45 AM** | Assignment algorithm fills cars along the route **Mesa → UTC → Midway → PV1 → PV2 → Vdcn → Camino → VDC** |
| **Saturday 12:00 PM** | Each driver gets a Discord DM (primary) and a Resend email (backup) with their rider list in pickup order |

All scheduled jobs run inside the Railway bot process with `node-cron` — no external cron services. Set the Railway service's `TZ` variable (e.g. `America/Los_Angeles`) so cron times match your church's local time.

> **Discord API note:** bots can't open a modal directly from a plain channel message, and modals don't support dropdowns. So the signup flow is: message in `#rides-signup` → bot replies with a **Register** button → button opens the private modal (name, phone, preferences) → an ephemeral dropdown collects the pickup location. The end result matches the spec: private, validated, upserted, and "Your info has been updated!" for returning members.

---

## 1. Local development

```bash
git clone <your-repo> && cd church-rides
npm install

# Local Postgres (mirrors Neon)
docker compose up -d

cp .env.example .env                       # root env, used by the bot + prisma
cp .env.example apps/web/.env.local        # web env (Next.js reads its own)

npm run db:generate    # prisma generate
npm run db:push        # create tables
npm run db:seed        # sample church, 3 drivers, 5 members, 4 ride requests

npm run dev:web        # http://localhost:3000 → /admin (password = ADMIN_PASSWORD)
npm run dev:bot        # starts the Discord bot (needs DISCORD_BOT_TOKEN)
```

## 2. Discord bot setup

1. Create an application at https://discord.com/developers/applications → **Bot** tab → copy the token into `DISCORD_BOT_TOKEN`; the application ID is `DISCORD_CLIENT_ID`.
2. Under **Bot → Privileged Gateway Intents**, enable **Message Content Intent** (needed to detect messages in `#rides-signup`).
3. Invite the bot with the `bot` scope and permissions: View Channels, Send Messages, Read Message History, Add Reactions.
4. In Discord, enable Developer Mode (Settings → Advanced) so you can right-click → **Copy ID** on your server and channels.
5. Put your real IDs into the database: either edit `packages/db/prisma/seed.ts` before seeding, or update them later in the dashboard under **Church Settings** (`discord_server_id` must match your server for the bot to respond).

## 3. Neon (database)

1. Create a free project at https://neon.tech → copy the **pooled** connection string.
2. Set it as `DATABASE_URL` (it looks like `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
3. Push the schema and seed:
   ```bash
   DATABASE_URL="postgresql://…" npm run db:push
   DATABASE_URL="postgresql://…" npm run db:seed
   ```
   Neon's free tier auto-suspends when idle; Prisma reconnects transparently.

## 4. Vercel (admin dashboard)

1. Import the repo at https://vercel.com/new.
2. Set **Root Directory** to `apps/web` (Vercel detects Next.js; `apps/web/vercel.json` handles the monorepo build).
3. Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` (your production URL, e.g. `https://rides.yourchurch.org`), `ADMIN_PASSWORD`.
4. Deploy. The dashboard lives at `/admin`, protected by NextAuth.

## 5. Railway (bot)

1. New project at https://railway.app → **Deploy from GitHub repo**.
2. Set the service **Root Directory** to the repo root (the bot's `railway.json` builds `apps/bot` from the workspace).
3. Environment variables: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `TZ` (e.g. `America/Los_Angeles`).
4. Deploy — a lightweight Discord bot comfortably fits in the $5/month free credit.

## 6. Resend (driver email backup)

1. Sign up at https://resend.com (3,000 emails/month free).
2. Verify your sending domain (or use `onboarding@resend.dev` for testing).
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on Railway. If the key is unset, the bot simply skips email and logs a warning — Discord DMs still go out.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | web + bot | Neon pooled URL in prod, Docker Postgres locally |
| `DISCORD_BOT_TOKEN` | bot | From the Discord developer portal |
| `DISCORD_CLIENT_ID` | bot | Application ID |
| `RESEND_API_KEY` | bot | Optional — email backup is skipped if unset |
| `RESEND_FROM_EMAIL` | bot | Verified sender |
| `NEXTAUTH_SECRET` | web | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | web | `http://localhost:3000` locally |
| `ADMIN_PASSWORD` | web | Shared password for `/admin` |

## Swapping in real SMS later

Notifications are isolated in `apps/bot/src/jobs/notifyDrivers.ts` and `apps/bot/src/lib/email.ts`. To add Twilio (or any SMS provider), drop a `sendDriverSMS()` helper next to `sendDriverEmail()` and call it from the same loop — nothing else changes.

## Useful commands

```bash
npm run db:studio      # browse the database in Prisma Studio
npm run db:migrate     # create a real migration (instead of db push)
npm run build          # build all workspaces
```
