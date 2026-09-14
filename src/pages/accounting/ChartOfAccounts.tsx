import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, ExportMenu } from '../../components/shared'
import { accountTotals } from '../../engine/ledger'
import type { Account, AccountCategory, AccountType } from '../../lib/types'

const CATS: { value: AccountCategory; label: string }[] = [
  { value: 'Asset', label: 'Aktivlar' },
  { value: 'Liability', label: 'Majburiyatlar' },
  { value: 'Equity', label: 'Kapital' },
  { value: 'Revenue', label: 'Daromad' },
  { value: 'CostOfGoodsSold', label: 'Tannarx' },
  { value: 'OperatingExpense', label: 'Operatsion xarajat' },
  { value: 'OtherIncome', label: 'Boshqa daromad' },
  { value: 'OtherExpense', label: 'Boshqa xarajat' },
]
const TYPES: { value: AccountType; label: string }[] = [
  { value: 'Bank', label: 'Bank' }, { value: 'Cash', label: 'Kassa' }, { value: 'Receivable', label: 'Debitor' },
  { value: 'Payable', label: 'Kreditor' }, { value: 'Inventory', label: 'Ombor' }, { value: 'FixedAsset', label: 'Asosiy vosita' },
  { value: 'VATPayable', label: 'QQS majburiyat' }, { value: 'VATInput', label: 'QQS kirim' }, { value: 'Equity', label: 'Kapital' },
  { value: 'Income', label: 'Daromad' }, { value: 'Expense', label: 'Xarajat' }, { value: 'Other', label: 'Boshqa' },
]

export default function ChartOfAccounts() {
  const { state, session, fmt, t, can, createAccount, updateAccount, archiveAccount, deleteAccount } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)

  const [form, setForm] = useState({ code: '', name: '', category: 'Asset' as AccountCategory, type: 'Other' as AccountType, openingBalance: 0 })

  const accounts = useMemo(() => state.accounts
    .filter((a) => a.companyId === cid && !a.archived)
    .filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()) || a.code.includes(q)), [state, cid, q])

  const entries = state.entries
  const groups = useMemo(() => {
    const g = new Map<AccountCategory, Account[]>()
    for (const a of accounts) {
      const cat = a.category
      if (!g.has(cat)) g.set(cat, [])
      g.get(cat)!.push(a)
    }
    return g
  }, [accounts])

  const openModal = (a?: Account) => {
    if (a) { setEditing(a); setForm({ code: a.code, name: a.name, category: a.category, type: a.type, openingBalance: a.openingBalance }) }
    else { setCreating(true); setForm({ code: '', name: '', category: 'Asset', type: 'Other', openingBalance: 0 }) }
  }
  const closeModal = () => { setCreating(false); setEditing(null) }

  const save = () => {
    if (!form.code.trim() || !form.name.trim()) { toast('error', 'Kod va nom majburiy'); return }
    if (editing) { updateAccount(editing.id, { code: form.code, name: form.name, category: form.category, type: form.type }); toast('success', t('toast.saved')) }
    else {
      const exists = state.accounts.some((a) => a.companyId === cid && a.code === form.code)
      if (exists) { toast('error', 'Bu kod allaqachon mavjud'); return }
      createAccount({ code: form.code, name: form.name, category: form.category, type: form.type, parentId: null, openingBalance: form.openingBalance })
      toast('success', t('toast.created'))
    }
    closeModal()
  }

  return (
    <div>
      <PageHeader title={t('nav.coa')} sub={`${accounts.length} ta faol hisob`}
        actions={<>
          <ExportMenu getRows={() => [['Kod', 'Nomi', 'Kategoriya', 'Turi', 'Balans'], ...accounts.map((a) => [a.code, a.name, a.category, a.type, accountTotals(a, entries).closing])]} filename="chart-of-accounts" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => openModal()}>Yangi hisob</Button>}
        </>} />

      <div className="mb16"><SearchBox value={q} onChange={setQ} placeholder="Kod yoki nom bo‘yicha qidirish…" /></div>

      {CATS.filter((c) => groups.has(c.value)).map((c) => (
        <Card key={c.value} className="mb16">
          <div className="card-head" style={{ padding: '14px 18px 0' }}>
            <h3>{c.label}</h3>
            <Badge tone="gray">{groups.get(c.value)!.length}</Badge>
          </div>
          <div className="table-wrap" style={{ padding: '0 6px 8px' }}>
            <table className="tbl">
              <thead><tr><th>Kod</th><th>Nomi</th><th>Turi</th><th className="num">Balans</th><th /></tr></thead>
              <tbody>
                {groups.get(c.value)!.map((a) => {
                  const bal = accountTotals(a, entries).closing
                  return (
                    <tr key={a.id}>
                      <td className="mono faint">{a.code}</td>
                      <td>
                        <span className="cell-strong">{a.name}</span>
                        {a.partyId && <div className="cell-sub">subsidiya hisobi</div>}
                      </td>
                      <td><Badge tone="gray">{a.type}</Badge></td>
                      <td className="num mono strong" style={{ color: bal >= 0 ? 'var(--ink)' : 'var(--danger)' }}>{fmt(bal)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => openModal(a)} />
                        <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setDeleting(a)} />
                        {can('edit') && <Button size="sm" variant="ghost" onClick={() => { archiveAccount(a.id); toast('success', a.archived ? 'Arxivga olindi' : 'Qayta tiklandi') }}>{a.archived ? 'Tiklash' : 'Arxiv'}</Button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {accounts.length === 0 && <EmptyState icon="fileText" title={t('empty.search')} />}

      <Modal open={creating || !!editing} onClose={closeModal} title={editing ? 'Hisobni tahrirlash' : 'Yangi hisob'} footer={
        <>
          <Button variant="ghost" onClick={closeModal}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={save}>{t('common.save')}</Button>
        </>
      }>
        <div className="form-grid">
          <Field label="Kod"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 7300" /></Field>
          <Field label="Nomi"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Kategoriya"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AccountCategory })}>{CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
          <Field label="Turi"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>{TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
          {!editing && <Field label="Boshlang‘ich balans"><Input type="number" value={form.openingBalance === 0 ? '' : form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) || 0 })} /></Field>}
        </div>
      </Modal>

      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="Hisobni o‘chirish"
        message={<>«{deleting?.name}» hisobini o‘chirishni xohlaysizmi? Agar provodkalar mavjud bo‘lsa, o‘chirib bo‘lmaydi.</>}
        onConfirm={() => { if (deleting) { deleteAccount(deleting.id); toast('success', t('toast.deleted')) } }} />
    </div>
  )
}
