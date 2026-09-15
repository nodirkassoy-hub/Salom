import React, { useState } from 'react'
import { useStore } from '../lib/store'
import { Badge, Button, Menu, Segmented, Input, Select, Tone, IconBtn } from './ui'
import { Icon, IconName } from './icons'
import { downloadCSV, downloadJSON, cx } from '../lib/utils'
import { todayISO, monthStart, monthEnd } from '../lib/money'
import type { InvoiceStatus, BillStatus, AlertSeverity, DocumentStatus, MovementType, EntrySource } from '../lib/types'

// ---------- status metadata ----------
export const INVOICE_STATUS: Record<InvoiceStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'gray', label: 'Qoralama' },
  sent: { tone: 'blue', label: 'Jo‘natilgan' },
  partially_paid: { tone: 'amber', label: 'Qisman to‘langan' },
  paid: { tone: 'green', label: 'To‘langan' },
  overdue: { tone: 'red', label: 'Muddati o‘tgan' },
  cancelled: { tone: 'gray', label: 'Bekor qilingan' },
}

export const BILL_STATUS: Record<BillStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'gray', label: 'Qoralama' },
  open: { tone: 'amber', label: 'Ochiq' },
  partially_paid: { tone: 'amber', label: 'Qisman' },
  paid: { tone: 'green', label: 'To‘langan' },
  overdue: { tone: 'red', label: 'Muddati o‘tgan' },
  cancelled: { tone: 'gray', label: 'Bekor qilingan' },
}

export const SEVERITY: Record<AlertSeverity, { tone: Tone; label: string }> = {
  critical: { tone: 'red', label: 'Kritik' },
  high: { tone: 'amber', label: 'Yuqori' },
  medium: { tone: 'blue', label: 'O‘rta' },
  low: { tone: 'gray', label: 'Past' },
}

export function severityMeta(s: AlertSeverity): { tone: Tone; label: string } {
  return SEVERITY[s] ?? SEVERITY.low
}

export const DOC_STATUS: Record<DocumentStatus, { tone: Tone; label: string }> = {
  uploaded: { tone: 'gray', label: 'Yuklangan' },
  extracted: { tone: 'blue', label: 'AI o‘qidi' },
  reviewed: { tone: 'amber', label: 'Ko‘rib chiqildi' },
  posted: { tone: 'green', label: 'Provodka qilindi' },
  archived: { tone: 'gray', label: 'Arxiv' },
}

export const MOVEMENT: Record<MovementType, { tone: Tone; label: string; icon: IconName }> = {
  in: { tone: 'green', label: 'Kirim', icon: 'arrowDown' },
  out: { tone: 'red', label: 'Chiqim', icon: 'arrowUp' },
  transfer: { tone: 'blue', label: 'O‘tkazma', icon: 'refresh' },
  adjust: { tone: 'violet', label: 'Korreksiya', icon: 'edit' },
}

export const SOURCE_META: Record<EntrySource, { tone: Tone; label: string; icon: IconName }> = {
  manual: { tone: 'violet', label: 'Qo‘lda', icon: 'edit' },
  invoice: { tone: 'blue', label: 'Faktura', icon: 'receipt' },
  payment: { tone: 'green', label: 'To‘lov', icon: 'wallet' },
  bill: { tone: 'amber', label: 'Bill', icon: 'file' },
  bill_payment: { tone: 'green', label: 'Bill to‘lovi', icon: 'wallet' },
  expense: { tone: 'red', label: 'Xarajat', icon: 'cart' },
  inventory: { tone: 'sky', label: 'Ombor', icon: 'box' },
  payroll: { tone: 'violet', label: 'Ish haqi', icon: 'users' },
  transfer: { tone: 'blue', label: 'O‘tkazma', icon: 'refresh' },
  bank_import: { tone: 'sky', label: 'Bank import', icon: 'bank' },
  opening: { tone: 'gray', label: 'Boshlang‘ich', icon: 'flag' },
  adjustment: { tone: 'violet', label: 'Korreksiya', icon: 'edit' },
}

export function SourceBadge({ source }: { source: EntrySource }) {
  const m = SOURCE_META[source] ?? SOURCE_META.manual
  return <Badge tone={m.tone}>{m.label}</Badge>
}

// ---------- period state ----------
export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom'
export interface Period { from: string; to: string }
export function usePeriod(): { period: Period; preset: PeriodPreset; setPreset: (p: PeriodPreset) => void; setCustom: (from: string, to: string) => void; label: string } {
  const ym = todayISO().slice(0, 7)
  const [preset, setPreset] = useState<PeriodPreset>('thisMonth')
  const [custom, setCustomState] = useState<Period>({ from: monthStart(ym), to: monthEnd(ym) })

  const compute = (): Period => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    switch (preset) {
      case 'thisMonth': return { from: monthStart(ym), to: monthEnd(ym) }
      case 'lastMonth': {
        const d = new Date(y, m - 1, 1)
        const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return { from: monthStart(ym2), to: monthEnd(ym2) }
      }
      case 'thisQuarter': {
        const q = Math.floor(m / 3)
        const from = `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`
        const to = monthEnd(`${y}-${String(q * 3 + 3).padStart(2, '0')}`)
        return { from, to }
      }
      case 'thisYear': return { from: `${y}-01-01`, to: `${y}-12-31` }
      case 'custom': return custom
    }
  }
  const period = compute()
  const labels: Record<PeriodPreset, string> = { thisMonth: 'Shu oy', lastMonth: 'O‘tgan oy', thisQuarter: 'Chorak', thisYear: 'Yil', custom: 'Davr' }
  return { period, preset, setPreset, setCustom: (from, to) => setCustomState({ from, to }), label: labels[preset] }
}

export function PeriodPicker({ preset, setPreset, setCustom }: { preset: PeriodPreset; setPreset: (p: PeriodPreset) => void; setCustom: (f: string, t: string) => void }) {
  return (
    <Segmented<PeriodPreset> value={preset} onChange={setPreset} options={[
      { value: 'thisMonth', label: 'Oy' },
      { value: 'lastMonth', label: 'O‘tgan oy' },
      { value: 'thisQuarter', label: 'Chorak' },
      { value: 'thisYear', label: 'Yil' },
      { value: 'custom', label: 'Davr' },
    ]} />
  )
}

// ---------- Export ----------
export function ExportMenu({ getRows, filename, json }: { getRows: () => (string | number)[][]; filename: string; json?: () => unknown }) {
  return (
    <Menu
      align="right"
      trigger={<Button icon="download" variant="secondary">Export</Button>}
      items={[
        { label: 'CSV', icon: 'download', onClick: () => downloadCSV(`${filename}.csv`, getRows()) },
        { label: 'Excel (.xls)', icon: 'download', onClick: () => downloadCSV(`${filename}.xls`, getRows()) },
        ...(json ? [{ label: 'JSON', icon: 'download' as const, onClick: () => downloadJSON(`${filename}.json`, json!()) }] : []),
      ]}
    />
  )
}

// ---------- Search box ----------
export function SearchBox({ value, onChange, placeholder = 'Qidirish…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon name="search" size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 32, width: 220 }} />
    </div>
  )
}

// ---------- Filter chips ----------
export function FilterChips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="pill-row">
      {options.map((o) => (
        <button key={o.value} className={cx('filter-chip', value === o.value && 'active')} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="tiny" style={{ opacity: 0.7 }}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ---------- Stat grid ----------
export function StatGrid({ items }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone }[] }) {
  return (
    <div className="grid grid-3 mb16">
      {items.map((it, i) => (
        <div className="stat-block" key={i}>
          <span className="stat-label">{it.label}</span>
          <span className="stat-value mono" style={it.tone ? { color: toneColor(it.tone) } : undefined}>{it.value}</span>
          {it.sub && <span className="tiny faint">{it.sub}</span>}
        </div>
      ))}
    </div>
  )
}
function toneColor(t: Tone): string {
  return { green: 'var(--primary)', red: 'var(--danger)', amber: 'var(--warning-ink)', blue: 'var(--blue)', violet: 'var(--violet)', sky: 'var(--sky-ink)', gray: 'var(--ink)' }[t]
}

// ---------- name lookups ----------
export function accountName(state: ReturnType<typeof useStore>['state'], id: string): string {
  return state.accounts.find((a) => a.id === id)?.name ?? '—'
}
export function partyName(state: ReturnType<typeof useStore>['state'], id: string): string {
  return state.parties.find((p) => p.id === id)?.name ?? '—'
}

// ---------- confirm hook ----------
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; message: React.ReactNode; title: string; onYes: () => void }>({ open: false, message: '', title: '', onYes: () => {} })
  const confirm = (title: string, message: React.ReactNode, onYes: () => void) => setState({ open: true, title, message, onYes })
  return { confirmState: state, confirm, closeConfirm: () => setState((s) => ({ ...s, open: false })) }
}
