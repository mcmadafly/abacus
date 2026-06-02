<div align="center">

# ▦ Abacus

### Real analytics — sent to your inbox every day.

Privacy-first, cookie-free web analytics with a daily email digest.
A lightweight, self-hostable alternative to Google Analytics — built entirely on the Cloudflare edge.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-5b46e5.svg)](./LICENSE)
[![Built with Astro](https://img.shields.io/badge/Astro-6-5b46e5.svg)](https://astro.build)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020.svg)](https://workers.cloudflare.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-22c55e.svg)](#-contributing)

[**abacuslytics.com**](https://abacuslytics.com) · [Live demo](https://abacuslytics.com/#demo) · [Report a bug](../../issues) · [Request a feature](../../issues)

</div>

---

## Why Abacus?

Most analytics tools bury the truth under dashboards you never open and cookies you have to
apologize for. Abacus keeps it to the metrics that matter — visitors, pageviews, top pages,
sources, countries — and **brings them to you**: drop in one tiny script and wake up to a clean
summary of yesterday in your inbox.

- 📨 **Daily email digest** — the whole story in the time it takes to drink your coffee. No login required.
- 🍪 **No cookies, no consent banners** — nothing personal is stored, so there's nothing to consent to. GDPR / CCPA / PECR friendly by design.
- ⚡ **Sub-1KB script** — async, no layout shift, won't dent your Core Web Vitals.
- 🌍 **Runs on the edge** — fast ingestion everywhere, and your data stays yours.
- 📈 **One screen, no maze** — visitors, sources, pages, countries and goals, minus the GA4 labyrinth.
- 🔒 **Privacy by design** — visitor counts use a daily-rotating, irreversible hash. We literally can't follow anyone across sites or days.

## How it works

```text
            ┌────────────────────── one Cloudflare Worker ──────────────────────┐
 your site  │                                                                   │
 <script>───┼──▶ /api/event ──▶ Workers Analytics Engine (raw events)           │
            │                                   │                               │
 dashboard ◀┼── Astro SSR ◀── D1 (sites, rollups, subscriptions) ◀── nightly cron│
            │                                   │                               │
 inbox  ◀───┼──────────────── Resend ◀── nightly cron (digest) ◀────────────────┘
            └───────────────────────────────────────────────────────────────────┘
```

Raw pageview/event hits stream into **Workers Analytics Engine** (cheap, high-volume time series).
A nightly **cron** rolls each day's data into **D1** (SQLite) for historical ranges and emails every
subscriber their digest via **Resend**. The live dashboard queries Analytics Engine directly.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Astro 6** (SSR) → a single **Cloudflare Worker** |
| Auth | **Clerk** |
| Event store | **Workers Analytics Engine** |
| App data | **D1** (SQLite) via **Drizzle ORM** |
| Email | **Resend** |
| Styling | Tailwind v4 + a hand-built editorial design system |
| Tooling | **Bun** workspaces monorepo |

## Repository layout

```text
apps/web            Astro app → the single Worker (marketing + dashboard + /api/event + cron)
packages/tracker    Embeddable, dependency-free tracking snippet → builds to apps/web/public/abacus.js
packages/db         Shared D1 schema (Drizzle) + migrations
```

The Worker's custom entrypoint (`apps/web/src/worker.ts`) exposes both a `fetch` handler (Astro)
and a `scheduled` handler (the nightly digest), so everything ships as one deploy.

## Quick start

**Prerequisites:** [Bun](https://bun.sh) 1.3+, a free [Clerk](https://clerk.com) app, and
(optionally) a [Resend](https://resend.com) account for the email digest. Deploying needs a
[Cloudflare](https://cloudflare.com) account.

```bash
git clone https://github.com/abacuslytics/abacus.git
cd abacus
bun install
```

### 1. Configure keys

Clerk reads its keys from Vite (`import.meta.env`), so they go in **`apps/web/.env`**:

```bash
cat > apps/web/.env <<'EOF'
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Optional: work on the dashboard/demo without signing in
PUBLIC_DISABLE_AUTH=true
EOF
```

Cloudflare **runtime bindings** (D1 / Analytics Engine / Resend / the visitor-hash salt) go in
**`apps/web/.dev.vars`** — copy the example and fill it in:

```bash
cp .dev.vars.example apps/web/.dev.vars
```

> ℹ️ `.env` and `.dev.vars` are git-ignored — never commit real keys.

### 2. Build the tracker, set up the database

```bash
bun run tracker:build     # builds apps/web/public/abacus.js
bun run db:generate       # generate SQL from the Drizzle schema (already committed)
bun run db:migrate        # apply migrations to a local D1 database
bun run db:demo           # (optional) seed the public "live demo" site with data
```

### 3. Run it

```bash
bun run dev               # http://localhost:4321
```

> **Analytics Engine note:** AE has no local query API — `writeDataPoint` runs locally but is a
> no-op for reads. With `PUBLIC_DISABLE_AUTH=true` and the seeded demo data, you can explore the
> full dashboard offline; live numbers require deploying with `CF_ACCOUNT_ID` + `CF_AE_API_TOKEN`.

## Install snippet (for site owners)

```html
<script defer data-domain="yourdomain.com" src="https://abacuslytics.com/abacus.js"></script>
```

Track custom goals with the global helper:

```html
<button onclick="window.abacus('signup')">Sign up</button>
```

SPA route changes are counted automatically. Exclude yourself with
`localStorage.abacus_ignore = 'true'`, or skip paths with `data-exclude="/admin/*"`.

## Configuration reference

| Variable | Where | Purpose |
|---|---|---|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` | Clerk frontend key |
| `CLERK_SECRET_KEY` | `.env` | Clerk backend key |
| `PUBLIC_DISABLE_AUTH` | `.env` | Dev-only: bypass Clerk and use a fixed dev user |
| `VISITOR_HASH_SALT` | `.dev.vars` / secret | Salt for the daily-rotating visitor hash |
| `RESEND_API_KEY` | `.dev.vars` / secret | Sends the daily digest + early-adopter signups |
| `RESEND_AUDIENCE_ID` | `.dev.vars` / secret | Resend audience for early-adopter signups |
| `CF_ACCOUNT_ID` / `CF_AE_API_TOKEN` | `.dev.vars` / secret | Query Analytics Engine via its SQL API |

## Deploying

```bash
# create the remote resources (one time), then paste their IDs into apps/web/wrangler.jsonc
wrangler d1 create abacus-db
wrangler kv namespace create SESSION
# create an "abacus_events" Analytics Engine dataset in the Cloudflare dashboard

# set production secrets
wrangler secret put CLERK_SECRET_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put VISITOR_HASH_SALT
# …etc

bun run deploy            # builds the tracker + Astro, then `wrangler deploy`
```

## Roadmap

- [ ] Weekly / monthly digest cadences
- [ ] Custom events & goal conversion funnels
- [ ] Team members & shared sites
- [ ] Public dashboards
- [ ] Import from Google Analytics / Plausible
- [ ] First-class WordPress / Next.js / Ghost plugins

Have an idea? [Open an issue](../../issues) — we'd love to hear it.

## 🤝 Contributing

Abacus is early and **contributions of every size are welcome** — code, docs, design, bug reports,
or just telling a friend.

1. Fork the repo and create a branch: `git checkout -b feat/my-thing`
2. `bun install`, then `bun run dev` to work locally (set `PUBLIC_DISABLE_AUTH=true` to skip auth)
3. Before pushing: `bun run typecheck` should pass
4. Open a pull request describing the change

Good first contributions: new tracker plugins, dashboard widgets, digest email polish, docs, and
accessibility fixes. Look for issues tagged **`good first issue`**.

## 💜 Support the project

If Abacus is useful to you, the best ways to help:

- ⭐ **Star the repo** — it genuinely helps others find it
- 🐛 **File issues** and help triage
- 🛠️ **Send a PR** — even a typo fix counts
- 📣 **Spread the word** — a blog post or tweet goes a long way

## License

Abacus is licensed under the **GNU AGPL-3.0** — see [LICENSE](./LICENSE). In short: it's free and
open source, and if you run a modified version as a network service, you must share your changes
under the same license. (Same spirit as Plausible and PostHog.)

## Acknowledgements

Built with [Astro](https://astro.build), the [Cloudflare Developer Platform](https://developers.cloudflare.com),
[Clerk](https://clerk.com), [Drizzle ORM](https://orm.drizzle.team), [Resend](https://resend.com),
and [Chart.js](https://www.chartjs.org). Inspired by the lovely simplicity of
[Plausible](https://plausible.io).

<div align="center">

**[abacuslytics.com](https://abacuslytics.com)** · No cookies were set reading this README.

</div>
