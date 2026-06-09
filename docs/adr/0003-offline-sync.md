# ADR-0003: オフライン同期は IndexedDB outbox + clientId 冪等 upsert

- **Date:** 2026-06-09
- **Status:** Accepted
- **Deciders:** @chanmatsu-sky

## Context

夜間授乳・移動中・通信不安定環境での記録は **絶対に欠損させてはならない** (acorn-steps の MVP 必須要件)。

要件:

1. オフライン状態でも記録ボタンが反応し、データが保持される
2. 通信復帰時に **重複登録なし**、**順序保持**、**ユーザー介入なし** で同期
3. 同一ユーザーが複数デバイス (スマホ + iPad 等) で記録した場合の整合性
4. 同時編集時のコンフリクト解決 (両親が同タイミングで記録した場合等)
5. Service Worker による画面シェル自体のオフライン動作
6. 既存スキーマ (`schema.prisma`) は `clientId` / `clientCreatedAt` フィールドを既に保持

## Decision

**IndexedDB の outbox queue + clientId ベース冪等 upsert + Service Worker** を組み合わせる。

### 4層構成

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: UI (Optimistic)                                │
│  - ボタン押下時に即座にローカル state を更新                  │
│  - 状態: "queued" → "syncing" → "synced" / "failed"      │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│ Layer 2: IndexedDB outbox (Dexie)                       │
│  - tables:                                              │
│    · pending  (送信前)                                   │
│    · synced   (送信済み、TTL 7日でクリーンアップ)            │
│  - 各 entry: { clientId, kind, payload, createdAt, ... } │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│ Layer 3: Sync worker (in-page + service worker)         │
│  - online イベント / 起動時 / 30秒間隔でフラッシュ           │
│  - Background Sync API 対応端末では SW で実行              │
│  - 失敗時 exponential backoff (1s, 2s, 4s, 8s, 30s, ...)│
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│ Layer 4: Server (Server Action)                         │
│  - Zod validate → repository.upsertByClientId           │
│  - Postgres: UNIQUE(familyId, clientId) で冪等性保証     │
│  - 成功時は Realtime broadcast (ADR-0002)                │
└─────────────────────────────────────────────────────────┘
```

### Outbox エントリ仕様

```typescript
type OutboxEntry = {
  // Idempotency
  clientId: string                  // crypto.randomUUID()
  // Routing
  kind: 'feed' | 'diaper' | 'sleep' | 'note' | 'measurement'
  op: 'create' | 'update' | 'delete'
  payload: unknown                  // Zod schema 検証済み
  // Context
  familyId: FamilyId
  babyId?: BabyId
  caretakerId?: CaretakerId
  // Lifecycle
  clientCreatedAt: number           // performance.now() ベース ISO timestamp
  attempts: number
  lastAttemptAt?: number
  lastError?: string
  state: 'pending' | 'syncing' | 'synced' | 'failed'
}
```

### サーバー側 upsert (repository 例)

```typescript
// features/feeding/repository.ts
export async function upsertByClientId(input: ParsedFeedInput) {
  return prisma.feedLog.upsert({
    where: { familyId_clientId: { familyId: input.familyId, clientId: input.clientId } },
    create: { ...input, syncedAt: new Date() },
    update: { ...input, syncedAt: new Date() }, // last-writer-wins for simple fields
  })
}
```

### コンフリクト解決ポリシー

| シナリオ | 解決 |
|---------|------|
| 同じ clientId が再送 | upsert で冪等、副作用なし |
| 異なる clientId で同時刻記録 | 両方残す (両親別記録として正当) |
| 同じレコードを別端末で edit | last-writer-wins (`updatedAt` 比較) |
| 同じレコードを delete + edit 競合 | delete 優先 (`deletedAt` を立てた側を保持) |
| Active feed session が複数 | `babyId` を PK にしているので最新の `updatedAt` 勝ち、過去セッションは feedLog へ flush |

### Service Worker 役割

- `app shell` (HTML / CSS / JS) のキャッシュ → オフライン起動
- API GET のキャッシュ (stale-while-revalidate)
- POST/PATCH/DELETE は **キャッシュしない** (outbox 経由のみ)
- Background Sync で outbox フラッシュ (Chromium 系のみ、フォールバックあり)

## Consequences

### Positive
- ユーザーが「通信あるか」を意識せず記録できる
- 重複・欠損が構造的に発生しない (clientId が冪等性キー)
- スキーマ側で既に対応済 (clientId / clientCreatedAt / syncedAt)
- Offline ファースト OSS としての品質感

### Negative
- 実装複雑度が上がる (outbox queue, sync worker, conflict policy)
- IndexedDB のクォータ上限 (端末で異なる、Safari は控えめ) を考慮
- Service Worker のデプロイ更新フロー設計が必要 (skipWaiting の扱い等)

### Accepted trade-offs
- リアルタイム整合性は捨てる (eventual consistency) — リアルタイム表示は ADR-0002 で別途確保
- 複雑な merge (CRDT) は採用しない — last-writer-wins + 履歴保持で MVP は十分

## Alternatives considered

### A. Service Worker のみ (outbox なし)
- ❌ POST のキャッシュ→リプレイは仕様外、信頼性低
- ❌ 状態が UI から見えない

### B. CRDT (Yjs / Automerge)
- ✅ 完全な分散整合性
- ❌ 育児ログのようなappend主体・親同士の競合稀なユースケースには過剰
- ❌ 学習コスト・バンドルサイズ増

### C. PouchDB + CouchDB 同期
- ✅ proven、双方向 sync
- ❌ Postgres と二重管理になる
- ❌ サーバースタックが膨らむ

### D. Polling のみ (outbox なし、optimistic UI なし)
- ❌ オフライン時に記録不可
- ❌ 夜間 / 移動中の体験が壊れる → MVP 必須要件未達

## Failure modes

- **IndexedDB クォータ超過:** synced エントリを LRU で削除、それでも溢れる場合はユーザーに通知
- **同期5回連続失敗:** ユーザーに「未同期がX件あります」を UI 表示、手動再試行ボタン
- **サーバー側 upsert で validation 失敗:** outbox を `failed` 状態に、ユーザーに該当エントリを編集/破棄させる
- **Service Worker 更新詰まり:** `workbox-window` で更新確認、ユーザー操作で reload

## References

- [Dexie.js — IndexedDB wrapper](https://dexie.org/)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- 関連: [ADR-0002 Realtime](./0002-realtime-strategy.md)
- [schema.prisma の clientId フィールド](../../packages/db/prisma/schema.prisma)
