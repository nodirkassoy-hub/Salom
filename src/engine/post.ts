import type { AppState, JournalEntry, JournalLine, Account, Invoice, Bill, Expense, Payment, PayrollRun } from '../lib/types'
import { buildEntry, EntryDraft } from './ledger'
import { invoiceTotal, invoiceTax, invoiceSubtotal, invoiceDiscount } from './selectors'

// =============================================================
// Business -> Journal posting rules. Every function below creates
// a balanced double-entry posting on the shared ledger.
// =============================================================

export function postEntry(draft: AppState, e: EntryDraft): JournalEntry {
  const entry = buildEntry(draft, e)
  draft.entries.push(entry)
  const m = entry.number.match(/(\d+)$/)
  if (m) draft.seq['JE'] = Math.max(draft.seq['JE'] || 0, parseInt(m[1], 10))
  return entry
}

export function bumpSeq(draft: AppState, key: string, prefix: string): string {
  const n = (draft.seq[key] || 0) + 1
  draft.seq[key] = n
  return `${prefix}-${String(n).padStart(4, '0')}`
}

export function findAccount(draft: AppState, companyId: string, code: string): Account | undefined {
  return draft.accounts.find((a) => a.companyId === companyId && a.code === code)
}

export function partyAccount(draft: AppState, companyId: string, partyId: string, type: 'Receivable' | 'Payable'): Account | undefined {
  return draft.accounts.find((a) => a.companyId === companyId && a.type === type && a.partyId === partyId)
}

export function revenueAccountForLine(draft: AppState, companyId: string, productId?: string): Account {
  const productAcct = findAccount(draft, companyId, '4200')!
  const serviceAcct = findAccount(draft, companyId, '4100')!
  return productId ? productAcct : serviceAcct
}

export function vatPayable(draft: AppState, companyId: string): Account {
  return findAccount(draft, companyId, '2200')!
}
export function vatInput(draft: AppState, companyId: string): Account {
  return findAccount(draft, companyId, '1250')!
}
export function inventoryAccount(draft: AppState, companyId: string): Account {
  return findAccount(draft, companyId, '1300')!
}
export function cogsAccount(draft: AppState, companyId: string): Account {
  return findAccount(draft, companyId, '5100')!
}

export function reverseEntry(draft: AppState, original: JournalEntry, date: string, description: string): JournalEntry {
  return postEntry(draft, {
    companyId: original.companyId,
    date,
    description: `Bekor qilish: ${description}`,
    source: 'adjustment',
    sourceId: original.id,
    lines: original.lines.map((l) => ({ accountId: l.accountId, debit: l.credit || 0, credit: l.debit || 0, memo: l.memo })),
  })
}

// ---- Invoice issue (accrual): DR AR, CR Revenue (+ VAT) + COGS if products ----
export function postInvoice(draft: AppState, invoice: Invoice): JournalEntry {
  const companyId = invoice.companyId
  const ar = partyAccount(draft, companyId, invoice.customerId, 'Receivable')!
  const lines: JournalLine[] = []
  const total = invoiceTotal(invoice)

  lines.push({ accountId: ar.id, debit: total, credit: 0, memo: `Invoice ${invoice.number}` })

  // Revenue split by line (service vs product)
  const serviceLines = invoice.lines.filter((l) => !l.productId)
  const productLines = invoice.lines.filter((l) => l.productId)
  const serviceNet = Math.round(serviceLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * (1 - invoice.discountRate))
  const productNet = Math.round(productLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * (1 - invoice.discountRate))
  if (serviceNet > 0) lines.push({ accountId: findAccount(draft, companyId, '4100')!.id, credit: serviceNet, debit: 0 })
  if (productNet > 0) lines.push({ accountId: findAccount(draft, companyId, '4200')!.id, credit: productNet, debit: 0 })

  const tax = invoiceTax(invoice)
  if (tax > 0) lines.push({ accountId: vatPayable(draft, companyId).id, credit: tax, debit: 0 })

  // COGS for product lines
  for (const l of productLines) {
    if (!l.productId) continue
    const p = draft.products.find((x) => x.id === l.productId)
    if (!p) continue
    const cost = Math.round(p.purchasePrice * l.quantity)
    lines.push({ accountId: cogsAccount(draft, companyId).id, debit: cost, credit: 0, memo: p.name })
    lines.push({ accountId: inventoryAccount(draft, companyId).id, debit: 0, credit: cost, memo: p.name })
  }

  return postEntry(draft, {
    companyId, date: invoice.issueDate, description: `Invoice ${invoice.number}`, source: 'invoice', sourceId: invoice.id, lines,
  })
}

// ---- Payment received: DR bank, CR AR ----
export function postPayment(draft: AppState, payment: Payment): JournalEntry {
  const companyId = payment.companyId
  const ar = partyAccount(draft, companyId, payment.partyId, 'Receivable')
  if (!ar) throw new Error('AR account not found')
  const bank = draft.accounts.find((a) => a.id === payment.accountId)!
  return postEntry(draft, {
    companyId, date: payment.date,
    description: `Payment received${payment.reference ? ' · ' + payment.reference : ''}`,
    source: 'payment', sourceId: payment.id,
    lines: [
      { accountId: bank.id, debit: payment.amount, credit: 0 },
      { accountId: ar.id, debit: 0, credit: payment.amount },
    ],
  })
}

// ---- Expense: DR expense (+ VAT input), CR bank/cash OR payable ----
export function postExpense(draft: AppState, expense: Expense): JournalEntry {
  const companyId = expense.companyId
  const net = Math.max(0, expense.amount - expense.taxAmount)
  const lines: JournalLine[] = []
  lines.push({ accountId: expense.categoryAccountId, debit: net, credit: 0, memo: expense.description })
  if (expense.taxAmount > 0) lines.push({ accountId: vatInput(draft, companyId).id, debit: expense.taxAmount, credit: 0 })
  const payAccount = draft.accounts.find((a) => a.id === expense.paymentAccountId)
  const isPayable = payAccount?.type === 'Payable'
  lines.push({ accountId: expense.paymentAccountId, debit: 0, credit: expense.amount, memo: isPayable ? 'On credit' : undefined })
  return postEntry(draft, {
    companyId, date: expense.date, description: `Expense ${expense.number} — ${expense.description}`,
    source: 'expense', sourceId: expense.id, lines,
  })
}

// ---- Bill (purchase on credit): DR expense/cogs/inventory (+VAT), CR AP ----
export function postBill(draft: AppState, bill: Bill): JournalEntry {
  const companyId = bill.companyId
  const ap = partyAccount(draft, companyId, bill.supplierId, 'Payable')!
  const total = invoiceTotal(bill as unknown as Invoice)
  const tax = invoiceTax(bill as unknown as Invoice)
  const net = total - tax
  const lines: JournalLine[] = []

  // Allocate to the first line's implied category: if product -> inventory, else expense
  const firstProductId = bill.lines[0]?.productId
  const targetAccount = firstProductId
    ? inventoryAccount(draft, companyId)
    : findAccount(draft, companyId, '6900')! // default other expense
  lines.push({ accountId: targetAccount.id, debit: net, credit: 0 })
  if (tax > 0) lines.push({ accountId: vatInput(draft, companyId).id, debit: tax, credit: 0 })
  lines.push({ accountId: ap.id, debit: 0, credit: total, memo: `Bill ${bill.number}` })

  return postEntry(draft, {
    companyId, date: bill.issueDate, description: `Bill ${bill.number}`, source: 'bill', sourceId: bill.id, lines,
  })
}

// ---- Bill payment: DR AP, CR bank ----
export function postBillPayment(draft: AppState, payment: Payment): JournalEntry {
  const companyId = payment.companyId
  const ap = partyAccount(draft, companyId, payment.partyId, 'Payable')!
  const bank = draft.accounts.find((a) => a.id === payment.accountId)!
  return postEntry(draft, {
    companyId, date: payment.date,
    description: `Bill payment${payment.reference ? ' · ' + payment.reference : ''}`,
    source: 'bill_payment', sourceId: payment.id,
    lines: [
      { accountId: ap.id, debit: payment.amount, credit: 0 },
      { accountId: bank.id, debit: 0, credit: payment.amount },
    ],
  })
}

// ---- Inventory purchase (paid): DR inventory (+VAT), CR bank ----
export function postInventoryPurchase(draft: AppState, opts: { companyId: string; date: string; productId: string; quantity: number; unitCost: number; accountId: string; description: string }): JournalEntry {
  const companyId = opts.companyId
  const total = Math.round(opts.quantity * opts.unitCost)
  const lines: JournalLine[] = [
    { accountId: inventoryAccount(draft, companyId).id, debit: total, credit: 0 },
    { accountId: opts.accountId, debit: 0, credit: total },
  ]
  return postEntry(draft, { companyId, date: opts.date, description: opts.description, source: 'inventory', lines })
}

// ---- Payroll: DR salaries(+social tax), CR tax payable, CR bank ----
export function postPayroll(draft: AppState, run: PayrollRun, bankAccountId: string): JournalEntry {
  const companyId = run.companyId
  const salaries = findAccount(draft, companyId, '6100')!
  const taxPayable = findAccount(draft, companyId, '2300')!
  let gross = 0, incomeTax = 0, socialTax = 0, net = 0
  for (const l of run.lines) {
    gross += l.gross + l.bonus - l.advance
    incomeTax += l.incomeTax
    socialTax += l.socialTax
    net += l.net
  }
  const expenseTotal = gross + socialTax
  return postEntry(draft, {
    companyId, date: run.runDate, description: `Payroll ${run.period}`,
    source: 'payroll', sourceId: run.id,
    lines: [
      { accountId: salaries.id, debit: expenseTotal, credit: 0 },
      { accountId: taxPayable.id, debit: 0, credit: incomeTax + socialTax },
      { accountId: bankAccountId, debit: 0, credit: net },
    ],
  })
}

// ---- Internal transfer: DR target, CR source ----
export function postTransfer(draft: AppState, opts: { companyId: string; date: string; amount: number; fromAccountId: string; toAccountId: string; description: string }): JournalEntry {
  return postEntry(draft, {
    companyId: opts.companyId, date: opts.date, description: opts.description, source: 'transfer',
    lines: [
      { accountId: opts.toAccountId, debit: opts.amount, credit: 0 },
      { accountId: opts.fromAccountId, debit: 0, credit: opts.amount },
    ],
  })
}

// ---- Opening balance: DR asset, CR equity ----
export function postOpening(draft: AppState, opts: { companyId: string; date: string; accountId: string; amount: number; description: string }): JournalEntry {
  const equity = findAccount(draft, opts.companyId, '3100')!
  return postEntry(draft, {
    companyId: opts.companyId, date: opts.date, description: opts.description, source: 'opening',
    lines: [
      { accountId: opts.accountId, debit: opts.amount, credit: 0 },
      { accountId: equity.id, debit: 0, credit: opts.amount },
    ],
  })
}

export function invoiceNet(inv: Invoice): { subtotal: number; discount: number; tax: number; total: number } {
  return { subtotal: invoiceSubtotal(inv), discount: invoiceDiscount(inv), tax: invoiceTax(inv), total: invoiceTotal(inv) }
}
