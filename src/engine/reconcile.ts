import type { AppState, BankTransaction, BankTxnStatus, JournalEntry } from '../lib/types'
import { accountTotals, entryTotals } from './ledger'
import { entriesIn } from './selectors'
import { daysBetween } from '../lib/money'

export interface ReconcileItem {
  bank: BankTransaction
  suggestion?: { entry: JournalEntry; amount: number; score: number; reason: string }
}

export interface ReconcileSummary {
  bankAccountId: string
  statementTotal: number
  ledgerTotal: number
  difference: number
  matched: number
  potential: number
  unmatched: number
  duplicate: number
  mismatch: number
  total: number
  pct: number
  items: ReconcileItem[]
}

const STATUS_RANK: Record<BankTxnStatus, number> = { matched: 0, potential: 1, mismatch: 2, duplicate: 3, unmatched: 4, ignored: 5 }

export function reconciliation(state: AppState, companyId: string, bankAccountId: string): ReconcileSummary {
  const btns = state.bankTransactions.filter((b) => b.companyId === companyId && b.bankAccountId === bankAccountId)
  const glEntries = entriesIn(state, companyId).filter((e) => e.lines.some((l) => l.accountId === bankAccountId))
  const ledgerTotal = accountTotals(state.accounts.find((a) => a.id === bankAccountId)!, entriesIn(state, companyId)).closing

  const statementTotal = btns.reduce((s, b) => s + (b.status === 'ignored' ? 0 : b.amount), 0)

  const items: ReconcileItem[] = btns
    .map((bank): ReconcileItem => {
      if (bank.status !== 'matched') {
        // suggest best GL match by amount + date proximity
        let best: ReconcileItem['suggestion']
        for (const e of glEntries) {
          const t = entryTotals(e.lines)
          const bankEffect = t.debit - t.credit
          const diff = Math.abs(bankEffect - bank.amount)
          const dayDiff = Math.abs(daysBetween(e.date, bank.date))
          const amountScore = diff === 0 ? 50 : diff < Math.abs(bank.amount) * 0.02 ? 35 : diff < Math.abs(bank.amount) * 0.1 ? 15 : 0
          const dateScore = dayDiff === 0 ? 50 : dayDiff <= 1 ? 40 : dayDiff <= 3 ? 25 : dayDiff <= 7 ? 10 : 0
          const score = amountScore + dateScore
          if (score >= 55 && (!best || score > best.score)) {
            best = { entry: e, amount: bankEffect, score, reason: diff === 0 ? 'Exact amount' : dayDiff <= 1 ? 'Close date' : 'Amount & date close' }
          }
        }
        return { bank, suggestion: best }
      }
      return { bank }
    })
    .sort((a, b) => STATUS_RANK[a.bank.status] - STATUS_RANK[b.bank.status])

  const count = (s: BankTxnStatus) => btns.filter((b) => b.status === s).length
  const matched = count('matched')
  const total = btns.filter((b) => b.status !== 'ignored').length
  return {
    bankAccountId,
    statementTotal,
    ledgerTotal,
    difference: ledgerTotal - statementTotal,
    matched,
    potential: count('potential'),
    unmatched: count('unmatched'),
    duplicate: count('duplicate'),
    mismatch: count('mismatch'),
    total,
    pct: total ? Math.round((matched / total) * 100) : 100,
    items,
  }
}

export function bankLedgerDifference(state: AppState, companyId: string, bankAccountId: string): number {
  return reconciliation(state, companyId, bankAccountId).difference
}
