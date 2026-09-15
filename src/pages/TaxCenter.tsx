import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHeader, Card, Badge, Button, CardHead } from '../components/ui'
import { accountTotals } from '../engine/ledger'
import { todayISO, fmtDate, addDays } from '../lib/money'

export default function TaxCenter() {
  const { state, session, fmt, t, markTaxPaid, company } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const ym = todayISO().slice(0, 7)

  const vatPayable = Math.abs(accountTotals(state.accounts.find((a) => a.companyId === cid && a.code === '2200')!, state.entries.filter((e) => e.companyId === cid)).closing)
  const vatInput = Math.abs(accountTotals(state.accounts.find((a) => a.companyId === cid && a.code === '1250')!, state.entries.filter((e) => e.companyId === cid)).closing)
  const payrollTax = Math.abs(accountTotals(state.accounts.find((a) => a.companyId === cid && a.code === '2300')!, state.entries.filter((e) => e.companyId === cid)).closing)

  const calendar = useMemo(() => {
    const events = state.taxLiabilities.filter((x) => x.companyId === cid && x.status === 'pending')
      .map((x) => ({ date: x.dueDate, label: `${x.name}: ${fmt(x.amount)}`, id: x.id }))
    // monthly VAT deadline (20th of next month) as a reference event
    const next = addDays(todayISO(), 20)
    events.push({ date: next, label: 'QQS deklaratsiyasi (taxminiy muddat)', id: 'ref_vat' })
    return events.sort((a, b) => a.date.localeCompare(b.date))
  }, [state.taxLiabilities, cid, fmt, todayISO()])

  const liabilities = state.taxLiabilities.filter((x) => x.companyId === cid)

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.taxcenter')} sub="O‘zbekiston soliq rejimi — indikativ" actions={<Button variant="secondary" icon="file" onClick={() => navigate('/documents/all')}>Soliq hujjatlari</Button>} />

      <div className="grid grid-3 mb16">
        <Card pad><div className="stat-label">QQS majburiyati (12%)</div><div className="stat-value mono">{fmt(vatPayable)}</div><div className="small muted">Kiruvchi QQS: {fmt(vatInput)}</div></Card>
        <Card pad><div className="stat-label">Ish haqi soliqlari</div><div className="stat-value mono">{fmt(payrollTax)}</div></Card>
        <Card pad><div className="stat-label">Foyda solig‘i (baholangan)</div><div className="stat-value mono">{fmt(company ? 4500000 : 0)}</div><div className="small muted">Indikativ</div></Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card pad>
          <CardHead title="Soliq taqvimi" sub="Kutilayotgan muddatlar" />
          {calendar.map((c, i) => (
            <div key={i} className="flex between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex"><span className="pill">{fmtDate(c.date)}</span><span style={{ fontSize: 13 }}>{c.label}</span></div>
              <Badge tone={c.date <= addDays(todayISO(), 7) ? 'red' : 'amber'}>{c.date <= addDays(todayISO(), 7) ? 'yaqin' : 'kutilmoqda'}</Badge>
            </div>
          ))}
        </Card>
        <Card pad>
          <CardHead title="Soliq majburiyatlari" />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Nom</th><th>Davr</th><th>Muddat</th><th>Summa</th><th /></tr></thead>
              <tbody>
                {liabilities.map((x) => (
                  <tr key={x.id}>
                    <td className="cell-strong">{x.name}</td>
                    <td className="cell-muted">{x.period}</td>
                    <td className="cell-muted">{fmtDate(x.dueDate)}</td>
                    <td className="num mono">{fmt(x.amount)}</td>
                    <td>{x.status === 'paid' ? <Badge tone="green">to‘langan</Badge> : <Button size="sm" variant="secondary" onClick={() => markTaxPaid(x.id)}>To‘lash</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card pad className="mt16">
        <div className="small muted" style={{ lineHeight: 1.7 }}>
          <strong>⚠ Muhim:</strong> BUXAI "100% qonuniy muvofiqlik"ni da’vo qilmaydi. Soliq stavkalari (QQS 12%, aylanma soliq 4%) kompaniya sozlamalarida saqlanadi va o‘zgarishi mumkin. AI soliq/huquqiy javob berganda manbaga ishora qilinadi; noaniq holatlarda <em>"tekshiruv talab qilinadi"</em> deb aniq ko‘rsatiladi. Yakuniy qaror uchun soliq maslahatchisiga murojaat qiling.
        </div>
      </Card>
    </div>
  )
}
