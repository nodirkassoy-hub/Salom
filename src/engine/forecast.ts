import type { AppState } from '../lib/types'
import { cashBalance, invoiceTotal, invoiceOutstanding } from './selectors'
import { todayISO, addDays, monthStart } from '../lib/money'

export interface ForecastPoint {
  date: string
  label: string
  inflow: number
  outflow: number
  balance: number
}

export interface CashForecast {
  startBalance: number
  points: ForecastPoint[]
  shortageDates: string[]
  totalInflow: number
  totalOutflow: number
}

// Daily cash projection over the next N days using real scheduled items:
// unpaid invoices (inflow on due date), unpaid bills (outflow on due date),
// tax liabilities (outflow on due date) and expected payroll.
export function forecastCash(state: AppState, companyId: string, days: number): CashForecast {
  const today = todayISO()
  const start = cashBalance(state, companyId, today)
  const points: ForecastPoint[] = []
  const events = new Map<string, { inflow: number; outflow: number }>()

  // Inflows: outstanding invoices scheduled on their due date
  for (const inv of state.invoices.filter((i) => i.companyId === companyId && i.status !== 'draft' && i.status !== 'cancelled' && i.status !== 'paid')) {
    const out = invoiceOutstanding(inv, state.payments)
    if (out <= 0) continue
    const key = inv.dueDate
    const ev = events.get(key) || { inflow: 0, outflow: 0 }
    ev.inflow += out
    events.set(key, ev)
  }

  // Outflows: open bills
  for (const b of state.bills.filter((x) => x.companyId === companyId && x.status !== 'draft' && x.status !== 'cancelled' && x.status !== 'paid')) {
    const total = invoiceTotal(b as never)
    const key = b.dueDate
    const ev = events.get(key) || { inflow: 0, outflow: 0 }
    ev.outflow += total
    events.set(key, ev)
  }

  // Outflows: tax liabilities
  for (const t of state.taxLiabilities.filter((x) => x.companyId === companyId && x.status === 'pending')) {
    const key = t.dueDate
    const ev = events.get(key) || { inflow: 0, outflow: 0 }
    ev.outflow += t.amount
    events.set(key, ev)
  }

  // Outflow: expected payroll next month (if any active employees)
  const nextYm = addDays(monthStart(today.slice(0, 7)), 32).slice(0, 7)
  const payrollKey = `${nextYm}-26`
  const activeEmps = state.employees.filter((e) => e.companyId === companyId && e.active)
  if (activeEmps.length) {
    const net = activeEmps.reduce((s, e) => s + Math.round(e.salary * 0.88), 0)
    const ev = events.get(payrollKey) || { inflow: 0, outflow: 0 }
    ev.outflow += net
    events.set(payrollKey, ev)
  }

  let balance = start
  let totalInflow = 0
  let totalOutflow = 0
  const shortageDates: string[] = []
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i)
    const ev = events.get(date)
    const inflow = ev?.inflow ?? 0
    const outflow = ev?.outflow ?? 0
    balance += inflow - outflow
    totalInflow += inflow
    totalOutflow += outflow
    if (balance < 0) shortageDates.push(date)
    points.push({ date, label: i === 0 ? 'Today' : `${i}d`, inflow, outflow, balance })
  }

  return { startBalance: start, points, shortageDates, totalInflow, totalOutflow }
}
