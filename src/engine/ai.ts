import type { AppState, Currency, Lang, JournalEntry } from '../lib/types'
import {
  incomeStatement, expenseBreakdown, revenueBreakdown, partyBalances, agingOf,
  cashBalance, receivablesBalance, payablesBalance, kpiMetrics, monthlySeries,
  financialHealth, pctChange, invoiceOutstanding,
} from './selectors'
import { accountTotals } from './ledger'
import { forecastCash } from './forecast'
import { monthStart, monthEnd, todayISO, fmtMoney, fmtPercent, fmtDate, addDays } from '../lib/money'

export interface AIAnswer {
  title: string
  paragraphs: string[]
  table?: { columns: string[]; rows: (string | number)[][] }
  transactions?: { date: string; description: string; amount: number; ref: string }[]
  refRoute?: string
  refLabel?: string
  disclaimer: boolean
}

const T = {
  uz: {
    revenue: 'Daromad', expenses: 'Xarajatlar', net: 'Sof foyda', cash: 'Naqd pul',
    profitTitle: 'Bu oygi foyda', expenseTitle: 'Eng katta xarajat', debtorsTitle: 'Qarzdorlar',
    overdueTitle: 'Overdue fakturalar', paymentsTitle: 'Bugungi to‘lovlar', budgetTitle: 'Byudjetdan oshib ketgan xarajatlar',
    checkTitle: 'Tranzaksiya tekshiruvi', fallbackTitle: 'Moliyaviy xulosa',
    vsLast: 'o‘tgan oyga nisbatan', noOverdue: 'Overdue faktura yo‘q', noPayments: 'Bugun rejalashtirilgan to‘lov yo‘q',
    disclaimer: 'Bu javob BUXAI’dagi real hisob ma’lumotlariga asoslanadi.',
  },
  ru: {
    revenue: 'Выручка', expenses: 'Расходы', net: 'Чистая прибыль', cash: 'Деньги',
    profitTitle: 'Прибыль за месяц', expenseTitle: 'Крупнейший расход', debtorsTitle: 'Должники',
    overdueTitle: 'Просроченные счета', paymentsTitle: 'Платежи на сегодня', budgetTitle: 'Превышение бюджета',
    checkTitle: 'Проверка транзакции', fallbackTitle: 'Финансовая сводка',
    vsLast: 'к прошлому месяцу', noOverdue: 'Просроченных счетов нет', noPayments: 'Платежей на сегодня нет',
    disclaimer: 'Ответ основан на реальных учётных данных BUXAI.',
  },
  en: {
    revenue: 'Revenue', expenses: 'Expenses', net: 'Net profit', cash: 'Cash',
    profitTitle: 'This month profit', expenseTitle: 'Biggest expense', debtorsTitle: 'Who owes us',
    overdueTitle: 'Overdue invoices', paymentsTitle: 'Payments due today', budgetTitle: 'Over-budget expenses',
    checkTitle: 'Transaction check', fallbackTitle: 'Financial summary',
    vsLast: 'vs last month', noOverdue: 'No overdue invoices', noPayments: 'No payments due today',
    disclaimer: 'This answer is grounded in real BUXAI accounting data.',
  },
}

type L = typeof T.uz

function hasAny(q: string, words: string[]): boolean {
  const s = q.toLowerCase()
  return words.some((w) => s.includes(w))
}

function topAccountEntries(state: AppState, companyId: string, accountId: string, limit = 5): { date: string; description: string; amount: number; ref: string }[] {
  return state.entries
    .filter((e) => e.companyId === companyId && e.lines.some((l) => l.accountId === accountId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((e) => {
      const line = e.lines.find((l) => l.accountId === accountId)!
      return { date: e.date, description: e.description, amount: line.debit || line.credit || 0, ref: e.number }
    })
}

export function answerAccountant(state: AppState, companyId: string, question: string, lang: Lang, currency: Currency): AIAnswer {
  const L = T[lang]
  const q = question.toLowerCase()
  const today = todayISO()
  const cur = incomeStatement(state, companyId, monthStart(today.slice(0, 7)), monthEnd(today.slice(0, 7)))
  const m = fmtMoney
  const f = (n: number) => m(n, currency, lang)
  const p = (n: number) => fmtPercent(n, lang)

  // 1. Profit this month
  if (hasAny(q, ['foyda', 'profit', 'прибыль', 'daromad qancha', 'qancha foyda'])) {
    const prev = monthlySeries(state, companyId, 2)[0]
    const growth = prev ? pctChange(cur.netProfit, prev.profit) : null
    return {
      title: L.profitTitle,
      paragraphs: [
        `${L.revenue}: ${f(cur.revenueTotal)}`,
        `${L.expenses}: ${f(cur.totalExpense)}`,
        `${L.net}: ${f(cur.netProfit)}${growth !== null && isFinite(growth) ? ` (${growth > 0 ? '+' : ''}${growth.toFixed(1)}% ${L.vsLast})` : ''}`,
      ],
      table: {
        columns: [L.revenue, L.expenses, L.net],
        rows: [[f(cur.revenueTotal), f(cur.totalExpense), f(cur.netProfit)]],
      },
      transactions: [
        ...cur.revenue.slice(0, 2).flatMap((li) => topAccountEntries(state, companyId, li.account.id, 2)),
        ...cur.opex.slice(0, 2).flatMap((li) => topAccountEntries(state, companyId, li.account.id, 2)),
      ].slice(0, 6),
      refRoute: '/reports/pl', refLabel: 'P&L hisobotini ochish',
      disclaimer: false,
    }
  }

  // 2. Biggest expense
  if (hasAny(q, ['katta xarajat', 'biggest expense', 'eng katta', 'крупный расход', 'xarajatimiz nima'])) {
    const top = expenseBreakdown(state, companyId, monthStart(today.slice(0, 7)), monthEnd(today.slice(0, 7)))[0]
    if (!top) return { title: L.expenseTitle, paragraphs: ['No expenses recorded.'], disclaimer: false }
    return {
      title: L.expenseTitle,
      paragraphs: [
        `Eng katta xarajat — ${top.account.name}: ${f(top.amount)} (shu oy).`,
        top.account.code,
      ],
      transactions: topAccountEntries(state, companyId, top.account.id, 6),
      refRoute: '/reports/expense', refLabel: 'Xarajatlar hisoboti',
      disclaimer: false,
    }
  }

  // 3. Who owes us
  if (hasAny(q, ['qarzdor', 'who owes', 'kim bizdan', 'кто должен', 'debitor'])) {
    const bal = partyBalances(state, companyId, 'Receivable')
    return {
      title: L.debtorsTitle,
      paragraphs: bal.length ? [`Jami debitorlik: ${f(receivablesBalance(state, companyId))}`] : ['No outstanding receivables.'],
      table: {
        columns: ['Mijoz', 'Qarz'],
        rows: bal.map((b) => [state.parties.find((p) => p.id === b.partyId)?.name ?? b.partyId, f(b.balance)]),
      },
      refRoute: '/sales/receivables', refLabel: 'Debitorlik',
      disclaimer: false,
    }
  }

  // 4. Overdue invoices
  if (hasAny(q, ['overdue', 'muddati', 'просрочен', 'kechik'])) {
    const overdue = state.invoices.filter((i) => i.companyId === companyId && (i.status === 'overdue' || (i.status !== 'draft' && i.status !== 'cancelled' && i.status !== 'paid' && i.dueDate < today)))
    return {
      title: L.overdueTitle,
      paragraphs: overdue.length ? [`${overdue.length} ta overdue faktura.`] : [L.noOverdue],
      table: overdue.length ? {
        columns: ['№', 'Mijoz', 'Muddat', 'Summa'],
        rows: overdue.map((i) => [i.number, state.parties.find((p) => p.id === i.customerId)?.name ?? '', fmtDate(i.dueDate, lang), f(invoiceOutstanding(i, state.payments))]),
      } : undefined,
      refRoute: '/sales/invoices', refLabel: 'Fakturalar',
      disclaimer: false,
    }
  }

  // 5. Payments due today
  if (hasAny(q, ['bugun', 'today', 'сегодня', 'to‘lovlar bor', 'payments'])) {
    const bills = state.bills.filter((b) => b.companyId === companyId && b.dueDate === today && b.status !== 'paid')
    const invs = state.invoices.filter((i) => i.companyId === companyId && i.dueDate === today && i.status !== 'paid')
    const total = bills.reduce((s, b) => s + b.lines.reduce((a, l) => a + Math.round(l.quantity * l.unitPrice), 0), 0)
    return {
      title: L.paymentsTitle,
      paragraphs: (bills.length || invs.length) ? [`Bugun ${bills.length} ta to‘lov va ${invs.length} ta tushum kutilmoqda.`] : [L.noPayments],
      table: bills.length ? { columns: ['Hisob', 'Yetkazib beruvchi', 'Summa'], rows: bills.map((b) => [b.number, state.parties.find((p) => p.id === b.supplierId)?.name ?? '', f(b.lines.reduce((a, l) => a + Math.round(l.quantity * l.unitPrice), 0))]) } : undefined,
      refRoute: '/purchases/bills', refLabel: 'Hisob-kitoblar',
      disclaimer: false,
    }
  }

  // 6. Over-budget expenses
  if (hasAny(q, ['byudjet', 'budget', 'oshgan', 'over budget', 'превысил', 'oshib'])) {
    const year = today.slice(0, 4)
    const rows: (string | number)[][] = []
    for (const b of state.budgets.filter((x) => x.companyId === companyId && x.year === Number(year))) {
      const acc = state.accounts.find((a) => a.id === b.accountId)!
      const actual = Math.abs(accountTotals(acc, state.entries.filter((e) => e.companyId === companyId), `${year}-01-01`, monthEnd(today.slice(0, 7))).closing)
      if (actual > b.amount) rows.push([acc.name, f(b.amount), f(actual), p(((actual - b.amount) / b.amount) * 100)])
    }
    return {
      title: L.budgetTitle,
      paragraphs: rows.length ? [`${rows.length} ta kategoriya byudjetdan oshib ketdi.`] : ['Hech qaysi kategoriya byudjetdan oshmadi.'],
      table: rows.length ? { columns: ['Kategoriya', 'Byudjet', 'Haqiqiy', 'Farq'], rows } : undefined,
      refRoute: '/budgeting', refLabel: 'Byudjet',
      disclaimer: false,
    }
  }

  // 7. Is this transaction correct?
  if (hasAny(q, ['to‘g‘ri', 'to\'g\'ri', 'correct', 'правильно', 'transaction to'])) {
    const recent = state.entries.filter((e) => e.companyId === companyId).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!recent) return { title: L.checkTitle, paragraphs: ['No transactions yet.'], disclaimer: false }
    const t = recent.lines.reduce((s, l) => s + (l.debit || 0) - (l.credit || 0), 0)
    const balanced = Math.abs(t) < 0.5
    const names = recent.lines.map((l) => state.accounts.find((a) => a.id === l.accountId)?.name ?? '?')
    return {
      title: L.checkTitle,
      paragraphs: [
        `${recent.number} — ${recent.description}`,
        balanced ? '✔ Provodka muvozanatda (debet = kredit).' : '✖ Provodka muvozanatda EMAS!',
        `Hisoblar: ${names.join(', ')}`,
      ],
      transactions: [{ date: recent.date, description: recent.description, amount: Math.abs(t), ref: recent.number }],
      disclaimer: true,
    }
  }

  // Fallback: current financial summary
  const health = financialHealth(state, companyId)
  return {
    title: L.fallbackTitle,
    paragraphs: [
      `${L.revenue}: ${f(cur.revenueTotal)} · ${L.expenses}: ${f(cur.totalExpense)} · ${L.net}: ${f(cur.netProfit)}`,
      `${L.cash}: ${f(cashBalance(state, companyId))} · AR: ${f(receivablesBalance(state, companyId))} · AP: ${f(payablesBalance(state, companyId))}`,
      `Barqarorlik: ${health.score}/100`,
    ],
    refRoute: '/dashboard', refLabel: 'Boshqaruv paneli',
    disclaimer: false,
  }
}

// =============================================================
// AI CFO — management analysis on real numbers.
// =============================================================

export interface Insight {
  severity: 'positive' | 'negative' | 'warning' | 'info'
  title: string
  detail: string
  evidence: string
}

export interface CFOAnalysis {
  score: number
  scoreLabel: string
  runwayMonths: number
  margin: number
  cash: number
  netProfit: number
  revenue: number
  revenueGrowth: number | null
  expenseGrowth: number | null
  insights: Insight[]
  recommendations: Insight[]
  risks: Insight[]
  opportunities: Insight[]
  forecast: { days30: number; days90: number; shortage: boolean }
}

export function cfoAnalysis(state: AppState, companyId: string, lang: Lang, currency: Currency): CFOAnalysis {
  const today = todayISO()
  const ym = today.slice(0, 7)
  const f = (n: number) => fmtMoney(n, currency, lang)
  const p = (n: number) => fmtPercent(n, lang)
  const cur = incomeStatement(state, companyId, monthStart(ym), monthEnd(ym))
  const series = monthlySeries(state, companyId, 4) // last 4 months
  const prevMonth = series[series.length - 2]
  const health = financialHealth(state, companyId)
  const aging = agingOf(state, companyId, 'receivable')
  const apAging = agingOf(state, companyId, 'payable')
  const cash = cashBalance(state, companyId)

  // runway: average monthly total expense over last 3 months
  const avgBurn = series.slice(-3).reduce((s, m) => s + m.expenses, 0) / 3
  const runwayMonths = avgBurn > 0 ? Math.round((cash / avgBurn) * 10) / 10 : 999

  const revenueGrowth = prevMonth && prevMonth.revenue > 0 ? pctChange(cur.revenueTotal, prevMonth.revenue) : null
  const expenseGrowth = prevMonth && prevMonth.expenses > 0 ? pctChange(cur.totalExpense, prevMonth.expenses) : null
  const margin = cur.revenueTotal > 0 ? (cur.netProfit / cur.revenueTotal) * 100 : 0

  const insights: Insight[] = []
  const recommendations: Insight[] = []
  const risks: Insight[] = []
  const opportunities: Insight[] = []

  // Revenue vs expense growth
  if (revenueGrowth !== null && expenseGrowth !== null) {
    if (expenseGrowth > revenueGrowth && expenseGrowth > 5) {
      const top = expenseBreakdown(state, companyId, monthStart(ym), monthEnd(ym))[0]
      insights.push({
        severity: 'warning',
        title: 'Xarajatlar daromaddan tezroq o‘smoqda',
        detail: `Xarajatlar ${p(expenseGrowth)} o‘sdi, daromad esa atigi ${p(revenueGrowth)}. Asosiy omil: ${top?.account.name ?? '—'}.`,
        evidence: `${f(cur.totalExpense)} xarajat vs ${f(cur.revenueTotal)} daromad`,
      })
      recommendations.push({
        severity: 'warning',
        title: `"${top?.account.name ?? 'Xarajat'}" bo‘yicha nazoratni kuchaytiring`,
        detail: `Ushbu kategoriya shu oyda ${top ? f(top.amount) : '—'} ni tashkil qildi va o‘sishning asosiy haydovchisidir.`,
        evidence: top?.account.code ?? '',
      })
    } else if (revenueGrowth > expenseGrowth) {
      insights.push({
        severity: 'positive',
        title: 'Daromad xarajatlardan tezroq o‘smoqda',
        detail: `Daromad ${p(revenueGrowth)}, xarajatlar ${p(expenseGrowth)}.`,
        evidence: '',
      })
    }
  }

  // Margin
  if (margin >= 20) {
    insights.push({ severity: 'positive', title: 'Sog‘lom rentabellik', detail: `Operatsion marja ${p(margin)} — soha bo‘yicha yuqori.`, evidence: `Sof foyda ${f(cur.netProfit)}` })
  } else if (margin < 5) {
    insights.push({ severity: 'warning', title: 'Past rentabellik', detail: `Marja atigi ${p(margin)}. Xarajat tarkibini qayta ko‘rib chiqing.`, evidence: '' })
    risks.push({ severity: 'warning', title: 'Rentabellik xatari', detail: `Marja ${p(margin)} darajasida — kutilmagan xarajat darhol zararga olib kelishi mumkin.`, evidence: '' })
  }

  // Receivables
  if (aging.overdue > 0) {
    const share = cur.revenueTotal > 0 ? (aging.overdue / cur.revenueTotal) * 100 : 0
    risks.push({
      severity: aging.overdue > 20000000 ? 'negative' : 'warning',
      title: 'Muddati o‘tgan debitorlik',
      detail: `${f(aging.overdue)} muddati o‘tgan qarz (daromadning ${p(share)}).`,
      evidence: `${state.invoices.filter((i) => i.companyId === companyId && i.status === 'overdue').length} ta faktura`,
    })
    recommendations.push({ severity: 'warning', title: 'Inkasso jarayonini boshlang', detail: 'Overdue mijozlarga eslatma yuboring va to‘lov shartlarini qayta kelishing.', evidence: '' })
  } else {
    insights.push({ severity: 'positive', title: 'Debitorlik toza', detail: 'Muddati o‘tgan qarz yo‘q.', evidence: '' })
  }

  // Liquidity
  if (apAging.overdue > 0) {
    risks.push({ severity: 'warning', title: 'Muddati o‘tgan kreditorlik', detail: `${f(apAging.overdue)} to‘lanmagan majburiyat.`, evidence: '' })
  }
  if (cash < avgBurn) {
    risks.push({ severity: 'negative', title: 'Kassa zaxirasi past', detail: `Naqd pul ${f(cash)} — bir oylik xarajatdan kam.`, evidence: `O‘rtacha oylik xarajat ${f(Math.round(avgBurn))}` })
  } else {
    opportunities.push({ severity: 'info', title: 'Erkin naqd pul', detail: `${f(cash)} likvid mablag‘ mavjud — depozit yoki investitsiyani ko‘rib chiqing.`, evidence: '' })
  }

  // Budget variances
  const year = today.slice(0, 4)
  const overBudget = state.budgets.filter((b) => b.companyId === companyId && b.year === Number(year) && b.accountId)
    .map((b) => {
      const acc = state.accounts.find((a) => a.id === b.accountId)!
      const actual = Math.abs(accountTotals(acc, state.entries.filter((e) => e.companyId === companyId), `${year}-01-01`, monthEnd(ym)).closing)
      return { acc, actual, budget: b.amount }
    })
    .filter((x) => x.actual > x.budget)
  if (overBudget.length) {
    const worst = overBudget.sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget))[0]
    insights.push({ severity: 'warning', title: 'Byudjetdan oshib ketish', detail: `${overBudget.length} kategoriya byudjetdan oshdi. Eng kattasi: ${worst.acc.name} (${f(worst.actual)} vs ${f(worst.budget)}).`, evidence: '' })
  }

  // Radar
  const openAlerts = state.alerts.filter((a) => a.companyId === companyId && (a.status === 'open' || a.status === 'reviewed')).length
  if (openAlerts > 0) {
    risks.push({ severity: openAlerts > 2 ? 'negative' : 'warning', title: 'Ochiq Xato Radar signallari', detail: `${openAlerts} ta signal ko‘rib chiqilishini kutmoqda.`, evidence: '' })
    recommendations.push({ severity: 'warning', title: 'Signallarni hal qiling', detail: 'Xato Radar bo‘limida ochiq signallarni ko‘rib chiqing.', evidence: '' })
  }

  // Forecast
  const fc30 = forecastCash(state, companyId, 30)
  const fc90 = forecastCash(state, companyId, 90)
  if (fc90.shortageDates.length) {
    risks.push({ severity: 'negative', title: 'Kassa uzilishi xavfi', detail: `${fc90.shortageDates.length} kunda salbiy qoldiq prognoz qilinmoqda. Birinchi sana: ${fmtDate(fc90.shortageDates[0], lang)}.`, evidence: '' })
    recommendations.push({ severity: 'negative', title: 'Naqd pul rejasini tuzing', detail: '90 kunlik prognozda kassa uzilishi ko‘rinmoqda — to‘lovlarni kechiktiring yoki tushumlarni tezlashtiring.', evidence: '' })
  } else if (runwayMonths < 3) {
    recommendations.push({ severity: 'warning', title: 'Zaxirani oshiring', detail: `Runway ${runwayMonths} oy — kamida 3 oylik zaxira saqlash tavsiya etiladi.`, evidence: '' })
  }

  // Upsell/opportunity
  const topCustomer = partyBalances(state, companyId, 'Receivable')[0]
  if (topCustomer && topCustomer.balance > 0) {
    opportunities.push({ severity: 'positive', title: 'Yirik qarzdorni undirish', detail: `${state.parties.find((x) => x.id === topCustomer.partyId)?.name} dan ${f(topCustomer.balance)} undirish kutilmoqda.`, evidence: '' })
  }

  return {
    score: health.score,
    scoreLabel: health.label,
    runwayMonths,
    margin,
    cash,
    netProfit: cur.netProfit,
    revenue: cur.revenueTotal,
    revenueGrowth,
    expenseGrowth,
    insights,
    recommendations,
    risks,
    opportunities,
    forecast: { days30: fc30.points[fc30.points.length - 1].balance, days90: fc90.points[fc90.points.length - 1].balance, shortage: fc90.shortageDates.length > 0 },
  }
}

export const QUICK_QUESTIONS: Record<Lang, string[]> = {
  uz: ['Bu oyda qancha foyda qildik?', 'Eng katta xarajatimiz nima?', 'Kim bizdan qarzdor?', 'Qaysi invoice overdue?', 'Bugun qanday to‘lovlar bor?', 'Qaysi xarajatlar oshib ketgan?'],
  ru: ['Сколько прибыли в этом месяце?', 'Какой самый крупный расход?', 'Кто нам должен?', 'Какие счета просрочены?', 'Какие платежи сегодня?', 'Что превысило бюджет?'],
  en: ['How much profit did we make this month?', 'What is our biggest expense?', 'Who owes us money?', 'Which invoices are overdue?', 'What payments are due today?', 'Which expenses are over budget?'],
}
