import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHeader, Card, EmptyState, Badge, Button } from '../components/ui'
import { fmtDate } from '../lib/money'

export default function NotificationsPage() {
  const { state, session, t, markNotifRead, markAllNotifRead } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const items = state.notifications.filter((n) => n.companyId === cid).sort((a, b) => b.createdAt - a.createdAt)
  const unread = items.filter((n) => !n.read).length
  const sev = (s: string) => s === 'critical' ? 'red' : s === 'warning' ? 'amber' : s === 'success' ? 'green' : 'blue'

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.notifications')} sub={`${unread} o‘qilmagan`} actions={<Button variant="secondary" onClick={() => markAllNotifRead()}>Hammasini o‘qildi deb belgilash</Button>} />
      <Card>
        {items.length === 0 ? <EmptyState icon="bell" title={t('empty.notifications')} /> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((n) => (
              <div key={n.id} className="flex between" style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.read ? undefined : 'var(--primary-soft)' }}
                onClick={() => { markNotifRead(n.id); if (n.route) navigate(n.route) }}>
                <div className="flex">
                  <Badge tone={sev(n.severity) as any} dot />
                  <div>
                    <div className="strong" style={{ fontSize: 13 }}>{n.message}</div>
                    <div className="small muted">{fmtDate(new Date(n.createdAt).toISOString().slice(0, 10))}</div>
                  </div>
                </div>
                {!n.read && <Badge tone="green">yangi</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
