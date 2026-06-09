# ADR-0001: Feature-folder + 薄いドメイン層を採用

- **Date:** 2026-06-09
- **Status:** Accepted
- **Deciders:** @chanmatsu-sky

## Context

acorn-steps はOSS PWAであり、以下の要件を満たす必要がある:

- 個人〜小規模での開発 (初期は1人、OSSコントリビューターを後から受け入れる)
- リアルタイム同期・オフライン対応・マルチテナンシー (Family単位) という構造的複雑性
- 「コードを読んで理解しやすい」「テストしやすい」「機能追加時の影響範囲が局所的」
- 「OSSとして恥ずかしくない」品質基準 (`memory: quality_manifest`)

既存OSS (sprout-track, babybuddy) は機能別ではなくレイヤー別フォルダ (models/, views/, services/) を採用しており、機能追加時にファイルが多数の場所に散らばる。これは中規模になると保守性を損なう。

一方、フルDDD (Aggregate Root クラス、Value Object クラス、Application Service、Domain Event Bus、Repository Interface...) は本アプリの規模に対して過剰であり、OSSコントリビューターの学習コストを不当に上げる。

## Decision

**Feature-folder + 薄いドメイン層** を採用する。

```
apps/web/src/
├── app/                        # Next.js routes (薄い、UI shell)
│   └── [locale]/...
├── features/
│   ├── feeding/
│   │   ├── domain.ts           # 型・Zod schema・純粋関数
│   │   ├── actions.ts          # Server Actions
│   │   ├── repository.ts       # Prisma 呼び出し集約
│   │   ├── events.ts           # Realtime/notify 発火
│   │   ├── ui/                 # React components
│   │   ├── README.md           # 機能の責務・境界
│   │   └── __tests__/
│   ├── diaper/
│   ├── sleep/
│   ├── family/
│   ├── caretaker/
│   └── notifications/
├── lib/                        # 横断
│   ├── auth/
│   ├── db.ts
│   ├── env.ts                  # Zod-validated env vars
│   ├── realtime/
│   ├── offline/
│   ├── i18n.ts
│   └── ids.ts                  # Branded types
└── shared/                     # UI kit (Button, Sheet, ...)
```

### 不変ルール

1. **Feature間の直接 import 禁止** — 横断連携が必要なら `lib/events` を経由
2. **Prisma 型は repository.ts の外に出さない** — Pick / Zod-derived の型のみ返却
3. **Server Action の流れは厳格に**: `validate (Zod) → use case (domain) → repository`
4. **純粋関数 (domain.ts) は副作用ゼロ** — テスト100%目標
5. **各 feature に `README.md`** — 責務・境界・依存関係を明文化

## Consequences

### Positive
- 機能追加時に新規 `features/<x>/` を作るだけで完結 → 影響範囲が予測可能
- 新規コントリビューターが「1機能を追加してみる」のハードルが低い
- テスト戦略が機能ごとに閉じる
- ファイル名から機能を即特定できる
- 機能の不要化時に1フォルダ削除で済む

### Negative
- 機能間で似たUIパターンが分散しがち → `shared/` で吸収する規律が必要
- "feature" の境界判断にレビューコストがかかる (ADR-0001 を根拠に判断)
- Prisma の relation を跨ぐクエリで repository の責務分担に迷う場面が出る

### Accepted trade-offs
- フルDDD で得られる「ドメインモデルの純粋性」は諦める → Zod schema + Prisma 型で代用
- レイヤー別構造で得られる「同類処理の集約」は諦める → 機能内重複は許容

## Alternatives considered

### A. レイヤー別構造 (sprout-track 風)
- `models/`, `actions/`, `components/` で分ける
- ❌ 機能追加で複数フォルダ往復、影響範囲が広がる、新規参入が「何がどこ」を覚える必要

### B. フルDDD / Clean Architecture
- Aggregate Root、Value Object、Application Service、Repository Interface、Use Case クラス
- ❌ 本アプリの複雑度に対して過剰、OSSコントリビューターの学習コスト過大
- ❌ Prisma の自然な使い方と衝突 (anti-corruption layer 必須化)

### C. モジュール (NestJS 風)
- @Module でDIする
- ❌ Next.js のエコシステムと相性悪い、Server Component と二重管理になる

### D. Monorepo で feature を package 化
- `packages/feeding`, `packages/diaper` ...
- ❌ ビルド分断が過剰、初期にやるべきではない

## References

- [Quality Manifest (project memory)](../../README.md)
- Cosmic JS / Vercel テンプレ系の feature-folder 例
- "Domain-Driven Design Distilled" — V. Vernon (採用しない部分の判断材料)
