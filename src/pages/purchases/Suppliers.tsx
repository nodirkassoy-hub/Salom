import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, ExportMenu } from '../../components/shared'
import { partyBalances, payablesBalance } from '../../engine/selectors'
import type { Party } from '../../lib/types'

export default function Suppliers() {
  const { state, session, fmt, t, can, createParty, updateParty, deleteParty } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Party | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Party | null>(null)

  const balances = useMemo(() => new Map(partyBalances(state, cid, 'Payable').map((b) => [b.partyId, b.balance])), [state, cid])

  const suppliers = useMemo(() => state.parties
    .filter((p) => p.companyId === cid && p.type === 'supplier')
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.taxId ?? '').includes(q))
    .sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0)), [state, cid, q, balances])

  return (
    <div>
      <PageHeader title={t('nav.suppliers')} sub={`${suppliers.length} ta yetkazib beruvchi · jami kreditorlik ${fmt(payablesBalance(state, cid))}`}
        actions={<>
          <ExportMenu getRows={() => [['Nomi', 'STIR', 'Telefon', 'Balans'], ...suppliers.map((s) => [s.name, s.taxId ?? '', s.phone ?? '', balances.get(s.id) ?? 0])]} filename="suppliers" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi yetkazib beruvchi</Button>}
        </>} />

      <div className="mb16"><SearchBox value={q} onChange={setQ} /></div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Yetkazib beruvchi</th><th>STIR</th><th>Telefon</th><th className="num">Balans</th><th /></tr></thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td><span className="cell-strong">{s.name}</span></td>
                  <td className="mono faint">{s.taxId ?? '—'}</td>
                  <td className="faint">{s.phone ?? '—'}</td>
                  <td className="num mono strong" style={{ color: (balances.get(s.id) ?? 0) > 0 ? 'var(--blue-ink)' : 'var(--ink)' }}>{fmt(balances.get(s.id) ?? 0)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {can('edit') && <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(s)} />}
                    {can('delete') && <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setDeleting(s)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 && <EmptyState icon="building" title="Yetkazib beruvchilar yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      <SupplierModal open={creating || !!editing} party={editing} onClose={() => { setCreating(false); setEditing(null) }}
        onSave={(d) => {
          if (editing) { updateParty(editing.id, d); toast('success', t('toast.saved')) }
          else { createParty('supplier', d); toast('success', t('toast.created')) }
          setCreating(false); setEditing(null)
        }} />

      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="O‘chirish"
        message={<>«{deleting?.name}» o‘chirilsinmi?</>}
        onConfirm={() => { if (deleting) { deleteParty(deleting.id); toast('success', t('toast.deleted')) } }} />
    </div>
  )
}

function SupplierModal({ open, party, onClose, onSave }: { open: boolean; party: Party | null; onClose: () => void; onSave: (d: Partial<Party>) => void }) {
  const [name, setName] = useState(party?.name ?? '')
  const [taxId, setTaxId] = useState(party?.taxId ?? '')
  const [phone, setPhone] = useState(party?.phone ?? '')
  const [email, setEmail] = useState(party?.email ?? '')
  const [address, setAddress] = useState(party?.address ?? '')
  const [bankName, setBankName] = useState(party?.bankName ?? '')
  const [accountNo, setAccountNo] = useState(party?.accountNo ?? '')
  const [mfo, setMfo] = useState(party?.mfo ?? '')

  return (
    <Modal open={open} onClose={onClose} title={party ? 'Tahrirlash' : 'Yangi yetkazib beruvchi'} footer={
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
