import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Icon, IconName } from './icons'
import { Badge, Menu } from './ui'
import { cx, initials, avatarColor } from '../lib/utils'
import type { Lang } from '../lib/types'

interface NavItem { to: string; key: string; icon: IconName }
interface NavGroup { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: 'Asosiy',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: 'dashboard' },
      { to: '/my-work', key: 'nav.mywork', icon: 'work' },
    ],
  },
  {
    label: 'nav.accounting',
    items: [
      { to: '/accounting/transactions', key: 'nav.transactions', icon: 'layers' },
      { to: '/accounting/journal', key: 'nav.journal', icon: 'calc' },
      { to: '/accounting/coa', key: 'nav.coa', icon: 'fileText' },
      { to: '/accounting/ledger', key: 'nav.ledger', icon: 'clock' },
      { to: '/accounting/trial', key: 'nav.trial', icon: 'percent' },
    ],
  },
  {
    label: 'nav.sales',
    items: [
      { to: '/sales/invoices', key: 'nav.invoices', icon: 'receipt' },
      { to: '/sales/customers', key: 'nav.customers', icon: 'users' },
      { to: '/sales/payments', key: 'nav.payments', icon: 'wallet' },
      { to: '/sales/receivables', key: 'nav.receivables', icon: 'arrowDown' },
    ],
  },
  {
    label: 'nav.purchases',
    items: [
      { to: '/purchases/bills', key: 'nav.bills', icon: 'file' },
      { to: '/purchases/suppliers', key: 'nav.suppliers', icon: 'building' },
      { to: '/purchases/expenses', key: 'nav.expenses', icon: 'cart' },
      { to: '/purchases/payables', key: 'nav.payables', icon: 'arrowUp' },
    ],
  },
  {
    label: 'nav.banking',
    items: [
      { to: '/banking/accounts', key: 'nav.bankaccounts', icon: 'bank' },
      { to: '/banking/transactions', key: 'nav.banktransactions', icon: 'tag' },
      { to: '/banking/reconciliation', key: 'nav.reconciliation', icon: 'checkCircle' },
    ],
  },
  {
    label: 'nav.inventory',
    items: [
      { to: '/inventory/products', key: 'nav.products', icon: 'box' },
      { to: '/inventory/stock', key: 'nav.stock', icon: 'layers' },
      { to: '/inventory/warehouses', key: 'nav.warehouses', icon: 'landmark' },
      { to: '/inventory/movements', key: 'nav.movements', icon: 'refresh' },
    ],
  },
  {
    label: 'nav.employees',
    items: [
      { to: '/employees/list', key: 'nav.employees', icon: 'users' },
      { to: '/employees/payroll', key: 'nav.payroll', icon: 'wallet' },
      { to: '/employees/advances', key: 'nav.advances', icon: 'arrowUp' },
    ],
  },
  {
    label: 'nav.documents',
    items: [
      { to: '/documents/all', key: 'nav.alldocuments', icon: 'file' },
      { to: '/documents/scanner', key: 'nav.docscanner', icon: 'sparkles' },
      { to: '/documents/contracts', key: 'nav.contracts', icon: 'fileText' },
      { to: '/documents/receipts', key: 'nav.receipts', icon: 'receipt' },
      { to: '/documents/statements', key: 'nav.statements', icon: 'bank' },
    ],
  },
  {
    label: 'nav.reports',
    items: [
      { to: '/reports', key: 'nav.reports', icon: 'report' },
      { to: '/reports/pl', key: 'nav.pl', icon: 'trend' },
      { to: '/reports/balance', key: 'nav.balanceSheet', icon: 'percent' },
      { to: '/reports/cashflow', key: 'nav.cashflow', icon: 'wallet' },
      { to: '/reports/tax', key: 'nav.taxReports', icon: 'flag' },
      { to: '/reports/management', key: 'nav.managementReports', icon: 'target' },
    ],
  },
  {
    label: 'nav.aicenter',
    items: [
      { to: '/ai/accountant', key: 'nav.aiaccountant', icon: 'sparkles' },
      { to: '/ai/cfo', key: 'nav.aicfo', icon: 'trend' },
      { to: '/ai/advisor', key: 'nav.advisor', icon: 'globe' },
      { to: '/ai/xato-radar', key: 'nav.xatoradar', icon: 'radar' },
    ],
  },
  {
    label: 'Boshqa',
    items: [
      { to: '/budgeting', key: 'nav.budgeting', icon: 'target' },
      { to: '/tax-center', key: 'nav.taxcenter', icon: 'flag' },
      { to: '/close', key: 'nav.close', icon: 'calendarCheck' },
    ],
  },
]

export default function AppLayout() {
  const { state, session, lang, t, can } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  const unread = state.notifications.filter((n) => n.companyId === session?.companyId && !n.read).length
  const openAlerts = state.alerts.filter((a) => a.companyId === session?.companyId && (a.status === 'open' || a.status === 'reviewed')).length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o) }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={cx('sidebar', sidebarOpen && 'open')}>
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <div className="brand-name">BUXAI</div>
            <div className="brand-tag">{t('app.tagline')}</div>
          </div>
        </div>
        <nav className="nav-scroll">
          {NAV.map((g) => (
            <div key={g.label}>
              <div className="nav-group-label">{t(g.label, g.label)}</div>
              {g.items.map((it) => {
                const badge = it.to === '/ai/xato-radar' ? openAlerts : 0
                return (
                  <NavLink key={it.to} to={it.to} className={({ isActive }) => cx('nav-item', isActive && 'active')} onClick={() => setSidebarOpen(false)}>
                    <Icon name={it.icon} size={17} />
                    <span className="ellipsis">{t(it.key)}</span>
                    {badge > 0 && <Badge tone="red" className="nav-badge">{badge}</Badge>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="demo-pill"><Icon name="sparkles" size={14} /> {t('app.demo')} · demo ma’lumotlar</div>
          <div className="flex mt8" style={{ gap: 6 }}>
            <NavLink to="/notifications" className="nav-item" style={{ flex: 1 }}><Icon name="bell" size={16} />{t('nav.notifications')}{unread > 0 && <Badge tone="red" className="nav-badge">{unread}</Badge>}</NavLink>
            <NavLink to="/settings" className="nav-item" style={{ flex: 1 }}><Icon name="gear" size={16} />{t('nav.settings')}</NavLink>
          </div>
          {can('manageUsers') && (
            <NavLink to="/team" className="nav-item"><Icon name="shield" size={16} />{t('nav.team')}</NavLink>
          )}
          <NavLink to="/companies" className="nav-item"><Icon name="building" size={16} />{t('nav.companies')}</NavLink>
        </div>
      </aside>

      <div className="main-col">
        <Topbar onMenu={() => setSidebarOpen(true)} onCmd={() => setCmdOpen(true)} unread={unread} />
        <main className="content"><Outlet /></main>
        <MobileNav unread={unread} openAlerts={openAlerts} />
      </div>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  )
}

function Topbar({ onMenu, onCmd, unread }: { onMenu: () => void; onCmd: () => void; unread: number }) {
  const { state, session, company, user, t, lang, setLanguage, switchCompany, markAllNotifRead } = useStore()
  const navigate = useNavigate()
  const notifs = state.notifications.filter((n) => n.companyId === session?.companyId).slice(0, 8)
  const companyName = company?.name ?? '—'

  return (
    <header className="topbar">
      <button className="topbar-btn menu-btn" onClick={onMenu} aria-label="Menu"><Icon name="menu" /></button>
      <div className="topbar-search" onClick={onCmd} style={{ cursor: 'pointer' }}>
        <Icon name="search" size={16} />
        <input className="input search-input" readOnly placeholder={`${t('common.search')}…  (Ctrl K)`} />
      </div>
      <div className="topbar-spacer" />

      <CompanySwitcher name={companyName} onSwitch={switchCompany} />

      <Menu
        align="right"
        trigger={
          <button className="topbar-btn" aria-label="Notifications">
            <Icon name="bell" size={17} />
            {unread > 0 && <span className="dot" />}
          </button>
        }
        items={[
          { label: <strong>{t('nav.notifications')}</strong>, disabled: true },
          ...notifs.map((n) => ({
            label: <span className="ellipsis" style={{ maxWidth: 260, display: 'inline-block' }}>{n.message}</span>,
            icon: (n.severity === 'critical' ? 'alert' : n.severity === 'warning' ? 'clock' : 'bell') as IconName,
            onClick: () => navigate(n.route ?? '/notifications'),
          })),
          { label: t('nav.notifications'), icon: 'bell', divider: notifs.length > 0, onClick: () => navigate('/notifications') },
          { label: 'Hammasini o‘qilgan deb belgilash', icon: 'check', onClick: markAllNotifRead },
        ]}
      />

      <ProfileMenu user={user} lang={lang} setLanguage={setLanguage} />
    </header>
  )
}

function CompanySwitcher({ name, onSwitch }: { name: string; onSwitch: (id: string) => void }) {
  const { state, session, company } = useStore()
  return (
    <Menu
      align="right"
      trigger={
        <button className="company-chip">
          <span className="company-dot" style={{ background: `hsl(${company?.logoHue ?? 156}, 62%, 45%)` }}>{initials(name)}</span>
          <span className="strong ellipsis hide-sm" style={{ maxWidth: 150 }}>{name}</span>
          <Icon name="chevronDown" size={15} />
        </button>
      }
      items={state.companies.map((c) => ({
        label: (
          <span className="flex" style={{ gap: 8 }}>
            <span className="company-dot" style={{ width: 22, height: 22, background: `hsl(${c.logoHue}, 62%, 45%)`, fontSize: 9 }}>{initials(c.name)}</span>
            {c.name}{c.id === session?.companyId && <Badge tone="green" style={{ marginLeft: 'auto' }}>joriy</Badge>}
          </span>
        ),
        onClick: () => onSwitch(c.id),
      }))}
    />
  )
}

function ProfileMenu({ user, lang, setLanguage }: { user: { name: string; email: string; role: string } | null; lang: Lang; setLanguage: (l: Lang) => void }) {
  const { logout } = useStore()
  const navigate = useNavigate()
  const name = user?.name ?? 'Foydalanuvchi'
  const langs: { value: Lang; label: string }[] = [{ value: 'uz', label: 'O‘zbekcha' }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]
  return (
    <Menu
      align="right"
      trigger={<span className="avatar" style={{ width: 36, height: 36, background: avatarColor(name), cursor: 'pointer' }}>{initials(name)}</span>}
      items={[
        { label: <div><div className="strong" style={{ fontSize: 13 }}>{name}</div><div className="tiny muted">{user?.email}</div></div>, disabled: true },
        { label: <span className="flex" style={{ gap: 6 }}>{langs.map((l) => <button key={l.value} className={cx('filter-chip', lang === l.value && 'active')} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setLanguage(l.value)}>{l.label}</button>)}</span>, disabled: true },
        { label: 'Sozlamalar', icon: 'gear', onClick: () => navigate('/settings') },
        { label: 'Kompaniyalar', icon: 'building', onClick: () => navigate('/companies') },
        { label: 'Chiqish', icon: 'logout', danger: true, onClick: logout },
      ]}
    />
  )
}

const MOBILE: NavItem[] = [
  { to: '/dashboard', key: 'nav.dashboard', icon: 'dashboard' },
  { to: '/accounting/transactions', key: 'nav.transactions', icon: 'layers' },
  { to: '/sales/invoices', key: 'nav.invoices', icon: 'receipt' },
  { to: '/ai/accountant', key: 'nav.aiaccountant', icon: 'sparkles' },
  { to: '/my-work', key: 'nav.mywork', icon: 'work' },
]

function MobileNav({ unread, openAlerts }: { unread: number; openAlerts: number }) {
  const { t } = useStore()
  return (
    <nav className="mobile-nav">
      {MOBILE.map((it) => {
        const badge = it.to === '/ai/xato-radar' ? openAlerts : it.to === '/dashboard' ? unread : 0
        return (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => cx('mobile-nav-item', isActive && 'active')} style={{ position: 'relative' }}>
            <Icon name={it.icon} size={19} />
            <span>{t(it.key).split(' ')[0]}</span>
            {badge > 0 && <span className="dot" style={{ position: 'absolute', top: 5, right: '24%', width: 7, height: 7, borderRadius: 99, background: 'var(--danger)' }} />}
          </NavLink>
        )
      })}
    </nav>
  )
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t, logout, state, session, switchCompany } = useStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const flat: { label: string; sub: string; to: string; icon: IconName }[] = useMemo(() => {
    const items: { label: string; sub: string; to: string; icon: IconName }[] = []
    for (const g of NAV) for (const it of g.items) items.push({ label: t(it.key), sub: t(g.label, g.label), to: it.to, icon: it.icon })
    items.push({ label: t('nav.notifications'), sub: '—', to: '/notifications', icon: 'bell' })
    items.push({ label: t('nav.settings'), sub: '—', to: '/settings', icon: 'gear' })
    items.push({ label: t('nav.team'), sub: '—', to: '/team', icon: 'shield' })
    items.push({ label: t('nav.companies'), sub: '—', to: '/companies', icon: 'building' })
    items.push({ label: t('nav.consolidated'), sub: '—', to: '/companies', icon: 'layers' })
    return items
  }, [t])

  const filtered = flat.filter((x) => x.label.toLowerCase().includes(q.toLowerCase()) || x.sub.toLowerCase().includes(q.toLowerCase())).slice(0, 14)

  const companies = state.companies

  return (
    <div className="cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cmd">
        <input ref={inputRef} className="cmd-input" placeholder={t('common.search') + '…'} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="cmd-list">
          {q.trim() && (
            <>
              <div className="cmd-group">{t('nav.companies')}</div>
              {companies.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).map((c) => (
                <button key={c.id} className="cmd-item" onClick={() => { switchCompany(c.id); onClose() }}>
                  <Icon name="building" size={16} /> {c.name}
                </button>
              ))}
            </>
          )}
          <div className="cmd-group">{q.trim() ? 'Natijalar' : 'Bo‘limlar'}</div>
          {filtered.map((x, i) => (
            <button key={x.to} className={cx('cmd-item', i === 0 && 'selected')} onClick={() => { navigate(x.to); onClose() }}>
              <Icon name={x.icon} size={16} /> <span>{x.label}</span><span className="tiny faint" style={{ marginLeft: 8 }}>{x.sub}</span>
              <span className="cmd-kbd">↵</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="empty-state" style={{ padding: 24 }}><div className="muted small">{t('empty.search')}</div></div>}
          <div className="cmd-group">Amallar</div>
          <button className="cmd-item" onClick={() => { navigate('/sales/invoices'); onClose() }}><Icon name="plus" size={16} /> Yangi hisob-faktura</button>
          <button className="cmd-item" onClick={() => { navigate('/purchases/expenses'); onClose() }}><Icon name="plus" size={16} /> Yangi xarajat</button>
          <button className="cmd-item" onClick={() => { navigate('/ai/xato-radar'); onClose() }}><Icon name="radar" size={16} /> Xato Radarni ishga tushirish</button>
          <button className="cmd-item" onClick={() => { logout(); onClose() }}><Icon name="logout" size={16} /> Chiqish</button>
        </div>
        <div className="cmd-footer">
          <span>↑↓ harakatlanish</span><span>↵ ochish</span><span>esc yopish</span>
        </div>
      </div>
    </div>
  )
}
