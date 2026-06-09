# ADR-0004: 認証は Family PIN + Caretaker サブPIN、Magic Link 任意レイヤー

- **Date:** 2026-06-09
- **Status:** Accepted
- **Deciders:** @chanmatsu-sky

## Context

acorn-steps の認証は以下の独特の制約を満たす必要がある:

1. **頻度が極端に高い** — 1日数十回、夜間も使う → ログインのフリクション禁止
2. **複数記録者** — ママ / パパ / 祖父母 / 保育士 が **同じ家族データを共有** しつつ **誰が記録したか** を区別
3. **同一デバイスで切替** — 「パパのスマホでママが記録」のケースが普通にある
4. **新生児期はアカウント作成すら手間** — sprout-track が PIN を採用しているのはこの理由
5. **自前ホスト時もクラウド時も成立** — SMTP がない環境でも動く
6. **将来のクラウド版** — 招待リンク・OAuth・パスワード復旧パスがほしい

## Decision

**2段階認証モデル: Family PIN (primary) + Caretaker サブPIN (記録者切替) + Magic Link (任意の上位レイヤー)**

### モデル

```
┌────────────────────────────────────────────────┐
│ Family (テナント境界)                            │
│  - slug: "matsumoto-family"                    │
│  - pinHash: bcrypt(6桁数字)                     │
│  - …                                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Caretaker (記録者プロフィール)              │  │
│  │  - name: "ママ" / "パパ" / "おばあちゃん"   │  │
│  │  - quickPin: 4桁 (家族PIN通過後の切替用)   │  │
│  │  - userId?: User と紐付け可能 (任意)       │  │
│  │  - color, kind                             │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
                    ▲
                    │ 任意でリンク
                    │
┌────────────────────────────────────────────────┐
│ User (Auth.js)                                 │
│  - email + Magic Link (SMTP あれば)            │
│  - OAuth (Google / Apple)                       │
│  - 1 User は複数 Family に所属可                │
└────────────────────────────────────────────────┘
```

### 認証フロー

#### A. 初回セットアップ (招待される側)
1. 共有された招待リンクを開く: `/invite/<token>`
2. Family PIN (6桁) を入力 → セッション cookie 発行
3. Caretaker プロフィールを選択 or 新規作成 (名前+4桁PIN+色)
4. 完了

#### B. 通常起動 (信頼デバイス)
- セッション cookie (30日) が有効 → 即ホーム画面
- Last active caretaker が記録者として既定

#### C. 記録者切替 (同一家族内)
- ヘッダーの caretaker chip タップ → 4桁 quickPin 入力 → 切替
- PIN を覚えてないケースを許容: 任意で「PINなし caretaker」も作れる (ただし family PIN は別)

#### D. クラウド版での昇格 (将来)
- Caretaker に User をリンク → Magic Link でメール認証
- パスワード復旧、デバイス横断の同期、招待リンク作成権限

### 実装方針

- **family PIN:** `bcrypt` (cost=10) でハッシュ保管、生PINはDBに残さない
- **quickPin:** 同様に bcrypt
- **セッション:** Auth.js を使う (`session.strategy = 'database'`)。Cookie: `secure + httpOnly + sameSite=lax`、TTL 30日、scope: `/`
- **招待リンク:** `crypto.randomBytes(32).toString('base64url')`、Family テーブルに `FamilyInvite` モデル (既にスキーマあり)、TTL 7日
- **ブルートフォース対策:** 同一IP/Family で 5回失敗 → 15分ロック、ログに記録
- **CSRF:** Server Action はデフォルトで CSRF protected (Next.js)

### 認可 (RLS的)

repository 層で **必ず familyId を WHERE 条件に含める**:

```typescript
// features/feeding/repository.ts
export async function listFeeds({ familyId, babyId, limit }: ListInput) {
  return prisma.feedLog.findMany({
    where: { familyId, babyId, deletedAt: null },  // ← familyId 必須
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}
```

ガード関数で型レベルで強制:

```typescript
// lib/auth/scope.ts
export function withFamilyScope<T>(
  session: Session,
  fn: (familyId: FamilyId) => Promise<T>,
): Promise<T> {
  if (!session.familyId) throw new UnauthorizedError()
  return fn(session.familyId as FamilyId)
}
```

## Consequences

### Positive
- 新生児期の極限疲労状態でも「ロックを開く」レベルの軽さで使える
- 複数記録者を1つの Family にまとめられる
- SMTP 不要 → 自前ホスト・オフライン first 環境でも完結
- Magic Link は orthogonal な追加レイヤー、無くても動く
- 招待 → PIN 共有という導線が直感的 (sprout-track で実証済み)

### Negative
- PIN の強度は6桁数字 = 100万通り、ブルートフォース対策必須
- PIN を共有する文化に依存 (家族のITリテラシ差)
- パスワードリセットの代替 = Family Owner による手動リセット
- 招待リンクの漏洩リスク (TTL + 1回使用で軽減)

### Accepted trade-offs
- 「アカウント主体」の現代的Web標準とは異なる → ドキュメントで丁寧に説明
- Family PIN = 共有秘密 (家族内で1つ)、これは敢えて受け入れる設計

## Alternatives considered

### A. Auth.js (Email Magic Link) のみ
- ❌ 夜間使用時の「メール待ち」が許容できない
- ❌ SMTP 必須
- ❌ 新生児期の「いま手元のスマホで配偶者がパッと記録」が不可能
- ✅ Magic Link 自体は **B. 任意レイヤー** として残す

### B. Username + Password
- ❌ 入力疲労、パスワード管理の負担、リセット用 SMTP 必要
- ❌ PIN 比でメリットなし

### C. OAuth (Google) のみ
- ❌ 自前ホスト時の Google 依存
- ❌ 祖父母にGoogleアカウント要求は厳しい

### D. PIN なし (端末信頼)
- ❌ 端末紛失時のリスク大
- ❌ 共用端末で家族外に見られる懸念

### E. Passkey (WebAuthn)
- ✅ 将来的に有力
- ❌ 2026時点でモバイル間共有が不安定、Magic Link 同様 **C. 任意レイヤー** として後追加検討

## Security checklist

- [ ] PIN は bcrypt cost ≥ 10 でハッシュ保管
- [ ] セッション cookie: `secure + httpOnly + sameSite=lax`
- [ ] 招待トークン: 32バイト crypto random + bcrypt 保管 + TTL 7日 + 一回使い切り
- [ ] Rate limit: 同IP・同family で 5回失敗 → 15分ロック (lib/auth/rate-limit.ts)
- [ ] PIN 入力欄: `autocomplete="off"`、`type="tel"` + `inputmode="numeric"`
- [ ] サインアウト時: cookie 削除 + サーバー側セッション無効化
- [ ] Family Owner のみ family PIN リセット可能
- [ ] CSP: `default-src 'self'` ベース、unsafe-inline 禁止

## Future work

- Passkey 対応 (M3+)
- 招待リンクの代わりに「家族追加QRコード」(NFC sharing 含む)
- Magic Link を Family Owner のみ強制 → 重要操作の二要素として

## References

- sprout-track 認証方式 (試用で参考)
- [Auth.js docs](https://authjs.dev/)
- 関連: [schema.prisma の Family/Caretaker/FamilyInvite モデル](../../packages/db/prisma/schema.prisma)
