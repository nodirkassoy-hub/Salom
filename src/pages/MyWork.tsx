import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHeader, Card, Badge, Button, Segmented } from '../components/ui'
import { fmtDate } from '../lib/money'
import type { TaskStatus } from '../lib/types'

const PRIORITY: Record<string, any> = { low: 'gray', medium: 'sky', high: 'red' }

export default function MyWork() {
  const { state, session, t, setTaskStatus } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const [filter, setFilter] = useState<'all' | TaskStatus>('all')
  const tasks = state.tasks.filter((x) => x.companyId === cid)
    .filter((x) => filter === 'all' || x.status === filter)
    .sort((a, b) => (a.priority === 'high' ? -1 : a.priority === 'medium' ? 0 : 1) - (b.priority === 'high' ? -1 : b.priority === 'medium' ? 0 : 1))

  const byStatus = (s: TaskStatus) => tasks.filter((x) => x.status === s)

  const columns: { status: TaskStatus; label: string; tone: any }[] = [
    { status: 'todo', label: 'To Do', tone: 'gray' },
    { status: 'in_progress', label: 'In Progress', tone: 'blue' },
    { status: 'completed', label: 'Completed', tone: 'green' },
  ]

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.mywork')} sub="Intellektual topshiriqlar markazi — avtomatik yaratiladi" />
      <div className="flex mb16">
        <Segmented<'all' | TaskStatus> value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'todo', label: `To Do (${byStatus('todo').length})` },
          { value: 'in_progress', label: `In Progress (${byStatus('in_progress').length})` },
          { value: 'completed', label: `Completed (${byStatus('completed').length})` },
        ]} />
      </div>
      <div className="grid grid-3">
        {columns.map((col) => {
          const list = byStatus(col.status)
          return (
            <div key={col.status} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex between" style={{ padding: '4px 2px' }}>
                <span className="strong" style={{ fontSize: 13 }}>{col.label}</span>
                <Badge tone={col.tone}>{list.length}</Badge>
              </div>
              {list.map((task) => (
                <Card key={task.id} pad hover>
                  <div className="flex between">
                    <Badge tone={PRIORITY[task.priority]}>{task.priority}</Badge>
                    <Badge tone="gray">{task.type}</Badge>
                  </div>
                  <div className="strong mt8" style={{ fontSize: 13.5 }}>{task.title}</div>
                  <div className="small muted mt8">{task.description}</div>
                  {task.dueDate && <div className="small faint mt8">Muddat: {fmtDate(task.dueDate)}</div>}
                  <div className="flex mt16" style={{ gap: 8 }}>
                    {col.status !== 'todo' && <Button size="sm" variant="ghost" onClick={() => setTaskStatus(task.id, 'todo')}>To Do</Button>}
                    {col.status !== 'in_progress' && col.status !== 'completed' && <Button size="sm" variant="secondary" onClick={() => setTaskStatus(task.id, 'in_progress')}>Boshlash</Button>}
                    {col.status !== 'completed' && <Button size="sm" variant="primary" icon="check" onClick={() => setTaskStatus(task.id, 'completed')}>Yakunlash</Button>}
                    {task.route && <Button size="sm" variant="ghost" icon="external" onClick={() => navigate(task.route!)} />}
                  </div>
                </Card>
              ))}
              {list.length === 0 && <div className="card" style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 18, textAlign: 'center', color: 'var(--faint)', fontSize: 12 }}>Topshiriq yo‘q</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
