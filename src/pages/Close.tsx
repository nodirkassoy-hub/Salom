import React, { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Card, Badge, Button, Progress, useToast } from '../components/ui'
import { I } from '../components/icons'
import { closeChecklist } from '../engine/close'
import { monthLabel } from '../lib/money'
import { todayISO } from '../lib/money'

export default function MonthEndClose() {
  const { state, session, t, fmt } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const result = closeChecklist(state, cid)
  const [approved, setApproved] = useState(false)
  const ym = todayISO().slice(0, 7)

  return (
    <div className="anim-in">
      <PageHeader title={t('close.title')} sub={`${monthLabel(ym, 'uz')} — ${result.done}/${result.total} bajarildi`} />
      <Card pad className="mb16">
        <div className="flex between mb16">
          <div className="strong">{t('close.progress')}: {result.done}/{result.total} ({result.pct}%)</div>
          {result.canClose && !approved ? <Button variant="primary" icon="check" onClick={() => { setApproved(true); toast('success', t('close.approved')) }}>{t('close.approve')}</Button>
            : result.canClose && approved ? <Badge tone="green" dot>{t('close.approved')}</Badge>
            : <Badge tone="red" dot>{t('close.blocked')}</Badge>}
        </div>
        <Progress value={result.pct} tone={result.canClose ? 'green' : 'danger'} />
      </Card>

      <Card>
        <div style={{ padding: 8 }}>
          {result.items.map((item) => (
            <div key={item.id} className="flex between" style={{ padding: '13px 8px', borderBottom: '1px solid var(--border)' }}>
              <div className="flex" style={{ gap: 12 }}>
                {item.status === 'done' ? <I.checkCircle size={20} style={{ color: 'var(--primary)' }} />
                  : item.status === 'blocked' ? <I.alert size={20} style={{ color: 'var(--danger)' }} />
                  : <I.clock size={20} style={{ color: 'var(--faint)' }} />}
                <div>
                  <div className="strong" style={{ fontSize: 13.5 }}>{item.label}</div>
                  <div className="small muted">{item.detail}</div>
                </div>
              </div>
              <Badge tone={item.status === 'done' ? 'green' : item.status === 'blocked' ? 'red' : 'gray'}>
                {item.status === 'done' ? 'Bajarildi' : item.status === 'blocked' ? 'Kritik' : 'Kutilmoqda'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {!result.canClose && (
        <Card pad className="mt16" style={{ borderColor: 'var(--danger)' }}>
          <div className="strong" style={{ color: 'var(--danger)' }}>⚠ Oy yakunini tasdiqlash mumkin emas</div>
          <div className="small muted mt8">Kritik buxgalteriya nomuvofiqliklari mavjud ({result.criticalCount} ta). Ular bartaraf etilmaguncha oy yopilmaydi — bu barcha hisobotlarning ishonchliligini ta’minlaydi.</div>
        </Card>
      )}
    </div>
  )
}
