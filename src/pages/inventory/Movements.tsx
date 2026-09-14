import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, EmptyState } from '../../components/ui'
import { FilterChips, ExportMenu, MOVEMENT } from '../../components/shared'
import { fmtDate } from '../../lib/money'
import type { MovementType } from '../../lib/types'

type Filter = 'all' | MovementType

export default function Movements() {
  const { state, session, t, lang } = useStore()
  const cid = session!.companyId
  const [filter, setFilter] = useState<Filter>('all')

  const movements = useMemo(() => state.movements
    .filter((m) => m.companyId === cid)
    .filter((m) => filter === 'all' || m.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date)), [state, cid, filter])

  const productName = (id: string) => state.products.find((p) => p.id === id)?.name ?? '—'

  return (
    <div>
      <PageHeader title={t('nav.movements')} sub={`${movements.length} ta harakat`}
        actions={<ExportMenu getRows={() => [['Sana', 'Mahsulot', 'Turi', 'Soni', 'Ombor'], ...movements.map((m) => [m.date, productName(m.productId), m.type, m.quantity, state.warehouses.find((w) => w.id === m.warehouseId)?.name ?? ''])]} filename="movements" />} />

      <div className="mb16">
        <FilterChips<Filter> value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'in', label: 'Kirim' },
          { value: 'out', label: 'Chiqim' },
          { value: 'transfer', label: 'O‘tkazma' },
          { value: 'adjust', label: 'Korreksiya' },
        ]} />
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Sana</th><th>Mahsulot</th><th>Turi</th><th className="num">Soni</th><th>Ombor</th><th>Izoh</th></tr></thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.date, lang)}</td>
                  <td className="cell-strong">{productName(m.productId)}</td>
                  <td><Badge tone={MOVEMENT[m.type].tone} dot>{MOVEMENT[m.type].label}</Badge></td>
                  <td className="num mono strong" style={{ color: m.type === 'out' ? 'var(--danger)' : 'var(--primary)' }}>{m.type === 'out' ? '-' : '+'}{m.quantity}</td>
                  <td className="muted">{state.warehouses.find((w) => w.id === m.warehouseId)?.name ?? '—'}</td>
                  <td className="muted small">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && <EmptyState icon="refresh" title="Harakatlar yo‘q" />}
        </div>
      </Card>
    </div>
  )
}
