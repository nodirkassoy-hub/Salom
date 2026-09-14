import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, ExportMenu, INVOICE_STATUS } from '../../components/shared'
import { partyBalances, invoiceOutstanding, invoiceTotal } from '../../engine/selectors'
import { fmtDate } from '../../lib/money'
import type { Party } from '../../lib/types'

export default function Customers() {
  const { state, session, fmt, t, lang, can, createParty, updateParty, deleteParty } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Party | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Party | null>(null)

  const balances = useMemo(() => new Map(partyBalances(state, cid, 'Receivable').map((b) => [b.partyId, b.balance])), [state, cid])

  const customers = useMemo(() => state.parties
    .filter((p) => p.companyId === cid && p.type === 'customer')
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.taxId ?? '').includes(q))
    .sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0)), [state, cid, q, balances])

  return (
    <div>
      <PageHeader title={t('nav.customers')} sub={`${customers.length} ta mijoz`}
        actions={<>
          <ExportMenu getRows={() => [['Nomi', 'STIR', 'Telefon', 'Email', 'Balans'], ...customers.map((c) => [c.name, c.taxId ?? '', c.phone ?? '', c.email ?? '', balances.get(c.id) ?? 0])]} filename="customers" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi mijoz</Button>}
        </>} />

      <div className="mb16"><SearchBox value={q} onChange={setQ} /></div>

      <Card>
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Mijoz</th><th>STIR</th><th>Telefon</th><th className="num">Balans</th><th /></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/sales/customers/${c.id}`)}>
                  <td><span className="cell-strong">{c.name}</span></td>
                  <td className="mono faint">{c.taxId ?? '—'}</td>
                  <td className="faint">{c.phone ?? '—'}</td>
                  <td className="num mono strong" style={{ color: (balances.get(c.id) ?? 0) > 0 ? 'var(--warning-ink)' : 'var(--primary)' }}>{fmt(balances.get(c.id) ?? 0)}</td>
                  <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    {can('edit') && <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(c)} />}
                    {can('delete') && <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setDeleting(c)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <EmptyState icon="users" title={t('empty.customers')} action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      <PartyModal open={creating || !!editing} party={editing} onClose={() => { setCreating(false); setEditing(null) }}
        onSave={(data) => {
          if (editing) { updateParty(editing.id, data); toast('success', t('toast.saved')) }
          else { createParty('customer', data); toast('success', t('toast.created')) }
          setCreating(false); setEditing(null)
        }} />

      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="Mijozni o‘chirish"
        message={<>«{deleting?.name}» o‘chirilsinmi? Balansi yoki faoliyati bo‘lsa o‘chirilmaydi.</>}
        onConfirm={() => { if (deleting) { deleteParty(deleting.id); toast('success', t('toast.deleted')) } }} />
    </div>
  )
}

export function CustomerDetail() {
  const { state, session, fmt, t, lang } = useStore()
  const { id } = useParams()
  const cid = session!.companyId
  const cust = state.parties.find((p) => p.id === id && p.companyId === cid)
  const balances = useMemo(() => new Map(partyBalances(state, cid, 'Receivable').map((b) => [b.partyId, b.balance])), [state, cid])
  if (!cust) return <EmptyState icon="users" title="Mijoz topilmadi" />

  const invoices = state.invoices.filter((i) => i.companyId === cid && i.customerId === cust.id).sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const totalBilled = invoices.reduce((s, i) => s + invoiceTotal(i), 0)
  const totalOutstanding = invoices.reduce((s, i) => s + invoiceOutstanding(i, state.payments), 0)

  return (
    <div>
      <PageHeader title={cust.name} sub={cust.taxId ? `STIR: ${cust.taxId}` : 'Mijoz'} />
      <div className="grid grid-3 mb16">
        <div className="stat-block"><span className="stat-label">Balans</span><span className="stat-value mono" style={{ color: (balances.get(cust.id) ?? 0) > 0 ? 'var(--warning-ink)' : 'var(--primary)' }}>{fmt(balances.get(cust.id) ?? 0)}</span></div>
        <div className="stat-block"><span className="stat-label">Jami faktura</span><span className="stat-value mono">{fmt(totalBilled)}</span></div>
        <div className="stat-block"><span className="stat-label">To‘lanmagan</span><span className="stat-value mono">{fmt(totalOutstanding)}</span></div>
      </div>

      <div className="grid grid-3" style={{ alignItems: 'start' }}>
        <Card pad style={{ gridColumn: 'span 2' }}>
          <div className="section-title">Fakturalar</div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Raqam</th><th>Sana</th><th>Muddat</th><th className="num">Jami</th><th className="num">Qoldiq</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="mono strong">{i.number}</td>
                    <td className="faint">{fmtDate(i.issueDate, lang)}</td>
                    <td className="faint">{fmtDate(i.dueDate, lang)}</td>
                    <td className="num mono">{fmt(invoiceTotal(i))}</td>
                    <td className="num mono">{fmt(invoiceOutstanding(i, state.payments))}</td>
                    <td><Badge tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</Badge></td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan={6} className="muted">Faktura yo‘q</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card pad>
          <div className="section-title">Rekvizitlar</div>
          <div className="flex-col" style={{ gap: 6 }}>
            <div className="tiny muted">Telefon</div><div className="small strong">{cust.phone ?? '—'}</div>
            <div className="tiny muted mt8">Email</div><div className="small strong">{cust.email ?? '—'}</div>
            <div className="tiny muted mt8">Manzil</div><div className="small strong">{cust.address ?? '—'}</div>
            <div className="tiny muted mt8">Bank</div><div className="small strong">{cust.bankName ?? '—'}</div>
            <div className="tiny muted mt8">Hisob raqam</div><div className="small mono">{cust.accountNo ?? '—'}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function PartyModal({ open, party, onClose, onSave }: { open: boolean; party: Party | null; onClose: () => void; onSave: (d: Partial<Party>) => void }) {
  const [name, setName] = useState(party?.name ?? '')
  const [taxId, setTaxId] = useState(party?.taxId ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [email, setEmail] = useState(party?.email ?? '')
  const [address, setAddress] = useState(party?.address ?? '')
  const [bankName, setBankName] = useState(party?.bankName ?? '')
  const [accountNo, setAccountNo] = useState(party?.accountNo ?? '')
  const [mfo, setMfo] = useState(party?.mfo ?? '')

  return (
    <Modal open={open} onClose={onClose} title={party ? 'Mijozni tahrirlash' : 'Yangi mijoz'} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), taxId, phone, email, address, bankName, accountNo, mfo })}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="STIR"><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field>
        <Field label="Telefon"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Manzil" className="full"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Bank"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
        <Field label="Hisob raqam"><Input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} /></Field>
        <Field label="MFO"><Input value={mfo} onChange={(e) => setMfo(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
