import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { PageHeader, Card, CardHead, Badge, Button, Segmented, Progress, EmptyState } from '../../components/ui'
import { I } from '../../components/icons'
import { ForecastChart } from '../../components/charts'
import { answerAccountant, cfoAnalysis, QUICK_QUESTIONS, CFOAnalysis } from '../../engine/ai'
import { forecastCash } from '../../engine/forecast'
import { severityRank } from '../../engine/radar'
import { severityMeta } from '../../components/shared'
import { fmtMoney, fmtDate } from '../../lib/money'
import type { RadarAlert } from '../../lib/types'

// ============ AI Accountant ============
export function AIAccountant() {
  const { state, session, lang, currency, fmt, t } = useStore()
  const cid = session!.companyId
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string; answer?: any }[]>([
    { role: 'ai', text: 'Salom! Men BUXAI AI Buxgalter. Real hisob ma’lumotlaridan foydalanib savollaringizga javob beraman. Misol: “Bu oyda qancha foyda qildik?”' },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const ask = (q: string) => {
    if (!q.trim()) return
    const answer = answerAccountant(state, cid, q, lang, currency)
    setMsgs((prev) => [...prev, { role: 'user', text: q }, { role: 'ai', text: '', answer }])
    setInput('')
  }

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.aiaccountant')} sub="Real BUXAI ma’lumotlari bilan ishlaydi — hech qachon raqam o‘ylab topmaydi" />
      <Card style={{ height: 'calc(100vh - 220px)', minHeight: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
              {m.answer ? (
                <div className="msg-bubble" style={{ maxWidth: 640 }}>
                  <div className="strong" style={{ marginBottom: 6 }}>{m.answer.title}</div>
                  {m.answer.paragraphs?.map((p: string, j: number) => <div key={j} style={{ marginBottom: 4 }}>{p}</div>)}
                  {m.answer.table && (
                    <div className="table-wrap mt8" style={{ background: '#fff', borderRadius: 10, padding: 8 }}>
                      <table className="tbl">
                        <thead><tr>{m.answer.table.columns.map((c: string, j: number) => <th key={j}>{c}</th>)}</tr></thead>
                        <tbody>{m.answer.table.rows.map((r: any[], j: number) => <tr key={j}>{r.map((cell, k) => <td key={k} className="num mono">{cell}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  {m.answer.transactions?.length ? (
                    <div className="mt8" style={{ fontSize: 12 }}>
                      {m.answer.transactions.map((tr: any, j: number) => (
                        <div key={j} className="flex between" style={{ padding: '3px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span>{tr.ref} · {tr.description}</span><span className="mono">{fmt(tr.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {m.answer.refRoute && (
                    <button className="btn btn-sm btn-secondary mt8" onClick={() => navigate(m.answer.refRoute)}>{m.answer.refLabel} →</button>
                  )}
                  {m.answer.disclaimer && <div className="mt8" style={{ fontSize: 11, opacity: 0.8 }}>{t('ai.disclaimer')}</div>}
                </div>
              ) : (
                <div className="msg-bubble">{m.text}</div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(input)} placeholder={t('ai.placeholder')} />
          <Button variant="primary" icon="send" onClick={() => ask(input)}>Jo‘natish</Button>
        </div>
        <div className="flex wrap" style={{ padding: '0 16px 14px', gap: 8 }}>
          {QUICK_QUESTIONS[lang].slice(0, 5).map((qq) => (
            <button key={qq} className="btn btn-sm btn-soft" onClick={() => ask(qq)}>{qq}</button>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ============ AI CFO ============
function Gauge({ value, size = 130 }: { value: number; size?: number }) {
  const r = (size - 20) / 2
  const c = 2 * Math.PI * r
  const off = c - (value / 100) * c
  const color = value >= 65 ? 'var(--primary)' : value >= 45 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="gauge" style={{ width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="gauge-center"><div className="gauge-num" style={{ fontSize: size * 0.2 }}>{value}</div></div>
    </div>
  )
}

function InsightList({ title, items, tone }: { title: string; items: CFOAnalysis['insights']; tone: 'green' | 'red' | 'amber' | 'blue' }) {
  return (
    <Card pad>
      <div className="card-title mb8">{title}</div>
      {items.length === 0 ? <div className="small muted">Yo‘q</div> : items.map((it, i) => (
        <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="flex between"><span className="strong" style={{ fontSize: 13 }}>{it.title}</span></div>
          <div className="small muted" style={{ marginTop: 3 }}>{it.detail}</div>
          {it.evidence && <div className="small mono" style={{ marginTop: 3, color: 'var(--primary-ink)' }}>{it.evidence}</div>}
        </div>
      ))}
    </Card>
  )
}

export function AICFO() {
  const { state, session, lang, currency, fmt, t } = useStore()
  const cid = session!.companyId
  const a = useMemo(() => cfoAnalysis(state, cid, lang, currency), [state, cid, lang, currency])
  const fc = forecastCash(state, cid, 90)

  const pct = (v: number | null) => v === null || !isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.aicfo')} sub={t('ai.cfo.subtitle')} />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card pad>
          <div className="flex" style={{ gap: 16 }}>
            <Gauge value={a.score} />
            <div style={{ flex: 1 }}>
              <div className="stat-label">{t('ai.health')}</div>
              <div className="strong" style={{ fontSize: 18 }}>{a.score}/100</div>
              <div className="small muted">{a.scoreLabel}</div>
            </div>
          </div>
        </Card>
        <Card pad>
          <div className="stat-label">{t('ai.runway')}</div>
          <div className="strong" style={{ fontSize: 22 }}>{a.runwayMonths >= 999 ? '∞' : `${a.runwayMonths} oy`}</div>
          <div className="small muted">Joriy xarajat tezligi bilan</div>
          <div className="divider" />
          <div className="flex between small"><span className="muted">Naqd pul</span><span className="mono strong">{fmt(a.cash)}</span></div>
          <div className="flex between small"><span className="muted">Sof foyda</span><span className="mono strong" style={{ color: a.netProfit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(a.netProfit)}</span></div>
        </Card>
        <Card pad>
          <div className="stat-label">{t('ai.margin')}</div>
          <div className="strong" style={{ fontSize: 22 }}>{a.margin.toFixed(1)}%</div>
          <div className="small muted">Daromad: {fmt(a.revenue)}</div>
          <div className="divider" />
          <div className="flex between small"><span className="muted">Daromad o‘sishi</span><span className="mono strong" style={{ color: (a.revenueGrowth ?? 0) >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{pct(a.revenueGrowth)}</span></div>
          <div className="flex between small"><span className="muted">Xarajat o‘sishi</span><span className="mono strong" style={{ color: (a.expenseGrowth ?? 0) <= 0 ? 'var(--primary)' : 'var(--danger)' }}>{pct(a.expenseGrowth)}</span></div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <InsightList title={t('ai.insights')} items={a.insights} tone="blue" />
        <InsightList title={t('ai.risks')} items={a.risks} tone="red" />
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InsightList title={t('ai.recommendations')} items={a.recommendations} tone="green" />
        <InsightList title={t('ai.opportunities')} items={a.opportunities} tone="amber" />
      </div>

      <Card pad className="mt16">
        <CardHead title={t('ai.forecast')} sub="90 kunlik kassa prognozi (real rejalashtirilgan to‘lovlar asosida)" />
        <ForecastChart data={fc.points.map((p) => ({ label: p.label, inflow: p.inflow, outflow: p.outflow, balance: p.balance }))} currency={currency} lang={lang} height={260} />
        <div className="small muted mt16">{t('ai.disclaimer')}</div>
      </Card>
    </div>
  )
}

// ============ Advisor ============
export function Advisor() {
  const { state, session, lang, currency, fmt, t } = useStore()
  const cid = session!.companyId
  const a = useMemo(() => cfoAnalysis(state, cid, lang, currency), [state, cid, lang, currency])
  const fc = forecastCash(state, cid, 90)
  return (
    <div className="anim-in">
      <PageHeader title={t('nav.advisor')} sub="Biznes maslahatchi — strategik xulosalar va prognoz" />
      <div className="grid grid-3 mb16">
        <Card pad><div className="stat-label">{t('ai.health')}</div><div className="stat-value mono" style={{ color: 'var(--primary)' }}>{a.score}/100</div></Card>
        <Card pad><div className="stat-label">{t('ai.runway')}</div><div className="stat-value mono">{a.runwayMonths >= 999 ? '∞' : a.runwayMonths + ' oy'}</div></Card>
        <Card pad><div className="stat-label">90 kunlik yakuniy kassa</div><div className="stat-value mono" style={{ color: fc.points[fc.points.length - 1].balance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(fc.points[fc.points.length - 1].balance)}</div></Card>
      </div>
      <Card pad>
        <CardHead title="Strategik tavsiyalar" />
        <div className="grid grid-2">
          {a.recommendations.slice(0, 4).map((r, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="strong" style={{ fontSize: 13 }}>{r.title}</div>
              <div className="small muted mt8">{r.detail}</div>
            </div>
          ))}
        </div>
        <div className="small muted mt16" style={{ lineHeight: 1.7 }}>
          <strong>{t('ai.verify')}:</strong> {t('ai.disclaimer')} Soliq va huquqiy tavsiyalar bo‘yicha yakuniy qarorni mutaxassis bilan tekshiring.
        </div>
      </Card>
    </div>
  )
}

// ============ Xato Radar ============
export function XatoRadar() {
  const { state, session, fmt, fmtDate, t, setAlertStatus } = useStore()
  const cid = session!.companyId
  const [filter, setFilter] = useState<'open' | 'all' | 'resolved'>('open')
  const [openId, setOpenId] = useState<string | null>(null)

  const alerts = useMemo(() => {
    const all = state.alerts.filter((a) => a.companyId === cid)
    const byStatus = filter === 'open' ? all.filter((a) => a.status === 'open' || a.status === 'reviewed') : filter === 'resolved' ? all.filter((a) => a.status === 'fixed' || a.status === 'ignored') : all
    return byStatus.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
  }, [state.alerts, cid, filter])

  const counts = {
    critical: state.alerts.filter((a) => a.companyId === cid && a.severity === 'critical' && (a.status === 'open' || a.status === 'reviewed')).length,
    high: state.alerts.filter((a) => a.companyId === cid && a.severity === 'high' && (a.status === 'open' || a.status === 'reviewed')).length,
    open: state.alerts.filter((a) => a.companyId === cid && (a.status === 'open' || a.status === 'reviewed')).length,
    resolved: state.alerts.filter((a) => a.companyId === cid && (a.status === 'fixed' || a.status === 'ignored')).length,
  }

  return (
    <div className="anim-in">
      <PageHeader title={t('radar.title')} sub={t('radar.subtitle')} />
      <div className="grid grid-4 mb16">
        <Card pad><div className="stat-label">Critical</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{counts.critical}</div></Card>
        <Card pad><div className="stat-label">High</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{counts.high}</div></Card>
        <Card pad><div className="stat-label">Ochiq</div><div className="stat-value">{counts.open}</div></Card>
        <Card pad><div className="stat-label">Hal qilingan</div><div className="stat-value" style={{ color: 'var(--primary)' }}>{counts.resolved}</div></Card>
      </div>

      <div className="flex mb16">
        <Segmented<'open' | 'all' | 'resolved'> value={filter} onChange={setFilter} options={[
          { value: 'open', label: `${t('radar.open')} (${counts.open})` },
          { value: 'all', label: t('radar.all') },
          { value: 'resolved', label: `${t('radar.resolved')} (${counts.resolved})` },
        ]} />
      </div>

      {alerts.length === 0 ? (
        <Card><EmptyState icon="radar" title={t('empty.alerts')} desc={t('empty.alertsDesc')} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map((a) => {
            const sm = severityMeta(a.severity)
            const open = openId === a.id
            return (
              <div key={a.id} className={`alert-card sev-${a.severity}`}>
                <div className="alert-head">
                  <div className="grow">
                    <div className="flex wrap">
                      <span className="strong" style={{ fontSize: 14 }}>{a.title}</span>
                      <Badge tone={sm.tone} dot>{a.severity}</Badge>
                      <Badge tone={a.status === 'fixed' ? 'green' : a.status === 'ignored' ? 'gray' : a.status === 'reviewed' ? 'blue' : 'amber'}>{a.status}</Badge>
                    </div>
                    <div className="small muted mt8">{a.what}</div>
                  </div>
                  <div className="flex" style={{ alignItems: 'flex-end', flexDirection: 'column', gap: 6 }}>
                    <Badge tone="violet">{t('radar.confidence')}: {a.confidence}%</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(open ? null : a.id)}>{open ? 'Yopish' : 'Batafsil'}</Button>
                  </div>
                </div>
                {open && (
                  <div className="anim-in mt16" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div className="grid grid-2">
                      <div><div className="small faint strong" style={{ fontSize: 10 }}>{t('radar.what')}</div><div className="small mt8">{a.what}</div></div>
                      <div><div className="small faint strong" style={{ fontSize: 10 }}>{t('radar.why')}</div><div className="small mt8">{a.why}</div></div>
                      <div><div className="small faint strong" style={{ fontSize: 10 }}>{t('radar.impact')}</div><div className="small mt8 mono strong" style={{ color: 'var(--danger)' }}>{fmt(a.impact)}</div></div>
                      <div><div className="small faint strong" style={{ fontSize: 10 }}>{t('radar.fix')}</div><div className="small mt8">{a.fix}</div></div>
                    </div>
                    <div className="flex mt16" style={{ gap: 8 }}>
                      <Button size="sm" variant="secondary" icon="eye" onClick={() => setAlertStatus(a.id, 'reviewed')}>{t('radar.review')}</Button>
                      <Button size="sm" variant="primary" icon="check" onClick={() => setAlertStatus(a.id, 'fixed')}>{t('radar.markFixed')}</Button>
                      <Button size="sm" variant="soft-danger" icon="x" onClick={() => setAlertStatus(a.id, 'ignored')}>{t('radar.ignore')}</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
