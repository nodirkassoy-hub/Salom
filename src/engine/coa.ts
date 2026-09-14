import type { Account, AccountCategory, AccountType, Currency, NormalBalance } from '../lib/types'

export const CATEGORY_NORMAL: Record<AccountCategory, NormalBalance> = {
  Asset: 'debit',
  Liability: 'credit',
  Equity: 'credit',
  Revenue: 'credit',
  CostOfGoodsSold: 'debit',
  OperatingExpense: 'debit',
  OtherIncome: 'credit',
  OtherExpense: 'debit',
}

export const CATEGORY_LABEL: Record<AccountCategory, { uz: string; ru: string; en: string }> = {
  Asset: { uz: 'Aktivlar', ru: 'Активы', en: 'Assets' },
  Liability: { uz: 'Majburiyatlar', ru: 'Обязательства', en: 'Liabilities' },
  Equity: { uz: 'Kapital', ru: 'Капитал', en: 'Equity' },
  Revenue: { uz: 'Daromad', ru: 'Выручка', en: 'Revenue' },
  CostOfGoodsSold: { uz: 'Sotilgan mahsulot tannarxi', ru: 'Себестоимость', en: 'Cost of Goods Sold' },
  OperatingExpense: { uz: 'Operatsion xarajatlar', ru: 'Операционные расходы', en: 'Operating Expenses' },
  OtherIncome: { uz: 'Boshqa daromadlar', ru: 'Прочие доходы', en: 'Other Income' },
  OtherExpense: { uz: 'Boshqa xarajatlar', ru: 'Прочие расходы', en: 'Other Expenses' },
}

export const ACCOUNT_COLORS: Record<AccountCategory, string> = {
  Asset: '#2f7cf6',
  Liability: '#f5a623',
  Equity: '#7c5cff',
  Revenue: '#0b9f6a',
  CostOfGoodsSold: '#0ea5e9',
  OperatingExpense: '#ef6c7c',
  OtherIncome: '#12b5a5',
  OtherExpense: '#e5484d',
}

interface SeedAccount {
  code: string
  name: string
  category: AccountCategory
  type: AccountType
  parentId: string | null
  opening?: number
  system?: boolean
}

// Standard Uzbek-oriented chart of accounts. Codes follow a logical
// 4-digit hierarchy; parents are control accounts.
export function buildChartOfAccounts(companyId: string, currency: Currency): Account[] {
  const seeds: SeedAccount[] = [
    // ---- Assets ----
    { code: '1100', name: 'Naqd pul va bank', category: 'Asset', type: 'Bank', parentId: null, system: true },
    { code: '1101', name: 'Kapitalbank UZS', category: 'Asset', type: 'Bank', parentId: null },
    { code: '1102', name: 'Ipak Yo‘li Bank UZS', category: 'Asset', type: 'Bank', parentId: null },
    { code: '1103', name: 'Xorijiy valyuta hisobi (USD)', category: 'Asset', type: 'Bank', parentId: null },
    { code: '1105', name: 'Kassa (naqd pul)', category: 'Asset', type: 'Cash', parentId: null },
    { code: '1200', name: 'Debitorlik qarzlari (AR)', category: 'Asset', type: 'Receivable', parentId: null, system: true },
    { code: '1250', name: 'QQS (kiruvchi)', category: 'Asset', type: 'VATInput', parentId: null, system: true },
    { code: '1300', name: 'Tovar-moddiy zaxiralar', category: 'Asset', type: 'Inventory', parentId: null, system: true },
    { code: '1400', name: 'Asosiy vositalar', category: 'Asset', type: 'FixedAsset', parentId: null, system: true },
    // ---- Liabilities ----
    { code: '2100', name: 'Kreditorlik qarzlari (AP)', category: 'Liability', type: 'Payable', parentId: null, system: true },
    { code: '2200', name: 'QQS (chiquvchi)', category: 'Liability', type: 'VATPayable', parentId: null, system: true },
    { code: '2300', name: 'Ish haqi soliqlari', category: 'Liability', type: 'Payable', parentId: null, system: true },
    { code: '2400', name: 'Kreditlar va qarzlar', category: 'Liability', type: 'Payable', parentId: null },
    // ---- Equity ----
    { code: '3100', name: 'Ustav kapitali', category: 'Equity', type: 'Equity', parentId: null, system: true },
    { code: '3200', name: 'Taqsimlanmagan foyda', category: 'Equity', type: 'Equity', parentId: null, system: true },
    // ---- Revenue ----
    { code: '4100', name: 'Xizmat ko‘rsatishdan daromad', category: 'Revenue', type: 'Income', parentId: null, system: true },
    { code: '4200', name: 'Mahsulot sotuvidan daromad', category: 'Revenue', type: 'Income', parentId: null, system: true },
    // ---- COGS ----
    { code: '5100', name: 'Sotilgan mahsulot tannarxi', category: 'CostOfGoodsSold', type: 'Expense', parentId: null, system: true },
    // ---- Operating expenses ----
    { code: '6100', name: 'Ish haqi va mukofotlar', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6200', name: 'Ofis ijarasi', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6300', name: 'Kommunal xizmatlar', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6400', name: 'Marketing va reklama', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6500', name: 'Ofis va xo‘jalik xarajatlari', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6600', name: 'Dasturiy ta’minot va IT', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6700', name: 'Transport xarajatlari', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6800', name: 'Soliqlar va majburiy to‘lovlar', category: 'OperatingExpense', type: 'Expense', parentId: null },
    { code: '6900', name: 'Boshqa operatsion xarajatlar', category: 'OperatingExpense', type: 'Expense', parentId: null },
    // ---- Other income ----
    { code: '7100', name: 'Kurs farqidan daromad', category: 'OtherIncome', type: 'Income', parentId: null },
    { code: '7200', name: 'Foizli daromadlar', category: 'OtherIncome', type: 'Income', parentId: null },
    // ---- Other expenses ----
    { code: '8100', name: 'Kurs farqidan zarar', category: 'OtherExpense', type: 'Expense', parentId: null },
    { code: '8200', name: 'Bank xizmatlari', category: 'OtherExpense', type: 'Expense', parentId: null },
  ]

  return seeds.map((s, i) => ({
    id: `acc_${companyId}_${s.code}${i}`,
    companyId,
    code: s.code,
    name: s.name,
    category: s.category,
    type: s.type,
    parentId: s.parentId,
    normalBalance: CATEGORY_NORMAL[s.category],
    openingBalance: s.opening ?? 0,
    currency,
    archived: false,
    system: s.system,
  }))
}

export function makeSubAccount(
  companyId: string,
  opts: { code: string; name: string; category: AccountCategory; type: AccountType; parentId: string | null; partyId?: string; currency: Currency; opening?: number },
): Account {
  return {
    id: `acc_${companyId}_${opts.code}_${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    code: opts.code,
    name: opts.name,
    category: opts.category,
    type: opts.type,
    parentId: opts.parentId,
    normalBalance: CATEGORY_NORMAL[opts.category],
    openingBalance: opts.opening ?? 0,
    currency: opts.currency,
    archived: false,
    partyId: opts.partyId,
  }
}
