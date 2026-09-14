import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Modal, Button, Field, Input, Select, useToast, IconBtn, Badge } from './ui'
import { Icon } from './icons'
import { entryTotals } from '../engine/ledger'
import { fmtDate, todayISO } from '../lib/money'
import { SourceBadge } from './shared'
import type { JournalEntry, JournalLine, AccountType } from '../lib/types'

const CATEGORY_ORDER: Record<string, number> = {
  Asset: 0, Liability: 1, Equity: 2, Revenue: 3, OtherIncome: 4, CostOfGoodsSold: 5, OperatingExpense: 6, OtherExpense: 7,
}

export function EntryDetailModal({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const { state, fmt, lang } = useStore()
  if (!entry) return null
  const t = entryTotals(entry.lines)
  return (
    <Modal open onClose={onClose} title={entry.number} wide>
      <div className="flex between mb8">
        <div className="flex">
          <SourceBadge source={entry.source} />
          <Badge tone="gray">{fmtDate(entry.date, lang)}</Badge>
        </div>
        <span className="tiny faint">{entry.id}</span>
      </div>
      <div className="small muted mb16">{entry.description}</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Hisob</th><th>Kod</th><th className="num">Debet</th><th className="num">Kredit</th></tr></thead>
          <tbody>
            {entry.lines.map((l, i) => {
              const acc = state.accounts.find((a) => a.id === l.accountId)
              return (
                <tr key={i}>
                  <td><span className="cell-strong">{acc?.name ?? '—'}</span>{l.memo && <div className="cell-sub">{l.memo}</div>}</td>
                  <td className="mono faint">{acc?.code}</td>
                  <td className="num mono">{l.debit ? fmt(l.debit) : '—'}</td>
                  <td className="num mono">{l.credit ? fmt(l.credit) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Jami</td>
              <td className="num mono">{fmt(t.debit)}</td>
              <td className="num mono">{fmt(t.credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  )
}

export function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const { state, session, createManualEntry, fmt, t, lang } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const accounts = useMemo(() => state.accounts
    .filter((a) => a.companyId === cid && !a.archived)
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.code.localeCompare(b.code)), [state.accounts, cid])

  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<{ accountId: string; debit: number; credit: number }[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 },
  ])

  const totals = entryTotals(lines.map((l) => ({ accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0 })))
  const diff = totals.debit - totals.credit
  const balanced = totals.debit > 0 && Math.abs(diff) < 0.005

  const setLine = (i: number, patch: Partial<{ accountId: string; debit: number; credit: number }>) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((ls) => [...ls, { accountId: '', debit: 0, credit: 0 }])
  const removeLine = (i: number) => setLines((ls) => (ls.length <= 2 ? ls : ls.filter((_, j) => j !== i)))

  const autoBalance = () => {
    if (diff > 0) {
      // need a credit line
      setLines((ls) => ls.map((l) => (l.credit === 0 && diff > 0 ? { ...l, credit: Math.abs(diff) } : l)))
    } else if (diff < 0) {
      setLines((ls) => ls.map((l) => (l.debit === 0 && diff < 0 ? { ...l, debit: Math.abs(diff) } : l)))
    }
  }

  const submit = () => {
    const valid = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
    if (!description.trim()) { toast('error', 'Tavsif kiriting'); return }
    if (valid.length < 2) { toast('error', 'Kamida 2 ta hisob kerak'); return }
    if (!balanced) { toast('error', `Debet ≠ Kredit (farq: ${fmt(Math.abs(diff))})`); return }
    try {
      createManualEntry({ date, description, lines: valid.map((l) => ({ accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0 })) })
      toast('success', t('toast.posted'))
      onClose()
    } catch (e) {
      toast('error', String(e))
    }
  }

  const moneyInput = (v: number) => (v === 0 ? '' : String(v))

  return (
    <Modal open onClose={onClose} title="Yangi provodka" wide footer={
      <>
        <span className="grow small muted mono">{balanced ? `Balans: ${fmt(totals.debit)} = ${fmt(totals.credit)} ✓` : `Debet: ${fmt(totals.debit)} · Kredit: ${fmt(totals.credit)} · Farq: ${fmt(Math.abs(diff))}`}</span>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="secondary" onClick={autoBalance} disabled={balanced}>Avto-balans</Button>
        <Button variant="primary" onClick={submit} disabled={!balanced || !description.trim()}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Sana"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Tavsif"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Operatsiya tavsifi" /></Field>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th style={{ width: '58%' }}>Hisob</th><th className="num">Debet</th><th className="num">Kredit</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <Select value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                    <option value="">— Hisobni tanlang —</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                  </Select>
                </td>
                <td><Input type="number" min="0" className="num" value={moneyInput(l.debit)} onChange={(e) => setLine(i, { debit: Number(e.target.value) || 0 })} /></td>
                <td><Input type="number" min="0" className="num" value={moneyInput(l.credit)} onChange={(e) => setLine(i, { credit: Number(e.target.value) || 0 })} /></td>
                <td><IconBtn icon="trash" className="danger" onClick={() => removeLine(i)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="soft" size="sm" icon="plus" onClick={addLine} className="mt8">Qator qo‘shish</Button>
      <div className="tiny faint mt8">Debet va kredit yig‘indisi har doim teng bo‘lishi shart — bu ikki tomonlama buxgalteriyaning asosi.</div>
    </Modal>
  )
}

// Line account name helper used by ledgers
export function LineAccount({ accountId }: { accountId: string }) {
  const { state } = useStore()
  const acc = state.accounts.find((a) => a.id === accountId)
  return <span className="cell-strong">{acc?.name ?? '—'}<span className="tiny faint" style={{ marginLeft: 6 }}>{acc?.code}</span></span>
}
