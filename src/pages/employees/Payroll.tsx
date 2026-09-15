import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState } from '../../components/ui'
import { fmtDate, todayISO } from '../../lib/money'
import type { PayrollRun } from '../../lib/types'

const STATUS: Record<PayrollRun['status'], { tone: 'gray' | 'amber' | 'green'; label: string }> = {
  draft: { tone: 'gray', label: 'Qoralama' },
  approved: { tone: 'amber', label: 'Tasdiqlangan' },
  paid: { tone: 'green', label: 'To‘langan' },
}

export default function Payroll() {
  const { state, session, fmt, t, can, createPayrollRun, payPayroll } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [creating, setCreating] = useState(false)
  const [period, setPeriod] = useState(todayISO().slice(0, 7))
  const [paying, setPaying] = useState<PayrollRun | null>(null)
  const [payAccount, setPayAccount] = useState('')

  const runs = useMemo(() => state.payrollRuns.filter((r) => r.companyId === cid).sort((a, b) => b.period.localeCompare(a.period)), [state, cid])
  const banks = state.bankAccounts.filter((b) => b.companyId === cid)

  return (
    <div>
      <PageHeader title={t('nav.payroll')} sub={`${runs.length} ta ish haqi davri`}
        actions={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi davr</Button> : undefined} />

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Davr</th><th>Sana</th><th>Xodimlar</th><th className="num">Yalpi</th><th className="num">Soliq</th><th className="num">To‘lov</th><th>Status</th><th /></tr></thead>
            <tbody>
              {runs.map((r) => {
                const gross = r.lines.reduce((s, l) => s + l.gross + l.bonus, 0)
                const tax = r.lines.reduce((s, l) => s + l.incomeTax + l.socialTax, 0)
                const net = r.lines.reduce((s, l) => s + l.net, 0)
                return (
                  <tr key={r.id}>
                    <td className="mono strong">{r.period}</td>
                    <td className="faint">{fmtDate(r.runDate, 'en')}</td>
                    <td className="faint">{r.lines.length}</td>
                    <td className="num mono">{fmt(gross)}</td>
                    <td className="num mono">{fmt(tax)}</td>
                    <td className="num mono strong">{fmt(net)}</td>
                    <td><Badge tone={STATUS[r.status].tone} dot>{STATUS[r.status].label}</Badge></td>
                    <td>
                      {r.status !== 'paid' && can('create') && (
                        <Button size="sm" variant="soft" icon="wallet" onClick={() => { setPaying(r); setPayAccount(banks[0]?.glAccountId ?? '') }}>To‘lash</Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {runs.length === 0 && <EmptyState icon="wallet" title="Ish haqi davrlari yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Yangi ish haqi davri" footer={
        <>
          <Button variant="ghost" onClick={() => setCreating(false)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!period} onClick={() => { createPayrollRun(period); setCreating(false); toast('success', 'Davr yaratildi (qoralama)') }}>Yaratish</Button>
        </>
      }>
        <Field label="Davr (oy)"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
        <div className="tiny muted">Barcha faol xodimlar bo‘yicha avtomatik hisob-kitob qilinadi (12% daromad + 12% ijtimoiy soliq).</div>
      </Modal>

      <Modal open={!!paying} onClose={() => setPaying(null)} title={`To‘lash: ${paying?.period}`} footer={
        <>
          <Button variant="ghost" onClick={() => setPaying(null)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!payAccount} onClick={() => { if (paying) { payPayroll(paying.id, payAccount); setPaying(null); toast('success', 'Ish haqi to‘landi — provodka qilindi') } }}>To‘lash</Button>
        </>
      }>
        <Field label="To‘lov hisobi"><Select value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>{banks.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
        <div className="tiny muted">Provodka: Debet ish haqi (6100), Kredit soliq (2300) + bank.</div>
      </Modal>
    </div>
  )
}
