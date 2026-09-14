import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm } from '../../components/ui'
import { SearchBox, ExportMenu } from '../../components/shared'
import { fmtDate } from '../../lib/money'
import type { Employee } from '../../lib/types'

export default function Employees() {
  const { state, session, fmt, t, lang, can, createEmployee, updateEmployee } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)

  const employees = useMemo(() => state.employees
    .filter((e) => e.companyId === cid && e.active)
    .filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.department.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [state, cid, q])

  const totalSalary = employees.reduce((s, e) => s + e.salary, 0)

  return (
    <div>
      <PageHeader title={t('nav.employees')} sub={`${employees.length} ta xodim · oylik fond ${fmt(totalSalary)}`}
        actions={<>
          <ExportMenu getRows={() => [['Nomi', 'Lavozim', 'Bo‘lim', 'Oylik', 'Ishga kirgan'], ...employees.map((e) => [e.name, e.position, e.department, e.salary, e.startDate])]} filename="employees" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi xodim</Button>}
        </>} />

      <div className="mb16"><SearchBox value={q} onChange={setQ} /></div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Xodim</th><th>Lavozim</th><th>Bo‘lim</th><th>Ishga kirgan</th><th className="num">Oylik</th><th /></tr></thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td><span className="cell-strong">{e.name}</span></td>
                  <td className="muted">{e.position}</td>
                  <td><Badge tone="gray">{e.department}</Badge></td>
                  <td className="faint">{fmtDate(e.startDate, lang)}</td>
                  <td className="num mono strong">{fmt(e.salary)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {can('edit') && <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(e)} />}
                    {can('delete') && <Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setDeleting(e)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <EmptyState icon="users" title="Xodimlar yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      {(creating || editing) && <EmployeeModal employee={editing} onClose={() => { setCreating(false); setEditing(null) }}
        onSave={(d) => {
          if (editing) { updateEmployee(editing.id, d); toast('success', t('toast.saved')) }
          else { createEmployee(d); toast('success', t('toast.created')) }
          setCreating(false); setEditing(null)
        }} />}

      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="Xodimni o‘chirish"
        message={<>«{deleting?.name}» o‘chirilsinmi?</>}
        onConfirm={() => { if (deleting) { updateEmployee(deleting.id, { active: false }); toast('success', 'Xodim ishdan chiqarildi') } }} />
    </div>
  )
}

function EmployeeModal({ employee, onClose, onSave }: { employee: Employee | null; onClose: () => void; onSave: (d: Omit<Employee, 'id' | 'companyId'>) => void }) {
  const [name, setName] = useState(employee?.name ?? '')
  const [position, setPosition] = useState(employee?.position ?? '')
  const [department, setDepartment] = useState(employee?.department ?? '')
  const [salary, setSalary] = useState(employee ? String(employee.salary) : '')
  const [startDate, setStartDate] = useState(employee?.startDate ?? '')
  const [taxId, setTaxId] = useState(employee?.taxId ?? '')
  const [bankAccount, setBankAccount] = useState(employee?.bankAccount ?? '')

  return (
    <Modal open onClose={onClose} title={employee ? 'Xodimni tahrirlash' : 'Yangi xodim'} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), position, department, salary: Number(salary) || 0, startDate: startDate || '2024-01-01', taxId, bankAccount, active: true })}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="F.I.Sh."><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Lavozim"><Input value={position} onChange={(e) => setPosition(e.target.value)} /></Field>
        <Field label="Bo‘lim"><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
        <Field label="Oylik (so‘m)"><Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} /></Field>
        <Field label="Ishga kirgan sana"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="JSHSHIR/STIR"><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></Field>
        <Field label="Bank hisobi" className="full"><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
