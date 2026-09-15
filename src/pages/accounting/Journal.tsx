import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, EmptyState, useToast, Confirm } from '../../components/ui'
import { SearchBox, SourceBadge, usePeriod } from '../../components/shared'
import { EntryDetailModal, ManualEntryModal } from '../../components/entry'
import { entryTotals } from '../../engine/ledger'
import { fmtDate } from '../../lib/money'
import type { JournalEntry } from '../../lib/types'

export default function Journal() {
  const { state, session, fmt, t, lang, can, reverseEntryById } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<JournalEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [reversing, setReversing] = useState<JournalEntry | null>(null)

  const entries = useMemo(() => state.entries
    .filter((e) => e.companyId === cid && e.source === 'manual' && e.date >= period.from && e.date <= period.to)
    .filter((e) => !q || e.description.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [state, cid, period, q])

  const balanced = useMemo(() => {
    let d = 0, c = 0
    for (const e of entries) { const t = entryTotals(e.lines); d += t.debit; c += t.credit }
    return d === c
  }, [entries])

  return (
    <div>
      <PageHeader title={t('nav.journal')} sub={`${entries.length} ta qo‘lda provodka`}
        actions={<>{can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi provodka</Button>}</>} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <SearchBox value={q} onChange={setQ} />
        <Badge tone={balanced ? 'green' : 'red'}>{balanced ? 'Balansda ✓' : 'Balans emas ✗'}</Badge>
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Raqam</th><th>Sana</th><th>Tavsif</th><th className="num">Debet</th><th className="num">Kredit</th><th /></tr></thead>
            <tbody>
              {entries.map((e) => {
                const tt = entryTotals(e.lines)
                return (
                  <tr key={e.id} onClick={() => setDetail(e)}>
                    <td className="mono faint">{e.number}</td>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date, lang)}</td>
                    <td><span className="cell-strong">{e.description}</span><div className="cell-sub">{e.lines.length} qator</div></td>
                    <td className="num mono">{fmt(tt.debit)}</td>
                    <td className="num mono">{fmt(tt.credit)}</td>
                    <td><Button size="sm" variant="ghost" icon="refresh" onClick={(ev) => { ev.stopPropagation(); setReversing(e) }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {entries.length === 0 && <EmptyState icon="calc" title="Qo‘lda provodkalar yo‘q" desc="Avtomatik provodkalar Tranzaksiyalar bo‘limida ko‘rinadi." action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi provodka</Button> : undefined} />}
        </div>
      </Card>

      {detail && <EntryDetailModal entry={detail} onClose={() => setDetail(null)} />}
      {creating && <ManualEntryModal onClose={() => setCreating(false)} />}
      <Confirm open={!!reversing} onClose={() => setReversing(null)} title="Provodkani bekor qilish"
        message={<>Provodka ({reversing?.number}) uchun teskari provodka yaratilsinmi?</>} confirmLabel="Bekor qilish"
        onConfirm={() => { if (reversing) { reverseEntryById(reversing.id); toast('success', 'Teskari provodka yaratildi') } }} />
    </div>
  )
}
