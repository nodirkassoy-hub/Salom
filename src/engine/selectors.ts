import type { AppState, Account, JournalEntry, AccountCategory, Invoice, Payment } from '../lib/types'
import { accountBalance, accountTotals } from './ledger'
import { eq, clamp, daysBetween, todayISO } from '../lib/money'

// =============================================================
// Derived financial selectors — ALL numbers come from the ledger.
// Dashboard, Reports, AI Accountant, AI CFO and Radar share these.
// =============================================================

export function companyEntries(state: AppState, companyId: string): JournalEntry[] {
  return state.entries.filter((e) => e.companyId === companyId)
}

export function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function entriesIn(state: AppState, companyId: string, from?: string, to?: string): JournalEntry[] {
  return companyEntries(state, companyId).filter((e) => inRange(e.date, from, to))
}

export function accountsOf(state: AppState, companyId: string, category?: AccountCategory): Account[] {
  return state.accounts.filter((a) => a.companyId === companyId && !a.archived && (!category || a.category === category))
}

export interface LineItem {
  account: Account
  amount: number // natural sign, positive
  entries: JournalEntry[]
}

function lineItems(state: AppState, companyId: string, categories: AccountCategory[], from?: string, to?: string): LineItem[] {
  const es = entriesIn(state, companyId, from, to)
  return accountsOf(state, companyId)
    .filter((a) => categories.includes(a.category))
    .map((a) => {
      const t = accountTotals(a, es, from, to)
      return { account: a, amount: Math.abs(t.closing), entries: es.filter((e) => e.lines.some((l) => l.accountId === a.id)) }
    })
    .filter((l) => l.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export interface IncomeStatement {
  revenue: LineItem[]
  cogs: LineItem[]
  opex: LineItem[]
  otherIncome: LineItem[]
  otherExpense: LineItem[]
  revenueTotal: number
  cogsTotal: number
  opexTotal: number
  otherIncomeTotal: number
  otherExpenseTotal: number
  grossProfit: number
  operatingProfit: number
  netProfit: number
  totalIncome: number
  totalExpense: number
}

export function incomeStatement(state: AppState, companyId: string, from?: string, to?: string): IncomeStatement {
  const revenue = lineItems(state, companyId, ['Revenue'], from, to)
  const cogs = lineItems(state, companyId, ['CostOfGoodsSold'], from, to)
  const opex = lineItems(state, companyId, ['OperatingExpense'], from, to)
  const otherIncome = lineItems(state, companyId, ['OtherIncome'], from, to)
  const otherExpense = lineItems(state, companyId, ['OtherExpense'], from, to)
  const revenueTotal = revenue.reduce((s, l) => s + l.amount, 0)
  const cogsTotal = cogs.reduce((s, l) => s + l.amount, 0)
  const opexTotal = opex.reduce((s, l) => s + l.amount, 0)
  const otherIncomeTotal = otherIncome.reduce((s, l) => s + l.amount, 0)
  const otherExpenseTotal = otherExpense.reduce((s, l) => s + l.amount, 0)
  const totalIncome = revenueTotal + otherIncomeTotal
  const totalExpense = cogsTotal + opexTotal + otherExpenseTotal
  const grossProfit = revenueTotal - cogsTotal
  const operatingProfit = grossProfit - opexTotal
  const netProfit = totalIncome - totalExpense
  return {
    revenue, cogs, opex, otherIncome, otherExpense,
    revenueTotal, cogsTotal, opexTotal, otherIncomeTotal, otherExpenseTotal,
    grossProfit, operatingProfit, netProfit, totalIncome, totalExpense,
  }
}

// Retained earnings = accumulated net profit since inception.
export function retainedEarnings(state: AppState, companyId: string, asOf?: string): number {
  const is = incomeStatement(state, companyId, undefined, asOf)
  return is.netProfit
}

export interface BalanceSheet {
  assets: LineItem[]
  liabilities: LineItem[]
  equity: LineItem[]
  assetsTotal: number
  liabilitiesTotal: number
  equityTotal: number
  balanced: boolean
}

export function balanceSheet(state: AppState, companyId: string, asOf?: string): BalanceSheet {
  const es = entriesIn(state, companyId, undefined, asOf)
  const assetAccs = accountsOf(state, companyId, 'Asset')
  const liabAccs = accountsOf(state, companyId, 'Liability')
  const eqAccs = accountsOf(state, companyId, 'Equity')

  const toItems = (accs: Account[]): LineItem[] =>
    accs
      .map((a) => {
        const t = accountTotals(a, es, undefined, asOf)
        return { account: a, amount: t.closing, entries: es.filter((e) => e.lines.some((l) => l.accountId === a.id)) }
      })
      .filter((l) => Math.abs(l.amount) > 0)
      .sort((a, b) => b.amount - a.amount)

  const assets = toItems(assetAccs)
  const liabilities = toItems(liabAccs)

  // Equity: owner's equity + retained earnings (derived from P&L)
  const reAcc = eqAccs.find((a) => a.code === '3200')
  const ownerAcc = eqAccs.find((a) => a.code === '3100')
  const equity: LineItem[] = []
  if (ownerAcc) {
    const t = accountTotals(ownerAcc, es, undefined, asOf)
    equity.push({ account: ownerAcc, amount: t.closing, entries: [] })
  }
  if (reAcc) {
    const re = retainedEarnings(state, companyId, asOf)
    equity.push({ account: { ...reAcc, name: reAcc.name }, amount: re, entries: [] })
  }

  const assetsTotal = assets.reduce((s, l) => s + l.amount, 0)
  const liabilitiesTotal = liabilities.reduce((s, l) => s + l.amount, 0)
  const equityTotal = equity.reduce((s, l) => s + l.amount, 0)
  const balanced = eq(assetsTotal, liabilitiesTotal + equityTotal)
  return { assets, liabilities, equity, assetsTotal, liabilitiesTotal, equityTotal, balanced }
}

export interface CashFlowStatement {
  operating: number
  investing: number
  financing: number
  netChange: number
  openingCash: number
  closingCash: number
}

export function cashFlowStatement(state: AppState, companyId: string, from?: string, to?: string): CashFlowStatement {
  const es = entriesIn(state, companyId, from, to)
  const cashAccs = accountsOf(state, companyId).filter((a) => a.type === 'Bank' || a.type === 'Cash')
  let openingCash = 0
  let closingCash = 0
  let operating = 0
  let investing = 0
  let financing = 0

  for (const a of cashAccs) {
    openingCash += accountTotals(a, entriesIn(state, companyId, undefined, from ? subDay(from) : undefined)).closing
    const t = accountTotals(a, es, from, to)
    closingCash += t.closing
  }

  // Categorize non-cash legs of each entry into operating/investing/financing.
  for (const e of es) {
    let cashEffect = 0
    let otherEffect = 0
    const otherCats = new Set<string>()
    for (const l of e.lines) {
      const acc = state.accounts.find((a) => a.id === l.accountId)
      if (!acc) continue
      const isCash = acc.type === 'Bank' || acc.type === 'Cash'
      const delta = (l.credit || 0) - (l.debit || 0) // + = cash inflow
      if (isCash) cashEffect += delta
      else {
        otherCats.add(acc.category)
        otherEffect += (l.debit || 0) - (l.credit || 0)
      }
    }
    void otherEffect
    if (otherCats.has('FixedAsset')) investing += cashEffect
    else if (otherCats.has('Equity') || otherCats.has('Asset')) {
      const isLoan = e.lines.some((l) => {
        const acc = state.accounts.find((a) => a.id === l.accountId)
        return acc?.code.startsWith('24') || acc?.category === 'Equity'
      })
      if (isLoan) financing += cashEffect
      else operating += cashEffect
    } else operating += cashEffect
  }

  return { operating, investing, financing, netChange: operating + investing + financing, openingCash, closingCash }
}

function subDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export interface KPIMetrics {
  revenue: number
  expenses: number
  netProfit: number
  cash: number
  receivables: number
  payables: number
  revenuePrev: number
  expensesPrev: number
  netProfitPrev: number
  cashPrev: number
  receivablesPrev: number
  payablesPrev: number
}

export function kpiMetrics(state: AppState, companyId: string, from: string, to: string): KPIMetrics {
  const cur = incomeStatement(state, companyId, from, to)
  const prevFrom = shiftRange(from, to)
  const prev = incomeStatement(state, companyId, prevFrom, from ? subDay(from) : undefined)
  const cash = cashBalance(state, companyId, to)
  const cashPrev = cashBalance(state, companyId, subDay(from))
  const ar = categoryBalance(state, companyId, 'Receivable', to)
  const arPrev = categoryBalance(state, companyId, 'Receivable', subDay(from))
  const ap = categoryBalance(state, companyId, 'Payable', to)
  const apPrev = categoryBalance(state, companyId, 'Payable', subDay(from))

  return {
    revenue: cur.revenueTotal,
    expenses: cur.totalExpense,
    netProfit: cur.netProfit,
    cash,
    receivables: ar,
    payables: ap,
    revenuePrev: prev.revenueTotal,
    expensesPrev: prev.totalExpense,
    netProfitPrev: prev.netProfit,
    cashPrev,
    receivablesPrev: arPrev,
    payablesPrev: apPrev,
  }
}

function shiftRange(from: string, to: string): string {
  const len = daysBetween(from, to)
  const d = new Date(from + 'T00:00:00')
  d.setDate(d.getDate() - len - 1)
  return d.toISOString().slice(0, 10)
}

function categoryBalance(state: AppState, companyId: string, type: string, asOf: string): number {
  const es = entriesIn(state, companyId, undefined, asOf)
  return accountsOf(state, companyId)
    .filter((a) => a.type === type)
    .reduce((s, a) => s + accountTotals(a, es, undefined, asOf).closing, 0)
}

export function cashBalance(state: AppState, companyId: string, asOf?: string): number {
  const es = entriesIn(state, companyId, undefined, asOf)
  return accountsOf(state, companyId)
    .filter((a) => a.type === 'Bank' || a.type === 'Cash')
    .reduce((s, a) => s + accountTotals(a, es, undefined, asOf).closing, 0)
}

export function receivablesBalance(state: AppState, companyId: string, asOf?: string): number {
  const es = entriesIn(state, companyId, undefined, asOf)
  return accountsOf(state, companyId)
    .filter((a) => a.type === 'Receivable')
    .reduce((s, a) => s + accountTotals(a, es, undefined, asOf).closing, 0)
}

export function payablesBalance(state: AppState, companyId: string, asOf?: string): number {
  const es = entriesIn(state, companyId, undefined, asOf)
  return accountsOf(state, companyId)
    .filter((a) => a.type === 'Payable')
    .reduce((s, a) => s + accountTotals(a, es, undefined, asOf).closing, 0)
}

export interface MonthlyPoint {
  ym: string
  label: string
  revenue: number
  expenses: number
  profit: number
  cash: number
  receivables: number
  payables: number
}

export function monthlySeries(state: AppState, companyId: string, months: number): MonthlyPoint[] {
  const out: MonthlyPoint[] = []
  const now = new Date(todayISO() + 'T00:00:00')
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const ym = `${y}-${String(m).padStart(2, '0')}`
    const from = `${ym}-01`
    const to = `${y}-${String(m).padStart(2, '0')}-31`
    const is = incomeStatement(state, companyId, from, to)
    out.push({
      ym,
      label: `${String(m).padStart(2, '0')}`,
      revenue: is.revenueTotal,
      expenses: is.totalExpense,
      profit: is.netProfit,
      cash: cashBalance(state, companyId, to),
      receivables: receivablesBalance(state, companyId, to),
      payables: payablesBalance(state, companyId, to),
    })
  }
  return out
}

export function expenseBreakdown(state: AppState, companyId: string, from?: string, to?: string): LineItem[] {
  return lineItems(state, companyId, ['OperatingExpense', 'CostOfGoodsSold', 'OtherExpense'], from, to)
}

export function revenueBreakdown(state: AppState, companyId: string, from?: string, to?: string): LineItem[] {
  return lineItems(state, companyId, ['Revenue', 'OtherIncome'], from, to)
}

export interface PartyBalance {
  partyId: string
  accountId: string
  balance: number
}

export function partyBalances(state: AppState, companyId: string, type: 'Receivable' | 'Payable'): PartyBalance[] {
  const es = entriesIn(state, companyId)
  return accountsOf(state, companyId)
    .filter((a) => a.type === type && a.partyId)
    .map((a) => ({ partyId: a.partyId!, accountId: a.id, balance: accountTotals(a, es).closing }))
    .filter((b) => Math.abs(b.balance) > 0)
    .sort((a, b) => b.balance - a.balance)
}

export interface AgingBucket {
  current: number
  days30: number
  days60: number
  days90: number
  overdue: number
}

export function invoiceOutstanding(inv: Invoice, payments: Payment[]): number {
  const paid = payments.filter((p) => p.invoiceId === inv.id && p.status === 'applied').reduce((s, p) => s + p.amount, 0)
  return Math.max(0, invoiceTotal(inv) - paid)
}

export function invoiceTotal(inv: Invoice): number {
  const subtotal = inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0)
  const afterDiscount = Math.round(subtotal * (1 - (inv.discountRate ?? 0)))
  const tax = inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * (l.taxRate ?? 0)), 0)
  return afterDiscount + tax
}

export function invoiceSubtotal(inv: Invoice): number {
  return inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0)
}

export function invoiceTax(inv: Invoice): number {
  return inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * (l.taxRate ?? 0)), 0)
}

export function invoiceDiscount(inv: Invoice): number {
  return Math.round(invoiceSubtotal(inv) * (inv.discountRate ?? 0))
}

export function agingOf(
  state: AppState,
  companyId: string,
  kind: 'receivable' | 'payable',
  asOf: string = todayISO(),
): AgingBucket {
  const bucket: AgingBucket = { current: 0, days30: 0, days60: 0, days90: 0, overdue: 0 }
  if (kind === 'receivable') {
    for (const inv of state.invoices.filter((i) => i.companyId === companyId && i.status !== 'draft' && i.status !== 'cancelled')) {
      const out = invoiceOutstanding(inv, state.payments)
      if (out <= 0) continue
      const days = daysBetween(inv.dueDate, asOf)
      if (days <= 0) bucket.current += out
      else if (days <= 30) bucket.days30 += out
      else if (days <= 60) bucket.days60 += out
      else bucket.days90 += out
      if (days > 0) bucket.overdue += out
    }
  } else {
    for (const b of state.bills.filter((x) => x.companyId === companyId && x.status !== 'draft' && x.status !== 'cancelled' && x.status !== 'paid')) {
      const paid = state.payments.filter((p) => p.partyId === b.supplierId && p.partyType === 'supplier').reduce((s, p) => s + p.amount, 0)
      const total = invoiceTotal(b as unknown as Invoice)
      const out = Math.max(0, total - paid)
      if (out <= 0) continue
      const days = daysBetween(b.dueDate, asOf)
      if (days <= 0) bucket.current += out
      else if (days <= 30) bucket.days30 += out
      else if (days <= 60) bucket.days60 += out
      else bucket.days90 += out
      if (days > 0) bucket.overdue += out
    }
  }
  return bucket
}

export interface HealthResult {
  score: number
  label: string
  factors: { label: string; value: string; good: boolean }[]
}

export function financialHealth(state: AppState, companyId: string): HealthResult {
  const is = incomeStatement(state, companyId)
  const margin = is.revenueTotal > 0 ? is.netProfit / is.revenueTotal : 0
  const cash = cashBalance(state, companyId)
  const ar = receivablesBalance(state, companyId)
  const ap = payablesBalance(state, companyId)
  const openAlerts = state.alerts.filter((a) => a.companyId === companyId && (a.status === 'open' || a.status === 'reviewed')).length
  const overdueAR = agingOf(state, companyId, 'receivable').overdue
  const bs = balanceSheet(state, companyId)
  const factors: HealthResult['factors'] = []

  let score = 60
  if (margin >= 0.2) score += 12
  else if (margin >= 0.05) score += 6
  else if (margin >= 0) score += 2
  else score -= 10
  factors.push({ label: 'Net margin', value: `${(margin * 100).toFixed(1)}%`, good: margin >= 0.1 })

  const liquidity = ap > 0 ? cash / ap : 2
  if (liquidity >= 1.5) score += 10
  else if (liquidity >= 1) score += 5
  else score -= 6
  factors.push({ label: 'Liquidity (cash/AP)', value: liquidity.toFixed(2), good: liquidity >= 1 })

  const arRatio = ar > 0 && is.revenueTotal > 0 ? overdueAR / is.revenueTotal : 0
  if (arRatio <= 0.05) score += 8
  else if (arRatio <= 0.15) score += 3
  else score -= 8
  factors.push({ label: 'Overdue AR ratio', value: `${(arRatio * 100).toFixed(1)}%`, good: arRatio <= 0.15 })

  if (bs.balanced) score += 6
  else score -= 25
  factors.push({ label: 'Books balanced', value: bs.balanced ? 'Yes' : 'No', good: bs.balanced })

  if (openAlerts === 0) score += 4
  else if (openAlerts <= 3) score -= 2
  else score -= 10
  factors.push({ label: 'Open Radar alerts', value: String(openAlerts), good: openAlerts === 0 })

  score = clamp(Math.round(score), 0, 100)
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Watch' : 'At risk'
  return { score, label, factors }
}

// Drill-down: transactions that produced a given account/period number.
export function entriesForAccount(state: AppState, companyId: string, accountId: string, from?: string, to?: string): JournalEntry[] {
  return entriesIn(state, companyId, from, to)
    .filter((e) => e.lines.some((l) => l.accountId === accountId))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return cur === 0 ? null : null
  return ((cur - prev) / Math.abs(prev)) * 100
}
