import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, Progress, EmptyState } from '../../components/ui'
import { ExportMenu, StatGrid } from '../../components/shared'
import { agingOf, partyBalances, payablesBalance } from '../../engine/selectors'
import { fmtDate } from '../../lib/money'

export default function Payables() {
  const { state, session, fmt, t, lang } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const aging = useMemo(() => agingOf(state, cid, 'payable'), [state, cid])
  const balances = useMemo(() => partyBalances(state, cid, 'Payable'), [state, cid])
  const totalAP = payablesBalance(state, cid)

  const upcomingBills = state.bills
    .filter((b) => b.companyId === cid && b.status !== 'paid' && b.status !== 'draft' && b.status !== 'cancelled')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  return (
    <div>
      <PageHeader title={t('nav.payables')} sub="Kreditorlik qarzdorlik"
        actions={<ExportMenu getRows={() => [['Yetkazib beruvchi', 'Balans'], ...balances.map((b) => [state.parties.find((p) => p.id === b.partyId)?.name ?? '', b.balance])]} filename="payables" />} />

      <StatGrid items={[
        { label: 'Jami kreditorlik', value: fmt(totalAP), tone: 'blue' },
        { label: 'Joriy (muddati kelmagan)', value: fmt(aging.current), tone: 'green' },
        { label: 'Muddati o‘tgan', value: fmt(aging.overdue), tone: 'red' },
      ]} />

      <div className="grid grid-2 mb16">
        <Card pad>
          <div className="section-title">Eskirish (aging)</div>
          <AgingRow label="Joriy" value={aging.current} total={totalAP} color="var(--primary)" />
          <AgingRow label="1–30 kun" value={aging.days30} total={totalAP} color="var(--blue)" />
          <AgingRow label="31–60 kun" value={aging.days60} total={totalAP} color="var(--warning)" />
          <AgingRow label="60+ kun" value={aging.days90} total={totalAP} color="var(--danger)" />
        </Card>
        <Card pad>
          <div className="section-title">Yetkazib beruvchilar bo‘yicha</div>
          <div className="table-wrap">
            <table className="tbl clickable">
              <thead><tr><th>Yetkazib beruvchi</th><th className="num">Balans</th></tr></thead>
              <tbody>
                {balances.slice(0, 10).map((b) => (
                  <tr key={b.partyId} onClick={() => navigate('/purchases/bills')}>
                    <td className="cell-strong">{state.parties.find((p) => p.id === b.partyId)?.name}</td>
                    <td className="num mono strong" style={{ color: 'var(--blue-ink)' }}>{fmt(b.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-head" style={{ padding: '14px 18px 0' }}><h3>Kutilayotgan to‘lovlar</h3><Badge tone="amber">{upcomingBills.length}</Badge></div>
        <div className="table-wrap" style={{ padding: '0 6px 8px' }}>
          <table className="tbl">
            <thead><tr><th>Raqam</th><th>Yetkazib beruvchi</th><th>Muddat</th><th>Status</th></tr></thead>
            <tbody>
              {upcomingBills.map((b) => (
                <tr key={b.id}>
                  <td className="mono strong">{b.number}</td>
                  <td className="cell-strong">{state.parties.find((p) => p.id === b.supplierId)?.name}</td>
                  <td className="faint">{fmtDate(b.dueDate, lang)}</td>
                  <td><Badge tone={b.status === 'overdue' ? 'red' : 'amber'} dot>{b.status === 'overdue' ? 'Muddati o‘tgan' : 'Kutilmoqda'}</Badge></td>
                </tr>
              ))}
              {upcomingBills.length === 0 && <tr><td colSpan={4}><EmptyState icon="checkCircle" title="Kutilayotgan to‘lov yo‘q" /></td></tr>}
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
