# ADR-0005: i18n は next-intl + ICU MessageFormat、locale は ja/en/vi

- **Date:** 2026-06-09
- **Status:** Accepted
- **Deciders:** @chanmatsu-sky

## Context

acorn-steps のコア差別化の1つは **日本語+ベトナム語両対応** ([[i18n-requirement]] memory)。既存OSS育児アプリで両方をサポートするものは確認できず、これは市場ポジショニング上の重要要素。

要件:

1. **JP / EN / VI** が初期サポート (将来 zh-TW / ko 等の追加が容易)
2. **複数形・性別** を正しく扱う ("5 feeds today" の英語複数、ベトナム語の量詞「lần」等)
3. **Date / Time / 量の単位** がロケール対応 (JP は 24時間制+`時/分`、EN は 12時間制+AM/PM、VI は 24時間制)
4. **DB データはロケール非依存** (生データ保存、表示時に変換)
5. **コミュニティ翻訳貢献** が容易 (`messages/<locale>.json` の単純構造)
6. **検索エンジンに対するロケールヒント** (hreflang)
7. **ベトナム語の長文字列** がレイアウトを壊さない (デザイン側の責任)

## Decision

**next-intl + ICU MessageFormat + messages/{ja,en,vi}.json + locale prefix `as-needed`** を採用。

### 構成

```
apps/web/src/
├── i18n/
│   ├── routing.ts          # locale list, default, prefix policy
│   └── request.ts          # getRequestConfig (messages loader)
├── messages/
│   ├── ja.json             # primary (default)
│   ├── en.json
│   └── vi.json
└── middleware.ts           # createMiddleware(routing)
```

### locale policy

| | 値 |
|---|---|
| サポート locale | `ja`, `en`, `vi` |
| デフォルト | `ja` |
| URL prefix | `as-needed` (`/` = ja, `/en/...`, `/vi/...`) |
| 検出順 | URL → cookie (`NEXT_LOCALE`) → `Accept-Language` → デフォルト |
| フォールバック | 翻訳キー不在時: `ja` → key そのもの (開発時はwarn) |

### messages 構造

ネストは **意味ドメインで2階層まで**:

```json
{
  "kind": { "feed": "授乳", "diaper": "オムツ" },
  "home": { "sinceLastFeed": "前回授乳から" },
  "compose": {
    "record": "記録する",
    "feed.sideLeft": "左",
    "feed.sideRight": "右"
  }
}
```

- ❌ 過剰な深いネスト (`home.section.subsection.label`) は避ける
- ❌ 同じテキストの重複定義は避ける (共通は `common.*` に)
- ✅ feature 名前空間 (`feeding.*`, `diaper.*`) で機能と対応

### ICU MessageFormat の使い方

```json
{
  "home": {
    "feedsToday": "{count, plural, =0 {今日はまだ記録なし} one {今日 # 回} other {今日 # 回}}"
  }
}
```

```tsx
const t = useTranslations()
t('home.feedsToday', { count: 5 })
```

- 全ての可変要素 (人名、回数、duration) は ICU で書く
- 文字列連結禁止 (`${name}さん` のような書き方も messages 内で表現)

### Date / Time / 数値

`Intl.DateTimeFormat` / `Intl.NumberFormat` を `lib/i18n/format.ts` でラップ:

```typescript
// lib/i18n/format.ts
export function formatTime(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',     // EN だけ 12h
  }).format(d)
}
```

| locale | 日付例 | 時刻例 | 量例 |
|--------|--------|--------|------|
| ja | 2026年6月9日 | 17:30 | 30ml |
| en | Jun 9, 2026 | 5:30 PM | 1 fl oz |
| vi | 9 thg 6, 2026 | 17:30 | 30ml |

### DB 側

- `User.locale` enum (`ja` / `en` / `vi`) で個人設定保持
- 自由文字列 (notes, solidFood) は **そのまま保存** (翻訳しない)
- enum (`FeedType`, `BreastSide` 等) は DB に英語キーで保存、表示時に i18n キー経由

### ベトナム語特有の配慮

- 母音記号 (`á à ả ã ạ` 等) のフォントサポート → Inter / Noto Sans に subset 含める (Next.js Font で対応済)
- 長い文字列 (e.g., "Cài đặt thông báo" vs 「通知設定」) → デザイン側で flex/min-width で吸収
- 数値の小数点・3桁区切り (VI は `.` 区切り、`,` 小数) → `Intl.NumberFormat` で自動

### hreflang / SEO

```tsx
// layout.tsx
<head>
  <link rel="alternate" hreflang="ja" href={`${baseUrl}/`} />
  <link rel="alternate" hreflang="en" href={`${baseUrl}/en`} />
  <link rel="alternate" hreflang="vi" href={`${baseUrl}/vi`} />
  <link rel="alternate" hreflang="x-default" href={baseUrl} />
</head>
```

next-intl の middleware が Link ヘッダーに自動付与 (確認済み、現状動作中)。

## Consequences

### Positive
- next-intl は Next.js 15 App Router 対応で安定、Server Component fully supported
- ICU は de facto 標準、翻訳ツール (Crowdin / Lokalise / Weblate) と互換
- Messages を JSON 単体ファイルにすることでコミュニティ翻訳の PR が簡単
- 3 locale 対応で実装上の "locale-agnostic思考" が定着、後追加が容易

### Negative
- 翻訳キーの命名規約に規律が必要 → CONTRIBUTING.md に明文化
- 未翻訳キーの検出を CI で行う必要 (`scripts/check-i18n.ts`)
- ベトナム語ネイティブのレビューが理想 (初期は機械翻訳ベース → コントリビューター募集)

### Accepted trade-offs
- 1つの言語をハードコードする「速度優位」は捨てる → 最初から3言語前提
- 翻訳ファイルの肥大化 → feature ごとの sub-import 化は将来検討

## Alternatives considered

### A. react-i18next
- ✅ 広く普及
- ❌ Next.js App Router 公式サポートが弱い (next-intl の方が滑らか)

### B. Lingui
- ✅ 高速 macro 変換、ファイルサイズ最適化
- ❌ ビルド時 macro が App Router で扱いに気を遣う
- 将来パフォーマンス問題が出たら再検討候補

### C. ハードコード文字列 + 後追い翻訳
- ❌ [[i18n-requirement]] で「最初から組み込む」と確定済み
- ❌ 後付けは漏れが出やすい

### D. Crowdin / Lokalise の有料 SaaS
- ✅ 翻訳プロセスが整う
- ❌ OSS 初期で導入は重い → GitHub PR ベースで開始、規模に応じて検討

## Translation contribution flow

1. 翻訳者は `messages/<locale>.json` を編集
2. 不足キーは `messages/ja.json` を参照し、対応するキーを追加
3. PR 作成 → CI が `scripts/check-i18n.ts` で構造一致を検証
4. メンテナがレビュー → merge

`CONTRIBUTING.md` の "Adding a new language" セクションに記載予定。

## Implementation checklist

- [x] next-intl 導入
- [x] routing / request / middleware 設定
- [x] messages/{ja,en,vi}.json 初期作成
- [x] layout.tsx で Inter + Noto Sans JP フォント読み込み
- [ ] `lib/i18n/format.ts` (date / time / number / weight / volume)
- [ ] `scripts/check-i18n.ts` (キー欠落検出 + CI 接続)
- [ ] ICU MessageFormat の使用例を CONTRIBUTING に記載
- [ ] DB の `Locale` enum を `prisma/schema.prisma` に同期 (`ja / en / vi`)
- [ ] hreflang 確認 (Link ヘッダー出力済、HTML head にも明示)

## References

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [[i18n-requirement]] (project memory)
- 関連: [Quality Manifest — i18n セクション](../../README.md)
