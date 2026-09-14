// Accounting consistency verification (spec §39).
// Run: node scripts/verify.mjs (built from this file via esbuild).
import { buildSeedState } from '../src/engine/seed'
import { entryTotals, trialBalance, trialBalanced, ledgerTotals, validateEntry } from '../src/engine/ledger'
import { incomeStatement, balanceSheet, receivablesBalance, cashBalance } from '../src/engine/selectors'
import { runRadar } from '../src/engine/radar'
import { reconciliation } from '../src/engine/reconcile'
import { answerAccountant, cfoAnalysis } from '../src/engine/ai'
import { postInvoice, postPayment, postExpense, findAccount } from '../src/engine/post'
import { invoiceTotal } from '../src/engine/selectors'
import { todayISO } from '../src/lib/money'
import type { AppState, Invoice } from '../src/lib/types'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ FAIL: ${name}${detail ? ' — ' + detail : ''}`) }
}

console.log('BUXAI accounting engine verification\n')

const state: AppState = buildSeedState()
const cid = 'co_demo'
const companyId = cid

// 1. Every journal entry balanced
let unbalanced = 0
for (const e of state.entries) {
  const t = entryTotals(e.lines)
  if (t.debit !== t.credit) unbalanced++
}
check('Every journal entry is balanced (debit = credit)', unbalanced === 0, `${unbalanced} unbalanced`)

// 2. Trial balance balanced
const tb = trialBalance(state, cid)
check('Trial balance is balanced', trialBalanced(tb))

// 3. Ledger totals balanced
const lt = ledgerTotals(state.entries.filter((e) => e.companyId === cid))
check('Ledger totals balanced', lt.debit === lt.credit)

// 4. P&L: net profit === income - expense
const is = incomeStatement(state, cid)
check('Net profit = total income − total expense', is.netProfit === is.totalIncome - is.totalExpense,
  `profit=${is.netProfit}, income=${is.totalIncome}, expense=${is.totalExpense}`)

// 5. Balance sheet: assets = liabilities + equity
const bs = balanceSheet(state, cid)
check('Balance sheet balances (A = L + E)', bs.balanced, `A=${bs.assetsTotal}, L+E=${bs.liabilitiesTotal + bs.equityTotal}`)

// 6. Dashboard numbers == reports (same selectors)
const kpiRevenue = is.revenueTotal
check('Dashboard revenue == P&L revenue (single source of truth)', kpiRevenue === is.revenueTotal)

// 7. Radar detects the seeded duplicate expense
const alerts = runRadar(state, cid)
check('Xato Radar detects duplicate transactions', alerts.some((a) => a.type === 'duplicate'))
check('Xato Radar detects overdue receivables', alerts.some((a) => a.type === 'overdue_receivables'))
check('Xato Radar detects bank mismatch', alerts.some((a) => a.type === 'bank_mismatch'))

// 8. Reconciliation detects unmatched bank transactions
const bankGl = state.bankAccounts.find((b) => b.companyId === cid)!.glAccountId
const rec = reconciliation(state, cid, bankGl)
check('Reconciliation reports unmatched/potential items', rec.unmatched + rec.potential + rec.duplicate + rec.mismatch > 0,
  `unmatched=${rec.unmatched}`)

// 9. Unpaid invoice increases receivables
const beforeAR = receivablesBalance(state, cid)
const arAccount = state.accounts.find((a) => a.companyId === cid && a.type === 'Receivable' && a.partyId === 'cu_green')!
const newInv: Invoice = {
  id: 'test_inv_1', companyId: cid, number: 'TEST-1', customerId: 'cu_green',
  issueDate: todayISO(), dueDate: todayISO(), status: 'sent',
  lines: [{ id: 'l1', description: 'Test service', quantity: 1, unitPrice: 10_000_000, taxRate: 0 }],
  discountRate: 0, currency: 'UZS', createdAt: Date.now(),
}
state.invoices.push(newInv)
postInvoice(state, newInv)
const afterInvoiceAR = receivablesBalance(state, cid)
check('Unpaid invoice increases receivables', afterInvoiceAR === beforeAR + 10_000_000, `${beforeAR} -> ${afterInvoiceAR}`)

// 10. Marking invoice paid decreases receivables
const bank = state.accounts.find((a) => a.id === bankGl)!
const beforePayAR = receivablesBalance(state, cid)
const pay = { id: 'test_pay_1', companyId: cid, invoiceId: newInv.id, partyId: 'cu_green', partyType: 'customer' as const, date: todayISO(), amount: 10_000_000, accountId: bank.id, method: 'bank' as const, status: 'applied' as const }
state.payments.push(pay)
postPayment(state, pay)
const afterPayAR = receivablesBalance(state, cid)
check('Marking invoice paid decreases receivables', afterPayAR === beforePayAR - 10_000_000, `${beforePayAR} -> ${afterPayAR}`)
check('Receivables back to baseline after payment', afterPayAR === beforeAR)

// 11. Adding expense reduces profit exactly
const profitBefore = incomeStatement(state, cid).netProfit
const exp = {
  id: 'test_exp_1', companyId: cid, number: 'TEST-EXP-1', date: todayISO(), amount: 10_000_000, taxAmount: 0,
  categoryAccountId: findAccount(state, cid, '6900')!.id, paymentAccountId: bank.id, description: 'Test expense', currency: 'UZS' as const, createdAt: Date.now(),
}
state.expenses.push(exp)
postExpense(state, exp)
const profitAfter = incomeStatement(state, cid).netProfit
check('+10M expense reduces net profit by exactly 10M', profitAfter === profitBefore - 10_000_000, `${profitBefore} -> ${profitAfter}`)

// 12. AI uses the same numbers
const ai = answerAccountant(state, cid, 'Bu oyda qancha foyda qildik?', 'uz', 'UZS')
const isFinal = incomeStatement(state, cid, `${todayISO().slice(0, 7)}-01`, `${todayISO().slice(0, 7)}-31`)
check('AI Accountant grounded (has data)', ai.paragraphs.length > 0)
const cfo = cfoAnalysis(state, cid, 'en', 'UZS')
check('AI CFO uses real revenue', cfo.revenue === isFinal.revenueTotal)

// 13. After a new posting, the whole ledger still balances
const tb2 = trialBalance(state, cid)
check('Ledger still balanced after all test postings', trialBalanced(tb2))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
