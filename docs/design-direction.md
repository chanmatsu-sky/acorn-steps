# baby-log Design Direction

## One-line
**Adult-grade baby tool** — 子ども向けではなく、寝不足の大人のための道具。

## Purpose
3AMの片手・暗所での記録を1秒で完了。配偶者の動きを即座に把握。

## Audience
- 寝不足の親 (mom/dad/co-parent)
- 祖父母・保育士 (一時的に記録)
- **NOT 赤ちゃん向け、NOT 親子で見るアプリ**

## Tone
Calm warmth・restrained・成熟した道具感。
- ❌ 幼児向けパステル、cartoon、過剰な絵文字
- ❌ SaaS的に冷たい無機質
- ✅ 良い手帳・Things 3・Stoic Journal・Apple Watch fitness app の温度感

## Memorable detail
**「ボタン自身が状態計器」** — 各アクションボタンが前回からの経過時間を内部に表示。
記録のために押すボタンが、同時に「いま何時間経った」のインジケーターになる。

## Design tokens

### Palette: Warm Linen
ベース: クリーム/リネン (純白ではなく暖色off-white)
プライマリ: 蜂蜜色 deep honey (#B8732B 系) — 警告色だが赤ではない
セカンダリ: セージグリーン (#7C8B6F 系) — 落ち着き
アクセント: ダスティローズ (#C4837A 系) — 強調用
夜間: 暖色チャコール (#1F1810 系) — 純黒ではない

### Typography
- Sans: Inter Variable (Latin) + Noto Sans JP (日本語) + Noto Sans (ベトナム語)
- Numerals: tabular figures for elapsed time
- Base: 16px mobile / 17px desktop, line-height 1.55
- Display: 32-40px、tight tracking
- 経過時間ディスプレイ: tabular-nums で固定幅

### Spacing & shape
- Tap target: **最小 56px**, 主要アクションは 72px
- Radius: 18-24px (rounded だが bubble ではない)
- Vertical rhythm: 8px base, generous 24-32px gaps in mobile

### Motion
- 配偶者の記録が同期した瞬間に、その項目が spring で「現れる」(1度だけ、500ms)
- ボタン押下: 軽い scale (0.96) + haptic vibration
- 装飾アニメーションは一切なし

## Home screen composition (mobile-first)

```
┌─────────────────────────────┐
│ 🌸 Saki  (赤ちゃん名)  ⚙   │  ← 控えめなトップバー
├─────────────────────────────┤
│                             │
│   2 時間 17 分              │  ← Hero: 最後のイベントからの経過
│   前回授乳から              │
│   👤 ママ                   │
│                             │
│   ● 配偶者が記録中           │  ← live indicator (該当時のみ)
├─────────────────────────────┤
│  ┌──────┐ ┌──────┐         │
│  │ 授乳  │ │オムツ │         │  ← Quick actions
│  │ 2:17 │ │ 0:43 │         │     ボタン内に経過時間
│  └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐         │
│  │ 睡眠  │ │ メモ  │         │
│  │ 5:21 │ │      │         │
│  └──────┘ └──────┘         │
├─────────────────────────────┤
│  最近                        │
│   15:30  授乳 (左) 12分      │  ← Timeline
│   13:42  オムツ wet          │
│   12:15  授乳 (右) 14分      │
│   ...                        │
└─────────────────────────────┘
   ホーム  グラフ  家族         ← Bottom nav (片手親指エリア)
```

## What this rejects
- 「ようこそ」のマーケコピー → 即座にツール画面
- カードの中にカード
- 紫グラデ・blob・ベクター絵
- 単色 (オレンジだけ) パレット
- 装飾的アニメーション

## What this commits to
- 初回ビューポートで主作業が完結する
- 経過時間の常時可視化
- 暗所での視認性 (light/dark両対応の温色ベース)
- 3言語のラベル幅差を吸収する flexible grid
