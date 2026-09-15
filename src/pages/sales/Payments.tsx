import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, EmptyState } from '../../components/ui'
import { SearchBox, FilterChips, usePeriod, ExportMenu } from '../../components/shared'
import { fmtDate } from '../../lib/money'

type Filter = 'all' | 'customer' | 'supplier'

export default function Payments() {
  const { state, session, fmt, t, lang } = useStore()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const payments = useMemo(() => state.payments
    .filter((p) => p.companyId === cid && p.date >= period.from && p.date <= period.to && p.status === 'applied')
    .filter((p) => filter === 'all' || p.partyType === filter)
    .filter((p) => !q || state.parties.find((x) => x.id === p.partyId)?.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [state, cid, period, filter, q])

  const totalIn = payments.filter((p) => p.partyType === 'customer').reduce((s, p) => s + p.amount, 0)
  const totalOut = payments.filter((p) => p.partyType === 'supplier').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <PageHeader title={t('nav.payments')} sub={`Kirim ${fmt(totalIn)} · Chiqim ${fmt(totalOut)}`}
        actions={<ExportMenu getRows={() => [['Sana', 'Kontragent', 'Turi', 'Summa', 'Usul'], ...payments.map((p) => [p.date, state.parties.find((x) => x.id === p.partyId)?.name ?? '', p.partyType, p.amount, p.method])]} filename="payments" />} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <SearchBox value={q} onChange={setQ} />
        <FilterChips<Filter> value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'customer', label: 'Mijoz to‘lovlari' },
          { value: 'supplier', label: 'Yetkazib beruvchiga' },
        ]} />
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Sana</th><th>Kontragent</th><th>Turi</th><th>Usul</th><th className="num">Summa</th></tr></thead>
            <tbody>
              {payments.map((p) => {
                const party = state.parties.find((x) => x.id === p.partyId)
                return (
                  <tr key={p.id}>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date, lang)}</td>
                    <td><span className="cell-strong">{party?.name ?? '—'}</span></td>
                    <td><Badge tone={p.partyType === 'customer' ? 'green' : 'amber'}>{p.partyType === 'customer' ? 'Kirim' : 'Chiqim'}</Badge></td>
                    <td className="faint">{p.method}</td>
                    <td className="num mono strong" style={{ color: p.partyType === 'customer' ? 'var(--primary)' : 'var(--danger)' }}>{p.partyType === 'customer' ? '+' : '-'}{fmt(p.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {payments.length === 0 && <EmptyState icon="wallet" title="To‘lovlar yo‘q" />}
        </div>
      </Card>
    </div>
  )
}
