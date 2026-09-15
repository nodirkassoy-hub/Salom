import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, useToast, EmptyState, Confirm, Textarea } from '../../components/ui'
import { SearchBox, FilterChips, INVOICE_STATUS, usePeriod, ExportMenu, partyName } from '../../components/shared'
import { Icon } from '../../components/icons'
import { invoiceTotal, invoiceTax, invoiceSubtotal, invoiceOutstanding, partyBalances } from '../../engine/selectors'
import { fmtDate, todayISO, addDays, uid } from '../../lib/money'
import type { Invoice, InvoiceLine, InvoiceStatus } from '../../lib/types'

type Filter = 'all' | InvoiceStatus

export default function Invoices() {
  const { state, session, fmt, t, lang, can } = useStore()
  const navigate = useNavigate()
  const cid = session!.companyId
  const { period } = usePeriod()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const invoices = useMemo(() => state.invoices
    .filter((i) => i.companyId === cid && i.issueDate >= period.from && i.issueDate <= period.to)
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => !q || i.number.toLowerCase().includes(q.toLowerCase()) || (state.parties.find((p) => p.id === i.customerId)?.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate)), [state, cid, period, filter, q])

  return (
    <div>
      <PageHeader title={t('nav.invoices')} sub={`${invoices.length} ta faktura`}
        actions={<>
          <ExportMenu getRows={() => [['Raqam', 'Mijoz', 'Sana', 'Muddat', 'Status', 'Jami', 'To‘langan'], ...invoices.map((i) => [i.number, partyName(state, i.customerId), i.issueDate, i.dueDate, i.status, invoiceTotal(i), invoiceTotal(i) - invoiceOutstanding(i, state.payments)])]} filename="invoices" />
          {can('create') && <Button variant="primary" icon="plus" onClick={() => navigate('/sales/invoices/new')}>Yangi faktura</Button>}
        </>} />

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Raqam yoki mijoz…" />
      </div>

      <Card>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <FilterChips<Filter> value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'Barchasi', count: state.invoices.filter((i) => i.companyId === cid).length },
            { value: 'sent', label: 'Jo‘natilgan' },
            { value: 'partially_paid', label: 'Qisman' },
            { value: 'paid', label: 'To‘langan' },
            { value: 'overdue', label: 'Muddati o‘tgan' },
            { value: 'draft', label: 'Qoralama' },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Raqam</th><th>Mijoz</th><th>Sana</th><th>Muddat</th><th className="num">Jami</th><th>Status</th><th /></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                  <td className="mono strong">{inv.number}</td>
                  <td><span className="cell-strong">{partyName(state, inv.customerId)}</span></td>
                  <td className="faint">{fmtDate(inv.issueDate, lang)}</td>
                  <td className="faint">{fmtDate(inv.dueDate, lang)}</td>
                  <td className="num mono strong">{fmt(invoiceTotal(inv))}</td>
                  <td><Badge tone={INVOICE_STATUS[inv.status].tone} dot>{INVOICE_STATUS[inv.status].label}</Badge></td>
                  <td><Icon name="chevronRight" size={15} style={{ color: 'var(--faint)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <EmptyState icon="receipt" title={t('empty.invoices')} desc={t('empty.invoicesDesc')} action={can('create') ? <Button variant="primary" icon="plus" onClick={() => navigate('/sales/invoices/new')}>Yaratish</Button> : undefined} />}
        </div>
      </Card>
    </div>
  )
}

// ---------- Invoice editor (new / edit) ----------
export function InvoiceEditor() {
  const { state, session, createInvoice, updateInvoice, fmt, t, currency } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const cid = session!.companyId
  const existing = id && id !== 'new' ? state.invoices.find((i) => i.id === id) : undefined

  const [customerId, setCustomerId] = useState(existing?.customerId ?? state.parties.find((p) => p.companyId === cid && p.type === 'customer')?.id ?? '')
  const [issueDate, setIssueDate] = useState(existing?.issueDate ?? todayISO())
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? addDays(todayISO(), 14))
  const [status, setStatus] = useState<'draft' | 'sent'>(existing ? (existing.status === 'draft' ? 'draft' : 'sent') : 'sent')
  const [discountRate, setDiscountRate] = useState(existing?.discountRate ?? 0)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [lines, setLines] = useState<InvoiceLine[]>(existing?.lines.map((l) => ({ ...l })) ?? [{ id: uid('il'), description: '', quantity: 1, unitPrice: 0, taxRate: 0.12 }])

  const customers = state.parties.filter((p) => p.companyId === cid && p.type === 'customer')
  const products = state.products.filter((p) => p.companyId === cid)

  const setLine = (i: number, patch: Partial<InvoiceLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const draft: Invoice = { id: existing?.id ?? 'x', companyId: cid, number: existing?.number ?? '—', customerId, issueDate, dueDate, status, lines, discountRate, notes, currency, createdAt: existing?.createdAt ?? 0 }
  const total = invoiceTotal(draft)

  const addProductLine = (pid: string) => {
    const p = products.find((x) => x.id === pid)
    if (!p) return
    setLines((ls) => [...ls, { id: uid('il'), productId: p.id, description: p.name, quantity: 1, unitPrice: p.sellingPrice, taxRate: 0.12 }])
  }

  const save = (asDraft?: boolean) => {
    if (!customerId) { toast('error', 'Mijozni tanlang'); return }
    const valid = lines.filter((l) => l.description.trim() && l.quantity > 0 && l.unitPrice > 0)
    if (valid.length === 0) { toast('error', 'Kamida bitta qator to‘ldiring'); return }
    const finalStatus: InvoiceStatus = asDraft ? 'draft' : status
    if (existing) {
      updateInvoice(existing.id, { customerId, issueDate, dueDate, discountRate, notes, lines: valid, status: existing.status })
      toast('success', t('toast.saved'))
    } else {
      createInvoice({ customerId, issueDate, dueDate, status: finalStatus, discountRate, notes, lines: valid, currency })
      toast('success', finalStatus === 'draft' ? 'Qoralama saqlandi' : t('toast.created'))
    }
    navigate('/sales/invoices')
  }

  return (
    <div>
      <PageHeader title={existing ? `Faktura ${existing.number}` : 'Yangi faktura'} sub={existing ? (INVOICE_STATUS[existing.status].label) : 'Hisob-faktura yaratish'}
        actions={<Button variant="ghost" icon="arrowRight" onClick={() => navigate('/sales/invoices')}>Ro‘yxatga qaytish</Button>} />
      <div className="grid grid-3" style={{ alignItems: 'start' }}>
        <Card pad style={{ gridColumn: 'span 2' }}>
          <div className="form-grid">
            <Field label="Mijoz"><Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Holat"><Select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'sent')}><option value="sent">Jo‘natilgan (provodka)</option><option value="draft">Qoralama</option></Select></Field>
            <Field label="Sana"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
            <Field label="Muddat"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="Chegirma (%)" className="full"><Input type="number" min="0" max="100" step="0.5" value={discountRate === 0 ? '' : discountRate} onChange={(e) => setDiscountRate(Number(e.target.value) || 0)} /></Field>
          </div>

          <div className="flex between mt8 mb8">
            <span className="section-title" style={{ margin: 0 }}>Qatorlar</span>
            <Select value="" onChange={(e) => addProductLine(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="">Mahsulot qo‘shish…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
            </Select>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: '38%' }}>Tavsif</th><th style={{ width: 80 }} className="num">Soni</th><th className="num">Narx</th><th style={{ width: 70 }} className="num">QQS%</th><th className="num">Jami</th><th /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id}>
                    <td><Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Xizmat / mahsulot" /></td>
                    <td><Input type="number" min="0" value={l.quantity || ''} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 0 })} /></td>
                    <td><Input type="number" min="0" value={l.unitPrice || ''} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} /></td>
                    <td><Input type="number" min="0" step="0.01" value={l.taxRate === 0 ? '' : l.taxRate} onChange={(e) => setLine(i, { taxRate: Number(e.target.value) || 0 })} /></td>
                    <td className="num mono">{fmt(Math.round(l.quantity * l.unitPrice * (1 + l.taxRate)))}</td>
                    <td><Button size="sm" variant="ghost" icon="trash" className="mr8" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="soft" icon="plus" className="mt8" onClick={() => setLines((ls) => [...ls, { id: uid('il'), description: '', quantity: 1, unitPrice: 0, taxRate: 0.12 }])}>Qator qo‘shish</Button>

          <Field label="Izoh" className="mt16"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></Field>
        </Card>

        <Card pad>
          <div className="section-title">Jami</div>
          <div className="flex-col" style={{ gap: 8 }}>
            <div className="flex between"><span className="muted small">Oraliq jami</span><span className="mono">{fmt(invoiceSubtotal(draft))}</span></div>
            <div className="flex between"><span className="muted small">Chegirma</span><span className="mono">-{fmt(Math.round(invoiceSubtotal(draft) * discountRate))}</span></div>
            <div className="flex between"><span className="muted small">QQS</span><span className="mono">{fmt(invoiceTax(draft))}</span></div>
            <div className="flex between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}><span className="strong">Jami</span><span className="mono strong" style={{ fontSize: 18 }}>{fmt(total)}</span></div>
          </div>
          <Button variant="primary" block icon="check" className="mt16" onClick={() => save(false)}>Saqlash</Button>
          <Button variant="secondary" block className="mt8" onClick={() => save(true)}>Qoralama sifatida saqlash</Button>
        </Card>
      </div>
    </div>
  )
}

// ---------- Invoice detail ----------
export function InvoiceDetail() {
  const { state, session, fmt, t, lang, can, recordPayment, deleteInvoice, duplicateInvoice, issueInvoice } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const cid = session!.companyId
  const inv = state.invoices.find((i) => i.id === id && i.companyId === cid)
  const [payOpen, setPayOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [payAmount, setPayAmount] = useState(0)
  const [payAccount, setPayAccount] = useState('')

  if (!inv) return <EmptyState icon="receipt" title="Faktura topilmadi" action={<Button onClick={() => navigate('/sales/invoices')}>Orqaga</Button>} />

  const cust = state.parties.find((p) => p.id === inv.customerId)
  const total = invoiceTotal(inv)
  const paid = state.payments.filter((p) => p.invoiceId === inv.id && p.status === 'applied').reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - paid)
  const bankAccounts = state.bankAccounts.filter((b) => b.companyId === cid)

  const openPay = () => {
    setPayAmount(remaining)
    setPayAccount(bankAccounts[0]?.glAccountId ?? '')
    setPayOpen(true)
  }

  return (
    <div>
      <PageHeader title={`Faktura ${inv.number}`} sub={cust?.name}
        actions={<>
          <Button variant="secondary" icon="printer" onClick={() => printInvoice(state, cid, inv, cust?.name ?? '', fmt)}>Chop etish</Button>
          {inv.status === 'draft' && can('edit') && <Button variant="soft" icon="send" onClick={() => { issueInvoice(inv.id); toast('success', 'Faktura jo‘natildi va provodka qilindi') }}>Jo‘natish</Button>}
          <Button variant="secondary" icon="copy" onClick={() => { duplicateInvoice(inv.id); toast('success', 'Nusxalandi') }}>Nusxalash</Button>
          {can('delete') && <Button variant="soft-danger" icon="trash" onClick={() => setDelOpen(true)}>O‘chirish</Button>}
        </>} />

      <div className="grid grid-3" style={{ alignItems: 'start' }}>
        <Card pad style={{ gridColumn: 'span 2' }}>
          <div className="flex between">
            <div>
              <div className="tiny faint uppercase">Mijoz</div>
              <div className="strong mt8">{cust?.name}</div>
              {cust?.taxId && <div className="tiny muted">STIR: {cust.taxId}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge tone={INVOICE_STATUS[inv.status].tone} dot>{INVOICE_STATUS[inv.status].label}</Badge>
              <div className="tiny muted mt8">Sana: {fmtDate(inv.issueDate, lang)}</div>
              <div className="tiny muted">Muddat: {fmtDate(inv.dueDate, lang)}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Tavsif</th><th className="num">Soni</th><th className="num">Narx</th><th className="num">QQS</th><th className="num">Jami</th></tr></thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="cell-strong">{l.description}</td>
                    <td className="num">{l.quantity}</td>
                    <td className="num mono">{fmt(l.unitPrice)}</td>
                    <td className="num mono faint">{l.taxRate ? (l.taxRate * 100) + '%' : '—'}</td>
                    <td className="num mono strong">{fmt(Math.round(l.quantity * l.unitPrice * (1 + l.taxRate)))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4}>Oraliq jami</td><td className="num mono">{fmt(invoiceSubtotal(inv))}</td></tr>
                <tr><td colSpan={4}>QQS</td><td className="num mono">{fmt(invoiceTax(inv))}</td></tr>
                <tr><td colSpan={4}>Jami</td><td className="num mono" style={{ fontSize: 15 }}>{fmt(total)}</td></tr>
              </tfoot>
            </table>
          </div>
          {inv.notes && <div className="small muted mt8">{inv.notes}</div>}
        </Card>

        <div className="flex-col">
          <Card pad>
            <div className="section-title">To‘lov holati</div>
            <div className="flex-col" style={{ gap: 8 }}>
              <div className="flex between"><span className="muted small">Jami</span><span className="mono">{fmt(total)}</span></div>
              <div className="flex between"><span className="muted small">To‘langan</span><span className="mono" style={{ color: 'var(--primary)' }}>{fmt(paid)}</span></div>
              <div className="flex between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}><span className="strong">Qoldiq</span><span className="mono strong" style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--primary)' }}>{fmt(remaining)}</span></div>
            </div>
            {remaining > 0 && can('create') && <Button variant="primary" block icon="wallet" className="mt16" onClick={openPay}>To‘lov qabul qilish</Button>}
          </Card>

          <Card pad>
            <div className="section-title">To‘lovlar</div>
            {state.payments.filter((p) => p.invoiceId === inv.id).length === 0 && <div className="tiny muted">Hozircha to‘lov yo‘q</div>}
            {state.payments.filter((p) => p.invoiceId === inv.id).map((p) => (
              <div key={p.id} className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div><div className="mono strong" style={{ fontSize: 13 }}>{fmt(p.amount)}</div><div className="tiny muted">{fmtDate(p.date, lang)} · {p.method}</div></div>
                <Badge tone="green">tushdi</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="To‘lov qabul qilish" footer={
        <>
          <Button variant="ghost" onClick={() => setPayOpen(false)}>Bekor qilish</Button>
          <Button variant="primary" disabled={payAmount <= 0 || !payAccount} onClick={() => { recordPayment({ invoiceId: inv.id, amount: payAmount, accountId: payAccount, method: 'bank', date: todayISO() }); setPayOpen(false); toast('success', 'To‘lov qayd etildi') }}>Qayd etish</Button>
        </>
      }>
        <Field label="Summa"><Input type="number" value={payAmount || ''} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} /></Field>
        <Field label="Hisob"><Select value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>{bankAccounts.map((b) => <option key={b.glAccountId} value={b.glAccountId}>{b.name}</option>)}</Select></Field>
        <div className="tiny muted">To‘lov qayd etilganda Debitorlik kamayadi va bank hisobi ko‘payadi.</div>
      </Modal>

      <Confirm open={delOpen} onClose={() => setDelOpen(false)} title="Fakturani o‘chirish"
        message={paid > 0 ? 'Fakturada to‘lov bor — o‘chirib bo‘lmaydi.' : 'Faktura o‘chiriladi va teskari provodka yaratiladi.'}
        onConfirm={() => { if (paid === 0) { deleteInvoice(inv.id); toast('success', t('toast.deleted')); navigate('/sales/invoices') } else toast('error', 'To‘lovi bor faktura o‘chirilmaydi') }} />
    </div>
  )
}

// Inline-styled print window
function printInvoice(state: any, cid: string, inv: Invoice, customerName: string, fmt: (n: number) => string) {
  const company = state.companies.find((c: any) => c.id === cid)
  const lines = inv.lines.map((l) => `<tr><td>${l.description}</td><td style="text-align:right">${l.quantity}</td><td style="text-align:right">${fmt(l.unitPrice)}</td><td style="text-align:right">${fmt(Math.round(l.quantity * l.unitPrice * (1 + l.taxRate)))}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${inv.number}</title><style>body{font-family:system-ui,sans-serif;color:#0f172a;padding:32px}table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;border-bottom:1px solid #e7eaf0;font-size:13px}h1{font-size:18px}.muted{color:#64748b}</style></head><body>
  <div style="display:flex;justify-content:space-between"><div><h1>${company?.name}</h1><div class="muted">${company?.address ?? ''} · STIR ${company?.taxId}</div></div><div style="text-align:right"><h1>${inv.number}</h1><div class="muted">Sana: ${inv.issueDate}</div><div class="muted">Muddat: ${inv.dueDate}</div></div></div>
  <hr style="border:none;border-top:2px solid #0b9f6a;margin:16px 0"/>
  <div class="muted">Mijoz: <b style="color:#0f172a">${customerName}</b></div>
  <table style="margin-top:16px"><thead><tr><th style="text-align:left">Tavsif</th><th style="text-align:right">Soni</th><th style="text-align:right">Narx</th><th style="text-align:right">Jami</th></tr></thead><tbody>${lines}</tbody><tfoot><tr><td colspan="3" style="text-align:right"><b>Jami</b></td><td style="text-align:right"><b>${fmt(invoiceTotal(inv))}</b></td></tr></tfoot></table>
  <div class="muted" style="margin-top:24px">BUXAI tomonidan yaratilgan — ikki tomonlama buxgalteriya daftariga provodka qilingan.</div>
  </body></html>`
  const w = window.open('', '_blank', 'width=720,height=900')
  if (w) { w.document.write(html); w.document.close(); w.focus() }
}
