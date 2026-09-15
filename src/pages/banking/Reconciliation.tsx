import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Select, Progress, useToast, Modal, Field, Input, EmptyState } from '../../components/ui'
import { reconciliation } from '../../engine/reconcile'
import { entryTotals } from '../../engine/ledger'
import { fmtDate } from '../../lib/money'
import type { BankTxnStatus } from '../../lib/types'

const STATUS_TONE: Record<BankTxnStatus, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet'> = {
  matched: 'green', potential: 'amber', unmatched: 'red', duplicate: 'violet', mismatch: 'red', ignored: 'gray',
}
const STATUS_LABEL: Record<BankTxnStatus, string> = {
  matched: 'Moslangan', potential: 'Potensial', unmatched: 'Moslanmagan', duplicate: 'Dublikat', mismatch: 'Farqli', ignored: 'E’tiborsiz',
}

export default function Reconciliation() {
  const { state, session, fmt, t, lang, can, matchBankTxn, ignoreBankTxn, createFromBank, splitBankTxn } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const accounts = state.bankAccounts.filter((b) => b.companyId === cid)
  const [accountId, setAccountId] = useState(accounts[0]?.glAccountId ?? '')
  const [splitTxn, setSplitTxn] = useState<string | null>(null)
  const [splitAmount, setSplitAmount] = useState('')

  const rec = useMemo(() => (accountId ? reconciliation(state, cid, accountId) : null), [state, cid, accountId])

  const summary = rec
  const diff = summary?.difference ?? 0

  return (
    <div>
      <PageHeader title={t('nav.reconciliation')} sub="Bank ko‘chirmasi bilan buxgalteriya daftarini solishtirish" />

      <Card pad className="mb16">
        <div className="flex between wrap" style={{ gap: 12 }}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ maxWidth: 280 }}>
            {accounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}
          </Select>
          {summary && (
            <div className="flex" style={{ gap: 18 }}>
              <div><div className="tiny muted">Ko‘chirma</div><div className="mono strong">{fmt(summary.statementTotal)}</div></div>
              <div><div className="tiny muted">Daftar</div><div className="mono strong">{fmt(summary.ledgerTotal)}</div></div>
              <div><div className="tiny muted">Farq</div><div className="mono strong" style={{ color: Math.abs(diff) < 0.5 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(diff)}</div></div>
              <div style={{ minWidth: 140 }}><div className="tiny muted mb8">Moslangan {summary.matched}/{summary.total}</div><Progress value={summary.pct} tone={summary.pct === 100 ? 'green' : 'warn'} /></div>
            </div>
          )}
        </div>
      </Card>

      {summary && summary.items.length > 0 ? (
        <Card>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Sana</th><th>Tavsif</th><th className="num">Summa</th><th>Holat</th><th>Taklif</th><th /></tr></thead>
              <tbody>
                {summary.items.map((it) => {
                  const b = it.bank
                  return (
                    <tr key={b.id}>
                      <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(b.date, lang)}</td>
                      <td><span className="cell-strong">{b.description}</span></td>
                      <td className="num mono strong" style={{ color: b.amount >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{b.amount >= 0 ? '+' : ''}{fmt(b.amount)}</td>
                      <td><Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}</Badge></td>
                      <td className="small muted ellipsis" style={{ maxWidth: 200 }}>
                        {b.status === 'matched' ? '—' : it.suggestion ? `${it.suggestion.entry.number} (${it.suggestion.reason}, ${it.suggestion.score}%)` : 'mos keluvchi yo‘q'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {b.status === 'unmatched' && (
                          <>
                            {it.suggestion && <Button size="sm" variant="soft" icon="check" onClick={() => { matchBankTxn(b.id, it.suggestion!.entry.id); toast('success', 'Moslandi') }}>Moslash</Button>}
                            <Button size="sm" variant="ghost" icon="plus" onClick={() => { createFromBank(b.id, { income: b.amount >= 0, accountId: b.amount >= 0 ? state.accounts.find((a) => a.companyId === cid && a.category === 'Revenue')?.id ?? '' : state.accounts.find((a) => a.companyId === cid && a.category === 'OperatingExpense')?.id ?? '', description: b.description }); toast('success', 'Yaratildi va moslandi') }}>Yaratish</Button>
                            <Button size="sm" variant="ghost" icon="edit" onClick={() => { setSplitTxn(b.id); setSplitAmount(String(Math.abs(b.amount) / 2)) }}>Bo‘lish</Button>
                            <Button size="sm" variant="ghost" icon="eye" onClick={() => { ignoreBankTxn(b.id); toast('info', 'E’tiborsiz qilindi') }}>E’tiborsiz</Button>
                          </>
                        )}
                        {b.status === 'duplicate' && <Button size="sm" variant="ghost" icon="eye" onClick={() => { ignoreBankTxn(b.id); toast('info', 'Dublikat e’tiborsiz qilindi') }}>E’tiborsiz</Button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card><EmptyState icon="checkCircle" title="Operatsiyalar yo‘q" /></Card>
      )}

      <Modal open={!!splitTxn} onClose={() => setSplitTxn(null)} title="Operatsiyani bo‘lish" footer={
        <>
          <Button variant="ghost" onClick={() => setSplitTxn(null)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!splitAmount} onClick={() => { if (splitTxn) { splitBankTxn(splitTxn, Math.round(Number(splitAmount))); setSplitTxn(null); toast('success', 'Bo‘lindi') } }}>Bo‘lish</Button>
        </>
      }>
        <Field label="Birinchi qism summasi"><Input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} /></Field>
        <div className="tiny muted">Qolgan summa alohida «Moslanmagan» operatsiya sifatida qo‘shiladi.</div>
      </Modal>
    </div>
  )
}
