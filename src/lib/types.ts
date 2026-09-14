// =============================================================
// BUXAI — Core domain types (single source of truth contracts)
// =============================================================

export type Lang = 'uz' | 'ru' | 'en'
export type Currency = 'UZS' | 'USD' | 'EUR' | 'RUB'

export type AccountCategory =
  | 'Asset'
  | 'Liability'
  | 'Equity'
  | 'Revenue'
  | 'CostOfGoodsSold'
  | 'OperatingExpense'
  | 'OtherIncome'
  | 'OtherExpense'

export type AccountType =
  | 'Bank'
  | 'Cash'
  | 'Receivable'
  | 'Payable'
  | 'Inventory'
  | 'FixedAsset'
  | 'VATPayable'
  | 'VATInput'
  | 'Equity'
  | 'Income'
  | 'Expense'
  | 'Other'

export type NormalBalance = 'debit' | 'credit'

export interface Account {
  id: string
  companyId: string
  code: string
  name: string
  category: AccountCategory
  type: AccountType
  parentId: string | null
  normalBalance: NormalBalance
  openingBalance: number // minor units, signed per normal balance
  currency: Currency
  archived: boolean
  system?: boolean // core control account, cannot delete
  partyId?: string // when this is a subsidiary ledger (AR/AP) of a party
}

export interface JournalLine {
  accountId: string
  debit: number // minor units >= 0
  credit: number
  memo?: string
}

export type EntrySource =
  | 'manual'
  | 'invoice'
  | 'payment'
  | 'bill'
  | 'bill_payment'
  | 'expense'
  | 'inventory'
  | 'payroll'
  | 'transfer'
  | 'bank_import'
  | 'opening'
  | 'adjustment'

export interface JournalEntry {
  id: string
  companyId: string
  number: string
  date: string // ISO date
  description: string
  lines: JournalLine[]
  source: EntrySource
  sourceId?: string
  createdAt: number
}

export type PartyType = 'customer' | 'supplier'

export interface Party {
  id: string
  companyId: string
  type: PartyType
  name: string
  taxId?: string
  phone?: string
  email?: string
  address?: string
  bankName?: string
  accountNo?: string
  mfo?: string
  createdAt?: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceLine {
  id: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number // minor units
  taxRate: number // e.g. 0.12
}

export interface Invoice {
  id: string
  companyId: string
  number: string
  customerId: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  lines: InvoiceLine[]
  discountRate: number // e.g. 0.05
  notes?: string
  currency: Currency
  createdAt: number
}

export type PaymentMethod = 'bank' | 'cash' | 'card' | 'online'
export type PaymentStatus = 'applied' | 'void'

export interface Payment {
  id: string
  companyId: string
  invoiceId?: string
  partyId: string
  partyType: PartyType
  date: string
  amount: number // minor units
  accountId: string // bank/cash GL account
  method: PaymentMethod
  reference?: string
  status: PaymentStatus
}

export type BillStatus = 'draft' | 'open' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export interface Bill {
  id: string
  companyId: string
  number: string
  supplierId: string
  issueDate: string
  dueDate: string
  status: BillStatus
  lines: InvoiceLine[]
  notes?: string
  currency: Currency
  createdAt: number
}

export interface Expense {
  id: string
  companyId: string
  number: string
  date: string
  amount: number // minor units, total incl tax
  taxAmount: number
  categoryAccountId: string // expense account
  paymentAccountId: string // bank/cash OR payable account
  supplierId?: string
  description: string
  currency: Currency
  attachment?: string // document id
  recurring?: boolean
  createdAt: number
}

export interface Warehouse {
  id: string
  companyId: string
  name: string
  address?: string
}

export interface Product {
  id: string
  companyId: string
  sku: string
  name: string
  category: string
  unit: string
  purchasePrice: number
  sellingPrice: number
  quantity: number // current on-hand (across warehouses for simplicity)
  minStock: number
  warehouseId: string
  active: boolean
  createdAt: number
}

export type MovementType = 'in' | 'out' | 'transfer' | 'adjust'

export interface InventoryMovement {
  id: string
  companyId: string
  productId: string
  type: MovementType
  quantity: number // signed for adjust
  date: string
  warehouseId: string
  refType?: string
  refId?: string
  note?: string
}

export type BankAccountType = 'bank' | 'cash' | 'card' | 'deposit'

export interface BankAccount {
  id: string
  companyId: string
  glAccountId: string // linked GL asset account
  name: string
  type: BankAccountType
  bankName?: string
  accountNo?: string
  currency: Currency
  openingBalance: number
  active: boolean
}

export type BankTxnStatus = 'unmatched' | 'potential' | 'matched' | 'duplicate' | 'mismatch' | 'ignored'

export interface BankTransaction {
  id: string
  companyId: string
  bankAccountId: string
  date: string
  description: string
  amount: number // signed minor units (income +, expense -)
  counterparty?: string
  reference?: string
  status: BankTxnStatus
  matchedEntryId?: string
  createdAt: number
}

export interface Employee {
  id: string
  companyId: string
  name: string
  position: string
  department: string
  salary: number // monthly gross
  startDate: string
  taxId?: string
  bankAccount?: string
  active: boolean
}

export interface PayrollLine {
  employeeId: string
  gross: number
  incomeTax: number
  socialTax: number
  bonus: number
  advance: number
  net: number
}

export interface PayrollRun {
  id: string
  companyId: string
  period: string // YYYY-MM
  runDate: string
  status: 'draft' | 'approved' | 'paid'
  lines: PayrollLine[]
}

export interface Budget {
  id: string
  companyId: string
  name: string
  year: number
  month?: number // undefined = annual
  accountId: string
  department?: string
  amount: number // minor units (expense budgets positive; revenue budgets positive target)
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertStatus = 'open' | 'reviewed' | 'fixed' | 'ignored'

export interface RadarAlert {
  id: string
  key: string
  companyId: string
  type: string
  severity: AlertSeverity
  title: string
  what: string
  why: string
  impact: number // minor units (signed)
  fix: string
  confidence: number // 0..100
  status: AlertStatus
  relatedIds: string[]
  createdAt: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed'

export interface WorkTask {
  id: string
  companyId: string
  title: string
  description: string
  type: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  relatedId?: string
  route?: string
  createdAt: number
}

export interface NotificationItem {
  id: string
  companyId: string
  kind: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  route?: string
  read: boolean
  createdAt: number
}

export type DocumentStatus = 'uploaded' | 'extracted' | 'reviewed' | 'posted' | 'archived'

export interface DocRecord {
  id: string
  companyId: string
  name: string
  type: string // pdf/jpg/png/xlsx/csv/docx
  size: number
  category: 'invoice' | 'contract' | 'receipt' | 'statement' | 'other'
  status: DocumentStatus
  extracted?: ExtractedDoc
  createdAt: number
}

export interface ExtractedDoc {
  docNumber?: string
  date?: string
  company?: string
  taxId?: string
  counterparty?: string
  amount?: number
  vat?: number
  currency?: Currency
  items?: { description: string; quantity: number; unitPrice: number }[]
  paymentInfo?: string
  confidence: number
}

export type Role = 'owner' | 'admin' | 'accountant' | 'manager' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarHue: number
  active: boolean
}

export interface AuditEvent {
  id: string
  companyId: string
  userId: string
  userName: string
  action: string
  entity: string
  entityId?: string
  before?: string
  after?: string
  at: number
}

export interface TaxLiability {
  id: string
  companyId: string
  name: string
  kind: 'vat' | 'income' | 'payroll' | 'property' | 'other'
  period: string // YYYY-MM
  dueDate: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
}

export interface CompanySettings {
  language: Lang
  currency: Currency
  vatRate: number
  vatRegistered: boolean
  turnoverTaxRate: number
  usdRate: number
  eurRate: number
  rubRate: number
  fiscalYearEnd: string // MM-DD
}

export interface Company {
  id: string
  name: string
  fullName: string
  taxId: string
  vatNo?: string
  activity?: string
  director?: string
  accountant?: string
  phone?: string
  email?: string
  address?: string
  bankName?: string
  accountNo?: string
  mfo?: string
  currency: Currency
  settings: CompanySettings
  logoHue: number
  isDemo: boolean
  createdAt: number
}

export interface AppState {
  version: number
  companies: Company[]
  accounts: Account[]
  entries: JournalEntry[]
  parties: Party[]
  invoices: Invoice[]
  payments: Payment[]
  bills: Bill[]
  expenses: Expense[]
  warehouses: Warehouse[]
  products: Product[]
  movements: InventoryMovement[]
  bankAccounts: BankAccount[]
  bankTransactions: BankTransaction[]
  employees: Employee[]
  payrollRuns: PayrollRun[]
  budgets: Budget[]
  alerts: RadarAlert[]
  tasks: WorkTask[]
  notifications: NotificationItem[]
  documents: DocRecord[]
  users: User[]
  audit: AuditEvent[]
  taxLiabilities: TaxLiability[]
  seq: Record<string, number> // document number sequences
}

export interface Session {
  userId: string
  companyId: string
}
