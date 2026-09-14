import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Card, CardHead, KPI, Badge, Button, EmptyState, Progress } from '../components/ui'
import { TrendArea, ProfitLine, Donut, DonutLegend } from '../components/charts'
import { INVOICE_STATUS, SEVERITY, SourceBadge, usePeriod } from '../components/shared'
import { Icon } from '../components/icons'
import { kpiMetrics, monthlySeries, expenseBreakdown, financialHealth, invoiceOutstanding, invoiceTotal, receivablesBalance } from '../engine/selectors'
import { entryTotals } from '../engine/ledger'
import { forecastCash } from '../engine/forecast'
import { fmtDate, todayISO, monthStart, monthEnd, addDays } from '../lib/money'
import { initials, avatarColor } from '../lib/utils'

export default function Dashboard() {
  const { state, session, t, fmt, lang, currency } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const { period } = usePeriod()

  const kpi = useMemo(() => kpiMetrics(state, cid, period.from, period.to), [state, cid, period])
  const series = useMemo(() => monthlySeries(state, cid, 8), [state, cid])
  const expenses = useMemo(() => expenseBreakdown(state, cid, period.from, period.to).slice(0, 6), [state, cid, period])
  const health = useMemo(() => financialHealth(state, cid), [state, cid])
  const forecast = useMemo(() => forecastCash(state, cid, 30), [state, cid])

  const company = state.companies.find((c) => c.id === cid)
  const today = todayISO()

  const outstanding = useMemo(() => state.invoices
    .filter((i) => i.companyId === cid && (i.status === 'sent' || i.status === 'partially_paid' || i.status === 'overdue'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5), [state, cid])

  const upcoming = useMemo(() => state.bills
    .filter((b) => b.companyId === cid && b.status !== 'paid' && b.status !== 'draft' && b.status !== 'cancelled')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5), [state, cid])

  const alerts = useMemo(() => state.alerts
    .filter((a) => a.companyId === cid && (a.status === 'open' || a.status === 'reviewed'))
    .sort((a, b) => (a.severity === 'critical' ? 0 : a.severity === 'high' ? 1 : 2) - (b.severity === 'critical' ? 0 : b.severity === 'high' ? 1 : 2))
    .slice(0, 4), [state, cid])

  const recent = useMemo(() => state.entries
    .filter((e) => e.companyId === cid)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 8), [state, cid])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli oqshom'

  const healthPct = health.score
  const healthColor = healthPct >= 65 ? 'var(--primary)' : healthPct >= 45 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="anim-in">
      <div className="page-head">
        <div>
          <h1>{greeting}, {company?.director?.split(' ')[0] ?? 'foydalanuvchi'} 👋</h1>
          <p className="sub">{company?.name} — {t('dash.overview')} · {fmtDate(period.from, lang)} – {fmtDate(period.to, lang)}</p>
        </div>
        <div className="actions">
          <Button variant="secondary" icon="plus" onClick={() => navigate('/sales/invoices')}>{t('nav.invoices')}</Button>
          <Button variant="primary" icon="sparkles" onClick={() => navigate('/ai/accountant')}>{t('nav.aiaccountant')}</Button>
        </div>
      </div>

      <div className="grid grid-6 mb16">
        <KPI label={t('dash.revenue')} icon="trend" tone="green" value={fmt(kpi.revenue)} delta={`${((kpi.revenue - kpi.revenuePrev) / Math.max(1, Math.abs(kpi.revenuePrev)) * 100).toFixed(1)}%`} deltaGood={kpi.revenue >= kpi.revenuePrev} sub={t('dash.vsPrevShort')} onClick={() => navigate('/reports/pl')} />
        <KPI label={t('dash.expenses')} icon="cart" tone="red" value={fmt(kpi.expenses)} delta={`${((kpi.expenses - kpi.expensesPrev) / Math.max(1, Math.abs(kpi.expensesPrev)) * 100).toFixed(1)}%`} deltaGood={kpi.expenses <= kpi.expensesPrev} sub={t('dash.vsPrevShort')} onClick={() => navigate('/purchases/expenses')} />
        <KPI label={t('dash.netprofit')} icon="percent" tone="violet" value={fmt(kpi.netProfit)} delta={`${((kpi.netProfit - kpi.netProfitPrev) / Math.max(1, Math.abs(kpi.netProfitPrev)) * 100).toFixed(1)}%`} deltaGood={kpi.netProfit >= kpi.netProfitPrev} sub={t('dash.vsPrevShort')} onClick={() => navigate('/reports/pl')} />
        <KPI label={t('dash.cash')} icon="wallet" tone="blue" value={fmt(kpi.cash)} sub={`${state.bankAccounts.filter((b) => b.companyId === cid).length} hisob`} onClick={() => navigate('/banking/accounts')} />
        <KPI label={t('dash.receivables')} icon="arrowDown" tone="amber" value={fmt(kpi.receivables)} sub="mijozlar" onClick={() => navigate('/sales/receivables')} />
        <KPI label={t('dash.payables')} icon="arrowUp" tone="sky" value={fmt(kpi.payables)} sub="yetkazib beruvchilar" onClick={() => navigate('/purchases/payables')} />
      </div>

      <div className="grid grid-3 mb16">
        <Card pad style={{ gridColumn: 'span 2' }}>
          <CardHead title={t('dash.revVsExp')} sub="8 oylik dinamika" actions={<Link to="/reports/pl" className="small" style={{ color: 'var(--primary)' }}>{t('dash.viewAll')} →</Link>} />
          <TrendArea data={series.map((s) => ({ label: s.label, revenue: s.revenue, expenses: s.expenses }))} currency={currency} lang={lang} height={264} />
        </Card>
        <Card pad>
          <CardHead title={t('dash.health')} sub="AI CFO baholashi" />
          <div className="flex" style={{ justifyContent: 'center', padding: '6px 0 14px' }}>
            <div className="health-ring" style={{ width: 128, height: 128 }}>
              <svg width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="#eef1f5" strokeWidth="11" />
                <circle cx="64" cy="64" r="54" fill="none" stroke={healthColor} strokeWidth="11" strokeDasharray={`${(healthPct / 100) * 2 * Math.PI * 54} ${2 * Math.PI * 54}`} strokeLinecap="round" />
              </svg>
              <div className="center">
                <div className="score" style={{ color: healthColor }}>{healthPct}</div>
                <div className="tiny muted">{health.label}</div>
              </div>
            </div>
          </div>
          <div className="flex-col" style={{ gap: 8 }}>
            {health.factors.map((f, i) => (
              <div className="flex between" key={i} style={{ fontSize: 12.5 }}>
                <span className="muted">{f.label}</span>
                <span className={f.good ? 'strong' : 'strong'} style={{ color: f.good ? 'var(--primary)' : 'var(--danger)' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <Button variant="soft" block className="mt16" onClick={() => navigate('/ai/cfo')}>AI CFO tahlili</Button>
        </Card>
      </div>

      <div className="grid grid-3 mb16">
        <Card pad>
          <CardHead title={t('dash.expenseBreakdown')} sub={t('dash.vsPrevShort')} />
          <Donut data={expenses.map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} height={220} />
          <DonutLegend data={expenses.map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} />
        </Card>
        <Card pad>
          <CardHead title={t('dash.profitTrend')} sub="8 oylik" />
          <ProfitLine data={series.map((s) => ({ label: s.label, profit: s.profit }))} currency={currency} lang={lang} height={220} />
        </Card>
        <Card pad>
          <CardHead title={t('dash.cashflowChart')} sub="30 kunlik prognoz" />
          <div className="flex-col" style={{ gap: 10 }}>
            <div className="flex between">
              <span className="small muted">Boshlang‘ich qoldiq</span><span className="mono strong">{fmt(forecast.startBalance)}</span>
            </div>
            <div className="flex between">
              <span className="small muted">Kutilayotgan kirim</span><span className="mono strong" style={{ color: 'var(--primary)' }}>+{fmt(forecast.totalInflow)}</span>
            </div>
            <div className="flex between">
              <span className="small muted">Kutilayotgan chiqim</span><span className="mono strong" style={{ color: 'var(--danger)' }}>-{fmt(forecast.totalOutflow)}</span>
            </div>
            <div className="flex between" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span className="small strong">Prognoz qoldiq (30 kun)</span><span className="mono strong">{fmt(forecast.startBalance + forecast.totalInflow - forecast.totalOutflow)}</span>
            </div>
            {forecast.shortageDates.length > 0 && (
              <div className="badge badge-red" style={{ alignSelf: 'flex-start' }}><Icon name="alert" size={13} /> Kassa uzilishi xavfi {forecast.shortageDates.length} kun</div>
            )}
            <Button variant="secondary" block onClick={() => navigate('/reports/cashflow')}>To‘liq pul oqimi</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-3 mb16">
        <Card pad>
          <CardHead title={t('dash.outstandingInvoices')} actions={<Link to="/sales/invoices" className="small" style={{ color: 'var(--primary)' }}>{t('dash.viewAll')} →</Link>} />
          {outstanding.length === 0 ? <EmptyState icon="receipt" title={t('empty.invoices')} />
            : outstanding.map((inv) => {
              const out = invoiceOutstanding(inv, state.payments)
              const cust = state.parties.find((p) => p.id === inv.customerId)
              return (
                <div key={inv.id} className="flex between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                  <div>
                    <div className="strong" style={{ fontSize: 13 }}>{inv.number}</div>
                    <div className="tiny muted">{cust?.name} · {fmtDate(inv.dueDate, lang)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono strong" style={{ fontSize: 13 }}>{fmt(out)}</div>
                    <Badge tone={INVOICE_STATUS[inv.status].tone} style={{ marginTop: 3 }}>{INVOICE_STATUS[inv.status].label}</Badge>
                  </div>
                </div>
              )
            })}
        </Card>
        <Card pad>
          <CardHead title={t('dash.upcomingPayments')} actions={<Link to="/purchases/bills" className="small" style={{ color: 'var(--primary)' }}>{t('dash.viewAll')} →</Link>} />
          {upcoming.length === 0 ? <EmptyState icon="file" title="To‘lovlar yo‘q" />
            : upcoming.map((b) => {
              const sup = state.parties.find((p) => p.id === b.supplierId)
              return (
                <div key={b.id} className="flex between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('/purchases/bills')}>
                  <div>
                    <div className="strong" style={{ fontSize: 13 }}>{b.number}</div>
                    <div className="tiny muted">{sup?.name} · {fmtDate(b.dueDate, lang)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono strong" style={{ fontSize: 13 }}>{fmt(invoiceTotal(b as any))}</div>
                    <Badge tone={b.dueDate < today ? 'red' : 'amber'} style={{ marginTop: 3 }}>{b.dueDate < today ? 'Muddati o‘tgan' : 'Kutilmoqda'}</Badge>
                  </div>
                </div>
              )
            })}
        </Card>
        <Card pad>
          <CardHead title={t('dash.radarAlerts')} actions={<Link to="/ai/xato-radar" className="small" style={{ color: 'var(--primary)' }}>{t('dash.viewAll')} →</Link>} />
          {alerts.length === 0 ? <EmptyState icon="checkCircle" title={t('empty.alerts')} desc={t('empty.alertsDesc')} />
            : alerts.map((a) => (
              <div key={a.id} className="alert-card card" style={{ padding: '11px 13px', marginBottom: 9, borderLeftColor: a.severity === 'critical' ? 'var(--danger)' : a.severity === 'high' ? 'var(--warning)' : 'var(--blue)' }} onClick={() => navigate('/ai/xato-radar')}>
                <div className="flex between">
                  <div className="flex" style={{ gap: 8, minWidth: 0 }}>
                    <Icon name="alert" size={14} style={{ color: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                    <span className="ellipsis strong" style={{ fontSize: 12.5 }}>{a.title}</span>
                  </div>
                  <Badge tone={SEVERITY[a.severity].tone}>{SEVERITY[a.severity].label}</Badge>
                </div>
              </div>
            ))}
        </Card>
      </div>

      <Card pad>
        <CardHead title={t('dash.lastTransactions')} actions={<Link to="/accounting/transactions" className="small" style={{ color: 'var(--primary)' }}>{t('dash.viewAll')} →</Link>} />
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Sana</th><th>Tavsif</th><th>Manba</th><th className="num">Summa</th></tr></thead>
            <tbody>
              {recent.map((e) => {
                const tt = entryTotals(e.lines)
                return (
                  <tr key={e.id} onClick={() => navigate(`/accounting/journal`)}>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date, lang)}</td>
                    <td><span className="cell-strong">{e.description}</span></td>
                    <td><SourceBadge source={e.source} /></td>
                    <td className="num mono">{fmt(tt.debit)}</td>
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
