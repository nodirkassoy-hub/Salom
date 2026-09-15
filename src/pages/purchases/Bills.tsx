import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, FilterChips, BILL_STATUS, usePeriod, ExportMenu } from '../../components/shared'
import { invoiceTotal } from '../../engine/selectors'
import { fmtDate, todayISO, addDays, uid } from '../../lib/money'
import type { Bill, BillStatus, InvoiceLine } from '../../lib/types'

type Filter = 'all' | BillStatus

export default function Bills() {
  const { state, session, fmt, t, lang, can, createBill, payBill, deleteBill } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState<Bill | null>(null)
  const [deleting, setDeleting] = useState<Bill | null>(null)
  const [payAccount, setPayAccount] = useState('')

  const bills = useMemo(() => state.bills
    .filter((b) => b.companyId === cid && b.issueDate >= period.from && b.issueDate <= period.to)
    .filter((b) => filter === 'all' || b.status === filter)
    .filter((b) => !q || b.number.toLowerCase().includes(q.toLowerCase()) || state.parties.find((p) => p.id === b.supplierId)?.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate)), [state, cid, period, filter, q])

  const bankAccounts = state.bankAccounts.filter((b) => b.companyId === cid)

  return (
    <div>
      <PageHeader title={t('nav.bills')} sub={`${bills.length} ta hisob-kitob`}
        actions={<>
          <ExportMenu getRows={() => [['Raqam', 'Yetkazib beruvchi', 'Sana', 'Muddat', 'Status', 'Jami'], ...bills.map((b) => [b.number, state.parties.find((p) => p.id === b.supplierId)?.name ?? '', b.issueDate, b.dueDate, b.status, invoiceTotal(b as any)])]} filename="bills" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi hisob</Button>}
        </>} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <SearchBox value={q} onChange={setQ} />
      </div>

      <Card>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <FilterChips<Filter> value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'open', label: 'Ochiq' },
            { value: 'paid', label: 'To‘langan' },
            { value: 'overdue', label: 'Muddati o‘tgan' },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Raqam</th><th>Yetkazib beruvchi</th><th>Sana</th><th>Muddat</th><th className="num">Jami</th><th>Status</th><th /></tr></thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="mono strong">{b.number}</td>
                  <td className="cell-strong">{state.parties.find((p) => p.id === b.supplierId)?.name}</td>
                  <td className="faint">{fmtDate(b.issueDate, lang)}</td>
                  <td className="faint">{fmtDate(b.dueDate, lang)}</td>
                  <td className="num mono strong">{fmt(invoiceTotal(b as any))}</td>
                  <td><Badge tone={BILL_STATUS[b.status].tone} dot>{BILL_STATUS[b.status].label}</Badge></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {b.status !== 'paid' && can('create') && <Button size="sm" variant="soft" icon="wallet" onClick={() => { setPaying(b); setPayAccount(bankAccounts[0]?.glAccountId ?? '') }}>To‘lash</Button>}
                    {can('delete') && <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setDeleting(b)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bills.length === 0 && <EmptyState icon="file" title="Hisob-kitoblar yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      {creating && <BillModal onClose={() => setCreating(false)} onCreate={(b) => { createBill(b); setCreating(false); toast('success', t('toast.created')) }} />}

      <Modal open={!!paying} onClose={() => setPaying(null)} title={`To‘lov: ${paying?.number}`} footer={
        <>
          <Button variant="ghost" onClick={() => setPaying(null)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!payAccount} onClick={() => { if (paying) { payBill(paying.id, payAccount, todayISO()); setPaying(null); toast('success', 'To‘lov amalga oshirildi') } }}>To‘lash</Button>
        </>
      }>
        <div className="small muted mb16">Jami: <span className="mono strong">{paying ? fmt(invoiceTotal(paying as any)) : ''}</span></div>
        <Field label="To‘lov hisobi"><Select value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>{bankAccounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
      </Modal>

      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="Hisobni o‘chirish"
        message={deleting?.status === 'paid' ? 'To‘langan hisob o‘chirilmaydi.' : 'Hisob o‘chiriladi va teskari provodka yaratiladi.'}
        onConfirm={() => { if (deleting) { deleteBill(deleting.id); toast('success', t('toast.deleted')) } }} />
    </div>
  )
}

function BillModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: Omit<Bill, 'id' | 'companyId' | 'number' | 'createdAt'>) => void }) {
  const { state, session, currency } = useStore()
  const cid = session!.companyId
  const suppliers = state.parties.filter((p) => p.companyId === cid && p.type === 'supplier')
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState<'open' | 'draft'>('open')

  return (
    <Modal open onClose={onClose} title="Yangi hisob-kitob" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!supplierId || amount <= 0} onClick={() => onCreate({
          supplierId, issueDate, dueDate, status, currency,
          lines: [{ id: uid('il'), description: description || 'Xarid', quantity: 1, unitPrice: amount, taxRate: 0 }],
          notes: '',
        })}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Yetkazib beruvchi"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Holat"><Select value={status} onChange={(e) => setStatus(e.target.value as 'open' | 'draft')}><option value="open">Ochiq (provodka)</option><option value="draft">Qoralama</option></Select></Field>
        <Field label="Sana"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
        <Field label="Muddat"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <Field label="Tavsif" className="full"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nima sotib olindi?" /></Field>
        <Field label="Summa" className="full"><Input type="number" min="0" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></Field>
      </div>
    </Modal>
  )
}
