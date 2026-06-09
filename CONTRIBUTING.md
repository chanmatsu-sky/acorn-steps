# Contributing to acorn-steps

Thanks for considering a contribution. acorn-steps aims to be an **open-source-quality codebase** — concise, typed, tested, and inclusive. This guide explains how to get set up and how we work.

## Code of conduct

By participating, you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- 🐛 **Report a bug** — use the [Bug template](https://github.com/chanmatsu-sky/acorn-steps/issues/new?template=bug.yml)
- 💡 **Suggest a feature** — use the [Feature template](https://github.com/chanmatsu-sky/acorn-steps/issues/new?template=feature.yml)
- 🌍 **Translate** — see [Adding a language](#adding-a-language) below
- 🧰 **Improve docs** — typos, clarifications, ADR refinements
- 🛠 **Fix something** — pick an issue labeled `good first issue` or `help wanted`

## Local setup

See [README — Quick start](./README.md#quick-start) for the basics. Additional dev workflow:

```bash
# Run typecheck across the monorepo
pnpm typecheck

# Lint
pnpm lint

# Format (Prettier)
pnpm format

# Open Prisma Studio (DB GUI)
pnpm db:studio
```

## Architecture in one minute

acorn-steps follows [ADR-0001 Feature-folder + thin domain layer](./docs/adr/0001-architecture-feature-folder.md):

```
apps/web/src/
├── features/<feature>/
│   ├── domain.ts          # Zod schemas, pure functions
│   ├── actions.ts         # Server Actions ("use server")
│   ├── repository.ts      # Prisma calls (only file allowed to touch Prisma types)
│   ├── ui/                # React components
│   └── __tests__/
├── lib/                   # Cross-cutting concerns (auth, db, realtime, ids, env)
└── shared/                # UI primitives reused across features
```

**Hard rules:**

1. **Do not import another feature** from `features/<x>/` directly. Use `lib/events` instead.
2. **Do not leak Prisma types** outside `repository.ts`. Return `Pick<...>` or Zod-inferred types.
3. **Always filter by `familyId`** in repository functions — multi-tenancy is a security boundary.
4. **Pure functions in `domain.ts`** — no side effects, tested at 100% coverage.

Read [the ADRs](./docs/adr/README.md) before designing anything non-trivial.

## Pull request workflow

1. **Fork & branch** from `main`:
   ```bash
   git checkout -b feat/your-thing
   ```
2. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add diaper logging`
   - `fix: handle SSE reconnect on Safari`
   - `chore: bump prisma to 6.20`
   - `docs: clarify offline sync ADR`
   - `test: cover edge cases in elapsed time formatter`
3. **Run before pushing**:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
4. **Push & open PR**. Fill in the PR template, link any related issues.
5. **CI must be green** to merge.
6. **One approval** from a maintainer required.

## Code style

- TypeScript strict — no `any`, `as` cast requires a `// reason: ...` comment
- IDs are branded types (`BabyId`, `FamilyId`, ...) — never raw `string`
- All boundary inputs validated with Zod
- Errors are discriminated unions (`Result<T, E>`), thrown only at top of stack
- Comments explain **why**, not **what**
- Aim for accessibility (WCAG 2.1 AA): keyboard nav, contrast, ARIA labels
- All user-facing strings live in `apps/web/src/messages/*.json` — never hardcode

## Testing

| Layer                          | Tool                           | Target coverage                          |
| ------------------------------ | ------------------------------ | ---------------------------------------- |
| `domain.ts` (pure)             | Vitest                         | **100%**                                 |
| `repository.ts` / `actions.ts` | Vitest + Testcontainers        | Critical paths                           |
| Components                     | Vitest + React Testing Library | Behavior-focused                         |
| Critical flows                 | Playwright                     | Record → timeline reflects, partner sync |

Run a focused test: `pnpm test -- features/feeding`

## Adding a language

acorn-steps speaks Japanese, English, and Vietnamese out of the box ([ADR-0005](./docs/adr/0005-i18n-strategy.md)). Adding a new locale:

1. Add the locale code to `apps/web/src/i18n/routing.ts` (`locales: ['ja', 'en', 'vi', 'ko']`)
2. Create `apps/web/src/messages/<locale>.json` by copying `ja.json` and translating
3. Verify with `pnpm dev` → `http://localhost:3001/ko`
4. Run `pnpm i18n:check` to verify no keys are missing
5. Open a PR — native-speaker review is requested

**Translation principles:**

- Keep ICU plural/select forms intact: `{count, plural, ...}`
- Preserve `{name}` placeholders verbatim
- Prefer natural phrasing over literal translation
- Add cultural context to PR description when relevant (e.g., diaper terminology)

## Adding an ADR

Significant decisions get an Architecture Decision Record:

```bash
# Pick the next number, create the file
cp docs/adr/0001-architecture-feature-folder.md docs/adr/0006-your-decision.md
# Edit using the structure in the existing ADRs
# Update docs/adr/README.md index
```

## Releasing

We use [changesets](https://github.com/changesets/changesets) for versioning (will be wired in pre-1.0):

```bash
pnpm changeset
# Describe the change, pick semver bump
git add .changeset/
git commit -m "chore: add changeset for your-feature"
```

Maintainers run `pnpm changeset version` on the release branch and tag.

## Questions

Open a [Discussion](https://github.com/chanmatsu-sky/acorn-steps/discussions) or use the [Question template](https://github.com/chanmatsu-sky/acorn-steps/issues/new?template=question.yml).

---

Thanks for helping make life with a newborn a little less chaotic. ✨
