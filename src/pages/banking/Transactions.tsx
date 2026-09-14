import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, Textarea, useToast, EmptyState } from '../../components/ui'
import { SearchBox, FilterChips, ExportMenu, usePeriod } from '../../components/shared'
import { fmtDate } from '../../lib/money'
import type { BankTxnStatus } from '../../lib/types'

type Filter = 'all' | BankTxnStatus
const STATUS_TONE: Record<BankTxnStatus, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet'> = {
  matched: 'green', potential: 'amber', unmatched: 'red', duplicate: 'violet', mismatch: 'red', ignored: 'gray',
}
const STATUS_LABEL: Record<BankTxnStatus, string> = {
  matched: 'Moslangan', potential: 'Potensial', unmatched: 'Moslanmagan', duplicate: 'Dublikat', mismatch: 'Farqli', ignored: 'E’tiborsiz',
}

export default function Transactions() {
  const { state, session, fmt, t, lang, can, importBankStatement, createFromBank } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [accountId, setAccountId] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState<{ id: string } | null>(null)

  const accounts = state.bankAccounts.filter((b) => b.companyId === cid)
  const activeAccount = accountId || accounts[0]?.glAccountId || ''

  const txns = useMemo(() => state.bankTransactions
    .filter((x) => x.companyId === cid && (!activeAccount || x.bankAccountId === activeAccount))
    .filter((x) => x.date >= period.from && x.date <= period.to)
    .filter((x) => filter === 'all' || x.status === filter)
    .filter((x) => !q || x.description.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [state, cid, activeAccount, period, filter, q])

  const net = txns.reduce((s, x) => s + (x.status === 'ignored' ? 0 : x.amount), 0)

  return (
    <div>
      <PageHeader title={t('nav.banktransactions')} sub={`${txns.length} ta operatsiya · netto ${fmt(net)}`}
        actions={can('create') ? <>
          <Button variant="secondary" icon="upload" onClick={() => setImportOpen(true)}>CSV import</Button>
          <Button variant="primary" icon="plus" onClick={() => setCreateOpen({ id: activeAccount })}>Bankdan yaratish</Button>
        </> : undefined} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <div className="flex wrap" style={{ gap: 10 }}>
          <Select value={activeAccount} onChange={(e) => setAccountId(e.target.value)} style={{ maxWidth: 220 }}>
            {accounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}
          </Select>
          <SearchBox value={q} onChange={setQ} />
        </div>
        <FilterChips<Filter> value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'matched', label: 'Moslangan' },
          { value: 'unmatched', label: 'Moslanmagan' },
          { value: 'potential', label: 'Potensial' },
          { value: 'duplicate', label: 'Dublikat' },
        ]} />
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Sana</th><th>Tavsif</th><th>Holat</th><th className="num">Summa</th><th /></tr></thead>
            <tbody>
              {txns.map((x) => (
                <tr key={x.id}>
                  <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(x.date, lang)}</td>
                  <td><span className="cell-strong">{x.description}</span>{x.counterparty && <div className="cell-sub">{x.counterparty}</div>}</td>
                  <td><Badge tone={STATUS_TONE[x.status]} dot>{STATUS_LABEL[x.status]}</Badge></td>
                  <td className="num mono strong" style={{ color: x.amount >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{x.amount >= 0 ? '+' : ''}{fmt(x.amount)}</td>
                  <td>{x.status === 'unmatched' && <Button size="sm" variant="soft" onClick={() => setCreateOpen({ id: x.id })}>Yaratish</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txns.length === 0 && <EmptyState icon="tag" title="Bank operatsiyalari yo‘q" />}
        </div>
      </Card>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={(rows) => { importBankStatement(activeAccount, rows); setImportOpen(false); toast('success', `${rows.length} ta operatsiya import qilindi`) }} />}
      {createOpen && <CreateFromBank bankTxnId={createOpen.id} onClose={() => setCreateOpen(null)} />}
    </div>
  )
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: { date: string; description: string; amount: number; reference?: string }[]) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const parse = () => {
    const rows: { date: string; description: string; amount: number; reference?: string }[] = []
    for (const raw of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
      // CSV: date,description,amount[,reference]
      const cells = raw.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
      if (cells.length < 3) { setError(`Qator noto‘g‘ri: "${raw}"`); return null }
      const amount = Number(cells[2])
      if (Number.isNaN(amount)) { setError(`Summa noto‘g‘ri: "${cells[2]}"`); return null }
      const iso = cells[0].split('/').reverse().join('-')
      rows.push({ date: iso, description: cells[1], amount: Math.round(amount), reference: cells[3] })
    }
    return rows
  }
  return (
    <Modal open onClose={onClose} title="CSV import" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" onClick={() => { const r = parse(); if (r) onImport(r) }}>Import</Button>
      </>
    }>
      <Field label="CSV matn" hint="Har qatorda: sana,tavsif,summa[,havola] — summa kirim uchun +, chiqim uchun -">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={'2026-09-10,To‘lov,250000\n2026-09-09,Komissiya,-5000'} />
      </Field>
      {error && <div className="badge badge-red">{error}</div>}
      <div className="tiny faint mt8">Import qilingan operatsiyalar «Moslanmagan» holatda qo‘shiladi va Rekonsilyatsiyada moslanadi.</div>
    </Modal>
  )
}

function CreateFromBank({ bankTxnId, onClose }: { bankTxnId: string; onClose: () => void }) {
  const { state, session, createFromBank, matchBankTxn } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const txn = state.bankTransactions.find((x) => x.id === bankTxnId)
  const isNew = txn?.status === 'matched' || !txn
  const incomeAccounts = state.accounts.filter((a) => a.companyId === cid && (a.category === 'Revenue' || a.category === 'OtherIncome'))
  const expenseAccounts = state.accounts.filter((a) => a.companyId === cid && (a.category === 'OperatingExpense' || a.category === 'CostOfGoodsSold' || a.category === 'OtherExpense'))
  const [income, setIncome] = useState((txn?.amount ?? 0) >= 0)
  const [accountId, setAccountId] = useState(income ? incomeAccounts[0]?.id ?? '' : expenseAccounts[0]?.id ?? '')
  const [desc, setDesc] = useState(txn?.description ?? '')

  if (!txn) return null
  const submit = () => {
    if (!accountId) { toast('error', 'Hisobni tanlang'); return }
    createFromBank(bankTxnId, { income, accountId, description: desc })
    toast('success', 'Provodka yaratildi va moslandi')
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Bankdan provodka yaratish" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" onClick={submit}>Yaratish</Button>
      </>
    }>
      <div className="small muted mb16">{txn.description} · {txn.date}</div>
      <div className="form-grid">
        <Field label="Turi"><Select value={income ? 'in' : 'out'} onChange={(e) => { const v = e.target.value === 'in'; setIncome(v); setAccountId(v ? incomeAccounts[0]?.id ?? '' : expenseAccounts[0]?.id ?? '') }}><option value="in">Kirim (daromad)</option><option value="out">Chiqim (xarajat)</option></Select></Field>
        <Field label="Hisob"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{(income ? incomeAccounts : expenseAccounts).map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</Select></Field>
        <Field label="Tavsif" className="full"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
