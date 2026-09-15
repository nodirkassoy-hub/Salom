import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import AppLayout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyWork from './pages/MyWork'
import Transactions from './pages/accounting/Transactions'
import JournalEntries from './pages/accounting/Journal'
import ChartOfAccounts from './pages/accounting/ChartOfAccounts'
import GeneralLedger from './pages/accounting/GeneralLedger'
import TrialBalance from './pages/accounting/TrialBalance'
import Invoices, { InvoiceEditor, InvoiceDetail } from './pages/sales/Invoices'
import Customers, { CustomerDetail } from './pages/sales/Customers'
import Payments from './pages/sales/Payments'
import Receivables from './pages/sales/Receivables'
import Bills from './pages/purchases/Bills'
import Suppliers from './pages/purchases/Suppliers'
import Expenses from './pages/purchases/Expenses'
import Payables from './pages/purchases/Payables'
import BankAccounts from './pages/banking/Accounts'
import BankTransactions from './pages/banking/Transactions'
import Reconciliation from './pages/banking/Reconciliation'
import Products from './pages/inventory/Products'
import Stock from './pages/inventory/Stock'
import Warehouses from './pages/inventory/Warehouses'
import Movements from './pages/inventory/Movements'
import Employees from './pages/employees/Employees'
import Payroll from './pages/employees/Payroll'
import Advances from './pages/employees/Advances'
import Documents from './pages/documents/Documents'
import { ReportCenter, PL, BalanceSheetReport, CashFlowReport, TrialBalanceReport, LedgerReport, ARReport, APReport, ExpenseReport, RevenueReport, InventoryReport, TaxReport, BudgetReport, ManagementReport } from './pages/reports/Reports'
import { AIAccountant, AICFO, Advisor, XatoRadar } from './pages/ai/AICenter'
import Budgeting from './pages/Budgeting'
import TaxCenter from './pages/TaxCenter'
import MonthEndClose from './pages/Close'
import NotificationsPage from './pages/Notifications'
import Settings from './pages/Settings'
import Team from './pages/Team'
import Companies from './pages/Companies'
import CashFlow from './pages/CashFlow'
import { I } from './components/icons'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useStore()
  const location = useLocation()
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function NotFound() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--faint)' }}>404</div>
        <div className="muted mb16">Sahifa topilmadi</div>
        <a className="btn btn-primary" href="/dashboard"><I.dashboard size={15} /> Boshqaruv paneliga qaytish</a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-work" element={<MyWork />} />
        <Route path="/accounting/transactions" element={<Transactions />} />
        <Route path="/accounting/journal" element={<JournalEntries />} />
        <Route path="/accounting/coa" element={<ChartOfAccounts />} />
        <Route path="/accounting/ledger" element={<GeneralLedger />} />
        <Route path="/accounting/trial" element={<TrialBalance />} />
        <Route path="/sales/invoices" element={<Invoices />} />
        <Route path="/sales/invoices/new" element={<InvoiceEditor />} />
        <Route path="/sales/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/sales/customers" element={<Customers />} />
        <Route path="/sales/customers/:id" element={<CustomerDetail />} />
        <Route path="/sales/payments" element={<Payments />} />
        <Route path="/sales/receivables" element={<Receivables />} />
        <Route path="/purchases/bills" element={<Bills />} />
        <Route path="/purchases/suppliers" element={<Suppliers />} />
        <Route path="/purchases/expenses" element={<Expenses />} />
        <Route path="/purchases/payables" element={<Payables />} />
        <Route path="/banking/accounts" element={<BankAccounts />} />
        <Route path="/banking/transactions" element={<BankTransactions />} />
        <Route path="/banking/reconciliation" element={<Reconciliation />} />
        <Route path="/inventory/products" element={<Products />} />
        <Route path="/inventory/stock" element={<Stock />} />
        <Route path="/inventory/warehouses" element={<Warehouses />} />
        <Route path="/inventory/movements" element={<Movements />} />
        <Route path="/employees/list" element={<Employees />} />
        <Route path="/employees/payroll" element={<Payroll />} />
        <Route path="/employees/advances" element={<Advances />} />
        <Route path="/documents/all" element={<Documents />} />
        <Route path="/documents/scanner" element={<Documents scanner />} />
        <Route path="/documents/contracts" element={<Documents category="contract" />} />
        <Route path="/documents/receipts" element={<Documents category="receipt" />} />
        <Route path="/documents/statements" element={<Documents category="statement" />} />
        <Route path="/reports" element={<ReportCenter />} />
        <Route path="/reports/pl" element={<PL />} />
        <Route path="/reports/balance" element={<BalanceSheetReport />} />
        <Route path="/reports/cashflow" element={<CashFlowReport />} />
        <Route path="/reports/trial" element={<TrialBalanceReport />} />
        <Route path="/reports/ledger" element={<LedgerReport />} />
        <Route path="/reports/ar" element={<ARReport />} />
        <Route path="/reports/ap" element={<APReport />} />
        <Route path="/reports/expense" element={<ExpenseReport />} />
        <Route path="/reports/revenue" element={<RevenueReport />} />
        <Route path="/reports/inventory" element={<InventoryReport />} />
        <Route path="/reports/tax" element={<TaxReport />} />
        <Route path="/reports/budget" element={<BudgetReport />} />
        <Route path="/reports/management" element={<ManagementReport />} />
        <Route path="/ai/accountant" element={<AIAccountant />} />
        <Route path="/ai/cfo" element={<AICFO />} />
        <Route path="/ai/advisor" element={<Advisor />} />
        <Route path="/ai/xato-radar" element={<XatoRadar />} />
        <Route path="/budgeting" element={<Budgeting />} />
        <Route path="/tax-center" element={<TaxCenter />} />
        <Route path="/cashflow" element={<CashFlow />} />
        <Route path="/close" element={<MonthEndClose />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
