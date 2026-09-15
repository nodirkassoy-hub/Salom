import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, EmptyState, useToast, Confirm } from '../../components/ui'
import { SearchBox, FilterChips, SourceBadge, usePeriod, PeriodPicker, ExportMenu } from '../../components/shared'
import { EntryDetailModal, ManualEntryModal } from '../../components/entry'
import { entryTotals } from '../../engine/ledger'
import { fmtDate } from '../../lib/money'
import type { JournalEntry } from '../../lib/types'

type Filter = 'all' | 'manual' | 'invoice' | 'payment' | 'bill' | 'expense' | 'payroll' | 'transfer' | 'other'

export default function Transactions() {
  const { state, session, fmt, t, lang, can, reverseEntryById } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const { period, preset, setPreset } = usePeriod()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [detail, setDetail] = useState<JournalEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [reversing, setReversing] = useState<JournalEntry | null>(null)

  const entries = useMemo(() => {
    const list = state.entries.filter((e) => e.companyId === cid && e.date >= period.from && e.date <= period.to)
    return list
      .filter((e) => {
        if (filter === 'all') return true
        if (filter === 'other') return !['manual', 'invoice', 'payment', 'bill', 'expense', 'payroll', 'transfer'].includes(e.source)
        return e.source === filter
      })
      .filter((e) => !q || e.description.toLowerCase().includes(q.toLowerCase()) || e.number.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [state, cid, period, filter, q])

  const totalDebit = entries.reduce((s, e) => s + entryTotals(e.lines).debit, 0)

  return (
    <div>
      <PageHeader title={t('nav.transactions')} sub={`${entries.length} ta provodka · jami aylanma ${fmt(totalDebit)}`}
        actions={<>
          <ExportMenu getRows={() => [['Raqam', 'Sana', 'Tavsif', 'Manba', 'Debet', 'Kredit'], ...entries.map((e) => { const tt = entryTotals(e.lines); return [e.number, e.date, e.description, e.source, tt.debit, tt.credit] })]} filename="transactions" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>{t('common.create')}</Button>}
        </>} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <div className="flex wrap" style={{ gap: 10 }}>
          <SearchBox value={q} onChange={setQ} />
          <PeriodPicker preset={preset} setPreset={setPreset} setCustom={() => {}} />
        </div>
      </div>

      <Card>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <FilterChips<Filter> value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'manual', label: 'Qo‘lda' },
            { value: 'invoice', label: 'Faktura' },
            { value: 'payment', label: 'To‘lov' },
            { value: 'bill', label: 'Bill' },
            { value: 'expense', label: 'Xarajat' },
            { value: 'payroll', label: 'Ish haqi' },
            { value: 'transfer', label: 'O‘tkazma' },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Raqam</th><th>Sana</th><th>Tavsif</th><th>Manba</th><th className="num">Summa</th><th /></tr></thead>
            <tbody>
              {entries.slice(0, 200).map((e) => {
                const tt = entryTotals(e.lines)
                return (
                  <tr key={e.id} onClick={() => setDetail(e)}>
                    <td className="mono faint">{e.number}</td>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date, lang)}</td>
                    <td><span className="cell-strong">{e.description}</span></td>
                    <td><SourceBadge source={e.source} /></td>
                    <td className="num mono strong">{fmt(tt.debit)}</td>
                    <td><Button size="sm" variant="ghost" icon="refresh" onClick={(ev) => { ev.stopPropagation(); setReversing(e) }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {entries.length === 0 && <EmptyState icon="layers" title={t('empty.transactions')} />}
        </div>
      </Card>

      {detail && <EntryDetailModal entry={detail} onClose={() => setDetail(null)} />}
      {creating && <ManualEntryModal onClose={() => setCreating(false)} />}
      <Confirm open={!!reversing} onClose={() => setReversing(null)} title="Provodkani bekor qilish"
        message={<>Ushbu provodka ({reversing?.number}) uchun teskari provodka yaratilsinmi? Asl provodka saqlanib qoladi, teskari provodka qo‘shiladi.</>}
        confirmLabel="Bekor qilish"
        onConfirm={() => { if (reversing) { reverseEntryById(reversing.id); toast('success', 'Teskari provodka yaratildi') } }} />
    </div>
  )
}
