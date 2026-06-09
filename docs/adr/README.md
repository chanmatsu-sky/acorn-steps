# Architecture Decision Records

acorn-steps の主要な技術的意思決定の記録。新規参加者・自分の未来形が「なぜこうなっているか」を辿れるようにする。

書式は軽量MADR。各ADRは次の構成:

1. **Status** — Proposed / Accepted / Deprecated / Superseded by X
2. **Context** — 何の問題を解こうとしているか、何が制約か
3. **Decision** — 決めたこと (1〜2文)
4. **Consequences** — 良い面・悪い面・受け入れたトレードオフ
5. **Alternatives considered** — 検討した他案と却下理由
6. **References** — 外部資料・関連ADR

## Index

| ID | Title | Status |
|----|-------|--------|
| [0001](./0001-architecture-feature-folder.md) | Feature-folder + 薄いドメイン層を採用 | Accepted |
| [0002](./0002-realtime-strategy.md) | リアルタイム同期は Postgres LISTEN/NOTIFY + SSE | Accepted |
| [0003](./0003-offline-sync.md) | オフライン同期は IndexedDB outbox + clientId 冪等 upsert | Accepted |
| [0004](./0004-auth-strategy.md) | 認証は Family PIN + Caretaker サブPIN、Magic Link 任意レイヤー | Accepted |
| [0005](./0005-i18n-strategy.md) | i18n は next-intl + ICU MessageFormat、locale は ja/en/vi | Accepted |
