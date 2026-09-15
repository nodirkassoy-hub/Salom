import React, { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Card, CardHead, Badge, Button, Modal, Field, Input, Select, useToast } from '../components/ui'
import { initials, avatarColor } from '../lib/utils'
import { fmtDate } from '../lib/money'
import type { Role } from '../lib/types'

const ROLES: Role[] = ['owner', 'admin', 'accountant', 'manager', 'viewer']
const MATRIX: { perm: string; roles: Role[] }[] = [
  { perm: 'Ko‘rish', roles: ['owner', 'admin', 'accountant', 'manager', 'viewer'] },
  { perm: 'Yaratish', roles: ['owner', 'admin', 'accountant', 'manager'] },
  { perm: 'Tahrirlash', roles: ['owner', 'admin', 'accountant', 'manager'] },
  { perm: 'O‘chirish', roles: ['owner', 'admin', 'accountant'] },
  { perm: 'Tasdiqlash', roles: ['owner', 'admin', 'accountant', 'manager'] },
  { perm: 'Eksport', roles: ['owner', 'admin', 'accountant', 'manager', 'viewer'] },
  { perm: 'Foydalanuvchilarni boshqarish', roles: ['owner'] },
  { perm: 'Buxgalteriyani boshqarish', roles: ['owner', 'admin', 'accountant'] },
  { perm: 'Hisobotlarni boshqarish', roles: ['owner', 'admin', 'accountant', 'manager'] },
]

export default function Team() {
  const { state, session, t, fmt, addUser, updateUserRole, removeUser, can } = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' as Role })

  const users = state.users
  const audit = state.audit.filter((a) => a.companyId === session?.companyId).sort((a, b) => b.at - a.at).slice(0, 40)
  const allowed = can('manageUsers')

  const submit = () => {
    if (!form.name || !form.email) { toast('error', 'Ism va email kiriting'); return }
    addUser(form)
    toast('success', 'Foydalanuvchi qo‘shildi')
    setOpen(false)
  }

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.team')} sub="Jamoa, rollar va ruxsatlar" actions={allowed ? <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Yangi foydalanuvchi</Button> : undefined} />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card pad>
          <CardHead title="Foydalanuvchilar" />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex">
                        <span className="avatar" style={{ width: 32, height: 32, background: avatarColor(u.name), fontSize: 11 }}>{initials(u.name)}</span>
                        <div><div className="cell-strong">{u.name}</div><div className="small muted">{u.email}</div></div>
                      </div>
                    </td>
                    <td>
                      {allowed && u.id !== session?.userId ? (
                        <Select style={{ width: 130 }} value={u.role} onChange={(e) => { updateUserRole(u.id, e.target.value as Role); toast('success', 'Rol o‘zgardi') }}>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </Select>
                      ) : <Badge tone="violet">{u.role}</Badge>}
                    </td>
                    <td>{allowed && u.id !== session?.userId && <Button variant="ghost" size="sm" onClick={() => { removeUser(u.id); toast('info', 'O‘chirildi') }}>🗑</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card pad>
          <CardHead title="Ruxsatlar matritsasi" />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Ruxsat</th>{ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r.slice(0, 4)}</th>)}</tr></thead>
              <tbody>
                {MATRIX.map((m) => (
                  <tr key={m.perm}>
                    <td className="cell-strong" style={{ fontSize: 12 }}>{m.perm}</td>
                    {ROLES.map((r) => <td key={r} style={{ textAlign: 'center' }}>{m.roles.includes(r) ? '✓' : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card pad className="mt16">
        <CardHead title="Audit jurnali" sub="Kim, nima, qachon" />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Vaqt</th><th>Foydalanuvchi</th><th>Amal</th><th>Obyekt</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="cell-muted nowrap">{new Date(a.at).toLocaleString()}</td>
                  <td className="cell-strong">{a.userName}</td>
                  <td>{a.action}</td>
                  <td className="cell-muted">{a.entity}{a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ''}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={4} className="muted">Audit yozuvlari yo‘q</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Yangi foydalanuvchi" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
          <Button variant="primary" onClick={submit}>Qo‘shish</Button>
        </>
      }>
        <div className="form-grid">
          <Field label="Ism"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Rol">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
