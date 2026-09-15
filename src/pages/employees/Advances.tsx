import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, Button, Field, Input, useToast, EmptyState } from '../../components/ui'
import { todayISO } from '../../lib/money'

export default function Advances() {
  const { state, session, fmt, t, can, createPayrollRun, setAdvance } = useStore()
  const toast = useToast()
  const cid = session!.companyId

  const draftRun = useMemo(() => state.payrollRuns
    .filter((r) => r.companyId === cid && r.status !== 'paid')
    .sort((a, b) => b.period.localeCompare(a.period))[0], [state, cid])

  const totalAdvance = draftRun ? draftRun.lines.reduce((s, l) => s + l.advance, 0) : 0

  if (!draftRun) {
    return (
      <div>
        <PageHeader title={t('nav.advances')} sub="Ish haqi avanslari" />
        <Card><EmptyState icon="wallet" title="Faol davr yo‘q" desc="Avans kiritish uchun avval ish haqi davrini yarating." action={can('create') ? <Button variant="primary" icon="plus" onClick={() => { createPayrollRun(todayISO().slice(0, 7)); toast('success', 'Davr yaratildi') }}>Davr yaratish</Button> : undefined} /></Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('nav.advances')} sub={`Davr: ${draftRun.period} · jami avans ${fmt(totalAdvance)}`} />

      <Card pad className="mb16">
        <div className="flex between">
          <div className="tiny muted">Avanslar joriy qoralama davrga kiritiladi va to‘lovda hisobdan chiqariladi.</div>
        </div>
      </Card>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Xodim</th><th className="num">Yalpi</th><th className="num">Daromad solig‘i</th><th className="num">Avans</th><th className="num">To‘lov</th></tr></thead>
            <tbody>
              {draftRun.lines.map((l) => {
                const emp = state.employees.find((e) => e.id === l.employeeId)
                return (
                  <tr key={l.employeeId}>
                    <td className="cell-strong">{emp?.name ?? '—'}</td>
                    <td className="num mono">{fmt(l.gross + l.bonus)}</td>
                    <td className="num mono faint">{fmt(l.incomeTax)}</td>
                    <td>
                      <AdvanceInput value={l.advance} onSave={(v) => { setAdvance(draftRun.id, l.employeeId, v); toast('success', 'Avans saqlandi') }} />
                    </td>
                    <td className="num mono strong" style={{ color: 'var(--primary)' }}>{fmt(l.net)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AdvanceInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value ? String(value) : '')
  const { fmt } = useStore()
  if (!editing) {
    return (
      <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <span className="mono">{fmt(value)}</span>
        <Button size="sm" variant="ghost" icon="edit" onClick={() => { setV(value ? String(value) : ''); setEditing(true) }} />
      </div>
    )
  }
  return (
    <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
      <Input type="number" value={v} onChange={(e) => setV(e.target.value)} style={{ width: 130 }} autoFocus />
      <Button size="sm" variant="primary" onClick={() => { onSave(Number(v) || 0); setEditing(false) }}>OK</Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>✕</Button>
    </div>
  )
}
