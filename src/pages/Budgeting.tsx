import React, { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Button, Card, Modal, Field, Input, Select, Badge, useToast, Progress } from '../components/ui'
import { accountTotals } from '../engine/ledger'
import { monthEnd, todayISO } from '../lib/money'

export default function Budgeting() {
  const { state, session, fmt, t, createBudget, deleteBudget } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const year = Number(todayISO().slice(0, 4))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', accountId: '', amount: '', month: '' })

  const expAccounts = state.accounts.filter((a) => a.companyId === cid && (a.category === 'OperatingExpense' || a.category === 'CostOfGoodsSold'))
  const budgets = state.budgets.filter((b) => b.companyId === cid && b.year === year)

  const rows = useMemo(() => budgets.map((b) => {
    const acc = state.accounts.find((a) => a.id === b.accountId)!
    const actual = Math.abs(accountTotals(acc, state.entries.filter((e) => e.companyId === cid), `${year}-01-01`, monthEnd(todayISO().slice(0, 7))).closing)
    const variance = actual - b.amount
    const pct = b.amount ? (variance / b.amount) * 100 : 0
    return { b, acc, actual, variance, pct }
  }), [budgets, state.accounts, state.entries, cid, year])

  const submit = () => {
    if (!form.accountId || !form.amount) { toast('error', 'Hisob va summani kiriting'); return }
    const acc = state.accounts.find((a) => a.id === form.accountId)!
    createBudget({ name: form.name || acc.name, year, accountId: form.accountId, amount: Number(form.amount) * 100, month: form.month ? Number(form.month) : undefined })
    toast('success', 'Byudjet yaratildi')
    setOpen(false)
    setForm({ name: '', accountId: '', amount: '', month: '' })
  }

  const aiExplain = (r: (typeof rows)[0]) => {
    if (r.variance <= 0) return `✅ ${r.acc.name}: byudjet doirasida (${fmt(r.actual)} / ${fmt(r.b.amount)}).`
    const pct = (r.variance / r.b.amount) * 100
    if (pct > 25) return `🚨 ${r.acc.name}: byudjetdan ${fmt(r.variance)} (+${pct.toFixed(1)}%) oshib ketdi. Asosiy omilni xarajatlar hisobotida tekshiring — bu o‘sish daromad o‘sishidan tezroq bo‘lsa, marjaga bosim beradi.`
    return `⚠ ${r.acc.name}: byudjetdan ${fmt(r.variance)} (+${pct.toFixed(1)}%) oshdi. Sababini aniqlash uchun tranzaksiyalarni ko‘rib chiqing.`
  }

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.budgeting')} sub={`${year}-yil byudjeti`} actions={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Yangi byudjet</Button>} />
      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kategoriya</th><th>Davr</th><th>Byudjet</th><th>Haqiqiy</th><th>Farq</th><th>Variance</th><th>AI izoh</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const pctUsed = r.b.amount ? Math.min(100, (r.actual / r.b.amount) * 100) : 0
                return (
                  <tr key={r.b.id}>
                    <td className="cell-strong">{r.acc.name}</td>
                    <td className="cell-muted">{r.b.month ? `${r.b.month}-oy` : 'Yillik'}</td>
                    <td className="num mono">{fmt(r.b.amount)}</td>
                    <td className="num mono">{fmt(r.actual)}</td>
                    <td className="num mono strong" style={{ color: r.variance > 0 ? 'var(--danger)' : 'var(--primary)' }}>{r.variance > 0 ? '+' : ''}{fmt(r.variance)}</td>
                    <td style={{ minWidth: 120 }}>
                      <Progress value={pctUsed} tone={pctUsed > 100 ? 'danger' : pctUsed > 80 ? 'warn' : 'green'} />
                      <div className="small muted">{r.pct.toFixed(1)}%</div>
                    </td>
                    <td className="small" style={{ maxWidth: 320 }}>{aiExplain(r)}</td>
                    <td><Button variant="ghost" size="sm" onClick={() => { deleteBudget(r.b.id); toast('info', 'O‘chirildi') }}>🗑</Button></td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="muted">Byudjetlar yo‘q</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi byudjet" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="primary" onClick={submit}>Yaratish</Button>
        </>
      }>
        <div className="form-grid">
          <Field label="Kategoriya (hisob)">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">— Tanlang —</option>
              {expAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </Select>
          </Field>
          <Field label="Byudjet summasi (so‘m)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Oy" hint="bo‘sh = yillik">
            <Select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              <option value="">Yillik</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}-oy</option>)}
            </Select>
          </Field>
          <Field label="Nomi (ixtiyoriy)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  )
}
