import type { AppState, RadarAlert, AlertSeverity } from '../lib/types'
import { incomeStatement, entriesIn } from './selectors'
import { entryTotals, accountTotals } from './ledger'
import { monthStart, monthEnd, todayISO, addDays } from '../lib/money'

// =============================================================
// Xato Radar — risk rules engine. Scans the real ledger and
// entity registries; never invents numbers.
// =============================================================

interface RuleAlert {
  key: string
  type: string
  severity: AlertSeverity
  title: string
  what: string
  why: string
  impact: number
  fix: string
  confidence: number
  relatedIds: string[]
}

function fmt(n: number): string {
  return (n / 100).toLocaleString('en-US')
}

// Normalize an entry description for duplicate detection: drop the
// auto-generated document number and collapse whitespace so two identical
// operations with different sequence numbers still match.
function normDesc(s: string): string {
  return s
    .replace(/\b(EXP|INV|BILL|JE|PAY|PR|MV)-\d{4}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function runRadar(state: AppState, companyId: string): RuleAlert[] {
  const out: RuleAlert[] = []
  const es = entriesIn(state, companyId)
  const today = todayISO()

  // ---- 1. Duplicate transactions (same date/amount/account/description) ----
  const seen = new Map<string, number>()
  const dupGroup = new Map<string, string[]>()
  for (const e of es) {
    if (e.source === 'opening') continue
    const t = entryTotals(e.lines)
    const accs = e.lines.map((l) => l.accountId).sort().join(',')
    const k = `${e.date}|${t.debit}|${accs}|${normDesc(e.description)}`
    seen.set(k, (seen.get(k) || 0) + 1)
    if (!dupGroup.has(k)) dupGroup.set(k, [])
    dupGroup.get(k)!.push(e.id)
  }
  for (const [k, ids] of dupGroup) {
    if (ids.length < 2) continue
    const first = es.find((e) => e.id === ids[0])!
    const t = entryTotals(first.lines)
    out.push({
      key: `dup_${k}`, type: 'duplicate', severity: 'high',
      title: 'Duplicate transaction detected',
      what: `Two or more identical transactions on ${first.date}: "${first.description}" (${fmt(t.debit)} so‘m).`,
      why: 'The same operation appears to be recorded twice, which overstates expenses/revenue and corrupts reports.',
      impact: t.debit * (ids.length - 1),
      fix: 'Review the duplicates and delete the incorrect copy, or mark one as void.',
      confidence: 94, relatedIds: ids,
    })
  }

  // ---- 2. Unusual expense (spike vs 6-month average) ----
  const curYm = today.slice(0, 7)
  const current = incomeStatement(state, companyId, monthStart(curYm), monthEnd(curYm))
  for (const li of current.opex) {
    const hist: number[] = []
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today + 'T00:00:00')
      const y = d.getFullYear()
      const m = d.getMonth() - i
      const dd = new Date(y, m, 1)
      const ym = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`
      hist.push(incomeStatement(state, companyId, monthStart(ym), monthEnd(ym)).opex.find((x) => x.account.id === li.account.id)?.amount ?? 0)
    }
    const avg = hist.reduce((s, v) => s + v, 0) / (hist.filter((v) => v > 0).length || 1)
    if (avg > 0 && li.amount > avg * 2 && li.amount > 1000000) {
      const pct = Math.round(((li.amount - avg) / avg) * 100)
      out.push({
        key: `spike_${li.account.id}`, type: 'unusual_expense', severity: 'high',
        title: `Unusual ${li.account.name} expense`,
        what: `${li.account.name} this month is ${fmt(li.amount)} so‘m — ${pct}% above the 6-month average (${fmt(Math.round(avg))} so‘m).`,
        why: 'An abnormally large expense may be misclassified, duplicated or unauthorized.',
        impact: li.amount - Math.round(avg),
        fix: 'Open the expense breakdown, verify the supporting documents and correct the category if needed.',
        confidence: 82, relatedIds: li.entries.map((e) => e.id),
      })
    }
  }

  // ---- 3. Wrong category (expense posted into revenue / negative revenue) ----
  for (const li of current.revenue) {
    if (li.amount < 0 || (li.entries.some((e) => e.lines.some((l) => l.accountId === li.account.id && (l.debit || 0) > 0)))) {
      const negative = Math.abs(Math.min(0, li.amount))
      out.push({
        key: `wrongcat_${li.account.id}`, type: 'wrong_category', severity: 'critical',
        title: `Revenue account "${li.account.name}" has debits`,
        what: `Account ${li.account.code} (${li.account.name}) contains debit postings that reduce revenue.`,
        why: 'An expense was likely recorded against a revenue account, distorting both revenue and expense figures.',
        impact: negative,
        fix: 'Reclassify the debits to the correct expense account via a journal entry.',
        confidence: 88, relatedIds: li.entries.map((e) => e.id),
      })
    }
  }

  // ---- 4. Bank mismatch (unmatched statement lines) ----
  const unmatched = state.bankTransactions.filter((b) => b.companyId === companyId && (b.status === 'unmatched' || b.status === 'mismatch' || b.status === 'duplicate'))
  if (unmatched.length) {
    const total = unmatched.reduce((s, b) => s + b.amount, 0)
    out.push({
      key: `bank_${unmatched.map((b) => b.id).join('_')}`, type: 'bank_mismatch', severity: unmatched.some((b) => b.status === 'mismatch') ? 'critical' : 'medium',
      title: `${unmatched.length} unreconciled bank transaction(s)`,
      what: `${unmatched.length} bank statement line(s) have no matching BUXAI transaction (net ${fmt(Math.abs(total))} so‘m ${total >= 0 ? 'in' : 'out'}).`,
      why: 'Unreconciled items mean the bank balance and the ledger disagree.',
      impact: total,
      fix: 'Open Reconciliation and match, create or ignore each item.',
      confidence: 90, relatedIds: unmatched.map((b) => b.id),
    })
  }

  // ---- 5. Overdue receivables ----
  const overdueInvs = state.invoices.filter((i) => i.companyId === companyId && (i.status === 'overdue' || (i.status !== 'draft' && i.status !== 'cancelled' && i.status !== 'paid' && i.dueDate < today)))
  const overdueTotal = overdueInvs.reduce((s, i) => {
    const paid = state.payments.filter((p) => p.invoiceId === i.id).reduce((x, p) => x + p.amount, 0)
    return s + Math.max(0, (i.lines.reduce((a, l) => a + Math.round(l.quantity * l.unitPrice), 0) * (1 - i.discountRate)) - paid)
  }, 0)
  if (overdueTotal > 0) {
    out.push({
      key: 'overdue_ar', type: 'overdue_receivables', severity: overdueTotal > 20000000 ? 'critical' : 'high',
      title: `${overdueInvs.length} overdue invoice(s)`,
      what: `${overdueInvs.length} customer invoices totalling ${fmt(overdueTotal)} so‘m are past due.`,
      why: 'Late receivables hurt cash flow and increase the risk of bad debt.',
      impact: overdueTotal,
      fix: 'Send payment reminders to the customers and review their credit terms.',
      confidence: 96, relatedIds: overdueInvs.map((i) => i.id),
    })
  }

  // ---- 6. Invoice mismatch (overpayment) ----
  for (const inv of state.invoices.filter((i) => i.companyId === companyId)) {
    const paid = state.payments.filter((p) => p.invoiceId === inv.id && p.status === 'applied').reduce((s, p) => s + p.amount, 0)
    const total = inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0) * (1 - inv.discountRate) + inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * l.taxRate), 0)
    if (paid > total && total > 0) {
      out.push({
        key: `overpay_${inv.id}`, type: 'invoice_mismatch', severity: 'medium',
        title: `Overpayment on invoice ${inv.number}`,
        what: `Invoice ${inv.number} received ${fmt(paid)} so‘m but totals ${fmt(total)} so‘m — ${fmt(paid - total)} so‘m excess.`,
        why: 'The customer overpaid; the excess must be refunded or applied to another invoice.',
        impact: paid - total,
        fix: 'Apply the excess to another open invoice or record a refund.',
        confidence: 90, relatedIds: [inv.id],
      })
    }
  }

  // ---- 7. Negative cash balances ----
  for (const acc of state.accounts.filter((a) => a.companyId === companyId && (a.type === 'Bank' || a.type === 'Cash'))) {
    const t = accountTotals(acc, es)
    if (t.closing < 0) {
      out.push({
        key: `negbal_${acc.id}`, type: 'negative_balance', severity: 'critical',
        title: `Negative balance on ${acc.name}`,
        what: `${acc.name} shows a closing balance of ${fmt(-t.closing)} so‘m below zero.`,
        why: 'A bank/cash account cannot be negative; a transaction is missing or misdated.',
        impact: -t.closing,
        fix: 'Check the account register and correct the missing or misdated entries.',
        confidence: 92, relatedIds: es.filter((e) => e.lines.some((l) => l.accountId === acc.id)).map((e) => e.id),
      })
    }
  }

  // ---- 8. Unusual supplier activity (bill spike) ----
  const supBills = new Map<string, { total: number; ids: string[] }>()
  for (const b of state.bills.filter((x) => x.companyId === companyId && x.status !== 'draft')) {
    const total = b.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0)
    if (!supBills.has(b.supplierId)) supBills.set(b.supplierId, { total: 0, ids: [] })
    const rec = supBills.get(b.supplierId)!
    rec.total += total
    rec.ids.push(b.id)
  }
  for (const [sid, rec] of supBills) {
    const cur = state.bills.filter((b) => b.companyId === companyId && b.supplierId === sid && b.issueDate >= monthStart(curYm)).reduce((s, b) => s + b.lines.reduce((a, l) => a + Math.round(l.quantity * l.unitPrice), 0), 0)
    const avg = rec.total / Math.max(1, 3)
    if (cur > avg * 2 && cur > 5000000) {
      const name = state.parties.find((p) => p.id === sid)?.name ?? 'Supplier'
      out.push({
        key: `supplier_${sid}`, type: 'supplier_activity', severity: 'medium',
        title: `Unusual activity from ${name}`,
        what: `Bills from ${name} this month total ${fmt(cur)} so‘m — more than double the running average.`,
        why: 'A sudden concentration with one supplier may indicate price inflation or a data-entry error.',
        impact: cur,
        fix: 'Review the bills from this supplier and confirm prices and quantities.',
        confidence: 71, relatedIds: rec.ids,
      })
    }
  }

  // ---- 9. Accounting inconsistency (ledger not balanced) ----
  const tb = state.entries.filter((e) => e.companyId === companyId)
  let debit = 0, credit = 0
  for (const e of tb) {
    const t = entryTotals(e.lines)
    debit += t.debit
    credit += t.credit
  }
  if (Math.abs(debit - credit) > 0.5) {
    out.push({
      key: 'ledger_unbalanced', type: 'accounting_inconsistency', severity: 'critical',
      title: 'Ledger is out of balance',
      what: `Total debits (${fmt(debit)}) ≠ total credits (${fmt(credit)}).`,
      why: 'The fundamental accounting equation is violated; every report is unreliable.',
      impact: debit - credit,
      fix: 'Locate the unbalanced journal entry and correct it so debits equal credits.',
      confidence: 99, relatedIds: [],
    })
  }

  // ---- 10. Inventory below minimum ----
  const lowStock = state.products.filter((p) => p.companyId === companyId && p.quantity <= p.minStock)
  if (lowStock.length) {
    out.push({
      key: 'low_stock', type: 'low_stock', severity: 'low',
      title: `${lowStock.length} product(s) low on stock`,
      what: lowStock.map((p) => `${p.name} (${p.quantity} left, min ${p.minStock})`).join(', '),
      why: 'Low stock can interrupt sales.',
      impact: lowStock.reduce((s, p) => s + p.minStock * p.sellingPrice, 0),
      fix: 'Create a purchase order / restock these products.',
      confidence: 95, relatedIds: lowStock.map((p) => p.id),
    })
  }

  return out
}

export function severityRank(s: AlertSeverity): number {
  return s === 'critical' ? 0 : s === 'high' ? 1 : s === 'medium' ? 2 : 3
}
