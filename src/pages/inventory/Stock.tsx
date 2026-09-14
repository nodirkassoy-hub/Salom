import React, { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, Progress, EmptyState } from '../../components/ui'
import { ExportMenu, StatGrid } from '../../components/shared'

export default function Stock() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const products = state.products.filter((p) => p.companyId === cid)
  const lowStock = products.filter((p) => p.quantity <= p.minStock)
  const totalValue = products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0)
  const retailValue = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0)

  return (
    <div>
      <PageHeader title={t('nav.stock')} sub="Zaxira holati va baholash"
        actions={<ExportMenu getRows={() => [['SKU', 'Nomi', 'Soni', 'Min', 'Xarid qiymati'], ...products.map((p) => [p.sku, p.name, p.quantity, p.minStock, p.quantity * p.purchasePrice])]} filename="stock" />} />

      <StatGrid items={[
        { label: 'Jami mahsulot', value: products.length },
        { label: 'Zaxira qiymati (xarid)', value: fmt(totalValue), tone: 'blue' },
        { label: 'Potensial qiymat (sotish)', value: fmt(retailValue), tone: 'green' },
      ]} />

      {lowStock.length > 0 && (
        <Card pad className="mb16" style={{ borderColor: 'var(--warning)' }}>
          <div className="section-title" style={{ color: 'var(--warning-ink)' }}>⚠ Kam zaxira ({lowStock.length})</div>
          <div className="flex-col" style={{ gap: 8 }}>
            {lowStock.map((p) => (
              <div className="flex between" key={p.id}>
                <span className="strong">{p.name} <span className="tiny faint mono">{p.sku}</span></span>
                <span className="flex" style={{ gap: 12 }}>
                  <span className="mono" style={{ color: 'var(--danger)' }}>{p.quantity} {p.unit}</span>
                  <span className="tiny muted">min {p.minStock}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Nomi</th><th>Ombor</th><th className="num">Soni</th><th className="num">Min</th><th style={{ width: 160 }}>Zaxira darajasi</th><th className="num">Qiymat</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const pct = p.minStock > 0 ? Math.min(100, (p.quantity / (p.minStock * 3)) * 100) : 100
                return (
                  <tr key={p.id}>
                    <td className="mono faint">{p.sku}</td>
                    <td className="cell-strong">{p.name}</td>
                    <td className="muted">{state.warehouses.find((w) => w.id === p.warehouseId)?.name ?? '—'}</td>
                    <td className="num mono strong">{p.quantity}</td>
                    <td className="num mono faint">{p.minStock}</td>
                    <td><Progress value={pct} tone={p.quantity <= p.minStock ? 'danger' : pct < 50 ? 'warn' : 'green'} /></td>
                    <td className="num mono">{fmt(p.quantity * p.purchasePrice)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {products.length === 0 && <EmptyState icon="box" title={t('empty.products')} />}
        </div>
      </Card>
    </div>
  )
}
