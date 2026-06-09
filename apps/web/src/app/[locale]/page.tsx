import { Droplet, Milk, Moon, Pencil, Plus, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <TimelineView />
}

type LogKind = 'feed' | 'diaper' | 'sleep' | 'note'

type TimelineEvent = {
  id: string
  kind: LogKind
  /** minutes ago from "now" */
  ago: number
  byInitial: string
  byColor: 'mama' | 'papa'
  detail?: string
  durationMin?: number
}

const mock = {
  baby: { name: 'Saki', emoji: '🌸' },
  partnerActive: null as { name: string; kind: LogKind } | null,
  lastKind: 'feed' as LogKind,
  lastAgoMin: 137,
  events: [
    { id: '1', kind: 'feed', ago: 137, byInitial: 'M', byColor: 'mama', detail: 'left', durationMin: 12 },
    { id: '2', kind: 'diaper', ago: 245, byInitial: 'P', byColor: 'papa', detail: 'wet' },
    { id: '3', kind: 'feed', ago: 332, byInitial: 'M', byColor: 'mama', detail: 'right', durationMin: 14 },
    { id: '4', kind: 'sleep', ago: 540, byInitial: 'P', byColor: 'papa', durationMin: 95 },
    { id: '5', kind: 'feed', ago: 678, byInitial: 'M', byColor: 'mama', detail: 'left', durationMin: 9 },
    { id: '6', kind: 'diaper', ago: 805, byInitial: 'P', byColor: 'papa', detail: 'dirty' },
  ] satisfies TimelineEvent[],
}

function TimelineView() {
  const t = useTranslations()
  const e = mock

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[var(--color-canvas)]/85 px-5 pt-5 pb-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {e.baby.emoji}
          </span>
          <span className="text-[15px] font-medium text-[var(--color-ink)]">{e.baby.name}</span>
        </div>
        <button
          aria-label={t('nav.settings')}
          className="press grid h-10 w-10 place-items-center rounded-full text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
        >
          <Settings size={20} strokeWidth={1.75} />
        </button>
      </header>

      {/* Inline status — "Xh Ym → 授乳" */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-baseline gap-2">
          <span className="tabular text-[15px] text-[var(--color-ink-3)]">
            {formatAgo(e.lastAgoMin)}
          </span>
          <span className="text-[15px] text-[var(--color-ink-3)]">→</span>
          <span className="text-[15px] font-medium text-[var(--color-ink)]">
            {t(`kind.${e.lastKind}`)}
          </span>
        </div>
        {e.partnerActive && (
          <div className="mt-2 inline-flex items-center gap-2 text-[13px] text-[var(--color-honey-dim)]">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-honey)]" />
            {t('home.partnerActive', {
              name: e.partnerActive.name,
              kind: t(`kind.${e.partnerActive.kind}`),
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <ol className="relative mt-6 px-5 pb-44">
        <NowAnchor label={t('home.now')} />
        {e.events.map((ev, i) => {
          const next = e.events[i + 1]
          const gapMin = next ? next.ago - ev.ago : null
          return (
            <li key={ev.id}>
              <EventRow ev={ev} />
              {gapMin != null && <Gap minutes={gapMin} />}
            </li>
          )
        })}
        <div className="relative ml-[44px] mt-2 h-6 border-l border-dashed border-[var(--color-line)]" />
      </ol>

      {/* Floating compose */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          aria-label={t('compose.record')}
          className="press pointer-events-auto mx-auto flex h-[60px] w-full max-w-[220px] items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-[0_12px_32px_oklch(0.30_0.030_60/0.20),0_2px_4px_oklch(0.30_0.030_60/0.10)]"
        >
          <Plus size={20} strokeWidth={2.4} />
          <span className="text-[15px] font-semibold">{t('compose.record')}</span>
        </button>
      </div>
    </div>
  )
}

function NowAnchor({ label }: { label: string }) {
  return (
    <li className="relative flex items-center gap-4 pb-2">
      <span className="tabular w-9 text-right text-[12px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
        {label}
      </span>
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[var(--color-honey)]/30" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--color-honey)]" />
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-[var(--color-line)] to-transparent" />
    </li>
  )
}

function EventRow({ ev }: { ev: TimelineEvent }) {
  const Icon = { feed: Milk, diaper: Droplet, sleep: Moon, note: Pencil }[ev.kind]
  const colorVar = `var(--color-${ev.kind})`
  const time = formatAbsTime(ev.ago)
  return (
    <div className="relative flex items-start gap-4 py-2">
      <span className="tabular w-9 pt-1 text-right text-[12px] text-[var(--color-ink-3)]">
        {time}
      </span>
      <span
        className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-[var(--color-canvas)]"
        style={{
          background: `color-mix(in oklch, ${colorVar} 16%, var(--color-surface))`,
          color: colorVar,
        }}
      >
        <Icon size={13} strokeWidth={2.2} />
      </span>
      <div className="flex-1 pt-1">
        <div className="text-[14px] text-[var(--color-ink)]">{describe(ev)}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--color-ink-3)]">
          <CaretakerDot color={ev.byColor} />
          <span>{ev.byInitial === 'M' ? 'ママ' : 'パパ'}</span>
        </div>
      </div>
    </div>
  )
}

function CaretakerDot({ color }: { color: 'mama' | 'papa' }) {
  const bg = color === 'mama' ? 'var(--color-rose)' : 'var(--color-sleep)'
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: bg }}
    />
  )
}

function Gap({ minutes }: { minutes: number }) {
  return (
    <div className="ml-[44px] flex h-12 items-center border-l border-dashed border-[var(--color-line)] pl-4 text-[11px] italic text-[var(--color-ink-3)]">
      <span>{formatGap(minutes)}</span>
    </div>
  )
}

function describe(ev: TimelineEvent) {
  if (ev.kind === 'feed') {
    const side = ev.detail === 'left' ? '左' : ev.detail === 'right' ? '右' : ''
    return `授乳 ${side} ${ev.durationMin}分`
  }
  if (ev.kind === 'diaper') return `オムツ ${ev.detail ?? ''}`
  if (ev.kind === 'sleep') return `睡眠 ${ev.durationMin}分`
  return 'メモ'
}

function formatAgo(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`
}

function formatGap(min: number) {
  if (min < 60) return `${min} min gap`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h gap` : `${h}h ${m}m gap`
}

function formatAbsTime(agoMin: number) {
  // 表示用のmockロジック (本物は date-fns + locale で差替)
  const base = 17 * 60 + 47 // mock "now" = 17:47
  const at = base - agoMin
  const h = ((Math.floor(at / 60) % 24) + 24) % 24
  const m = ((at % 60) + 60) % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
