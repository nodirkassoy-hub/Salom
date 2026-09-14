import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Menu } from '../../components/ui'
import { SearchBox, ExportMenu } from '../../components/shared'
import type { Product, MovementType } from '../../lib/types'

export default function Products() {
  const { state, session, fmt, t, can, createProduct, updateProduct, stockMove } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [moveOpen, setMoveOpen] = useState<Product | null>(null)

  const products = useMemo(() => state.products
    .filter((p) => p.companyId === cid)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [state, cid, q])

  const totalValue = products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0)

  return (
    <div>
      <PageHeader title={t('nav.products')} sub={`${products.length} ta mahsulot · zaxira qiymati ${fmt(totalValue)}`}
        actions={<>
          <ExportMenu getRows={() => [['SKU', 'Nomi', 'Kategoriya', 'Soni', 'Min', 'Xarid', 'Sotish'], ...products.map((p) => [p.sku, p.name, p.category, p.quantity, p.minStock, p.purchasePrice, p.sellingPrice])]} filename="products" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yangi mahsulot</Button>}
        </>} />

      <div className="mb16"><SearchBox value={q} onChange={setQ} /></div>

      <Card>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Nomi</th><th>Kategoriya</th><th className="num">Soni</th><th className="num">Xarid</th><th className="num">Sotish</th><th className="num">Marja</th><th /></tr></thead>
            <tbody>
              {products.map((p) => {
                const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0
                return (
                  <tr key={p.id}>
                    <td className="mono faint">{p.sku}</td>
                    <td><span className="cell-strong">{p.name}</span>{p.quantity <= p.minStock && <Badge tone="red" style={{ marginLeft: 6 }}>kam</Badge>}</td>
                    <td className="muted">{p.category}</td>
                    <td className="num mono">{p.quantity}</td>
                    <td className="num mono">{fmt(p.purchasePrice)}</td>
                    <td className="num mono">{fmt(p.sellingPrice)}</td>
                    <td className="num mono" style={{ color: margin >= 20 ? 'var(--primary)' : 'var(--warning)' }}>{margin.toFixed(0)}%</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Menu align="right" trigger={<Button size="sm" variant="ghost" icon="dots" />} items={[
                        { label: 'Ombor harakati', icon: 'refresh', onClick: () => setMoveOpen(p) },
                        { label: 'Tahrirlash', icon: 'edit', onClick: () => setEditing(p) },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {products.length === 0 && <EmptyState icon="box" title={t('empty.products')} action={can('create') ? <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Yaratish</Button> : undefined} />}
        </div>
      </Card>

      {creating && <ProductModal onClose={() => setCreating(false)} onSave={(p) => { createProduct(p); setCreating(false); toast('success', t('toast.created')) }} />}
      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onSave={(p) => { updateProduct(editing.id, p); setEditing(null); toast('success', t('toast.saved')) }} />}
      {moveOpen && <StockMoveModal product={moveOpen} onClose={() => setMoveOpen(null)} onMove={(type, qty) => { stockMove({ productId: moveOpen.id, type, quantity: qty, date: new Date().toISOString().slice(0, 10) }); setMoveOpen(null); toast('success', 'Harakat qayd etildi') }} />}
    </div>
  )
}

function ProductModal({ product, onClose, onSave }: { product?: Product; onClose: () => void; onSave: (p: Omit<Product, 'id' | 'companyId' | 'createdAt'>) => void }) {
  const { state, session } = useStore()
  const cid = session!.companyId
  const warehouses = state.warehouses.filter((w) => w.companyId === cid)
  const [sku, setSku] = useState(product?.sku ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [unit, setUnit] = useState(product?.unit ?? 'dona')
  const [purchasePrice, setPurchasePrice] = useState(product ? String(product.purchasePrice) : '')
  const [sellingPrice, setSellingPrice] = useState(product ? String(product.sellingPrice) : '')
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '0')
  const [minStock, setMinStock] = useState(product ? String(product.minStock) : '0')
  const [warehouseId, setWarehouseId] = useState(product?.warehouseId ?? warehouses[0]?.id ?? '')

  return (
    <Modal open onClose={onClose} title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={() => onSave({ sku, name: name.trim(), category, unit, purchasePrice: Number(purchasePrice) || 0, sellingPrice: Number(sellingPrice) || 0, quantity: Number(quantity) || 0, minStock: Number(minStock) || 0, warehouseId, active: true })}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="SKU"><Input value={sku} onChange={(e) => setSku(e.target.value)} /></Field>
        <Field label="Nomi"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Kategoriya"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        <Field label="O‘lchov"><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <Field label="Xarid narxi (so‘m)"><Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></Field>
        <Field label="Sotish narxi (so‘m)"><Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} /></Field>
        <Field label="Boshlang‘ich soni"><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
        <Field label="Minimal zaxira"><Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} /></Field>
        <Field label="Ombor" className="full"><Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
      </div>
    </Modal>
  )
}

function StockMoveModal({ product, onClose, onMove }: { product: Product; onClose: () => void; onMove: (type: MovementType, qty: number) => void }) {
  const [type, setType] = useState<MovementType>('in')
  const [qty, setQty] = useState('')
  return (
    <Modal open onClose={onClose} title={`Ombor harakati — ${product.name}`} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button variant="primary" disabled={!qty || Number(qty) <= 0} onClick={() => onMove(type, Number(qty))}>Saqlash</Button>
      </>
    }>
      <div className="form-grid">
        <Field label="Turi"><Select value={type} onChange={(e) => setType(e.target.value as MovementType)}><option value="in">Kirim</option><option value="out">Chiqim</option><option value="transfer">O‘tkazma</option><option value="adjust">Korreksiya</option></Select></Field>
        <Field label="Soni"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
      </div>
      <div className="tiny faint">Joriy zaxira: {product.quantity} {product.unit}. Kirim/chiqim ombor qiymatiga ham ta’sir qiladi.</div>
    </Modal>
  )
}
