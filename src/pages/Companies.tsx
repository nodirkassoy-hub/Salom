import React, { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Card, CardHead, Badge, Button, Modal, Field, Input, useToast } from '../components/ui'
import { initials } from '../lib/utils'
import { incomeStatement, cashBalance, receivablesBalance, payablesBalance } from '../engine/selectors'
import { monthStart, monthEnd, todayISO } from '../lib/money'

export default function Companies() {
  const { state, session, fmt, t, switchCompany, createCompany } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ym = todayISO().slice(0, 7)

  const consolidated = useMemo(() => {
    let revenue = 0, expense = 0, profit = 0, cash = 0, ar = 0, ap = 0
    for (const c of state.companies) {
      const is = incomeStatement(state, c.id, monthStart(ym), monthEnd(ym))
      revenue += is.revenueTotal
      expense += is.totalExpense
      profit += is.netProfit
      cash += cashBalance(state, c.id)
      ar += receivablesBalance(state, c.id)
      ap += payablesBalance(state, c.id)
    }
    return { revenue, expense, profit, cash, ar, ap }
  }, [state, ym])

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.companies')} sub="Multi-kompaniya boshqaruvi va konsolidatsiya" actions={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Yangi kompaniya</Button>} />

      <Card pad className="mb16">
        <CardHead title="Konsolidatsiyalangan hisobot" sub="Barcha kompaniyalar bo‘yicha (joriy oy)" />
        <div className="grid grid-3">
          <div className="stat-block"><span className="stat-label">Daromad</span><span className="stat-value mono">{fmt(consolidated.revenue)}</span></div>
          <div className="stat-block"><span className="stat-label">Xarajat</span><span className="stat-value mono">{fmt(consolidated.expense)}</span></div>
          <div className="stat-block"><span className="stat-label">Sof foyda</span><span className="stat-value mono" style={{ color: consolidated.profit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(consolidated.profit)}</span></div>
          <div className="stat-block"><span className="stat-label">Naqd pul</span><span className="stat-value mono">{fmt(consolidated.cash)}</span></div>
          <div className="stat-block"><span className="stat-label">Debitorlik</span><span className="stat-value mono">{fmt(consolidated.ar)}</span></div>
          <div className="stat-block"><span className="stat-label">Kreditorlik</span><span className="stat-value mono">{fmt(consolidated.ap)}</span></div>
        </div>
      </Card>

      <Card pad>
        <CardHead title="Kompaniyalar" />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kompaniya</th><th>STIR</th><th>Valyuta</th><th>Turi</th><th /></tr></thead>
            <tbody>
              {state.companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex">
                      <span className="company-dot" style={{ background: `hsl(${c.logoHue}, 62%, 45%)` }}>{initials(c.name)}</span>
                      <div>
                        <div className="cell-strong">{c.name}</div>
                        <div className="small muted">{c.fullName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono faint">{c.taxId}</td>
                  <td><Badge tone="blue">{c.currency}</Badge></td>
                  <td>{c.isDemo ? <Badge tone="amber">demo</Badge> : <Badge tone="green">real</Badge>}</td>
                  <td>
                    {session?.companyId === c.id ? <Badge tone="green">joriy</Badge> : <Button size="sm" variant="secondary" onClick={() => { switchCompany(c.id); toast('success', 'Kompaniya almashtirildi') }}>O‘tish</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi kompaniya" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => { createCompany({ name: name.trim(), fullName: name.trim() }); setOpen(false); setName(''); toast('success', 'Kompaniya yaratildi') }}>Yaratish</Button>
        </>
      }>
        <Field label="Kompaniya nomi"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <div className="small muted mt8">Har bir kompaniya to‘liq izolyatsiyalangan: tranzaksiyalar, mijozlar, fakturalar, hisobotlar va hujjatlar alohida saqlanadi.</div>
      </Modal>
    </div>
  )
}
