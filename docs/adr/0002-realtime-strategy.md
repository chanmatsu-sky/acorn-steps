# ADR-0002: リアルタイム同期は Postgres LISTEN/NOTIFY + SSE

- **Date:** 2026-06-09
- **Status:** Accepted
- **Deciders:** @chanmatsu-sky

## Context

acorn-steps のコア差別化は **両親リアルタイム共有** — 片方が授乳を開始したら、もう片方の画面に **2秒以内** に反映される必要がある (sprout-track 試用で確認した最重要要件)。

要件:

1. Family 単位の publish/subscribe (テナント境界)
2. 配信レイテンシ < 2秒
3. 同時接続は 1 family あたり 1〜8 デバイス想定 (両親 + 祖父母 + タブ複数)
4. 全Family合計でも数千接続/同時程度
5. **自前ホスト可** — Pusher/Ably等の外部サービス依存は OSS の理想と相反
6. Vercel / Railway 等の標準的なホストでそのまま動く
7. **Server → Client が主**: 「家族が記録した」「Active feed の進捗」が99%、Client → Server は Server Action で十分

## Decision

**Postgres `LISTEN/NOTIFY` + Server-Sent Events (SSE)** を採用する。

### アーキテクチャ

```
[Client A]                         [Client B]
   │ POST /actions/feeding/start      │
   ▼                                  │
[Server Action]                       │
   │ INSERT INTO ActiveFeedSession    │
   │ NOTIFY family_<id>, '{...}'      │
   ▼                                  │
[Postgres]                            │
   │ pub/sub channel                  │
   └─────────[event]──────────────────┤
                                      ▼
                              [/api/realtime/[familyId] SSE]
                                      │
                                      ▼ ReadableStream
                                  [Client B onmessage]
```

### 実装方針

- **チャンネル名:** `family_<familyId>` (Postgres 識別子制限 63文字に注意)
- **ペイロード:** JSON、Postgres NOTIFY の 8000バイト制限内に収める (大きい場合はIDだけ送り、clientは再fetch)
- **SSE エンドポイント:** `/api/realtime/[familyId]` で Node ランタイム (Edge ではpgクライアント維持が困難)
- **接続確立時の認可:** Cookie の Family PIN/Session を検証
- **再接続:** EventSource の自動再接続 + last-event-id ヘッダーで欠損補完
- **Heartbeat:** 25秒ごとに `:ping\n\n` をproxy timeout対策に送出
- **接続プール:** Server起動時に1本の専用 `pg.Client` で LISTEN、リクエストごとに SSE stream を fork

### TypeScript signature

```typescript
// lib/realtime/server.ts
export function broadcast(familyId: FamilyId, event: RealtimeEvent): Promise<void>

// lib/realtime/sse-handler.ts
export function createSSEHandler(familyId: FamilyId): Response

// app/api/realtime/[familyId]/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
```

## Consequences

### Positive
- 追加サービス不要 (Postgres 1本で済む)
- HTTP/1.1 で動くため proxy / CDN / Service Worker と相性◎
- 自前ホスト時に何も増えない
- iOS Safari 含む全モバイルブラウザでサポート
- Edge Function でなくとも動作 (Node ランタイムで十分)
- `pg_notify` はトランザクション内発火可、原子性が保たれる

### Negative
- 双方向通信が必要になったら別途検討必要 (現状その予定なし)
- Postgres の NOTIFY ペイロードは 8KB 制限 → 大きいペイロードは Pull モデル併用
- SSE 接続は HTTP/1.1 で1接続=1ソケット、HTTP/2 でmultiplex可
- Vercel Hobby だと Function 実行時間 10秒制限 → Pro/Railway で問題なし

### Accepted trade-offs
- WebSocket の bidirectional 性は捨てる (Server Action でカバー)
- Postgres への接続が常時1本占有される (各 server instance につき1)

## Alternatives considered

### A. WebSocket (Soketi 自前 / ws ライブラリ)
- ✅ 双方向、低レイテンシ
- ❌ プロキシ / CDN / Cloudflare 等で扱いに気を遣う
- ❌ コネクション管理が SSE より複雑
- ❌ 本アプリでは双方向必要性が薄い

### B. Supabase Realtime
- ✅ マネージドで楽
- ❌ Supabase 依存 → 自前ホスト時に増える
- ❌ ライセンス・OSS精神とミスマッチ

### C. Pusher / Ably 等のSaaS
- ❌ 外部依存、課金、データ流出懸念

### D. Polling (TanStack Query refetch 5秒間隔)
- ✅ 実装最簡
- ❌ 「リアルタイム共有」の体感を出せない
- ❌ DB 負荷が積み上がる
- 補助 (SSE 切断時のフォールバック) としては併用予定

### E. Vercel Edge + 外部 pub/sub (Upstash QStash 等)
- ❌ 自前ホスト時に追加サービス、複雑

## Failure modes / Fallbacks

- **SSE接続失敗 (旧ブラウザ、企業プロキシ):** 自動で polling モード (5秒) にフォールバック
- **Postgres LISTEN 接続切断:** 専用クライアントを 1秒・5秒・15秒 で再接続、最終的にプロセス再起動
- **NOTIFY 8KB超え:** ID のみ通知、client が REST/Server Action で詳細取得

## References

- PostgreSQL Docs: [LISTEN / NOTIFY](https://www.postgresql.org/docs/current/sql-listen.html)
- MDN: [Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- 関連: [ADR-0003 Offline sync](./0003-offline-sync.md) — 同期失敗時のリカバリ戦略
