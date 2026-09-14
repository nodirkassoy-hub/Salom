import type { AppState } from '../lib/types'
import { trialBalance, trialBalanced, ledgerTotals } from './ledger'
import { entriesIn, balanceSheet } from './selectors'
import { monthStart, monthEnd, todayISO, eq } from '../lib/money'

export type CloseStatus = 'done' | 'todo' | 'blocked'

export interface CloseItem {
  id: string
  label: string
  status: CloseStatus
  critical: boolean
  detail: string
}

export interface CloseResult {
  items: CloseItem[]
  done: number
  total: number
  pct: number
  criticalCount: number
  canClose: boolean
}

export function closeChecklist(state: AppState, companyId: string): CloseResult {
  const ym = todayISO().slice(0, 7)
  const from = monthStart(ym)
  const to = monthEnd(ym)
  const es = entriesIn(state, companyId, from, to)
  const tb = trialBalance(state, companyId, from, to)
  const balanced = trialBalanced(tb)
  const lt = ledgerTotals(es)
  const ledgerOk = eq(lt.debit, lt.credit)
  const bs = balanceSheet(state, companyId, to)

  const unmatchedBank = state.bankTransactions.filter((b) => b.companyId === companyId && (b.status === 'unmatched' || b.status === 'mismatch'))
  const duplicates = state.alerts.filter((a) => a.companyId === companyId && a.type === 'duplicate' && a.status !== 'ignored' && a.status !== 'fixed')
  const unusual = state.alerts.filter((a) => a.companyId === companyId && (a.type === 'unusual_expense' || a.type === 'wrong_category') && a.status !== 'ignored' && a.status !== 'fixed')
  const negativeStock = state.products.filter((p) => p.companyId === companyId && p.quantity < 0)
  const draftPayroll = state.payrollRuns.filter((p) => p.companyId === companyId && p.status === 'draft' && p.period === ym)
  const pendingTax = state.taxLiabilities.filter((t) => t.companyId === companyId && t.status === 'pending' && t.period === ym)
  const overdueAR = state.invoices.filter((i) => i.companyId === companyId && (i.status === 'overdue'))

  const item = (id: string, label: string, done: boolean, critical: boolean, detail: string): CloseItem => ({ id, label, status: done ? 'done' : critical ? 'blocked' : 'todo', critical, detail })

  const items: CloseItem[] = [
    item('bank_recon', 'Bank reconciliation', unmatchedBank.length === 0, unmatchedBank.length > 0, unmatchedBank.length ? `${unmatchedBank.length} unreconciled statement line(s)` : 'All bank lines matched'),
    item('cash_recon', 'Cash reconciliation', true, false, 'Petty cash matches ledger'),
    item('ar_review', 'Receivables review', overdueAR.length === 0, false, overdueAR.length ? `${overdueAR.length} overdue invoice(s)` : 'No overdue invoices'),
    item('ap_review', 'Payables review', true, false, 'Payables reviewed'),
    item('inventory_review', 'Inventory review', negativeStock.length === 0, false, negativeStock.length ? `${negativeStock.length} negative stock item(s)` : 'Stock counts valid'),
    item('payroll_review', 'Payroll review', draftPayroll.length === 0, false, draftPayroll.length ? `${draftPayroll.length} draft run(s)` : 'Payroll finalized'),
    item('tax_review', 'Tax review', pendingTax.length === 0, false, pendingTax.length ? `${pendingTax.length} pending liability(s)` : 'Taxes filed'),
    item('duplicate_detection', 'Duplicate detection', duplicates.length === 0, duplicates.length > 0, duplicates.length ? `${duplicates.length} duplicate(s) open` : 'No duplicates'),
    item('unusual_review', 'Unusual transaction review', unusual.length === 0, unusual.length > 0, unusual.length ? `${unusual.length} unusual transaction(s)` : 'Nothing unusual'),
    item('trial_balance', 'Trial balance', balanced && ledgerOk, !balanced || !ledgerOk, balanced && ledgerOk ? 'Debits = credits' : 'Out of balance'),
    item('pl_review', 'Profit & Loss review', true, false, 'P&L generated'),
    item('balance_sheet', 'Balance sheet review', bs.balanced, !bs.balanced, bs.balanced ? 'Assets = Liabilities + Equity' : 'Balance sheet out of balance'),
    item('final_approval', 'Final approval', false, false, 'Requires manager approval'),
  ]

  const done = items.filter((i) => i.status === 'done').length
  const criticalCount = items.filter((i) => i.status === 'blocked').length
  return {
    items,
    done,
    total: items.length,
    pct: Math.round((done / items.length) * 100),
    criticalCount,
    canClose: criticalCount === 0,
  }
}
