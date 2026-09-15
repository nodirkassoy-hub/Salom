import type { Account, AppState, JournalEntry, JournalLine } from '../lib/types'
import { eq } from '../lib/money'

// =============================================================
// Double-entry ledger. Every financial event posts a balanced
// journal entry: TOTAL DEBIT === TOTAL CREDIT (always).
// =============================================================

export interface EntryDraft {
  companyId: string
  date: string
  description: string
  lines: JournalLine[]
  source: JournalEntry['source']
  sourceId?: string
  number?: string
}

export function entryTotals(lines: JournalLine[]): { debit: number; credit: number } {
  let debit = 0
  let credit = 0
  for (const l of lines) {
    debit += l.debit || 0
    credit += l.credit || 0
  }
  return { debit, credit }
}

export function validateEntry(lines: JournalLine[]): { ok: boolean; diff: number; reason?: string } {
  if (!lines.length) return { ok: false, diff: 0, reason: 'no_lines' }
  for (const l of lines) {
    if ((l.debit > 0 && l.credit > 0) || l.debit < 0 || l.credit < 0)
      return { ok: false, diff: 0, reason: 'invalid_line' }
    if (!l.accountId) return { ok: false, diff: 0, reason: 'missing_account' }
  }
  const t = entryTotals(lines)
  if (t.debit === 0 && t.credit === 0) return { ok: false, diff: 0, reason: 'zero' }
  if (!eq(t.debit, t.credit)) return { ok: false, diff: t.debit - t.credit, reason: 'unbalanced' }
  return { ok: true, diff: 0 }
}

export function buildEntry(state: AppState, draft: EntryDraft): JournalEntry {
  const v = validateEntry(draft.lines)
  if (!v.ok) {
    throw new Error(v.reason === 'unbalanced' ? `Unbalanced entry (diff ${v.diff})` : `Invalid entry: ${v.reason}`)
  }
  const seq = (state.seq['JE'] || 0) + 1
  return {
    id: `je_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    companyId: draft.companyId,
    number: draft.number || `JE-${String(seq).padStart(4, '0')}`,
    date: draft.date,
    description: draft.description,
    lines: draft.lines,
    source: draft.source,
    sourceId: draft.sourceId,
    createdAt: Date.now(),
  }
}

export function normalizeLines(lines: JournalLine[]): JournalLine[] {
  return lines
    .filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0)
    .map((l) => ({ ...l, debit: l.debit || 0, credit: l.credit || 0 }))
}

// Raw account balance = opening + debits - credits (debit-positive).
export function accountRawBalance(account: Account, entries: JournalEntry[]): number {
  let bal = account.openingBalance
  for (const e of entries) {
    if (e.companyId !== account.companyId) continue
    for (const l of e.lines) {
      if (l.accountId === account.id) bal += (l.debit || 0) - (l.credit || 0)
    }
  }
  return bal
}

// Balance in the account's natural sign (assets/expenses positive when debited,
// liabilities/equity/revenue positive when credited).
export function accountBalance(account: Account, entries: JournalEntry[]): number {
  const raw = accountRawBalance(account, entries)
  return account.normalBalance === 'credit' ? -raw : raw
}

export interface AccountPeriodTotals {
  account: Account
  debit: number
  credit: number
  opening: number
  closingRaw: number
  closing: number // natural sign
}

export function accountTotals(
  account: Account,
  entries: JournalEntry[],
  from?: string,
  to?: string,
): AccountPeriodTotals {
  let debit = 0
  let credit = 0
  for (const e of entries) {
    if (e.companyId !== account.companyId) continue
    if (from && e.date < from) continue
    if (to && e.date > to) continue
    for (const l of e.lines) {
      if (l.accountId === account.id) {
        debit += l.debit || 0
        credit += l.credit || 0
      }
    }
  }
  const closingRaw = account.openingBalance + debit - credit
  return {
    account,
    debit,
    credit,
    opening: account.openingBalance,
    closingRaw,
    closing: account.normalBalance === 'credit' ? -closingRaw : closingRaw,
  }
}

export interface TrialRow {
  account: Account
  debit: number
  credit: number
  closing: number // natural sign
}

export function trialBalance(state: AppState, companyId: string, from?: string, to?: string): TrialRow[] {
  const accounts = state.accounts.filter((a) => a.companyId === companyId)
  const entries = state.entries.filter((e) => e.companyId === companyId)
  return accounts
    .map((account) => {
      const t = accountTotals(account, entries, from, to)
      return { account, debit: t.debit, credit: t.credit, closing: t.closing }
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code))
}

export function trialBalanced(rows: TrialRow[]): boolean {
  const d = rows.reduce((s, r) => s + r.debit, 0)
  const c = rows.reduce((s, r) => s + r.credit, 0)
  return eq(d, c)
}

export function ledgerTotals(entries: JournalEntry[]): { debit: number; credit: number } {
  let debit = 0
  let credit = 0
  for (const e of entries) {
    const t = entryTotals(e.lines)
    debit += t.debit
    credit += t.credit
  }
  return { debit, credit }
}

export function nextNumber(state: AppState, key: string, prefix: string): string {
  const n = (state.seq[key] || 0) + 1
  return `${prefix}-${String(n).padStart(4, '0')}`
}
