import React, { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Badge } from '../../components/ui'
import { usePeriod, PeriodPicker, ExportMenu } from '../../components/shared'
import { trialBalance, trialBalanced } from '../../engine/ledger'
import { fmtMoney } from '../../lib/money'

export default function TrialBalance() {
  const { state, session, fmt, t, currency, lang } = useStore()
  const cid = session!.companyId
  const { period, preset, setPreset, setCustom } = usePeriod()

  const rows = useMemo(() => trialBalance(state, cid, period.from, period.to), [state, cid, period])
  const balanced = trialBalanced(rows)
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

  return (
    <div>
      <PageHeader title={t('nav.trial')} sub="Aylanma-saldo vedomosti"
        actions={<ExportMenu getRows={() => [['Kod', 'Nomi', 'Debet', 'Kredit', 'Balans'], ...rows.map((r) => [r.account.code, r.account.name, r.debit, r.credit, r.closing])]} filename="trial-balance" />} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <PeriodPicker preset={preset} setPreset={setPreset} setCustom={setCustom} />
        <Badge tone={balanced ? 'green' : 'red'} dot>{balanced ? 'Balansda ✓' : `Farq: ${fmt(totalDebit - totalCredit)}`}</Badge>
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kod</th><th>Hisob</th><th className="num">Boshlang‘ich</th><th className="num">Debet</th><th className="num">Kredit</th><th className="num">Yakuniy</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account.id}>
                  <td className="mono faint">{r.account.code}</td>
                  <td>
                    <span className="cell-strong">{r.account.name}</span>
                    <span className="tiny faint" style={{ marginLeft: 8 }}>{r.account.category}</span>
                  </td>
                  <td className="num mono faint">{r.account.openingBalance ? fmt(r.account.openingBalance) : '—'}</td>
                  <td className="num mono">{r.debit ? fmt(r.debit) : '—'}</td>
                  <td className="num mono">{r.credit ? fmt(r.credit) : '—'}</td>
                  <td className="num mono strong">{fmt(r.closing)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Jami</td>
                <td className="num mono">{fmt(totalDebit)}</td>
                <td className="num mono">{fmt(totalCredit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <div className="tiny faint mt8">Barcha summalar ikki tomonlama buxgalteriya daftaridan olinadi — debet har doim kreditga teng.</div>
    </div>
  )
}
