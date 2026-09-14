import React, { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { ForecastChart } from '../components/charts'
import { forecastCash } from '../engine/forecast'
import { fmtDate } from '../lib/money'

export default function CashFlow() {
  const { state, session, fmt, t, lang, currency } = useStore()
  const cid = session!.companyId
  const [days, setDays] = useState<'7' | '30' | '60' | '90'>('30')
  const fc = forecastCash(state, cid, Number(days))

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.cashflow')} sub="Kelajakdagi pul oqimi prognozi — real rejalashtirilgan operatsiyalar asosida" />
      <div className="grid grid-3 mb16">
        <Card pad><div className="stat-label">Joriy naqd pul</div><div className="stat-value mono">{fmt(fc.startBalance)}</div></Card>
        <Card pad><div className="stat-label">Kutilayotgan kirim</div><div className="stat-value mono" style={{ color: 'var(--primary)' }}>+{fmt(fc.totalInflow)}</div></Card>
        <Card pad><div className="stat-label">Kutilayotgan chiqim</div><div className="stat-value mono" style={{ color: 'var(--danger)' }}>-{fmt(fc.totalOutflow)}</div></Card>
      </div>

      {fc.shortageDates.length > 0 && (
        <Card pad className="mb16" style={{ borderColor: 'var(--danger)' }}>
          <div className="strong" style={{ color: 'var(--danger)' }}>⚠ Kassa uzilishi xavfi</div>
          <div className="small muted mt8">Quyidagi sanalarda salbiy qoldiq prognoz qilinmoqda: {fc.shortageDates.slice(0, 5).map((d) => fmtDate(d, lang)).join(', ')}{fc.shortageDates.length > 5 ? '…' : ''}</div>
        </Card>
      )}

      <Card pad>
        <div className="flex between mb16">
          <div className="strong">Prognoz grafigi</div>
          <Segmented<'7' | '30' | '60' | '90'> value={days} onChange={setDays} options={[{ value: '7', label: '7 kun' }, { value: '30', label: '30 kun' }, { value: '60', label: '60 kun' }, { value: '90', label: '90 kun' }]} />
        </div>
        <ForecastChart data={fc.points.map((p) => ({ label: p.label, inflow: p.inflow, outflow: p.outflow, balance: p.balance }))} currency={currency} lang={lang} height={340} />
      </Card>
    </div>
  )
}
