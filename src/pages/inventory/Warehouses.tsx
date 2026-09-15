import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, useToast, EmptyState } from '../../components/ui'
import { fmtDate } from '../../lib/money'

export default function Warehouses() {
  const { state, session, t, can, createWarehouse } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const warehouses = state.warehouses.filter((w) => w.companyId === cid)
  const productCount = (wid: string) => state.products.filter((p) => p.companyId === cid && p.warehouseId === wid).reduce((s, p) => s + p.quantity, 0)

  return (
    <div>
      <PageHeader title={t('nav.warehouses')} sub={`${warehouses.length} ta omborxona`}
        actions={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi ombor</Button> : undefined} />

      <div className="grid grid-3">
        {warehouses.map((w) => (
          <Card pad hover key={w.id}>
            <div className="strong" style={{ fontSize: 15 }}>{w.name}</div>
            <div className="tiny muted">{w.address ?? ''}</div>
            <div className="mono strong mt16" style={{ fontSize: 19 }}>{productCount(w.id)} <span className="tiny muted">birlik</span></div>
          </Card>
        ))}
      </div>
      {warehouses.length === 0 && <Card><EmptyState icon="landmark" title="Omborxonalar yo‘q" action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} /></Card>}

      <Modal open={creating} onClose={() => setCreating(false)} title="Yangi omborxona" footer={
        <>
          <Button variant="ghost" onClick={() => setCreating(false)}>Bekor qilish</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => { createWarehouse(name.trim()); setCreating(false); setName(''); toast('success', t('toast.created')) }}>Saqlash</Button>
        </>
      }>
        <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      </Modal>
    </div>
  )
}
