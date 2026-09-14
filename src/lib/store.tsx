import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import type {
  AppState, Company, Session, Lang, Currency, Account, AccountCategory, AccountType, Party, PartyType,
  Invoice, InvoiceLine, InvoiceStatus, Expense, Bill, Product, Warehouse, MovementType, BankAccount,
  Employee, PayrollRun, Budget, User, Role, RadarAlert, WorkTask, NotificationItem, DocRecord, TaxLiability,
  AuditEvent, BankTransaction, PaymentMethod, CompanySettings,
} from './types'
import { buildSeedState, emptyState } from '../engine/seed'
import { buildChartOfAccounts, makeSubAccount, CATEGORY_NORMAL } from '../engine/coa'
import {
  postEntry, bumpSeq, postInvoice, postPayment, postExpense, postBill, postBillPayment,
  postInventoryPurchase, postPayroll, postOpening, postTransfer, reverseEntry, findAccount, partyAccount,
} from '../engine/post'
import { validateEntry } from '../engine/ledger'
import { invoiceTotal, invoiceSubtotal, invoiceTax, invoiceDiscount, invoiceOutstanding } from '../engine/selectors'
import { runRadar, severityRank } from '../engine/radar'
import { forecastCash } from '../engine/forecast'
import { closeChecklist } from '../engine/close'
import { translate } from '../i18n'
import { fmtMoney, fmtDate, todayISO, addDays, uid, monthEnd } from './money'

const STORAGE_KEY = 'buxai.state.v1'
const SESSION_KEY = 'buxai.session.v1'
const LANG_KEY = 'buxai.lang.v1'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.companies?.length) return parsed
    }
  } catch { /* ignore */ }
  return buildSeedState()
}

export type Permission =
  | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  | 'manageUsers' | 'manageAccounting' | 'manageReports' | 'manageSettings'

const PERMS: Record<Role, Permission[]> = {
  owner: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manageUsers', 'manageAccounting', 'manageReports', 'manageSettings'],
  admin: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manageAccounting', 'manageReports', 'manageSettings'],
  accountant: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manageAccounting', 'manageReports'],
  manager: ['view', 'create', 'edit', 'approve', 'export', 'manageReports'],
  viewer: ['view', 'export'],
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner', admin: 'Admin', accountant: 'Accountant', manager: 'Manager', viewer: 'Viewer',
}

interface StoreApi {
  state: AppState
  session: Session | null
  lang: Lang
  company: Company | null
  user: User | null
  t: (key: string, fallback?: string) => string
  fmt: (amount: number, opts?: { decimals?: number; sign?: boolean }) => string
  fmtDate: (iso: string) => string
  currency: Currency
  can: (p: Permission) => boolean
  login: (role: Role) => void
  logout: () => void
  setLanguage: (l: Lang) => void
  switchCompany: (id: string) => void

  // Company
  createCompany: (data: Partial<Company>) => string
  updateCompany: (patch: Partial<Company>) => void
  updateSettings: (patch: Partial<CompanySettings>) => void

  // Manual entries
  createManualEntry: (e: { date: string; description: string; lines: { accountId: string; debit: number; credit: number; memo?: string }[] }) => void
  reverseEntryById: (id: string) => void

  // Accounts
  createAccount: (a: { code: string; name: string; category: AccountCategory; type: AccountType; parentId: string | null; openingBalance: number }) => void
  updateAccount: (id: string, patch: Partial<Account>) => void
  archiveAccount: (id: string) => void
  deleteAccount: (id: string) => void

  // Parties
  createParty: (type: PartyType, data: Partial<Party>) => string
  updateParty: (id: string, patch: Partial<Party>) => void
  deleteParty: (id: string) => void

  // Invoices
  createInvoice: (inv: Omit<Invoice, 'id' | 'companyId' | 'number' | 'createdAt'>) => string
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  issueInvoice: (id: string) => void
  deleteInvoice: (id: string) => void
  duplicateInvoice: (id: string) => void
  recordPayment: (p: { invoiceId: string; amount: number; accountId: string; method: PaymentMethod; date: string; reference?: string }) => void

  // Expenses
  createExpense: (e: Omit<Expense, 'id' | 'companyId' | 'number' | 'createdAt'>) => string
  updateExpense: (id: string, patch: Partial<Expense>) => void
  deleteExpense: (id: string) => void

  // Bills
  createBill: (b: Omit<Bill, 'id' | 'companyId' | 'number' | 'createdAt'>) => string
  payBill: (id: string, accountId: string, date: string) => void
  deleteBill: (id: string) => void

  // Inventory
  createProduct: (p: Omit<Product, 'id' | 'companyId' | 'createdAt'>) => string
  updateProduct: (id: string, patch: Partial<Product>) => void
  createWarehouse: (name: string) => string
  stockMove: (opts: { productId: string; type: MovementType; quantity: number; date: string; note?: string; accountId?: string }) => void

  // Banking
  createBankAccount: (b: { name: string; type: BankAccount['type']; bankName?: string; accountNo?: string; currency: Currency; openingBalance: number }) => string
  importBankStatement: (bankAccountId: string, rows: { date: string; description: string; amount: number; reference?: string }[]) => number
  matchBankTxn: (bankTxnId: string, entryId?: string) => void
  ignoreBankTxn: (bankTxnId: string) => void
  createFromBank: (bankTxnId: string, opts: { income: boolean; accountId: string; partyId?: string; description: string }) => void
  splitBankTxn: (bankTxnId: string, amount: number) => void

  // Payroll
  createPayrollRun: (period: string) => string
  payPayroll: (id: string, bankAccountId: string) => void
  setAdvance: (runId: string, employeeId: string, amount: number) => void
  createEmployee: (e: Omit<Employee, 'id' | 'companyId'>) => string
  updateEmployee: (id: string, patch: Partial<Employee>) => void

  // Budgets
  createBudget: (b: Omit<Budget, 'id' | 'companyId'>) => void
  updateBudget: (id: string, patch: Partial<Budget>) => void
  deleteBudget: (id: string) => void

  // Tax
  markTaxPaid: (id: string) => void
  addTaxLiability: (t: Omit<TaxLiability, 'id' | 'companyId'>) => void

  // Documents
  uploadDocument: (d: { name: string; type: string; size: number; category: DocRecord['category'] }) => string
  scanDocument: (id: string) => void
  setDocExtraction: (id: string, extraction: NonNullable<DocRecord['extracted']>, status?: DocRecord['status']) => void
  postDocumentExpense: (docId: string) => void
  postDocumentInvoice: (docId: string, customerId: string) => void
  archiveDocument: (id: string) => void

  // Radar / Tasks / Notifications
  refreshRadar: () => void
  setAlertStatus: (id: string, status: RadarAlert['status']) => void
  setTaskStatus: (id: string, status: WorkTask['status']) => void
  markNotifRead: (id: string) => void
  markAllNotifRead: () => void

  // Team
  addUser: (u: { name: string; email: string; role: Role }) => void
  updateUserRole: (id: string, role: Role) => void
  removeUser: (id: string) => void

  // Data
  resetDemo: () => void
  clearAll: () => void
}

const Ctx = createContext<StoreApi | null>(null)

function deriveNotifications(state: AppState, companyId: string): NotificationItem[] {
  const out: NotificationItem[] = []
  const today = todayISO()
  const push = (kind: string, message: string, severity: NotificationItem['severity'], route?: string, relatedId?: string) => {
    const key = `${kind}_${relatedId ?? ''}`
    out.push({ id: `n_${key}`, companyId, kind, message, severity, route, read: false, createdAt: Date.now() })
  }
  const overdue = state.invoices.filter((i) => i.companyId === companyId && (i.status === 'overdue'))
  for (const i of overdue.slice(0, 3)) push('invoice_overdue', `Faktura ${i.number} muddati o‘tgan`, 'critical', '/sales/invoices', i.id)
  const dueSoon = state.bills.filter((b) => b.companyId === companyId && b.status !== 'paid' && b.dueDate >= today && b.dueDate <= addDays(today, 7))
  for (const b of dueSoon.slice(0, 3)) push('payment_due', `To‘lov muddati yaqin: ${b.number}`, 'warning', '/purchases/bills', b.id)
  const low = state.products.filter((p) => p.companyId === companyId && p.quantity <= p.minStock)
  if (low.length) push('low_stock', `${low.length} ta mahsulot zaxirasi kamayib ketdi`, 'warning', '/inventory/stock')
  const fc = forecastCash(state, companyId, 30)
  if (fc.shortageDates.length) push('cash_shortage', '30 kun ichida kassa uzilishi xavfi', 'critical', '/cashflow')
  const taxDue = state.taxLiabilities.filter((x) => x.companyId === companyId && x.status === 'pending' && x.dueDate <= addDays(today, 7))
  for (const t of taxDue) push('tax_deadline', `Soliq muddati: ${t.name} — ${fmtDate(t.dueDate, 'en')}`, 'warning', '/tax-center', t.id)
  const unusual = state.alerts.filter((a) => a.companyId === companyId && (a.status === 'open' || a.status === 'reviewed') && (a.severity === 'critical' || a.severity === 'high'))
  if (unusual.length) push('unusual', `${unusual.length} ta muhim Xato Radar signali`, 'critical', '/ai/xato-radar')
  const unmatched = state.bankTransactions.filter((b) => b.companyId === companyId && (b.status === 'unmatched' || b.status === 'mismatch'))
  if (unmatched.length) push('bank_recon', `${unmatched.length} ta bank operatsiyasi moslanmagan`, 'warning', '/banking/reconciliation')
  return out
}

function deriveTasks(state: AppState, companyId: string): WorkTask[] {
  const out: WorkTask[] = []
  const today = todayISO()
  const push = (key: string, title: string, description: string, type: string, priority: WorkTask['priority'], route?: string, relatedId?: string, dueDate?: string) => {
    out.push({ id: `t_${key}`, companyId, title, description, type, status: 'todo', priority, dueDate, relatedId, route, createdAt: Date.now() })
  }
  const drafts = state.invoices.filter((i) => i.companyId === companyId && i.status === 'draft')
  if (drafts.length) push('review_draft', 'Draft fakturani ko‘rib chiqish', `${drafts.length} ta qoralama faktura`, 'invoice', 'medium', '/sales/invoices')
  const openBills = state.bills.filter((b) => b.companyId === companyId && b.status === 'open' && b.dueDate <= addDays(today, 7))
  if (openBills.length) push('approve_payment', 'To‘lovni tasdiqlash', `${openBills.length} ta hisob to‘lovini tasdiqlang`, 'payment', 'high', '/purchases/bills')
  const critical = state.alerts.filter((a) => a.companyId === companyId && (a.status === 'open' || a.status === 'reviewed') && (a.severity === 'critical' || a.severity === 'high'))
  if (critical.length) push('fix_error', 'Buxgalteriya xatosini tuzatish', `${critical.length} ta muhim signal`, 'error', 'high', '/ai/xato-radar')
  const unmatched = state.bankTransactions.filter((b) => b.companyId === companyId && (b.status === 'unmatched' || b.status === 'mismatch'))
  if (unmatched.length) push('reconcile', 'Bankni moslashtirish', `${unmatched.length} ta moslanmagan operatsiya`, 'reconcile', 'medium', '/banking/reconciliation')
  const overdue = state.invoices.filter((i) => i.companyId === companyId && i.status === 'overdue')
  if (overdue.length) push('review_overdue', 'Overdue fakturani ko‘rib chiqish', `${overdue.length} ta overdue faktura`, 'invoice', 'high', '/sales/invoices')
  const noAttachment = state.expenses.filter((e) => e.companyId === companyId && !e.attachment)
  if (noAttachment.length) push('upload_doc', 'Hujjat biriktirish', `${noAttachment.length} ta xarajatga hujjat yo‘q`, 'document', 'low', '/documents')
  const close = closeChecklist(state, companyId)
  if (close.done < close.total) push('close_month', 'Oy yakunini yakunlash', `${close.done}/${close.total} bajarildi`, 'close', 'medium', '/close')
  return out
}

function mergeDerived<T extends { id: string }>(fresh: T[], prev: T[], keep: (old: T, next: T) => void): T[] {
  const prevById = new Map(prev.map((p) => [p.id, p]))
  return fresh.map((n) => {
    const old = prevById.get(n.id)
    if (old) keep(old, n)
    return n
  })
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const s = loadState()
    return s
  })
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return null
  })
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const raw = localStorage.getItem(LANG_KEY)
      if (raw) return raw as Lang
    } catch { /* ignore */ }
    const s = loadState()
    return s.companies[0]?.settings.language ?? 'uz'
  })

  const company = useMemo(() => state.companies.find((c) => c.id === session?.companyId) ?? null, [state.companies, session])
  const user = useMemo(() => state.users.find((u) => u.id === session?.userId) ?? null, [state.users, session])
  const currency = company?.currency ?? 'UZS'

  const persist = useCallback((d: AppState) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* quota */ }
  }, [])

  const mutate = useCallback((fn: (d: AppState) => void, audit?: { action: string; entity: string; entityId?: string; before?: unknown; after?: unknown }) => {
    setState((prev) => {
      const d = structuredClone(prev)
      fn(d)
      if (audit && session) {
        d.audit.push({
          id: uid('au'), companyId: session.companyId, userId: session.userId,
          userName: d.users.find((u) => u.id === session.userId)?.name ?? 'System',
          action: audit.action, entity: audit.entity, entityId: audit.entityId,
          before: audit.before ? JSON.stringify(audit.before).slice(0, 500) : undefined,
          after: audit.after ? JSON.stringify(audit.after).slice(0, 500) : undefined,
          at: Date.now(),
        })
      }
      d.version = (d.version || 1) + 1
      persist(d)
      return d
    })
  }, [session, persist])

  const api = useMemo<StoreApi>(() => {
    const cid = () => session?.companyId ?? 'co_demo'

    const refreshDerived = (d: AppState, companyId: string) => {
      // radar with status preservation
      const prevAlerts = d.alerts.filter((a) => a.companyId === companyId)
      const freshAlerts = runRadar(d, companyId).map((r) => {
        const old = prevAlerts.find((a) => a.key === r.key)
        return { id: old?.id ?? uid('al'), key: r.key, companyId, type: r.type, severity: r.severity, title: r.title, what: r.what, why: r.why, impact: r.impact, fix: r.fix, confidence: r.confidence, status: old?.status ?? 'open', relatedIds: r.relatedIds, createdAt: old?.createdAt ?? Date.now() }
      })
      d.alerts = [...d.alerts.filter((a) => a.companyId !== companyId), ...freshAlerts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))]

      const prevNotif = d.notifications.filter((n) => n.companyId === companyId)
      d.notifications = [
        ...d.notifications.filter((n) => n.companyId !== companyId),
        ...mergeDerived<NotificationItem>(deriveNotifications(d, companyId), prevNotif, (old, next) => { next.read = old.read }),
      ]

      const prevTasks = d.tasks.filter((t) => t.companyId === companyId)
      d.tasks = [
        ...d.tasks.filter((t) => t.companyId !== companyId),
        ...mergeDerived<WorkTask>(deriveTasks(d, companyId), prevTasks, (old, next) => { next.status = old.status }),
      ]
    }

    const mutateWithDerived = (fn: (d: AppState) => void, audit?: Parameters<typeof mutate>[1]) => {
      mutate((d) => {
        fn(d)
        refreshDerived(d, cid())
      }, audit)
    }

    const t = (key: string, fb?: string) => translate(lang, key, fb)
    const fmt = (amount: number, opts?: { decimals?: number; sign?: boolean }) => fmtMoney(amount, currency, lang, opts)

    const api: StoreApi = {
      state, session, lang, company, user, t, fmt, fmtDate: (iso) => fmtDate(iso, lang), currency,
      can: (p) => (user ? PERMS[user.role].includes(p) : false),
      login: (role) => {
        const target = state.users.find((u) => u.role === role) ?? state.users[0]
        if (!target) return
        const s: Session = { userId: target.id, companyId: state.companies[0].id }
        setSession(s)
        localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        setLangState(state.companies[0].settings.language)
      },
      logout: () => { setSession(null); localStorage.removeItem(SESSION_KEY) },
      setLanguage: (l) => { setLangState(l); localStorage.setItem(LANG_KEY, l) },
      switchCompany: (id) => {
        setSession((prev) => {
          if (!prev) return prev
          const s = { ...prev, companyId: id }
          localStorage.setItem(SESSION_KEY, JSON.stringify(s))
          return s
        })
      },

      createCompany: (data) => {
        const id = uid('co')
        const newCo: Company = {
          id, name: data.name || 'New Company', fullName: data.fullName || data.name || 'New Company',
          taxId: data.taxId || '', logoHue: Math.floor(Math.random() * 360), isDemo: false, createdAt: Date.now(),
          currency: data.currency || 'UZS',
          settings: { language: 'uz', currency: data.currency || 'UZS', vatRate: 0.12, vatRegistered: false, turnoverTaxRate: 0.04, usdRate: 12600, eurRate: 14000, rubRate: 145, fiscalYearEnd: '12-31' },
          ...data,
        }
        mutate((d) => {
          d.companies.push(newCo)
          d.accounts.push(...buildChartOfAccounts(id, newCo.currency))
          const bank = findAccount(d, id, '1101')!
          d.bankAccounts.push({ id: uid('ba'), companyId: id, glAccountId: bank.id, name: 'Asosiy hisob', type: 'bank', bankName: '', accountNo: '', currency: newCo.currency, openingBalance: 0, active: true })
          d.audit.push({ id: uid('au'), companyId: id, userId: session?.userId ?? '', userName: user?.name ?? '', action: 'create', entity: 'company', entityId: id, at: Date.now() })
        })
        setSession((prev) => prev ? { ...prev, companyId: id } : prev)
        return id
      },
      updateCompany: (patch) => mutateWithDerived((d) => {
        const c = d.companies.find((x) => x.id === cid())
        if (c) Object.assign(c, patch)
      }, { action: 'update', entity: 'company' }),
      updateSettings: (patch) => mutateWithDerived((d) => {
        const c = d.companies.find((x) => x.id === cid())
        if (c) Object.assign(c.settings, patch)
      }, { action: 'update', entity: 'settings' }),

      createManualEntry: (e) => mutateWithDerived((d) => {
        const v = validateEntry(e.lines)
        if (!v.ok) throw new Error(v.reason || 'invalid')
        postEntry(d, { companyId: cid(), date: e.date, description: e.description, source: 'manual', lines: e.lines.map((l) => ({ ...l })) })
      }, { action: 'create', entity: 'journal_entry' }),
      reverseEntryById: (id) => mutateWithDerived((d) => {
        const entry = d.entries.find((x) => x.id === id)
        if (entry) reverseEntry(d, entry, todayISO(), entry.description)
      }, { action: 'reverse', entity: 'journal_entry', entityId: id }),

      createAccount: (a) => mutateWithDerived((d) => {
        const acc: Account = {
          id: uid('acc'), companyId: cid(), code: a.code, name: a.name, category: a.category, type: a.type,
          parentId: a.parentId, normalBalance: CATEGORY_NORMAL[a.category], openingBalance: a.openingBalance || 0,
          currency: currency, archived: false,
        }
        d.accounts.push(acc)
        if (acc.openingBalance > 0) {
          postOpening(d, { companyId: cid(), date: todayISO(), accountId: acc.id, amount: acc.openingBalance, description: `Opening balance — ${acc.name}` })
        }
      }, { action: 'create', entity: 'account' }),
      updateAccount: (id, patch) => mutateWithDerived((d) => {
        const a = d.accounts.find((x) => x.id === id)
        if (a) Object.assign(a, patch)
      }, { action: 'update', entity: 'account', entityId: id }),
      archiveAccount: (id) => mutateWithDerived((d) => {
        const a = d.accounts.find((x) => x.id === id)
        if (a) a.archived = !a.archived
      }, { action: 'archive', entity: 'account', entityId: id }),
      deleteAccount: (id) => mutateWithDerived((d) => {
        const hasEntries = d.entries.some((e) => e.lines.some((l) => l.accountId === id))
        if (hasEntries) return
        d.accounts = d.accounts.filter((a) => a.id !== id)
      }, { action: 'delete', entity: 'account', entityId: id }),

      createParty: (type, data) => {
        const id = uid('party')
        mutateWithDerived((d) => {
          const p: Party = { id, companyId: cid(), type, name: data.name || '', taxId: data.taxId, phone: data.phone, email: data.email, address: data.address, bankName: data.bankName, accountNo: data.accountNo, mfo: data.mfo, createdAt: Date.now() }
          d.parties.push(p)
          const parent = findAccount(d, cid(), type === 'customer' ? '1200' : '2100')!
          d.accounts.push(makeSubAccount(cid(), { code: `${type === 'customer' ? '1201' : '2101'}-${id.slice(-4).toUpperCase()}`, name: p.name, category: type === 'customer' ? 'Asset' : 'Liability', type: type === 'customer' ? 'Receivable' : 'Payable', parentId: parent.id, partyId: id, currency }))
        }, { action: 'create', entity: 'party', entityId: id })
        return id
      },
      updateParty: (id, patch) => mutateWithDerived((d) => {
        const p = d.parties.find((x) => x.id === id)
        if (p) {
          Object.assign(p, patch)
          const acc = d.accounts.find((a) => a.partyId === id)
          if (acc && patch.name) acc.name = patch.name
        }
      }, { action: 'update', entity: 'party', entityId: id }),
      deleteParty: (id) => mutateWithDerived((d) => {
        const acc = d.accounts.find((a) => a.partyId === id)
        const hasEntries = acc && d.entries.some((e) => e.lines.some((l) => l.accountId === acc.id))
        if (hasEntries) return
        d.parties = d.parties.filter((p) => p.id !== id)
        if (acc) d.accounts = d.accounts.filter((a) => a.id !== acc.id)
      }, { action: 'delete', entity: 'party', entityId: id }),

      createInvoice: (inv) => {
        const id = uid('inv')
        mutateWithDerived((d) => {
          const invoice: Invoice = { ...inv, id, companyId: cid(), number: bumpSeq(d, 'INV', 'INV'), createdAt: Date.now() }
          d.invoices.push(invoice)
          if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
            postInvoice(d, invoice)
            applyStockOut(d, invoice)
          }
        }, { action: 'create', entity: 'invoice', entityId: id })
        return id
      },
      updateInvoice: (id, patch) => mutateWithDerived((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (inv) Object.assign(inv, patch)
      }, { action: 'update', entity: 'invoice', entityId: id }),
      issueInvoice: (id) => mutateWithDerived((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (inv && inv.status === 'draft') {
          inv.status = 'sent'
          postInvoice(d, inv)
          applyStockOut(d, inv)
        }
      }, { action: 'issue', entity: 'invoice', entityId: id }),
      deleteInvoice: (id) => mutateWithDerived((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (!inv) return
        const paid = d.payments.filter((p) => p.invoiceId === id).reduce((s, p) => s + p.amount, 0)
        if (paid > 0) return
        const entries = d.entries.filter((e) => e.sourceId === id && e.source === 'invoice')
        for (const e of entries) reverseEntry(d, e, todayISO(), e.description)
        d.invoices = d.invoices.filter((x) => x.id !== id)
      }, { action: 'delete', entity: 'invoice', entityId: id }),
      duplicateInvoice: (id) => mutateWithDerived((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (!inv) return
        const copy: Invoice = { ...inv, id: uid('inv'), number: bumpSeq(d, 'INV', 'INV'), status: 'draft', createdAt: Date.now(), lines: inv.lines.map((l) => ({ ...l, id: uid('il') })) }
        d.invoices.push(copy)
      }, { action: 'duplicate', entity: 'invoice', entityId: id }),
      recordPayment: (p) => mutateWithDerived((d) => {
        const payment = { id: uid('pay'), companyId: cid(), invoiceId: p.invoiceId, partyId: d.invoices.find((i) => i.id === p.invoiceId)?.customerId ?? '', partyType: 'customer' as const, date: p.date, amount: p.amount, accountId: p.accountId, method: p.method, reference: p.reference, status: 'applied' as const }
        d.payments.push(payment)
        postPayment(d, payment)
        const inv = d.invoices.find((i) => i.id === p.invoiceId)
        if (inv) {
          const total = invoiceTotal(inv)
          const paid = d.payments.filter((x) => x.invoiceId === inv.id).reduce((s, x) => s + x.amount, 0)
          inv.status = paid >= total ? 'paid' : 'partially_paid'
        }
      }, { action: 'create', entity: 'payment' }),

      createExpense: (e) => {
        const id = uid('exp')
        mutateWithDerived((d) => {
          const exp: Expense = { ...e, id, companyId: cid(), number: bumpSeq(d, 'EXP', 'EXP'), createdAt: Date.now() }
          d.expenses.push(exp)
          postExpense(d, exp)
        }, { action: 'create', entity: 'expense', entityId: id })
        return id
      },
      updateExpense: (id, patch) => mutateWithDerived((d) => {
        const exp = d.expenses.find((x) => x.id === id)
        if (!exp) return
        const entries = d.entries.filter((e) => e.sourceId === id && e.source === 'expense')
        for (const e of entries) reverseEntry(d, e, todayISO(), e.description)
        Object.assign(exp, patch)
        postExpense(d, exp)
      }, { action: 'update', entity: 'expense', entityId: id }),
      deleteExpense: (id) => mutateWithDerived((d) => {
        const exp = d.expenses.find((x) => x.id === id)
        if (!exp) return
        const entries = d.entries.filter((e) => e.sourceId === id && e.source === 'expense')
        for (const e of entries) reverseEntry(d, e, todayISO(), e.description)
        d.expenses = d.expenses.filter((x) => x.id !== id)
      }, { action: 'delete', entity: 'expense', entityId: id }),

      createBill: (b) => {
        const id = uid('bill')
        mutateWithDerived((d) => {
          const bill: Bill = { ...b, id, companyId: cid(), number: bumpSeq(d, 'BILL', 'BILL'), createdAt: Date.now() }
          d.bills.push(bill)
          if (bill.status !== 'draft') postBill(d, bill)
        }, { action: 'create', entity: 'bill', entityId: id })
        return id
      },
      payBill: (id, accountId, date) => mutateWithDerived((d) => {
        const bill = d.bills.find((x) => x.id === id)
        if (!bill) return
        const total = invoiceTotal(bill as unknown as Invoice)
        const payment = { id: uid('pay'), companyId: cid(), partyId: bill.supplierId, partyType: 'supplier' as const, date, amount: total, accountId, method: 'bank' as const, status: 'applied' as const }
        d.payments.push(payment)
        postBillPayment(d, payment)
        bill.status = 'paid'
      }, { action: 'pay', entity: 'bill', entityId: id }),
      deleteBill: (id) => mutateWithDerived((d) => {
        const bill = d.bills.find((x) => x.id === id)
        if (!bill || bill.status === 'paid') return
        const entries = d.entries.filter((e) => e.sourceId === id && e.source === 'bill')
        for (const e of entries) reverseEntry(d, e, todayISO(), e.description)
        d.bills = d.bills.filter((x) => x.id !== id)
      }, { action: 'delete', entity: 'bill', entityId: id }),

      createProduct: (p) => {
        const id = uid('pr')
        mutateWithDerived((d) => {
          d.products.push({ ...p, id, companyId: cid(), createdAt: Date.now() })
          d.movements.push({ id: uid('mv'), companyId: cid(), productId: id, type: 'in', quantity: p.quantity, date: todayISO(), warehouseId: p.warehouseId, note: 'Boshlang‘ich qoldiq' })
        }, { action: 'create', entity: 'product', entityId: id })
        return id
      },
      updateProduct: (id, patch) => mutateWithDerived((d) => {
        const p = d.products.find((x) => x.id === id)
        if (p) Object.assign(p, patch)
      }, { action: 'update', entity: 'product', entityId: id }),
      createWarehouse: (name) => {
        const id = uid('wh')
        mutateWithDerived((d) => { d.warehouses.push({ id, companyId: cid(), name }) })
        return id
      },
      stockMove: (opts) => mutateWithDerived((d) => {
        const p = d.products.find((x) => x.id === opts.productId)
        if (!p) return
        const qty = opts.type === 'out' ? opts.quantity : opts.quantity
        if (opts.type === 'in') {
          p.quantity += qty
          if (opts.accountId) postInventoryPurchase(d, { companyId: cid(), date: opts.date, productId: p.id, quantity: qty, unitCost: p.purchasePrice, accountId: opts.accountId, description: `Stock in — ${p.name}` })
        } else if (opts.type === 'out') {
          p.quantity -= qty
          const inv = findAccount(d, cid(), '1300')!
          const exp = findAccount(d, cid(), '6900')!
          postEntry(d, { companyId: cid(), date: opts.date, description: `Stock out — ${p.name}`, source: 'inventory', lines: [{ accountId: exp.id, debit: Math.round(qty * p.purchasePrice), credit: 0 }, { accountId: inv.id, debit: 0, credit: Math.round(qty * p.purchasePrice) }] })
        } else if (opts.type === 'adjust') {
          const diff = qty
          p.quantity += diff
          const inv = findAccount(d, cid(), '1300')!
          const exp = findAccount(d, cid(), '6900')!
          const amount = Math.abs(Math.round(diff * p.purchasePrice))
          postEntry(d, { companyId: cid(), date: opts.date, description: `Adjustment — ${p.name}`, source: 'adjustment', lines: diff >= 0 ? [{ accountId: inv.id, debit: amount, credit: 0 }, { accountId: exp.id, debit: 0, credit: amount }] : [{ accountId: exp.id, debit: amount, credit: 0 }, { accountId: inv.id, debit: 0, credit: amount }] })
        }
        d.movements.push({ id: uid('mv'), companyId: cid(), productId: p.id, type: opts.type, quantity: opts.type === 'adjust' ? opts.quantity : opts.quantity, date: opts.date, warehouseId: p.warehouseId, note: opts.note })
      }, { action: 'create', entity: 'movement' }),

      createBankAccount: (b) => {
        const id = uid('ba')
        mutateWithDerived((d) => {
          const code = `${1101 + d.bankAccounts.filter((x) => x.companyId === cid()).length}`
          const gl = makeSubAccount(cid(), { code, name: b.name, category: 'Asset', type: b.type === 'cash' ? 'Cash' : 'Bank', parentId: findAccount(d, cid(), '1100')?.id ?? null, currency: b.currency })
          d.accounts.push(gl)
          d.bankAccounts.push({ id, companyId: cid(), glAccountId: gl.id, name: b.name, type: b.type, bankName: b.bankName, accountNo: b.accountNo, currency: b.currency, openingBalance: b.openingBalance, active: true })
          if (b.openingBalance > 0) postOpening(d, { companyId: cid(), date: todayISO(), accountId: gl.id, amount: b.openingBalance, description: `Opening balance — ${b.name}` })
        }, { action: 'create', entity: 'bank_account', entityId: id })
        return id
      },
      importBankStatement: (bankAccountId, rows) => {
        let count = 0
        mutateWithDerived((d) => {
          for (const r of rows) {
            d.bankTransactions.push({ id: uid('bt'), companyId: cid(), bankAccountId, date: r.date, description: r.description, amount: r.amount, reference: r.reference, status: 'unmatched', createdAt: Date.now() })
            count++
          }
        }, { action: 'import', entity: 'bank_statement' })
        return count
      },
      matchBankTxn: (bankTxnId, entryId) => mutateWithDerived((d) => {
        const b = d.bankTransactions.find((x) => x.id === bankTxnId)
        if (!b) return
        b.status = 'matched'
        b.matchedEntryId = entryId
        // if matched to an existing GL entry, no posting needed; else create one
        if (!entryId) {
          const bankGl = d.accounts.find((a) => a.id === b.bankAccountId)!
          const income = b.amount > 0
          const target = income ? findAccount(d, cid(), '4100')! : findAccount(d, cid(), '6900')!
          const e = postEntry(d, { companyId: cid(), date: b.date, description: b.description, source: 'bank_import', sourceId: b.id, lines: income ? [{ accountId: bankGl.id, debit: b.amount, credit: 0 }, { accountId: target.id, debit: 0, credit: b.amount }] : [{ accountId: target.id, debit: -b.amount, credit: 0 }, { accountId: bankGl.id, debit: 0, credit: -b.amount }] })
          b.matchedEntryId = e.id
        }
      }, { action: 'match', entity: 'bank_transaction', entityId: bankTxnId }),
      ignoreBankTxn: (bankTxnId) => mutateWithDerived((d) => {
        const b = d.bankTransactions.find((x) => x.id === bankTxnId)
        if (b) b.status = 'ignored'
      }, { action: 'ignore', entity: 'bank_transaction', entityId: bankTxnId }),
      createFromBank: (bankTxnId, opts) => mutateWithDerived((d) => {
        const b = d.bankTransactions.find((x) => x.id === bankTxnId)
        if (!b) return
        const bankGl = d.accounts.find((a) => a.id === b.bankAccountId)!
        const amount = Math.abs(b.amount)
        const lines = opts.income
          ? [{ accountId: bankGl.id, debit: amount, credit: 0 }, { accountId: opts.accountId, debit: 0, credit: amount }]
          : [{ accountId: opts.accountId, debit: amount, credit: 0 }, { accountId: bankGl.id, debit: 0, credit: amount }]
        const e = postEntry(d, { companyId: cid(), date: b.date, description: opts.description || b.description, source: 'bank_import', sourceId: b.id, lines })
        b.status = 'matched'
        b.matchedEntryId = e.id
      }, { action: 'create', entity: 'bank_transaction', entityId: bankTxnId }),
      splitBankTxn: (bankTxnId, amount) => mutateWithDerived((d) => {
        const b = d.bankTransactions.find((x) => x.id === bankTxnId)
        if (!b) return
        const remainder = b.amount - amount
        d.bankTransactions.push({ id: uid('bt'), companyId: cid(), bankAccountId: b.bankAccountId, date: b.date, description: b.description + ' (split)', amount: remainder, status: 'unmatched', createdAt: Date.now() })
        b.amount = amount
        b.status = 'unmatched'
      }, { action: 'split', entity: 'bank_transaction', entityId: bankTxnId }),

      createPayrollRun: (period) => {
        const id = uid('pr')
        mutateWithDerived((d) => {
          const run: PayrollRun = { id, companyId: cid(), period, runDate: todayISO(), status: 'draft', lines: [] }
          for (const e of d.employees.filter((x) => x.companyId === cid() && x.active)) {
            const incomeTax = Math.round(e.salary * 0.12)
            const socialTax = Math.round(e.salary * 0.12)
            run.lines.push({ employeeId: e.id, gross: e.salary, incomeTax, socialTax, bonus: 0, advance: 0, net: e.salary - incomeTax })
          }
          d.payrollRuns.push(run)
        }, { action: 'create', entity: 'payroll', entityId: id })
        return id
      },
      payPayroll: (id, bankAccountId) => mutateWithDerived((d) => {
        const run = d.payrollRuns.find((x) => x.id === id)
        if (!run || run.status === 'paid') return
        postPayroll(d, run, bankAccountId)
        run.status = 'paid'
        run.runDate = todayISO()
      }, { action: 'pay', entity: 'payroll', entityId: id }),
      setAdvance: (runId, employeeId, amount) => mutateWithDerived((d) => {
        const run = d.payrollRuns.find((x) => x.id === runId)
        if (!run || run.status === 'paid') return
        const line = run.lines.find((l) => l.employeeId === employeeId)
        if (line) {
          line.advance = Math.max(0, amount)
          line.net = Math.max(0, line.gross + line.bonus - line.incomeTax - line.advance)
        }
      }, { action: 'update', entity: 'advance', entityId: runId }),
      createEmployee: (e) => {
        const id = uid('emp')
        mutateWithDerived((d) => { d.employees.push({ ...e, id, companyId: cid() }) })
        return id
      },
      updateEmployee: (id, patch) => mutateWithDerived((d) => {
        const e = d.employees.find((x) => x.id === id)
        if (e) Object.assign(e, patch)
      }, { action: 'update', entity: 'employee', entityId: id }),

      createBudget: (b) => mutateWithDerived((d) => {
        d.budgets.push({ ...b, id: uid('bg'), companyId: cid() })
      }, { action: 'create', entity: 'budget' }),
      updateBudget: (id, patch) => mutateWithDerived((d) => {
        const b = d.budgets.find((x) => x.id === id)
        if (b) Object.assign(b, patch)
      }, { action: 'update', entity: 'budget', entityId: id }),
      deleteBudget: (id) => mutateWithDerived((d) => { d.budgets = d.budgets.filter((b) => b.id !== id) }, { action: 'delete', entity: 'budget', entityId: id }),

      markTaxPaid: (id) => mutateWithDerived((d) => {
        const t = d.taxLiabilities.find((x) => x.id === id)
        if (t) t.status = 'paid'
      }, { action: 'pay', entity: 'tax', entityId: id }),
      addTaxLiability: (t) => mutateWithDerived((d) => { d.taxLiabilities.push({ ...t, id: uid('tax'), companyId: cid() }) }, { action: 'create', entity: 'tax' }),

      uploadDocument: (doc) => {
        const id = uid('doc')
        mutateWithDerived((d) => {
          d.documents.push({ id, companyId: cid(), name: doc.name, type: doc.type, size: doc.size, category: doc.category, status: 'uploaded', createdAt: Date.now() })
        }, { action: 'upload', entity: 'document', entityId: id })
        return id
      },
      scanDocument: (id) => mutateWithDerived((d) => {
        const doc = d.documents.find((x) => x.id === id)
        if (!doc) return
        doc.status = 'extracted'
        doc.extracted = simulateOcr(doc)
      }, { action: 'scan', entity: 'document', entityId: id }),
      setDocExtraction: (id, extraction, status) => mutateWithDerived((d) => {
        const doc = d.documents.find((x) => x.id === id)
        if (doc) { doc.extracted = extraction; if (status) doc.status = status }
      }, { action: 'update', entity: 'document', entityId: id }),
      postDocumentExpense: (docId) => mutateWithDerived((d) => {
        const doc = d.documents.find((x) => x.id === docId)
        if (!doc?.extracted) return
        const ex = doc.extracted
        const exp: Expense = {
          id: uid('exp'), companyId: cid(), number: bumpSeq(d, 'EXP', 'EXP'), date: ex.date || todayISO(),
          amount: ex.amount || 0, taxAmount: ex.vat || 0, categoryAccountId: findAccount(d, cid(), '6900')!.id,
          paymentAccountId: findAccount(d, cid(), '1101')!.id, supplierId: undefined, description: doc.name, currency: ex.currency || currency, attachment: doc.id, createdAt: Date.now(),
        }
        d.expenses.push(exp)
        postExpense(d, exp)
        doc.status = 'posted'
      }, { action: 'post', entity: 'document', entityId: docId }),
      postDocumentInvoice: (docId, customerId) => mutateWithDerived((d) => {
        const doc = d.documents.find((x) => x.id === docId)
        if (!doc?.extracted) return
        const ex = doc.extracted
        const inv: Invoice = {
          id: uid('inv'), companyId: cid(), number: bumpSeq(d, 'INV', 'INV'), customerId, issueDate: ex.date || todayISO(), dueDate: addDays(ex.date || todayISO(), 14),
          status: 'sent', lines: [{ id: uid('il'), description: doc.name, quantity: 1, unitPrice: ex.amount || 0, taxRate: 0 }], discountRate: 0, notes: '', currency: ex.currency || currency, createdAt: Date.now(),
        }
        d.invoices.push(inv)
        postInvoice(d, inv)
        doc.status = 'posted'
      }, { action: 'post', entity: 'document', entityId: docId }),
      archiveDocument: (id) => mutateWithDerived((d) => {
        const doc = d.documents.find((x) => x.id === id)
        if (doc) doc.status = 'archived'
      }, { action: 'archive', entity: 'document', entityId: id }),

      refreshRadar: () => mutateWithDerived((d) => { /* refreshDerived already runs */ }),
      setAlertStatus: (id, status) => mutateWithDerived((d) => {
        const a = d.alerts.find((x) => x.id === id)
        if (a) a.status = status
      }, { action: 'update', entity: 'alert', entityId: id }),
      setTaskStatus: (id, status) => mutateWithDerived((d) => {
        const t = d.tasks.find((x) => x.id === id)
        if (t) t.status = status
      }, { action: 'update', entity: 'task', entityId: id }),
      markNotifRead: (id) => mutate((d) => {
        const n = d.notifications.find((x) => x.id === id)
        if (n) n.read = true
      }),
      markAllNotifRead: () => mutate((d) => {
        for (const n of d.notifications) if (n.companyId === cid()) n.read = true
      }),

      addUser: (u) => mutateWithDerived((d) => {
        d.users.push({ id: uid('u'), name: u.name, email: u.email, role: u.role, avatarHue: Math.floor(Math.random() * 360), active: true })
      }, { action: 'create', entity: 'user' }),
      updateUserRole: (id, role) => mutateWithDerived((d) => {
        const u = d.users.find((x) => x.id === id)
        if (u) u.role = role
      }, { action: 'update', entity: 'user', entityId: id }),
      removeUser: (id) => mutateWithDerived((d) => {
        if (id === session?.userId) return
        d.users = d.users.filter((u) => u.id !== id)
      }, { action: 'delete', entity: 'user', entityId: id }),

      resetDemo: () => {
        const s = buildSeedState()
        persist(s)
        setState(s)
      },
      clearAll: () => {
        const s = emptyState()
        persist(s)
        setState(s)
        setSession(null)
        localStorage.removeItem(SESSION_KEY)
      },
    }
    return api
  }, [state, session, lang, company, user, currency, mutate])

  useEffect(() => {
    // ensure derived data exists on first load
    if (session) {
      const cid = session.companyId
      const hasAlerts = state.alerts.some((a) => a.companyId === cid)
      if (!hasAlerts) {
        mutate((d) => {
          const prevAlerts = d.alerts.filter((a) => a.companyId === cid)
          const freshAlerts = runRadar(d, cid).map((r) => {
            const old = prevAlerts.find((a) => a.key === r.key)
            return { id: old?.id ?? uid('al'), key: r.key, companyId: cid, type: r.type, severity: r.severity, title: r.title, what: r.what, why: r.why, impact: r.impact, fix: r.fix, confidence: r.confidence, status: old?.status ?? 'open', relatedIds: r.relatedIds, createdAt: old?.createdAt ?? Date.now() }
          })
          d.alerts = [...d.alerts.filter((a) => a.companyId !== cid), ...freshAlerts]
          const prevNotif = d.notifications.filter((n) => n.companyId === cid)
          d.notifications = [...d.notifications.filter((n) => n.companyId !== cid), ...mergeDerived(deriveNotifications(d, cid), prevNotif, (o, n) => { n.read = o.read })]
          const prevTasks = d.tasks.filter((t) => t.companyId === cid)
          d.tasks = [...d.tasks.filter((t) => t.companyId !== cid), ...mergeDerived(deriveTasks(d, cid), prevTasks, (o, n) => { n.status = o.status })]
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.companyId])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

function applyStockOut(d: AppState, inv: Invoice): void {
  for (const l of inv.lines) {
    if (!l.productId) continue
    const p = d.products.find((x) => x.id === l.productId)
    if (p) p.quantity -= l.quantity
    d.movements.push({ id: uid('mv'), companyId: inv.companyId, productId: l.productId, type: 'out', quantity: l.quantity, date: inv.issueDate, warehouseId: p?.warehouseId ?? '', refType: 'invoice', refId: inv.id })
  }
}

function simulateOcr(doc: DocRecord): NonNullable<DocRecord['extracted']> {
  const amount = 500000 + Math.floor(Math.random() * 2000000)
  return {
    docNumber: `${doc.name.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: todayISO(),
    company: 'Taxminiy yetkazib beruvchi',
    taxId: '306000000',
    counterparty: 'Taxminiy yetkazib beruvchi',
    amount,
    vat: Math.round(amount * 0.12),
    currency: 'UZS',
    items: [{ description: doc.name, quantity: 1, unitPrice: amount }],
    paymentInfo: 'To‘lov ma’lumoti aniqlanmadi',
    confidence: 74,
  }
}

export function useStore(): StoreApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
