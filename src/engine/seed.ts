import type {
  AppState, Company, Invoice, InvoiceLine, Party, Payment, Bill, Expense, Product, Warehouse,
  Employee, PayrollRun, Budget, DocRecord, User, BankAccount, BankTransaction, InventoryMovement, TaxLiability,
} from '../lib/types'
import { buildChartOfAccounts, makeSubAccount } from './coa'
import {
  postEntry, bumpSeq, postInvoice, postPayment, postExpense, postBill, postBillPayment,
  postInventoryPurchase, postPayroll, postOpening, postTransfer, findAccount,
} from './post'
import { invoiceTotal } from './selectors'
import { todayISO, addDays, uid } from '../lib/money'

const VAT = 0.12
const CURRENCY = 'UZS'

function d(daysOffset: number): string {
  return addDays(todayISO(), daysOffset)
}

function monthStartAgo(monthsAgo: number): string {
  const now = new Date(todayISO() + 'T00:00:00')
  const y = now.getFullYear()
  const m = now.getMonth() - monthsAgo
  const dd = new Date(y, m, 1)
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-01`
}

function monthEndAgo(monthsAgo: number): string {
  const now = new Date(todayISO() + 'T00:00:00')
  const y = now.getFullYear()
  const m = now.getMonth() - monthsAgo
  const dd = new Date(y, m + 1, 0)
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
}

export function buildSeedState(): AppState {
  const state: AppState = emptyState()

  // ---------- Company ----------
  const company: Company = {
    id: 'co_demo',
    name: 'BUXAI Technologies',
    fullName: 'BUXAI Technologies MChJ',
    taxId: '309123456',
    vatNo: 'VAT-09876543',
    activity: 'IT va dasturiy ta’minot',
    director: 'Aziz Karimov',
    accountant: 'Dilnoza Rahimova',
    phone: '+998 90 123 45 67',
    email: 'info@buxai.uz',
    address: 'Toshkent sh., Amir Temur 108',
    bankName: 'Kapitalbank',
    accountNo: '20208000123456789001',
    mfo: '01076',
    currency: 'UZS',
    logoHue: 156,
    isDemo: true,
    createdAt: Date.now(),
    settings: {
      language: 'uz', currency: 'UZS', vatRate: 0.12, vatRegistered: true,
      turnoverTaxRate: 0.04, usdRate: 12600, eurRate: 14000, rubRate: 145, fiscalYearEnd: '12-31',
    },
  }
  state.companies.push(company)
  const cid = company.id

  // Second company for multi-company demo (empty-ish, real structure)
  const company2: Company = {
    id: 'co_second',
    name: 'BUXAI Retail',
    fullName: 'BUXAI Retail Savdo MChJ',
    taxId: '309654321',
    vatNo: undefined,
    activity: 'Savdo va chakana',
    director: 'Aziz Karimov',
    accountant: 'Dilnoza Rahimova',
    phone: '+998 90 123 45 68',
    email: 'retail@buxai.uz',
    address: 'Toshkent sh., Chilonzor 12',
    bankName: 'Ipak Yo‘li',
    accountNo: '20208000123456789002',
    mfo: '00440',
    currency: 'UZS',
    logoHue: 260,
    isDemo: true,
    createdAt: Date.now(),
    settings: { ...company.settings },
  }
  state.companies.push(company2)
  buildCompanyScaffold(state, company2)

  // ---------- Chart of accounts ----------
  state.accounts.push(...buildChartOfAccounts(cid, CURRENCY))

  // ---------- Bank accounts (each links a GL account) ----------
  const banks: BankAccount[] = [
    { id: 'ba_kapital', companyId: cid, glAccountId: '', name: 'Kapitalbank UZS', type: 'bank', bankName: 'Kapitalbank', accountNo: '20208000123456789001', currency: 'UZS', openingBalance: 40000000, active: true },
    { id: 'ba_ipak', companyId: cid, glAccountId: '', name: 'Ipak Yo‘li UZS', type: 'bank', bankName: 'Ipak Yo‘li Bank', accountNo: '20208000987654321001', currency: 'UZS', openingBalance: 15000000, active: true },
    { id: 'ba_usd', companyId: cid, glAccountId: '', name: 'USD hisob', type: 'bank', bankName: 'Kapitalbank', accountNo: '20208888444411110001', currency: 'USD', openingBalance: 3000000, active: true },
    { id: 'ba_kassa', companyId: cid, glAccountId: '', name: 'Kassa (naqd)', type: 'cash', bankName: undefined, accountNo: undefined, currency: 'UZS', openingBalance: 2500000, active: true },
  ]
  const glMap: Record<string, string> = {
    ba_kapital: '1101', ba_ipak: '1102', ba_usd: '1103', ba_kassa: '1105',
  }
  for (const b of banks) {
    const gl = findAccount(state, cid, glMap[b.id])!
    b.glAccountId = gl.id
    state.bankAccounts.push(b)
    if (b.openingBalance > 0) {
      postOpening(state, { companyId: cid, date: monthStartAgo(8), accountId: gl.id, amount: b.openingBalance, description: `Opening balance — ${b.name}` })
    }
  }
  const kapital = banks[0].glAccountId
  const ipak = banks[1].glAccountId
  const kassa = banks[3].glAccountId

  // ---------- Parties ----------
  const customers: Party[] = [
    { id: 'cu_universal', companyId: cid, type: 'customer', name: 'Universal Trade Group', taxId: '305112233', phone: '+998 71 200 11 22', email: 'finance@utg.uz', address: 'Toshkent', bankName: 'NBU', accountNo: '20210000111122223333', mfo: '00420' },
    { id: 'cu_alpha', companyId: cid, type: 'customer', name: 'Alpha Retail MChJ', taxId: '305445566', phone: '+998 71 205 33 44', email: 'billing@alpha.uz', address: 'Toshkent', bankName: 'Kapitalbank', accountNo: '20210000222233334444', mfo: '01076' },
    { id: 'cu_delta', companyId: cid, type: 'customer', name: 'Delta Construction', taxId: '305778899', phone: '+998 71 208 55 66', email: 'office@delta.uz', address: 'Toshkent', bankName: 'Xalq Banki', accountNo: '20210000333344445555', mfo: '00410' },
    { id: 'cu_prime', companyId: cid, type: 'customer', name: 'Prime Media Group', taxId: '305001122', phone: '+998 71 210 77 88', email: 'billing@primemedia.uz', address: 'Toshkent', bankName: 'Asaka Bank', accountNo: '20210000444455556666', mfo: '00445' },
    { id: 'cu_green', companyId: cid, type: 'customer', name: 'Green Agro MChJ', taxId: '305334455', phone: '+998 71 211 99 00', email: 'finance@greenagro.uz', address: 'Samarqand', bankName: 'Agrobank', accountNo: '20210000555566667777', mfo: '00490' },
    { id: 'cu_nova', companyId: cid, type: 'customer', name: 'Nova Logistics', taxId: '305667788', phone: '+998 71 213 11 22', email: 'ap@novalog.uz', address: 'Toshkent', bankName: 'Orient Finans', accountNo: '20210000666677778888', mfo: '00446' },
  ]
  const suppliers: Party[] = [
    { id: 'su_tech', companyId: cid, type: 'supplier', name: 'TechSupply LLC', taxId: '306123123', phone: '+998 71 220 10 10', email: 'sales@techsupply.uz', address: 'Toshkent', bankName: 'Ipak Yo‘li', accountNo: '20220000111100001111', mfo: '00440' },
    { id: 'su_office', companyId: cid, type: 'supplier', name: 'OfficeLand MChJ', taxId: '306456456', phone: '+998 71 221 20 20', email: 'sales@officeland.uz', address: 'Toshkent', bankName: 'Kapitalbank', accountNo: '20220000222200002222', mfo: '01076' },
    { id: 'su_marketing', companyId: cid, type: 'supplier', name: 'MarketingPro Agency', taxId: '306789789', phone: '+998 71 222 30 30', email: 'hello@marketingpro.uz', address: 'Toshkent', bankName: 'NBU', accountNo: '20220000333300003333', mfo: '00420' },
    { id: 'su_logistics', companyId: cid, type: 'supplier', name: 'Capital Logistics', taxId: '306012012', phone: '+998 71 223 40 40', email: 'billing@caplog.uz', address: 'Toshkent', bankName: 'Xalq Banki', accountNo: '20220000444400004444', mfo: '00410' },
  ]
  const arParent = findAccount(state, cid, '1200')!
  const apParent = findAccount(state, cid, '2100')!
  for (const p of customers) {
    state.parties.push(p)
    state.accounts.push(makeSubAccount(cid, { code: `1201-${p.id.slice(-4).toUpperCase()}`, name: p.name, category: 'Asset', type: 'Receivable', parentId: arParent.id, partyId: p.id, currency: CURRENCY }))
  }
  for (const p of suppliers) {
    state.parties.push(p)
    state.accounts.push(makeSubAccount(cid, { code: `2101-${p.id.slice(-4).toUpperCase()}`, name: p.name, category: 'Liability', type: 'Payable', parentId: apParent.id, partyId: p.id, currency: CURRENCY }))
  }

  // ---------- Warehouses & products ----------
  const whMain: Warehouse = { id: 'wh_main', companyId: cid, name: 'Asosiy ombor', address: 'Toshkent' }
  const whSec: Warehouse = { id: 'wh_sec', companyId: cid, name: '2-ombor (Chilonzor)', address: 'Toshkent' }
  state.warehouses.push(whMain, whSec)

  const productDefs: [string, string, string, number, number, number, number, string][] = [
    ['P-001', 'Dell XPS 15 noutbuki', 'Kompyuterlar', 12500000, 16500000, 7, 3, 'wh_main'],
    ['P-002', 'LG 27" monitor', 'Monitorlar', 2400000, 3100000, 12, 5, 'wh_main'],
    ['P-003', 'Ofis kreslosi Ergo', 'Mebel', 850000, 1150000, 20, 6, 'wh_sec'],
    ['P-004', 'HP ProLiant server', 'Serverlar', 22000000, 28500000, 2, 1, 'wh_main'],
    ['P-005', 'Cisco tarmoq switch', 'Tarmoq', 1900000, 2600000, 9, 4, 'wh_main'],
    ['P-006', 'SSD 1TB NVMe', 'Komponentlar', 900000, 1250000, 25, 10, 'wh_main'],
    ['P-007', 'UPS 3kVA', 'Uskunalar', 3400000, 4600000, 5, 2, 'wh_sec'],
    ['P-008', 'Klaviatura+sichqoncha', 'Aksessuarlar', 180000, 260000, 40, 12, 'wh_sec'],
  ]
  for (const [sku, name, cat, buy, sell, qty, min, wh] of productDefs) {
    const p: Product = { id: `pr_${sku.toLowerCase()}`, companyId: cid, sku, name, category: cat, unit: 'dona', purchasePrice: buy, sellingPrice: sell, quantity: qty, minStock: min, warehouseId: wh, active: true, createdAt: Date.now() }
    state.products.push(p)
    state.movements.push({ id: uid('mv'), companyId: cid, productId: p.id, type: 'in', quantity: qty, date: monthStartAgo(8), warehouseId: wh, note: 'Boshlang‘ich qoldiq' })
  }

  // ---------- Employees ----------
  const empDefs: [string, string, string, number, string][] = [
    ['Aziz Karimov', 'Direktor', 'Boshqaruv', 22000000, '2022-01-10'],
    ['Dilnoza Rahimova', 'Bosh buxgalter', 'Buxgalteriya', 16000000, '2022-03-01'],
    ['Jasur Toshmatov', 'Savdo menejeri', 'Savdo', 12000000, '2023-05-15'],
    ['Malika Yusupova', 'Marketing mutaxassisi', 'Marketing', 10000000, '2023-09-01'],
    ['Bekzod Ergashev', 'IT muhandis', 'IT', 14000000, '2024-02-20'],
  ]
  for (const [name, pos, dep, sal, start] of empDefs) {
    state.employees.push({ id: uid('emp'), companyId: cid, name, position: pos, department: dep, salary: sal, startDate: start, taxId: '4980' + Math.floor(Math.random() * 900000 + 100000), bankAccount: '9860' + Math.floor(Math.random() * 900000000 + 100000000), active: true })
  }

  // =============================================================
  // Activity generation across 8 months
  // =============================================================
  const bankEvents: { entryId: string; bankAccountId: string; amount: number; date: string; description: string }[] = []

  const svcLine = (desc: string, amount: number, qty = 1): InvoiceLine => ({ id: uid('il'), description: desc, quantity: qty, unitPrice: amount, taxRate: VAT })
  const prodLine = (productId: string, qty: number): InvoiceLine => {
    const p = state.products.find((x) => x.id === productId)!
    return { id: uid('il'), productId, description: p.name, quantity: qty, unitPrice: p.sellingPrice, taxRate: VAT }
  }

  function makeInvoice(opts: { customerId: string; issueDate: string; dueDate: string; lines: InvoiceLine[]; discountRate?: number; status?: Invoice['status'] }): Invoice {
    const inv: Invoice = {
      id: uid('inv'), companyId: cid, number: bumpSeq(state, 'INV', 'INV'), customerId: opts.customerId,
      issueDate: opts.issueDate, dueDate: opts.dueDate, status: opts.status || 'sent', lines: opts.lines,
      discountRate: opts.discountRate || 0, notes: '', currency: CURRENCY, createdAt: Date.now(),
    }
    state.invoices.push(inv)
    if (opts.status !== 'draft' && opts.status !== 'cancelled') postInvoice(state, inv)
    return inv
  }

  function receivePayment(inv: Invoice, date: string, accountId: string, amount?: number, method: Payment['method'] = 'bank'): Payment {
    const pay: Payment = { id: uid('pay'), companyId: cid, invoiceId: inv.id, partyId: inv.customerId, partyType: 'customer', date, amount: amount ?? invoiceTotal(inv), accountId, method, status: 'applied' }
    state.payments.push(pay)
    const e = postPayment(state, pay)
    bankEvents.push({ entryId: e.id, bankAccountId: accountId, amount: pay.amount, date, description: `Payment from ${state.parties.find((p) => p.id === inv.customerId)?.name}` })
    updateInvoiceStatus(state, inv)
    return pay
  }

  function makeExpense(opts: { date: string; amount: number; taxAmount: number; categoryCode: string; accountId: string; supplierId?: string; description: string }): Expense {
    const exp: Expense = {
      id: uid('exp'), companyId: cid, number: bumpSeq(state, 'EXP', 'EXP'), date: opts.date, amount: opts.amount,
      taxAmount: opts.taxAmount, categoryAccountId: findAccount(state, cid, opts.categoryCode)!.id,
      paymentAccountId: opts.accountId, supplierId: opts.supplierId, description: opts.description, currency: CURRENCY, createdAt: Date.now(),
    }
    state.expenses.push(exp)
    const e = postExpense(state, exp)
    bankEvents.push({ entryId: e.id, bankAccountId: opts.accountId, amount: -opts.amount, date: opts.date, description: opts.description })
    return exp
  }

  function makeBill(opts: { supplierId: string; issueDate: string; dueDate: string; amount: number; description: string; accountCode?: string }): Bill {
    const bill: Bill = {
      id: uid('bill'), companyId: cid, number: bumpSeq(state, 'BILL', 'BILL'), supplierId: opts.supplierId,
      issueDate: opts.issueDate, dueDate: opts.dueDate, status: 'open',
      lines: [{ id: uid('il'), description: opts.description, quantity: 1, unitPrice: opts.amount, taxRate: 0 }],
      notes: '', currency: CURRENCY, createdAt: Date.now(),
    }
    state.bills.push(bill)
    postBill(state, bill)
    return bill
  }

  function payBill(bill: Bill, date: string, accountId: string): void {
    const total = invoiceTotal(bill as unknown as Invoice)
    const pay: Payment = { id: uid('pay'), companyId: cid, partyId: bill.supplierId, partyType: 'supplier', date, amount: total, accountId, method: 'bank', status: 'applied' }
    state.payments.push(pay)
    const e = postBillPayment(state, pay)
    bankEvents.push({ entryId: e.id, bankAccountId: accountId, amount: -total, date, description: `Payment to ${state.parties.find((p) => p.id === bill.supplierId)?.name}` })
    bill.status = 'paid'
  }

  function makeInventoryPurchase(monthsAgo: number): void {
    const idx = Math.floor(Math.random() * productDefs.length)
    const p = state.products[idx]
    const qty = 4 + (monthsAgo % 3) * 2
    const date = `${monthStartAgo(monthsAgo).slice(0, 8)}${String(5 + monthsAgo * 3).padStart(2, '0')}`
    const e = postInventoryPurchase(state, { companyId: cid, date, productId: p.id, quantity: qty, unitCost: p.purchasePrice, accountId: kapital, description: `Stock in — ${p.name} x${qty}` })
    bankEvents.push({ entryId: e.id, bankAccountId: kapital, amount: -qty * p.purchasePrice, date, description: `Stock in — ${p.name}` })
    state.movements.push({ id: uid('mv'), companyId: cid, productId: p.id, type: 'in', quantity: qty, date, warehouseId: p.warehouseId, note: 'Xarid' })
    p.quantity += qty
  }

  function adjustStockForSale(inv: Invoice): void {
    for (const l of inv.lines) {
      if (!l.productId) continue
      const p = state.products.find((x) => x.id === l.productId)!
      p.quantity -= l.quantity
      state.movements.push({ id: uid('mv'), companyId: cid, productId: p.id, type: 'out', quantity: l.quantity, date: inv.issueDate, warehouseId: p.warehouseId, refType: 'invoice', refId: inv.id })
    }
  }

  // Monthly loop: months 8..2 (fully settled), months 1..0 (recent, partial)
  for (let m = 8; m >= 0; m--) {
    const mStart = monthStartAgo(m)
    const issueA = `${mStart.slice(0, 8)}03`
    const issueB = `${mStart.slice(0, 8)}08`
    const issueC = `${mStart.slice(0, 8)}12`

    const growth = (8 - m) * 0.06 // revenue grows over time
    const base = Math.round(15000000 * (1 + growth))
    const invA = makeInvoice({ customerId: 'cu_universal', issueDate: issueA, dueDate: addDays(issueA, 14), lines: [svcLine('IT konsalting xizmatlari (oylik)', base), svcLine('Texnik qo‘llab-quvvatlash', 3000000)] })
    const invB = makeInvoice({ customerId: 'cu_alpha', issueDate: issueB, dueDate: addDays(issueB, 10), lines: [svcLine('Dasturiy ta’minot litsenziyasi', 9500000)] })

    // product invoice for Delta every other month
    let invC: Invoice | null = null
    if (m % 2 === 0) {
      invC = makeInvoice({ customerId: 'cu_delta', issueDate: issueC, dueDate: addDays(issueC, 14), lines: [prodLine('pr_p-002', 3), prodLine('pr_p-006', 10)] })
      adjustStockForSale(invC)
    }

    // payments
    if (m >= 2) {
      receivePayment(invA, addDays(issueA, 6), kapital)
      receivePayment(invB, addDays(issueB, 9), kapital)
      if (invC) receivePayment(invC, addDays(issueC, 12), kapital)
    }

    // expenses
    if (m >= 1) {
      makeExpense({ date: `${mStart.slice(0, 8)}05`, amount: 8000000, taxAmount: 0, categoryCode: '6200', accountId: kapital, description: 'Ofis ijarasi (oylik)' })
      makeExpense({ date: `${mStart.slice(0, 8)}06`, amount: 1800000, taxAmount: 0, categoryCode: '6300', accountId: kapital, description: 'Kommunal to‘lovlar' })
      makeExpense({ date: `${mStart.slice(0, 8)}10`, amount: 3500000, taxAmount: 0, categoryCode: '6600', accountId: kapital, description: 'Dasturiy ta’minot obunalari' })
      makeExpense({ date: `${mStart.slice(0, 8)}15`, amount: 1200000, taxAmount: 0, categoryCode: '6500', accountId: kassa, description: 'Ofis xo‘jalik buyumlari' })
      makeExpense({ date: `${mStart.slice(0, 8)}20`, amount: 900000, taxAmount: 0, categoryCode: '6700', accountId: kapital, description: 'Transport xarajatlari' })
      // marketing: spike in m=2
      const marketing = m === 2 ? 15000000 : 4000000
      makeExpense({ date: `${mStart.slice(0, 8)}18`, amount: marketing, taxAmount: Math.round(marketing * VAT), categoryCode: '6400', accountId: kapital, supplierId: 'su_marketing', description: 'Marketing kampaniyasi' })
    }

    // salaries: direct for older months, payroll module for last 3
    if (m >= 4) {
      makeExpense({ date: `${mStart.slice(0, 8)}27`, amount: 31000000, taxAmount: 0, categoryCode: '6100', accountId: kapital, description: 'Ish haqi to‘lovlari' })
    }

    // inventory purchase every 2 months
    if (m >= 1 && m % 2 === 1) makeInventoryPurchase(m)

    // bills
    const bill1 = makeBill({ supplierId: 'su_office', issueDate: `${mStart.slice(0, 8)}07`, dueDate: addDays(`${mStart.slice(0, 8)}07`, 10), amount: 1800000, description: 'Ofis anjomlari yetkazib berish' })
    if (m >= 1) payBill(bill1, addDays(`${mStart.slice(0, 8)}07`, 8), kapital)
    if (m % 2 === 0) {
      const bill2 = makeBill({ supplierId: 'su_logistics', issueDate: `${mStart.slice(0, 8)}16`, dueDate: addDays(`${mStart.slice(0, 8)}16`, 15), amount: 2400000, description: 'Logistika va yetkazib berish xizmatlari' })
      if (m >= 1) payBill(bill2, addDays(`${mStart.slice(0, 8)}16`, 12), kapital)
    }
  }

  // ---------- Recent-period specials (for dashboard/reconciliation/radar) ----------
  const curStart = monthStartAgo(0)
  // current month unpaid invoice (outstanding AR)
  const invNow = makeInvoice({ customerId: 'cu_prime', issueDate: d(-6), dueDate: d(9), lines: [svcLine('Reklama kampaniyasi boshqaruvi', 12000000)] })
  // current month partially paid
  const invPart = makeInvoice({ customerId: 'cu_green', issueDate: d(-12), dueDate: d(2), lines: [svcLine('Agro-dasturiy ta’minot', 15000000)] })
  receivePayment(invPart, d(-8), kapital, 6000000)
  // overdue invoice (from 2 months ago, unpaid)
  const overdueInv = makeInvoice({ customerId: 'cu_nova', issueDate: monthStartAgo(2).slice(0, 8) + '10', dueDate: addDays(monthStartAgo(2).slice(0, 8) + '10', 10), lines: [svcLine('Logistika integratsiyasi', 7800000)] })
  overdueInv.status = 'overdue'
  // one more small unpaid from last month
  const prevUnpaid = makeInvoice({ customerId: 'cu_alpha', issueDate: monthStartAgo(1).slice(0, 8) + '20', dueDate: addDays(monthStartAgo(1).slice(0, 8) + '20', 14), lines: [svcLine('Qo‘shimcha qo‘llab-quvvatlash', 4200000)] })
  prevUnpaid.status = 'overdue'

  // draft invoice (not posted)
  const draftInv: Invoice = {
    id: uid('inv'), companyId: cid, number: bumpSeq(state, 'INV', 'INV'), customerId: 'cu_delta', issueDate: d(0), dueDate: d(14),
    status: 'draft', lines: [svcLine('Loyiha konsaltingi (qoralama)', 6800000)], discountRate: 0, notes: '', currency: CURRENCY, createdAt: Date.now(),
  }
  state.invoices.push(draftInv)

  // current month expenses (some unpaid via bill)
  makeExpense({ date: d(-4), amount: 1800000, taxAmount: 0, categoryCode: '6300', accountId: kapital, description: 'Kommunal to‘lovlar' })
  // Duplicate expense (radar signal): same amount/date/account/desc as above
  makeExpense({ date: d(-4), amount: 1800000, taxAmount: 0, categoryCode: '6300', accountId: kapital, description: 'Kommunal to‘lovlar' })
  makeExpense({ date: d(-2), amount: 1200000, taxAmount: 0, categoryCode: '6500', accountId: kassa, description: 'Ofis xo‘jalik buyumlari' })
  // unpaid bill (upcoming payable)
  const openBill = makeBill({ supplierId: 'su_marketing', issueDate: d(-3), dueDate: d(11), amount: 6500000, description: 'Oylik marketing xizmatlari' })
  // overdue bill (from last month)
  const overdueBill = makeBill({ supplierId: 'su_tech', issueDate: monthStartAgo(1).slice(0, 8) + '15', dueDate: addDays(monthStartAgo(1).slice(0, 8) + '15', 10), amount: 9200000, description: 'Server uskunalari' })
  overdueBill.status = 'overdue'

  // internal transfer demo
  const tr = postTransfer(state, { companyId: cid, date: d(-3), amount: 2500000, fromAccountId: kapital, toAccountId: kassa, description: 'Kassa to‘ldirish' })
  bankEvents.push({ entryId: tr.id, bankAccountId: kapital, amount: -2500000, date: d(-3), description: 'Kassa to‘ldirish' })

  // ---------- Payroll (last 3 months) ----------
  const empTax = (gross: number) => ({ incomeTax: Math.round(gross * 0.12), socialTax: Math.round(gross * 0.12) })
  function makeRun(monthsAgo: number, paid: boolean): PayrollRun {
    const period = monthStartAgo(monthsAgo).slice(0, 7)
    const run: PayrollRun = {
      id: uid('pr'), companyId: cid, period, runDate: paid ? addDays(monthStartAgo(monthsAgo), 26) : d(0),
      status: paid ? 'paid' : 'draft', lines: [],
    }
    for (const e of state.employees) {
      const t = empTax(e.salary)
      const gross = e.salary
      run.lines.push({ employeeId: e.id, gross, incomeTax: t.incomeTax, socialTax: t.socialTax, bonus: 0, advance: 0, net: gross - t.incomeTax })
    }
    state.payrollRuns.push(run)
    if (paid) {
      const entry = postPayroll(state, run, kapital)
      bankEvents.push({ entryId: entry.id, bankAccountId: kapital, amount: -run.lines.reduce((s, l) => s + l.net, 0), date: run.runDate, description: `Payroll ${period}` })
    }
    return run
  }
  makeRun(2, true)
  makeRun(1, true)
  makeRun(0, false)

  // ---------- Budgets ----------
  const year = new Date(todayISO()).getFullYear()
  const budgetDefs: [string, string, number][] = [
    ['6100', 'Ish haqi', 420000000],
    ['6200', 'Ijara', 96000000],
    ['6400', 'Marketing', 48000000],
    ['6600', 'Dasturiy ta’minot', 42000000],
    ['6700', 'Transport', 12000000],
  ]
  for (const [code, name, amount] of budgetDefs) {
    const acc = findAccount(state, cid, code)!
    state.budgets.push({ id: uid('bg'), companyId: cid, name, year, accountId: acc.id, amount })
  }
  // over-budget marketing (radar/AI signal)
  state.budgets.push({ id: uid('bg'), companyId: cid, name: 'Marketing (Q4)', year, accountId: findAccount(state, cid, '6400')!.id, amount: 30000000 })

  // ---------- Tax liabilities ----------
  const vatBalance = state.accounts.filter((a) => a.id === 'acc_' + cid + '_2200' || a.code === '2200').reduce((s, a) => {
    return s + accountRaw(state, a.id)
  }, 0)
  const payrollTaxBalance = accountRaw(state, findAccount(state, cid, '2300')!.id)
  state.taxLiabilities = [
    { id: uid('tax'), companyId: cid, name: 'QQS (12%)', kind: 'vat', period: curStart.slice(0, 7), dueDate: addDays(monthStartAgo(0), 50), amount: Math.max(0, vatBalance), status: 'pending' },
    { id: uid('tax'), companyId: cid, name: 'Ish haqi soliqlari', kind: 'payroll', period: curStart.slice(0, 7), dueDate: addDays(monthStartAgo(0), 48), amount: Math.max(0, payrollTaxBalance), status: 'pending' },
    { id: uid('tax'), companyId: cid, name: 'Foyda solig‘i (baholangan)', kind: 'income', period: curStart.slice(0, 7), dueDate: addDays(monthStartAgo(0), 55), amount: 4500000, status: 'pending' },
  ]

  // ---------- Bank statement (reconciliation) ----------
  state.bankTransactions = buildBankStatement(state, cid, banks, bankEvents)

  // ---------- Documents ----------
  state.documents = [
    { id: 'doc_receipt1', companyId: cid, name: 'chek_kommunal.pdf', type: 'pdf', size: 184320, category: 'receipt', status: 'extracted', createdAt: Date.now() - 86400000 * 2, extracted: { docNumber: 'CHK-2026-08123', date: d(-4), company: 'Toshshaharelektr', taxId: '202345678', counterparty: 'Toshshaharelektr', amount: 1800000, vat: 0, currency: 'UZS', paymentInfo: 'Terminal orqali', confidence: 92, items: [{ description: 'Elektr energiyasi', quantity: 1, unitPrice: 1800000 }] } },
    { id: 'doc_receipt2', companyId: cid, name: 'ofis_anjomlari.jpg', type: 'jpg', size: 291000, category: 'receipt', status: 'reviewed', createdAt: Date.now() - 86400000 * 4, extracted: { docNumber: 'R-7741', date: d(-6), company: 'OfficeLand MChJ', taxId: '306456456', counterparty: 'OfficeLand MChJ', amount: 1200000, vat: 128571, currency: 'UZS', paymentInfo: 'Naqd', confidence: 88, items: [{ description: 'Ofis anjomlari', quantity: 1, unitPrice: 1200000 }] } },
    { id: 'doc_contract1', companyId: cid, name: 'shartnoma_prime_media.pdf', type: 'pdf', size: 512000, category: 'contract', status: 'uploaded', createdAt: Date.now() - 86400000 * 6 },
    { id: 'doc_stmt1', companyId: cid, name: 'kapitalbank_kochirma.xlsx', type: 'xlsx', size: 98200, category: 'statement', status: 'uploaded', createdAt: Date.now() - 86400000 },
  ]

  // ---------- Users ----------
  state.users = [
    { id: 'u_owner', name: 'Aziz Karimov', email: 'aziz@buxai.uz', role: 'owner', avatarHue: 156, active: true },
    { id: 'u_acc', name: 'Dilnoza Rahimova', email: 'dilnoza@buxai.uz', role: 'accountant', avatarHue: 210, active: true },
    { id: 'u_mgr', name: 'Jasur Toshmatov', email: 'jasur@buxai.uz', role: 'manager', avatarHue: 30, active: true },
    { id: 'u_viewer', name: 'Malika Yusupova', email: 'malika@buxai.uz', role: 'viewer', avatarHue: 330, active: true },
  ]

  return state
}

function accountRaw(state: AppState, accountId: string): number {
  const acc = state.accounts.find((a) => a.id === accountId)
  if (!acc) return 0
  let bal = acc.openingBalance
  for (const e of state.entries) {
    for (const l of e.lines) if (l.accountId === acc.id) bal += (l.debit || 0) - (l.credit || 0)
  }
  return bal
}

function updateInvoiceStatus(state: AppState, inv: Invoice): void {
  const paid = state.payments.filter((p) => p.invoiceId === inv.id && p.status === 'applied').reduce((s, p) => s + p.amount, 0)
  const total = invoiceTotal(inv)
  if (paid >= total) inv.status = 'paid'
  else if (paid > 0) inv.status = 'partially_paid'
  else inv.status = 'sent'
}

function buildBankStatement(state: AppState, cid: string, banks: BankAccount[], events: { entryId: string; bankAccountId: string; amount: number; date: string; description: string }[]): BankTransaction[] {
  const out: BankTransaction[] = []
  // matched from GL events of the last ~45 days
  const cutoff = addDays(todayISO(), -45)
  for (const ev of events) {
    if (ev.date < cutoff) continue
    out.push({
      id: uid('bt'), companyId: cid, bankAccountId: ev.bankAccountId, date: ev.date, description: ev.description,
      amount: ev.amount, counterparty: undefined, reference: undefined, status: 'matched', matchedEntryId: ev.entryId, createdAt: Date.now(),
    })
  }
  // unmatched incoming
  out.push({ id: uid('bt'), companyId: cid, bankAccountId: banks[0].glAccountId, date: d(-1), description: 'Kirim — noma’lum kontragent', amount: 340000, status: 'unmatched', createdAt: Date.now() })
  // unmatched outgoing
  out.push({ id: uid('bt'), companyId: cid, bankAccountId: banks[0].glAccountId, date: d(-2), description: 'Bank xizmat komissiyasi', amount: -85000, status: 'unmatched', createdAt: Date.now() })
  // amount mismatch (potential)
  out.push({ id: uid('bt'), companyId: cid, bankAccountId: banks[0].glAccountId, date: d(-5), description: 'Alpha Retail to‘lovi', amount: 10640000, status: 'potential', createdAt: Date.now() })
  // duplicate
  out.push({ id: uid('bt'), companyId: cid, bankAccountId: banks[0].glAccountId, date: d(-3), description: 'Kassa to‘ldirish', amount: -2500000, status: 'duplicate', createdAt: Date.now() })
  return out
}

function buildCompanyScaffold(state: AppState, company: Company): void {
  state.accounts.push(...buildChartOfAccounts(company.id, company.currency))
  const kapital = findAccount(state, company.id, '1101')!
  state.bankAccounts.push({ id: `ba2_${company.id}`, companyId: company.id, glAccountId: kapital.id, name: 'Asosiy hisob', type: 'bank', bankName: 'Ipak Yo‘li', accountNo: company.accountNo, currency: 'UZS', openingBalance: 0, active: true })
  postOpening(state, { companyId: company.id, date: monthStartAgo(1), accountId: kapital.id, amount: 25000000, description: 'Ustav kapitali' })
  // small customer + invoice
  const cust: Party = { id: `cu2_${company.id}`, companyId: company.id, type: 'customer', name: 'Chakana mijoz', taxId: '305999000', address: 'Toshkent' }
  state.parties.push(cust)
  const arParent = findAccount(state, company.id, '1200')!
  state.accounts.push(makeSubAccount(company.id, { code: '1201-RTL', name: cust.name, category: 'Asset', type: 'Receivable', parentId: arParent.id, partyId: cust.id, currency: company.currency }))
  const inv: Invoice = {
    id: uid('inv'), companyId: company.id, number: bumpSeq(state, 'INV', 'INV'), customerId: cust.id, issueDate: monthStartAgo(1), dueDate: addDays(monthStartAgo(1), 20),
    status: 'sent', lines: [{ id: uid('il'), description: 'Chakana savdo', quantity: 1, unitPrice: 8500000, taxRate: 0 }], discountRate: 0, notes: '', currency: 'UZS', createdAt: Date.now(),
  }
  state.invoices.push(inv)
  postInvoice(state, inv)
  state.users = state.users // keep global users
}

export function emptyState(): AppState {
  return {
    version: 1,
    companies: [],
    accounts: [],
    entries: [],
    parties: [],
    invoices: [],
    payments: [],
    bills: [],
    expenses: [],
    warehouses: [],
    products: [],
    movements: [],
    bankAccounts: [],
    bankTransactions: [],
    employees: [],
    payrollRuns: [],
    budgets: [],
    alerts: [],
    tasks: [],
    notifications: [],
    documents: [],
    users: [],
    audit: [],
    taxLiabilities: [],
    seq: {},
  }
}
