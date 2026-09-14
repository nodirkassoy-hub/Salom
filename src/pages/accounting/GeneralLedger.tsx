import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Select, Badge, EmptyState, Button } from '../../components/ui'
import { usePeriod, ExportMenu } from '../../components/shared'
import { EntryDetailModal } from '../../components/entry'
import { accountTotals } from '../../engine/ledger'
import { entriesForAccount } from '../../engine/selectors'
import { fmtDate } from '../../lib/money'
import type { JournalEntry } from '../../lib/types'

export default function GeneralLedger() {
  const { state, session, fmt, t, lang } = useStore()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [accountId, setAccountId] = useState('')
  const [detail, setDetail] = useState<JournalEntry | null>(null)

  const accounts = useMemo(() => state.accounts
    .filter((a) => a.companyId === cid && !a.archived)
    .sort((a, b) => a.code.localeCompare(b.code)), [state, cid])

  const account = accounts.find((a) => a.id === accountId)
  const entries = useMemo(() => accountId ? entriesForAccount(state, cid, accountId, period.from, period.to) : [], [state, cid, accountId, period])

  const rows = useMemo(() => {
    let running = account ? accountTotals(account, entriesForAccount(state, cid, accountId, undefined, period.from ? subDay(period.from) : undefined)).closing : 0
    return entries.map((e) => {
      const line = e.lines.find((l) => l.accountId === accountId)!
      const delta = (line.debit || 0) - (line.credit || 0)
      const sign = account?.normalBalance === 'credit' ? -1 : 1
      running = running + delta * sign
      return { entry: e, line, delta: delta * sign, running }
    })
  }, [entries, account, accountId, state, cid, period])

  return (
    <div>
      <PageHeader title={t('nav.ledger')} sub="Hisob bo‘yicha harakatlar va yig‘ilib boruvchi balans"
        actions={<ExportMenu getRows={() => [['Sana', 'Tavsif', 'Debet', 'Kredit', 'Balans'], ...rows.map((r) => [r.entry.date, r.entry.description, r.line.debit, r.line.credit, r.running])]} filename={`ledger-${account?.code ?? 'all'}`} />} />

      <Card pad className="mb16">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">— Hisobni tanlang —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
        </Select>
      </Card>

      {account ? (
        <Card>
          <div className="flex between" style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="strong" style={{ fontSize: 15 }}>{account.code} · {account.name}</div>
              <div className="tiny muted">{account.category} · {account.type}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted">Yakuniy balans</div>
              <div className="mono strong" style={{ fontSize: 17 }}>{fmt(accountTotals(account, entriesForAccount(state, cid, accountId)).closing)}</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl clickable">
              <thead><tr><th>Sana</th><th>Raqam</th><th>Tavsif</th><th className="num">Debet</th><th className="num">Kredit</th><th className="num">Balans</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.entry.id} onClick={() => setDetail(r.entry)}>
                    <td className="faint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.entry.date, lang)}</td>
                    <td className="mono faint">{r.entry.number}</td>
                    <td className="cell-strong">{r.entry.description}</td>
                    <td className="num mono">{r.line.debit ? fmt(r.line.debit) : '—'}</td>
                    <td className="num mono">{r.line.credit ? fmt(r.line.credit) : '—'}</td>
                    <td className="num mono strong" style={{ color: r.running < 0 ? 'var(--danger)' : undefined }}>{fmt(r.running)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <EmptyState icon="clock" title="Bu davrda harakat yo‘q" />}
          </div>
        </Card>
      ) : (
        <Card><EmptyState icon="clock" title="Hisobni tanlang" desc="Harakatlarni ko‘rish uchun yuqoridan hisobni tanlang." /></Card>
      )}

      {detail && <EntryDetailModal entry={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function subDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
