import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState } from '../../components/ui'
import { Icon } from '../../components/icons'
import { accountTotals } from '../../engine/ledger'
import { todayISO } from '../../lib/money'
import type { BankAccountType, Currency } from '../../lib/types'

const TYPE_LABEL: Record<BankAccountType, string> = { bank: 'Bank', cash: 'Kassa', card: 'Karta', deposit: 'Depozit' }

export default function Accounts() {
  const { state, session, fmt, t, can, createBankAccount, createManualEntry } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [creating, setCreating] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const accounts = state.bankAccounts.filter((b) => b.companyId === cid)
  const totalBalance = accounts.reduce((s, b) => {
    const acc = state.accounts.find((a) => a.id === b.glAccountId)
    return s + (acc ? accountTotals(acc, state.entries).closing : 0)
  }, 0)

  return (
    <div>
      <PageHeader title={t('nav.bankaccounts')} sub={`${accounts.length} ta hisob · jami ${fmt(totalBalance)}`}
        actions={can('create') ? <>
          <Button variant="secondary" icon="refresh" onClick={() => setTransferOpen(true)}>Ichki o‘tkazma</Button>
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi hisob</Button>
        </> : undefined} />

      <div className="grid grid-3">
        {accounts.map((b) => {
          const acc = state.accounts.find((a) => a.id === b.glAccountId)!
          const bal = accountTotals(acc, state.entries).closing
          return (
            <Card pad hover key={b.id}>
              <div className="flex between">
                <span className="kpi-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}><Icon name={b.type === 'cash' ? 'wallet' : 'bank'} size={16} /></span>
                <Badge tone={b.type === 'cash' ? 'amber' : 'blue'}>{TYPE_LABEL[b.type]}</Badge>
              </div>
              <div className="strong mt8" style={{ fontSize: 15 }}>{b.name}</div>
              <div className="tiny muted">{b.bankName ?? ''} {b.accountNo ?? ''}</div>
              <div className="mono strong mt16" style={{ fontSize: 20 }}>{fmt(bal)}</div>
              <div className="tiny muted mt8">{b.currency}</div>
            </Card>
          )
        })}
      </div>
      {accounts.length === 0 && <Card><EmptyState icon="bank" title="Bank hisoblari yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} /></Card>}

      {creating && <CreateAccountModal onClose={() => setCreating(false)} onCreate={(b) => { createBankAccount(b); setCreating(false); toast('success', t('toast.created')) }} />}
      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} onDone={(lines, desc) => { createManualEntry({ date: todayISO(), description: desc, lines }); setTransferOpen(false); toast('success', 'O‘tkazma amalga oshirildi') }} />}
    </div>
  )
}

function CreateAccountModal({ onClose, onCreate }: { onClose: () => void; onCreate: (b: { name: string; type: BankAccountType; bankName?: string; accountNo?: string; currency: Currency; openingBalance: number }) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BankAccountType>('bank')
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [currency, setCurrency] = useState<Currency>('UZS')
  const [opening, setOpening] = useState('')
  return (
    <Modal open onClose={onClose} title="Yangi bank hisobi" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), type, bankName, accountNo, currency, openingBalance: Number(opening) || 0 })}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Turi"><Select value={type} onChange={(e) => setType(e.target.value as BankAccountType)}><option value="bank">Bank</option><option value="cash">Kassa</option><option value="card">Karta</option><option value="deposit">Depozit</option></Select></Field>
        <Field label="Bank"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
        <Field label="Hisob raqam"><Input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} /></Field>
        <Field label="Valyuta"><Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option value="UZS">UZS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="RUB">RUB</option></Select></Field>
        <Field label="Boshlang‘ich balans"><Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function TransferModal({ onClose, onDone }: { onClose: () => void; onDone: (lines: { accountId: string; debit: number; credit: number }[], desc: string) => void }) {
  const { state, session, fmt } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const accounts = state.bankAccounts.filter((b) => b.companyId === cid)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('Ichki o‘tkazma')

  const submit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) { toast('error', 'Summani kiriting'); return }
    if (!from || !to || from === to) { toast('error', 'Hisoblarni to‘g‘ri tanlang'); return }
    onDone([
      { accountId: to, debit: Math.round(amt), credit: 0 },
      { accountId: from, debit: 0, credit: Math.round(amt) },
    ], desc)
  }

  return (
    <Modal open onClose={onClose} title="Ichki o‘tkazma" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" onClick={submit}>O‘tkazish</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Qaysi hisobdan"><Select value={from} onChange={(e) => setFrom(e.target.value)}><option value="">—</option>{accounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
        <Field label="Qaysi hisobga"><Select value={to} onChange={(e) => setTo(e.target.value)}><option value="">—</option>{accounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
        <Field label="Summa (so‘m)" className="full"><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Tavsif" className="full"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      </div>
      <div className="tiny faint">O‘tkazma Debet (qabul qiluvchi) = Kredit (yuboruvchi) prinsipida ikki tomonlama provodka qilinadi.</div>
    </Modal>
  )
}
