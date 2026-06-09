# acorn-steps

> Open-source baby tracking PWA — feeding, diaper, sleep with real-time parent sharing.
> Built for tired adults at 3 a.m., not for cartoons.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Status: pre-1.0](https://img.shields.io/badge/Status-pre--1.0-orange.svg)](#status)

[日本語](./docs/README.ja.md) · [Tiếng Việt](./docs/README.vi.md)

---

## Why

Existing baby-tracking apps are either closed-source (ぴよログ) or treat babies as the user (pastel cartoons). Existing open-source options ([babybuddy](https://github.com/babybuddy/babybuddy), [sprout-track](https://github.com/Oak-and-Sprout/sprout-track)) are great, but:

- **None support Japanese + Vietnamese together** — a market gap
- **Real-time co-parent sharing is shallow** — usually "synced eventually", not "I see my partner logging right now"
- **The "whose turn next" question is unsolved** — no rotation primitive

acorn-steps is the answer:

- 📓 **Timeline-first**: the vertical timeline IS the home screen, not buried under a card grid
- 👥 **True real-time co-parent sync**: both screens update within 2 seconds via Postgres `LISTEN/NOTIFY` + SSE
- 🌏 **Native JP / EN / VI from day one**
- 📴 **Offline-first**: record at 3 a.m. with no signal, sync when you're back
- 🔓 **MIT licensed**: fork it, host it, ship it commercially

## Features

|                                                         | Status |
| ------------------------------------------------------- | ------ |
| Feeding (breast L/R, bottle, solids)                    | 🚧     |
| Diaper                                                  | 🚧     |
| Sleep                                                   | 🚧     |
| Multi-caretaker family (parents + grandparents + nanny) | 🚧     |
| Real-time co-parent sync                                | 🚧     |
| Offline outbox + idempotent sync                        | 🚧     |
| Web Push reminders                                      | ⏳     |
| Growth measurements + WHO/CDC percentile                | ⏳     |
| Stats & graphs                                          | ⏳     |
| "Whose turn next" rotation                              | ⏳     |
| Data export (JSON / CSV)                                | ⏳     |

Legend: ✅ done · 🚧 in progress · ⏳ planned

## Stack

- **Web**: [Next.js 15](https://nextjs.org/) (App Router, RSC, Server Actions) · TypeScript strict · Tailwind v4
- **DB**: PostgreSQL 17 · [Prisma](https://www.prisma.io/) · soft delete · multi-tenant by `familyId`
- **Realtime**: Postgres `LISTEN/NOTIFY` + Server-Sent Events ([ADR-0002](./docs/adr/0002-realtime-strategy.md))
- **Offline**: IndexedDB outbox + `clientId` idempotent upsert ([ADR-0003](./docs/adr/0003-offline-sync.md))
- **Auth**: Family PIN + Caretaker sub-PIN, Magic Link optional ([ADR-0004](./docs/adr/0004-auth-strategy.md))
- **i18n**: [next-intl](https://next-intl-docs.vercel.app/) + ICU MessageFormat, ja / en / vi ([ADR-0005](./docs/adr/0005-i18n-strategy.md))
- **Monorepo**: pnpm workspaces + [Turborepo](https://turbo.build/)

## Quick start

### Requirements

- Node.js ≥ 22
- pnpm ≥ 10 (`brew install pnpm` or `corepack enable`)
- Docker (for local Postgres)

### Steps

```bash
git clone git@github.com:chanmatsu-sky/acorn-steps.git
cd acorn-steps

# Install deps
pnpm install

# Start Postgres
docker compose up -d

# Copy env files
cp .env.example .env.local
cp packages/db/.env.example packages/db/.env

# Apply migrations + generate Prisma client
pnpm db:migrate

# Start the web app
pnpm dev
```

Open <http://localhost:3001>.

## Repository layout

```
acorn-steps/
├── apps/
│   └── web/                  # Next.js 15 PWA
├── packages/
│   └── db/                   # Prisma schema + client
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   ├── design-direction.md   # Visual design direction
│   └── ...
├── docker-compose.yml        # Local Postgres
└── ...
```

See [ADR-0001](./docs/adr/0001-architecture-feature-folder.md) for the feature-folder rationale.

## Status

Pre-1.0. The schema, design direction, and architecture are stable. The implementation is in progress — see [the roadmap issues](https://github.com/chanmatsu-sky/acorn-steps/issues).

## Contributing

We'd love your help — see [CONTRIBUTING.md](./CONTRIBUTING.md).

Translations (especially **Vietnamese, Korean, Traditional Chinese**) are particularly welcome. See [ADR-0005](./docs/adr/0005-i18n-strategy.md) for the i18n workflow.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## License

[MIT](./LICENSE). Use it, fork it, ship it commercially. Attribution appreciated but not required by license.

## Acknowledgments

- [babybuddy](https://github.com/babybuddy/babybuddy) — 7-year-mature data model that informed our schema
- [sprout-track](https://github.com/Oak-and-Sprout/sprout-track) — UX and PWA patterns
- Every parent who logged a feeding at 4 a.m. and thought "this UI is the wrong shape"
