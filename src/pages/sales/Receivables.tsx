import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, Progress, EmptyState } from '../../components/ui'
import { ExportMenu, INVOICE_STATUS, StatGrid } from '../../components/shared'
import { agingOf, partyBalances, invoiceOutstanding, invoiceTotal, receivablesBalance } from '../../engine/selectors'
import { fmtDate, todayISO } from '../../lib/money'

export default function Receivables() {
  const { state, session, fmt, t, lang } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const aging = useMemo(() => agingOf(state, cid, 'receivable'), [state, cid])
  const balances = useMemo(() => partyBalances(state, cid, 'Receivable'), [state, cid])
  const totalAR = receivablesBalance(state, cid)
  const totalAging = aging.current + aging.days30 + aging.days60 + aging.days90
  const overdueTotal = aging.overdue

  const overdueInvoices = state.invoices
    .filter((i) => i.companyId === cid && (i.status === 'overdue' || (i.status !== 'draft' && i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate < todayISO())))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <div>
      <PageHeader title={t('nav.receivables')} sub="Debitorlik qarzdorlik tahlili"
        actions={<ExportMenu getRows={() => [['Mijoz', 'Balans'], ...balances.map((b) => [state.parties.find((p) => p.id === b.partyId)?.name ?? '', b.balance])]} filename="receivables" />} />

      <StatGrid items={[
        { label: 'Jami debitorlik', value: fmt(totalAR), tone: 'amber' },
        { label: 'Joriy (muddati kelmagan)', value: fmt(aging.current), tone: 'green' },
        { label: 'Muddati o‘tgan', value: fmt(overdueTotal), tone: 'red' },
      ]} />

      <div className="grid grid-2 mb16">
        <Card pad>
          <div className="section-title">Eskirish (aging)</div>
          <AgingRow label="Joriy" value={aging.current} total={totalAging} color="var(--primary)" />
          <AgingRow label="1–30 kun" value={aging.days30} total={totalAging} color="var(--blue)" />
          <AgingRow label="31–60 kun" value={aging.days60} total={totalAging} color="var(--warning)" />
          <AgingRow label="60+ kun" value={aging.days90} total={totalAging} color="var(--danger)" />
        </Card>
        <Card pad>
          <div className="section-title">Mijozlar bo‘yicha</div>
          <div className="table-wrap">
            <table className="tbl clickable">
              <thead><tr><th>Mijoz</th><th className="num">Balans</th></tr></thead>
              <tbody>
                {balances.slice(0, 10).map((b) => (
                  <tr key={b.partyId} onClick={() => navigate(`/sales/customers/${b.partyId}`)}>
                    <td className="cell-strong">{state.parties.find((p) => p.id === b.partyId)?.name}</td>
                    <td className="num mono strong" style={{ color: 'var(--warning-ink)' }}>{fmt(b.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-head" style={{ padding: '14px 18px 0' }}><h3>Muddati o‘tgan fakturalar</h3><Badge tone="red">{overdueInvoices.length}</Badge></div>
        <div className="table-wrap" style={{ padding: '0 6px 8px' }}>
          <table className="tbl clickable">
            <thead><tr><th>Raqam</th><th>Mijoz</th><th>Muddat</th><th className="num">Qoldiq</th></tr></thead>
            <tbody>
              {overdueInvoices.map((i) => (
                <tr key={i.id} onClick={() => navigate(`/sales/invoices/${i.id}`)}>
                  <td className="mono strong">{i.number}</td>
                  <td className="cell-strong">{state.parties.find((p) => p.id === i.customerId)?.name}</td>
                  <td className="faint">{fmtDate(i.dueDate, lang)}</td>
                  <td className="num mono strong" style={{ color: 'var(--danger)' }}>{fmt(invoiceOutstanding(i, state.payments))}</td>
                </tr>
              ))}
              {overdueInvoices.length === 0 && <tr><td colSpan={4}><EmptyState icon="checkCircle" title="Muddati o‘tgan qarz yo‘q" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AgingRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { fmt } = useStore()
  return (
    <div className="flex-col" style={{ gap: 5, marginBottom: 12 }}>
      <div className="flex between small">
        <span className="muted">{label}</span>
        <span className="mono strong">{fmt(value)}</span>
      </div>
      <Progress value={total ? (value / total) * 100 : 0} />
    </div>
  )
}
