import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, usePeriod, PeriodPicker, ExportMenu } from '../../components/shared'
import { fmtDate, todayISO } from '../../lib/money'
import type { Expense } from '../../lib/types'

export default function Expenses() {
  const { state, session, fmt, fmtDate: fd, t, lang, can, createExpense, deleteExpense } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const { period, preset, setPreset, setCustom } = usePeriod()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Expense | null>(null)

  const expenses = useMemo(() => state.expenses
    .filter((e) => e.companyId === cid && e.date >= period.from && e.date <= period.to)
    .filter((e) => !q || e.description.toLowerCase().includes(q.toLowerCase()) || e.number.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [state, cid, period, q])

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <PageHeader title={t('nav.expenses')} sub={`${expenses.length} ta xarajat · jami ${fmt(total)}`}
        actions={<>
          <ExportMenu getRows={() => [['№', 'Sana', 'Tavsif', 'Kategoriya', 'Summa', 'QQS'], ...expenses.map((e) => [e.number, e.date, e.description, state.accounts.find((a) => a.id === e.categoryAccountId)?.name ?? '', e.amount, e.taxAmount])]} filename="expenses" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Yangi xarajat</Button>}
        </>} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <PeriodPicker preset={preset} setPreset={setPreset} setCustom={setCustom} />
        <SearchBox value={q} onChange={setQ} />
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>№</th><th>Sana</th><th>Tavsif</th><th>Kategoriya</th><th>Yetkazib beruvchi</th><th className="num">Summa</th><th className="num">QQS</th><th /></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="mono faint">{e.number}</td>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fd(e.date)}</td>
                  <td><span className="cell-strong">{e.description}</span>{e.recurring && <Badge tone="violet" style={{ marginLeft: 6 }}>doimiy</Badge>}</td>
                  <td className="muted ellipsis" style={{ maxWidth: 180 }}>{state.accounts.find((a) => a.id === e.categoryAccountId)?.name}</td>
                  <td className="muted">{state.parties.find((p) => p.id === e.supplierId)?.name ?? '—'}</td>
                  <td className="num mono strong">{fmt(e.amount)}</td>
                  <td className="num mono faint">{e.taxAmount ? fmt(e.taxAmount) : '—'}</td>
                  <td>{can('delete') && <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setToDelete(e)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <EmptyState icon="cart" title="Xarajatlar yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Yangi xarajat</Button> : undefined} />}
        </div>
      </Card>

      {open && <ExpenseModal onClose={() => setOpen(false)} />}
      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} title="Xarajatni o‘chirish"
        message={<>«{toDelete?.description}» o‘chiriladi va teskari provodka yaratiladi.</>}
        onConfirm={() => { if (toDelete) { deleteExpense(toDelete.id); toast('success', 'Xarajat o‘chirildi') } }} />
    </div>
  )
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const { state, session, createExpense, fmt } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const expAccounts = state.accounts.filter((a) => a.companyId === cid && (a.category === 'OperatingExpense' || a.category === 'CostOfGoodsSold' || a.category === 'OtherExpense'))
  const banks = state.bankAccounts.filter((b) => b.companyId === cid)
  const suppliers = state.parties.filter((p) => p.companyId === cid && p.type === 'supplier')

  const [amount, setAmount] = useState('')
  const [tax, setTax] = useState('')
  const [categoryId, setCategoryId] = useState(expAccounts[0]?.id ?? '')
  const [accountId, setAccountId] = useState(banks[0]?.glAccountId ?? '')
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')
  const [recurring, setRecurring] = useState(false)

  const submit = () => {
    const amt = Number(amount)
    const tx = Number(tax || 0)
    if (!amt || amt <= 0) { toast('error', 'Summani kiriting'); return }
    if (!categoryId) { toast('error', 'Kategoriyani tanlang'); return }
    if (!accountId) { toast('error', 'To‘lov hisobini tanlang'); return }
    createExpense({
      amount: Math.round(amt), taxAmount: Math.round(tx), categoryAccountId: categoryId,
      paymentAccountId: accountId, supplierId: supplierId || undefined,
      description: description || 'Xarajat', date: todayISO(), currency: 'UZS', recurring,
    })
    toast('success', 'Xarajat yaratildi — provodka qilindi')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Yangi xarajat" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" onClick={submit}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Summa (so‘m)"><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Field label="QQS (so‘m)"><Input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} /></Field>
        <Field label="Kategoriya"><Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{expAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</Select></Field>
        <Field label="To‘lov hisobi"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{banks.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
        <Field label="Yetkazib beruvchi (ixtiyoriy)"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Sana"><Input type="date" value={todayISO()} readOnly /></Field>
        <Field label="Tavsif" className="full"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nima uchun xarajat?" /></Field>
      </div>
      <label className="flex" style={{ gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        <span className="muted">Doimiy (takrorlanuvchi) xarajat</span>
      </label>
      <div className="tiny faint mt8">Xarajat yaratilganda avtomatik ikki tomonlama provodka qilinadi: Debet xarajat hisobi, Kredit to‘lov hisobi.</div>
    </Modal>
  )
}
