import React, { createContext, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge, Modal, Select, EmptyState } from '../../components/ui'
import { usePeriod, PeriodPicker, ExportMenu, StatGrid } from '../../components/shared'
import { Icon, IconName } from '../../components/icons'
import { TrendArea, Donut, DonutLegend } from '../../components/charts'
import { trialBalance, trialBalanced, accountTotals } from '../../engine/ledger'
import {
  incomeStatement, balanceSheet, cashFlowStatement, monthlySeries, agingOf, partyBalances,
  entriesForAccount, revenueBreakdown, expenseBreakdown, receivablesBalance, payablesBalance, cashBalance,
} from '../../engine/selectors'
import { fmtDate, monthStart, monthEnd, todayISO } from '../../lib/money'

// =============================================================
// Report center + all statement pages. Every number is derived
// from the same double-entry ledger via engine selectors.
// =============================================================

const PeriodCtx = createContext<{ from: string; to: string }>({ from: '', to: '' })
function usePeriodRange() { return useContext(PeriodCtx) }

const REPORTS: { path: string; key: string; icon: IconName; desc: string }[] = [
  { path: '/reports/pl', key: 'nav.pl', icon: 'trend', desc: 'Daromad, xarajat va sof foyda' },
  { path: '/reports/balance', key: 'nav.balanceSheet', icon: 'percent', desc: 'Aktivlar, majburiyatlar va kapital' },
  { path: '/reports/cashflow', key: 'nav.cashflow', icon: 'wallet', desc: 'Operatsion, investitsion va moliyaviy oqim' },
  { path: '/reports/trial', key: 'nav.trial', icon: 'fileText', desc: 'Aylanma-saldo vedomosti' },
  { path: '/reports/ledger', key: 'nav.ledger', icon: 'clock', desc: 'Har bir hisob bo‘yicha harakatlar' },
  { path: '/reports/ar', key: 'nav.receivables', icon: 'arrowDown', desc: 'Debitorlik qarzdorlik va eskirish' },
  { path: '/reports/ap', key: 'nav.payables', icon: 'arrowUp', desc: 'Kreditorlik qarzdorlik va eskirish' },
  { path: '/reports/revenue', key: 'rep.revenue', icon: 'sales', desc: 'Daromad tarkibi va manbalari' },
  { path: '/reports/expense', key: 'rep.expense', icon: 'cart', desc: 'Xarajat tarkibi tahlili' },
  { path: '/reports/inventory', key: 'nav.inventory', icon: 'box', desc: 'Ombor qoldiqlari va baholash' },
  { path: '/reports/tax', key: 'nav.taxReports', icon: 'flag', desc: 'QQS va boshqa soliqlar' },
  { path: '/reports/budget', key: 'nav.budgeting', icon: 'target', desc: 'Byudjet vs haqiqiy bajarilish' },
  { path: '/reports/management', key: 'nav.managementReports', icon: 'calc', desc: 'Boshqaruv KPI va vizual tahlil' },
]

export function ReportCenter() {
  const { t } = useStore()
  return (
    <div>
      <PageHeader title={t('nav.reports')} sub="Barcha hisobotlar bitta haqiqiy manbadan — buxgalteriya daftaridan" />
      <div className="grid grid-3">
        {REPORTS.map((r) => (
          <Link to={r.path} key={r.path}>
            <Card pad hover style={{ height: '100%' }}>
              <span className="kpi-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}><Icon name={r.icon} size={18} /></span>
              <div className="strong mt16" style={{ fontSize: 15 }}>{t(r.key)}</div>
              <div className="tiny muted mt8">{r.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------- shared shell ----------
function Shell({ title, sub, rows, filename, children }: { title: string; sub?: string; rows: () => (string | number)[][]; filename: string; children: React.ReactNode }) {
  const { period, preset, setPreset, setCustom } = usePeriod()
  return (
    <div>
      <PageHeader title={title} sub={sub} actions={<ExportMenu getRows={rows} filename={filename} />} />
      <div className="mb16"><PeriodPicker preset={preset} setPreset={setPreset} setCustom={setCustom} /></div>
      <PeriodCtx.Provider value={period}>{children}</PeriodCtx.Provider>
    </div>
  )
}

function DrillModal({ title, accountId, onClose }: { title: string; accountId: string; onClose: () => void }) {
  const { state, session, fmt, lang } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const entries = entriesForAccount(state, cid, accountId, from, to)
  return (
    <Modal open onClose={onClose} title={title} wide>
      <div className="tiny muted mb16">Provodkalar davri: {fmtDate(from, lang)} – {fmtDate(to, lang)}</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Sana</th><th>Raqam</th><th>Tavsif</th><th className="num">Debet</th><th className="num">Kredit</th></tr></thead>
          <tbody>
            {entries.map((e) => {
              const l = e.lines.find((x) => x.accountId === accountId)!
              return (
                <tr key={e.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date, lang)}</td>
                  <td className="mono faint">{e.number}</td>
                  <td className="cell-strong">{e.description}</td>
                  <td className="num mono">{l.debit ? fmt(l.debit) : '—'}</td>
                  <td className="num mono">{l.credit ? fmt(l.credit) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {entries.length === 0 && <EmptyState icon="search" title="Bu davrda harakat yo‘q" />}
      </div>
    </Modal>
  )
}

function LineItemTable({ items, onDrill }: { items: { account: { id: string; name: string; code: string }; amount: number }[]; onDrill: (a: string) => void }) {
  const { fmt } = useStore()
  const total = items.reduce((s, l) => s + l.amount, 0)
  return (
    <div className="table-wrap">
      <table className="tbl clickable">
        <thead><tr><th>Modda</th><th className="num">Summa</th><th className="num">Ulush</th></tr></thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.account.id} onClick={() => onDrill(l.account.id)}>
              <td><span className="cell-strong">{l.account.name}</span><span className="tiny faint mono" style={{ marginLeft: 8 }}>{l.account.code}</span></td>
              <td className="num mono strong">{fmt(l.amount)}</td>
              <td className="num mono faint">{total ? ((l.amount / total) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- P&L ----------
export function PL() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const [drill, setDrill] = useState<string | null>(null)
  const is = incomeStatement(state, cid, from, to)
  return (
    <Shell title={t('rep.pl')} rows={() => [
      ['Modda', 'Summa'],
      ...is.revenue.map((l) => [l.account.name, l.amount] as (string | number)[]),
      ...is.opex.map((l) => [l.account.name, l.amount] as (string | number)[]),
      ['Sof foyda', is.netProfit],
    ]} filename="profit-and-loss">
      <StatGrid items={[
        { label: 'Daromad', value: fmt(is.revenueTotal), tone: 'green' },
        { label: 'Xarajatlar', value: fmt(is.totalExpense), tone: 'red' },
        { label: 'Sof foyda', value: fmt(is.netProfit), tone: is.netProfit >= 0 ? 'green' : 'red' },
      ]} />
      <div className="grid grid-2">
        <Card pad><div className="section-title">Daromad</div><LineItemTable items={is.revenue} onDrill={setDrill} /></Card>
        <Card pad><div className="section-title">Xarajatlar</div><LineItemTable items={[...is.cogs, ...is.opex, ...is.otherExpense]} onDrill={setDrill} /></Card>
      </div>
      {drill && <DrillModal title="Batafsil (drill-down)" accountId={drill} onClose={() => setDrill(null)} />}
    </Shell>
  )
}

// ---------- Balance sheet ----------
export function BalanceSheetReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const [drill, setDrill] = useState<string | null>(null)
  const bs = balanceSheet(state, cid)
  return (
    <Shell title={t('rep.balance')} rows={() => [
      ['Guruh', 'Summa'],
      ...bs.assets.map((l) => [l.account.name, l.amount] as (string | number)[]),
      ...bs.liabilities.map((l) => [l.account.name, l.amount] as (string | number)[]),
      ...bs.equity.map((l) => [l.account.name, l.amount] as (string | number)[]),
    ]} filename="balance-sheet">
      <StatGrid items={[
        { label: 'Aktivlar', value: fmt(bs.assetsTotal), tone: 'blue' },
        { label: 'Majburiyatlar', value: fmt(bs.liabilitiesTotal), tone: 'amber' },
        { label: 'Kapital', value: fmt(bs.equityTotal), tone: 'green' },
      ]} />
      <Badge tone={bs.balanced ? 'green' : 'red'} dot className="mb16">{bs.balanced ? 'Balansda: A = L + E ✓' : 'Balans emas ✗'}</Badge>
      <div className="grid grid-2">
        <Card pad><div className="section-title">Aktivlar</div><LineItemTable items={bs.assets} onDrill={setDrill} /></Card>
        <div className="flex-col" style={{ gap: 16 }}>
          <Card pad><div className="section-title">Majburiyatlar</div><LineItemTable items={bs.liabilities} onDrill={setDrill} /></Card>
          <Card pad><div className="section-title">Kapital</div><LineItemTable items={bs.equity} onDrill={setDrill} /></Card>
        </div>
      </div>
      {drill && <DrillModal title="Batafsil (drill-down)" accountId={drill} onClose={() => setDrill(null)} />}
    </Shell>
  )
}

// ---------- Cash flow ----------
export function CashFlowReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const cf = cashFlowStatement(state, cid, from, to)
  return (
    <Shell title={t('rep.cashflow')} rows={() => [['Oqim', 'Summa'], ['Operatsion', cf.operating], ['Investitsion', cf.investing], ['Moliyaviy', cf.financing], ['Sof o‘zgarish', cf.netChange]]} filename="cash-flow">
      <StatGrid items={[
        { label: 'Operatsion', value: fmt(cf.operating), tone: cf.operating >= 0 ? 'green' : 'red' },
        { label: 'Investitsion', value: fmt(cf.investing), tone: cf.investing >= 0 ? 'green' : 'red' },
        { label: 'Moliyaviy', value: fmt(cf.financing), tone: cf.financing >= 0 ? 'green' : 'red' },
      ]} />
      <Card pad>
        <div className="flex between mb8"><span className="muted">Boshlang‘ich naqd</span><span className="mono strong">{fmt(cf.openingCash)}</span></div>
        <div className="flex between mb8"><span className="muted">Sof o‘zgarish</span><span className="mono strong" style={{ color: cf.netChange >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(cf.netChange)}</span></div>
        <div className="flex between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}><span className="strong">Yakuniy naqd</span><span className="mono strong">{fmt(cf.closingCash)}</span></div>
      </Card>
    </Shell>
  )
}

// ---------- Trial balance ----------
export function TrialBalanceReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const rows = trialBalance(state, cid, from, to)
  const balanced = trialBalanced(rows)
  return (
    <Shell title={t('rep.trial')} rows={() => [['Kod', 'Nomi', 'Debet', 'Kredit', 'Balans'], ...rows.map((r) => [r.account.code, r.account.name, r.debit, r.credit, r.closing])]} filename="trial-balance">
      <Badge tone={balanced ? 'green' : 'red'} dot className="mb16">{balanced ? 'Balansda ✓' : 'Balans emas ✗'}</Badge>
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kod</th><th>Hisob</th><th className="num">Debet</th><th className="num">Kredit</th><th className="num">Balans</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.account.id}><td className="mono faint">{r.account.code}</td><td className="cell-strong">{r.account.name}</td><td className="num mono">{r.debit ? fmt(r.debit) : '—'}</td><td className="num mono">{r.credit ? fmt(r.credit) : '—'}</td><td className="num mono strong">{fmt(r.closing)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- General ledger ----------
export function LedgerReport() {
  const { state, session, fmt, t, lang } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const accounts = state.accounts.filter((a) => a.companyId === cid && !a.archived)
  const [accountId, setAccountId] = useState('')
  const entries = accountId ? entriesForAccount(state, cid, accountId, from, to) : []
  return (
    <Shell title={t('rep.ledger')} rows={() => [['Sana', 'Tavsif', 'Debet', 'Kredit'], ...entries.map((e) => { const l = e.lines.find((x) => x.accountId === accountId)!; return [e.date, e.description, l.debit, l.credit] })]} filename="general-ledger">
      <Card pad className="mb16">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">— Hisobni tanlang —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
        </Select>
      </Card>
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Sana</th><th>Raqam</th><th>Tavsif</th><th className="num">Debet</th><th className="num">Kredit</th></tr></thead>
            <tbody>{entries.map((e) => { const l = e.lines.find((x) => x.accountId === accountId)!; return <tr key={e.id}><td className="faint">{fmtDate(e.date, lang)}</td><td className="mono faint">{e.number}</td><td className="cell-strong">{e.description}</td><td className="num mono">{l.debit ? fmt(l.debit) : '—'}</td><td className="num mono">{l.credit ? fmt(l.credit) : '—'}</td></tr> })}</tbody>
          </table>
          {accountId && <div className="tiny faint" style={{ padding: 12 }}>Yakuniy balans: <span className="mono strong">{fmt(accountTotals(state.accounts.find((a) => a.id === accountId)!, entriesForAccount(state, cid, accountId)).closing)}</span></div>}
        </div>
      </Card>
    </Shell>
  )
}

// ---------- AR ----------
export function ARReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const aging = agingOf(state, cid, 'receivable')
  const balances = partyBalances(state, cid, 'Receivable')
  return (
    <Shell title={t('rep.ar')} rows={() => [['Mijoz', 'Balans'], ...balances.map((b) => [state.parties.find((p) => p.id === b.partyId)?.name ?? '', b.balance])]} filename="receivables">
      <StatGrid items={[
        { label: 'Jami debitorlik', value: fmt(receivablesBalance(state, cid)), tone: 'amber' },
        { label: 'Joriy', value: fmt(aging.current), tone: 'green' },
        { label: 'Muddati o‘tgan', value: fmt(aging.overdue), tone: 'red' },
      ]} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Mijoz</th><th className="num">Balans</th></tr></thead>
            <tbody>{balances.map((b) => <tr key={b.partyId}><td className="cell-strong">{state.parties.find((p) => p.id === b.partyId)?.name}</td><td className="num mono strong">{fmt(b.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- AP ----------
export function APReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const aging = agingOf(state, cid, 'payable')
  const balances = partyBalances(state, cid, 'Payable')
  return (
    <Shell title={t('rep.ap')} rows={() => [['Yetkazib beruvchi', 'Balans'], ...balances.map((b) => [state.parties.find((p) => p.id === b.partyId)?.name ?? '', b.balance])]} filename="payables">
      <StatGrid items={[
        { label: 'Jami kreditorlik', value: fmt(payablesBalance(state, cid)), tone: 'blue' },
        { label: 'Joriy', value: fmt(aging.current), tone: 'green' },
        { label: 'Muddati o‘tgan', value: fmt(aging.overdue), tone: 'red' },
      ]} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Yetkazib beruvchi</th><th className="num">Balans</th></tr></thead>
            <tbody>{balances.map((b) => <tr key={b.partyId}><td className="cell-strong">{state.parties.find((p) => p.id === b.partyId)?.name}</td><td className="num mono strong">{fmt(b.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- Revenue breakdown ----------
export function RevenueReport() {
  const { state, session, fmt, t, currency, lang } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const [drill, setDrill] = useState<string | null>(null)
  const rev = revenueBreakdown(state, cid, from, to)
  return (
    <Shell title={t('rep.revenue')} rows={() => [['Manba', 'Summa'], ...rev.map((l) => [l.account.name, l.amount])]} filename="revenue">
      <Card pad><div className="section-title">Daromad manbalari</div><LineItemTable items={rev} onDrill={setDrill} /></Card>
      {drill && <DrillModal title="Batafsil (drill-down)" accountId={drill} onClose={() => setDrill(null)} />}
    </Shell>
  )
}

// ---------- Expense breakdown ----------
export function ExpenseReport() {
  const { state, session, fmt, t, currency, lang } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const [drill, setDrill] = useState<string | null>(null)
  const exp = expenseBreakdown(state, cid, from, to)
  return (
    <Shell title={t('rep.expense')} rows={() => [['Kategoriya', 'Summa'], ...exp.map((l) => [l.account.name, l.amount])]} filename="expenses">
      <div className="grid grid-2">
        <Card pad><div className="section-title">Xarajatlar tarkibi</div><LineItemTable items={exp} onDrill={setDrill} /></Card>
        <Card pad><div className="section-title">Vizual</div><Donut data={exp.slice(0, 8).map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} height={200} /><DonutLegend data={exp.slice(0, 8).map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} /></Card>
      </div>
      {drill && <DrillModal title="Batafsil (drill-down)" accountId={drill} onClose={() => setDrill(null)} />}
    </Shell>
  )
}

// ---------- Inventory ----------
export function InventoryReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const products = state.products.filter((p) => p.companyId === cid && p.active)
  const totalValue = products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0)
  const lowStock = products.filter((p) => p.quantity <= p.minStock)
  return (
    <Shell title={t('rep.inventory')} rows={() => [['SKU', 'Nomi', 'Qoldiq', 'Xarid narxi', 'Qiymat'], ...products.map((p) => [p.sku, p.name, p.quantity, p.purchasePrice, p.quantity * p.purchasePrice])]} filename="inventory">
      <StatGrid items={[
        { label: 'Jami qoldiq qiymati', value: fmt(totalValue), tone: 'blue' },
        { label: 'SKUlar', value: String(products.length), tone: 'gray' },
        { label: 'Kam qoldiq', value: String(lowStock.length), tone: 'red' },
      ]} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Mahsulot</th><th className="num">Qoldiq</th><th className="num">Xarid narxi</th><th className="num">Qiymat</th><th>Holat</th></tr></thead>
            <tbody>{products.map((p) => <tr key={p.id}><td className="mono faint">{p.sku}</td><td className="cell-strong">{p.name}</td><td className="num mono">{p.quantity}</td><td className="num mono faint">{fmt(p.purchasePrice)}</td><td className="num mono strong">{fmt(p.quantity * p.purchasePrice)}</td><td>{p.quantity <= p.minStock ? <Badge tone="red" dot>kam</Badge> : <Badge tone="green">ok</Badge>}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- Tax ----------
export function TaxReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const acc = (code: string) => state.accounts.find((a) => a.companyId === cid && a.code === code)
  const vat = acc('2200') ? Math.abs(accountTotals(acc('2200')!, state.entries.filter((e) => e.companyId === cid)).closing) : 0
  const payrollTax = acc('2300') ? Math.abs(accountTotals(acc('2300')!, state.entries.filter((e) => e.companyId === cid)).closing) : 0
  return (
    <Shell title={t('rep.tax')} rows={() => [['Soliq', 'Balans'], ['QQS', vat], ['Ish haqi soliqlari', payrollTax]]} filename="tax-report">
      <StatGrid items={[
        { label: 'QQS majburiyat (2200)', value: fmt(vat), tone: 'amber' },
        { label: 'Ish haqi soliqlari (2300)', value: fmt(payrollTax), tone: 'amber' },
        { label: 'Majburiyatlar soni', value: String(state.taxLiabilities.filter((x) => x.companyId === cid && x.status !== 'paid').length), tone: 'blue' },
      ]} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Soliq</th><th>Davr</th><th>Muddat</th><th className="num">Summa</th><th>Holat</th></tr></thead>
            <tbody>{state.taxLiabilities.filter((x) => x.companyId === cid).map((x) => <tr key={x.id}><td className="cell-strong">{x.name}</td><td className="mono faint">{x.period}</td><td className="faint">{x.dueDate}</td><td className="num mono strong">{fmt(x.amount)}</td><td><Badge tone={x.status === 'paid' ? 'green' : x.status === 'overdue' ? 'red' : 'amber'}>{x.status}</Badge></td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- Budget vs actual ----------
export function BudgetReport() {
  const { state, session, fmt, t } = useStore()
  const cid = session!.companyId
  const year = Number(todayISO().slice(0, 4))
  const budgets = state.budgets.filter((b) => b.companyId === cid && b.year === year)
  const rows = budgets.map((b) => {
    const acc = state.accounts.find((a) => a.id === b.accountId)!
    const actual = Math.abs(accountTotals(acc, state.entries.filter((e) => e.companyId === cid), `${year}-01-01`, monthEnd(todayISO().slice(0, 7))).closing)
    return { b, acc, actual, variance: actual - b.amount }
  })
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual, 0)
  return (
    <Shell title={t('rep.budget')} rows={() => [['Kategoriya', 'Byudjet', 'Haqiqiy', 'Farq'], ...rows.map((r) => [r.acc.name, r.b.amount, r.actual, r.variance])]} filename="budget-vs-actual">
      <StatGrid items={[
        { label: 'Jami byudjet', value: fmt(totalBudget), tone: 'blue' },
        { label: 'Jami haqiqiy', value: fmt(totalActual), tone: 'gray' },
        { label: 'Farq', value: fmt(totalActual - totalBudget), tone: totalActual - totalBudget > 0 ? 'red' : 'green' },
      ]} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kategoriya</th><th className="num">Byudjet</th><th className="num">Haqiqiy</th><th className="num">Farq</th><th>Bajarilish</th></tr></thead>
            <tbody>{rows.map((r) => { const pct = r.b.amount ? (r.actual / r.b.amount) * 100 : 0; return <tr key={r.b.id}><td className="cell-strong">{r.acc.name}</td><td className="num mono">{fmt(r.b.amount)}</td><td className="num mono">{fmt(r.actual)}</td><td className="num mono strong" style={{ color: r.variance > 0 ? 'var(--danger)' : 'var(--primary)' }}>{r.variance > 0 ? '+' : ''}{fmt(r.variance)}</td><td><Badge tone={pct > 100 ? 'red' : pct > 80 ? 'amber' : 'green'}>{pct.toFixed(0)}%</Badge></td></tr> })}</tbody>
          </table>
        </div>
      </Card>
    </Shell>
  )
}

// ---------- Management report (KPI overview) ----------
export function ManagementReport() {
  const { state, session, fmt, t, currency, lang } = useStore()
  const cid = session!.companyId
  const { from, to } = usePeriodRange()
  const series = monthlySeries(state, cid, 8)
  const exp = expenseBreakdown(state, cid, from, to).slice(0, 8)
  const is = incomeStatement(state, cid, from, to)
  const cf = cashFlowStatement(state, cid, from, to)
  return (
    <Shell title={t('nav.managementReports')} rows={() => [['Oy', 'Daromad', 'Xarajat', 'Foyda'], ...series.map((s) => [s.ym, s.revenue, s.expenses, s.profit])]} filename="management-report">
      <StatGrid items={[
        { label: 'Naqd pul', value: fmt(cashBalance(state, cid)), tone: 'blue' },
        { label: 'Debitorlik', value: fmt(receivablesBalance(state, cid)), tone: 'amber' },
        { label: 'Kreditorlik', value: fmt(payablesBalance(state, cid)), tone: 'sky' },
        { label: 'Sof foyda', value: fmt(is.netProfit), tone: 'green' },
        { label: 'Sof pul o‘zgarishi', value: fmt(cf.netChange), tone: cf.netChange >= 0 ? 'green' : 'red' },
        { label: 'Marja', value: `${is.revenueTotal ? ((is.netProfit / is.revenueTotal) * 100).toFixed(1) : 0}%`, tone: 'violet' },
      ]} />
      <div className="grid grid-2">
        <Card pad><div className="section-title">Daromad vs xarajat (8 oy)</div><TrendArea data={series.map((s) => ({ label: s.label, revenue: s.revenue, expenses: s.expenses }))} currency={currency} lang={lang} height={250} /></Card>
        <Card pad><div className="section-title">Xarajatlar tarkibi</div><Donut data={exp.map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} height={190} /><DonutLegend data={exp.map((e) => ({ name: e.account.name, value: e.amount }))} currency={currency} lang={lang} /></Card>
      </div>
    </Shell>
  )
}
