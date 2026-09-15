import type { Currency, Lang } from './types'

// Money is stored as integer minor units (cents / tiyin) to keep
// double-entry arithmetic exact (debits === credits always).
// UZS renders without decimals; USD/EUR/RUB render with 2.

export const CURRENCY_INFO: Record<Currency, { symbol: string; decimals: number; label: string }> = {
  UZS: { symbol: 'so‘m', decimals: 0, label: 'UZS' },
  USD: { symbol: '$', decimals: 2, label: 'USD' },
  EUR: { symbol: '€', decimals: 2, label: 'EUR' },
  RUB: { symbol: '₽', decimals: 2, label: 'RUB' },
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100
export const eq = (a: number, b: number): boolean => Math.abs(a - b) < 0.005

export function toMinor(amount: number, currency: Currency = 'UZS'): number {
  const d = CURRENCY_INFO[currency].decimals
  return Math.round(amount * Math.pow(10, d))
}

export function fromMinor(amount: number, currency: Currency = 'UZS'): number {
  const d = CURRENCY_INFO[currency].decimals
  return round2(amount / Math.pow(10, d))
}

const LANG_LOCALE: Record<Lang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

export function fmtNumber(n: number, lang: Lang = 'en', decimals?: number): string {
  try {
    return new Intl.NumberFormat(LANG_LOCALE[lang], {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 2,
    }).format(n)
  } catch {
    return n.toLocaleString('en-US')
  }
}

export function fmtMoney(
  amountMinor: number,
  currency: Currency = 'UZS',
  lang: Lang = 'en',
  opts: { sign?: boolean; decimals?: number } = {},
): string {
  const info = CURRENCY_INFO[currency]
  const decimals = opts.decimals ?? info.decimals
  const value = fromMinor(amountMinor, currency)
  const sign = opts.sign && value > 0 ? '+' : ''
  const num = fmtNumber(Math.abs(value), lang, decimals)
  const negative = value < 0
  const body = `${sign}${num} ${info.symbol}`
  return negative ? `-${num} ${info.symbol}` : body
}

// Compact number for axis labels (e.g. 128.5M)
export function fmtCompact(amountMinor: number, currency: Currency, lang: Lang = 'en'): string {
  const v = fromMinor(amountMinor, currency)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  const fmt = (n: number, d = 1) => `${sign}${fmtNumber(n, lang, d)}`
  if (abs >= 1_000_000_000) return `${fmt(abs / 1_000_000_000)} mlrd`
  if (abs >= 1_000_000) return `${fmt(abs / 1_000_000)} mln`
  if (abs >= 1_000) return `${fmt(abs / 1_000)} ming`
  return fmt(abs, CURRENCY_INFO[currency].decimals)
}

export function fmtPercent(n: number, lang: Lang = 'en', digits = 1): string {
  return `${fmtNumber(n, lang, digits)}%`
}

export function fmtDate(iso: string, lang: Lang = 'en'): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(LANG_LOCALE[lang], { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return d.toLocaleDateString()
  }
}

export function fmtDateShort(iso: string, lang: Lang = 'en'): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(LANG_LOCALE[lang], { day: '2-digit', month: '2-digit' }).format(d)
  } catch {
    return iso.slice(5)
  }
}

export function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.round((db - da) / 86_400_000)
}

export function monthLabel(ym: string, lang: Lang = 'en'): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  try {
    return new Intl.DateTimeFormat(LANG_LOCALE[lang], { month: 'long', year: 'numeric' }).format(d)
  } catch {
    return ym
  }
}

export function currentMonth(): string {
  return todayISO().slice(0, 7)
}

export function monthStart(ym: string): string {
  return `${ym}-01`
}

export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate().toString().padStart(2, '0')}`
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
