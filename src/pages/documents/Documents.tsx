import React, { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Card, PageHeader, Button, Badge, Modal, Field, Input, Select, Textarea, useToast, EmptyState, Confirm } from '../../components/ui'
import { DOC_STATUS, SearchBox, FilterChips, ExportMenu } from '../../components/shared'
import { Icon } from '../../components/icons'
import { fmtDate } from '../../lib/money'
import type { DocRecord } from '../../lib/types'

type Category = DocRecord['category'] | 'all'

function modeFromPath(path: string): { category: Category; scanner: boolean } {
  if (path.includes('/scanner')) return { category: 'all', scanner: true }
  if (path.includes('/contracts')) return { category: 'contract', scanner: false }
  if (path.includes('/receipts')) return { category: 'receipt', scanner: false }
  if (path.includes('/statements')) return { category: 'statement', scanner: false }
  return { category: 'all', scanner: false }
}

export default function Documents({ scanner: scannerProp, category: categoryProp }: { scanner?: boolean; category?: Category } = {}) {
  const { state, session, t, lang, fmt, can, uploadDocument, scanDocument, setDocExtraction, postDocumentExpense, postDocumentInvoice, archiveDocument } = useStore()
  const toast = useToast()
  const location = useLocation()
  const fromPath = modeFromPath(location.pathname)
  const category = categoryProp ?? fromPath.category
  const scanner = scannerProp ?? fromPath.scanner
  const cid = session!.companyId
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DocRecord['status']>('all')
  const [detail, setDetail] = useState<DocRecord | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const docs = useMemo(() => state.documents
    .filter((d) => d.companyId === cid)
    .filter((d) => category === 'all' || d.category === category)
    .filter((d) => statusFilter === 'all' || d.status === statusFilter)
    .filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt), [state, cid, category, statusFilter, q])

  const guessCategory = (name: string): DocRecord['category'] => {
    const n = name.toLowerCase()
    if (n.includes('shartnoma') || n.includes('contract')) return 'contract'
    if (n.includes('kochirma') || n.includes('statement') || n.includes('bank')) return 'statement'
    if (n.includes('chek') || n.includes('receipt') || n.includes('invoice') || n.includes('faktura') || n.includes('.jpg') || n.includes('.png')) return 'receipt'
    return 'other'
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).slice(0, 5).forEach((f) => {
      uploadDocument({ name: f.name, type: f.name.split('.').pop() ?? 'pdf', size: f.size, category: guessCategory(f.name) })
    })
    toast('success', `${files.length} ta hujjat yuklandi`)
  }

  return (
    <div>
      <PageHeader
        title={scanner ? t('nav.docscanner') : t('nav.documents')}
        sub={scanner ? 'AI orqali hujjatlarni avtomatik tanib olish va provodka qilish' : `${docs.length} ta hujjat`}
        actions={can('create') ? <>
          <ExportMenu getRows={() => [['Nomi', 'Kategoriya', 'Holat', 'Sana'], ...docs.map((d) => [d.name, d.category, d.status, fmtDate(new Date(d.createdAt).toISOString().slice(0, 10), lang)])]} filename="documents" />
          <Button variant="primary" icon="upload" onClick={() => fileRef.current?.click()}>Yuklash</Button>
        </> : undefined}
      />

      <input ref={fileRef} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.docx" onChange={(e) => onFiles(e.target.files)} />

      {scanner && (
        <div
          className={`dropzone mb16 ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" size={26} />
          <div className="strong mt8">Hujjatni bu yerga tashlang yoki tanlang</div>
          <div className="tiny mt8">PDF, JPG, PNG, XLSX, CSV, DOCX — AI tahlil qiladi, siz tasdiqlaysiz</div>
        </div>
      )}

      <div className="flex between wrap mb16" style={{ gap: 12 }}>
        <SearchBox value={q} onChange={setQ} />
        <FilterChips<'all' | DocRecord['status']> value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'all', label: 'Barchasi' },
          { value: 'uploaded', label: 'Yuklangan' },
          { value: 'extracted', label: 'AI o‘qidi' },
          { value: 'reviewed', label: 'Ko‘rib chiqildi' },
          { value: 'posted', label: 'Provodka qilindi' },
        ]} />
      </div>

      <Card>
        <div className="table-wrap">
          <table className="tbl clickable">
            <thead><tr><th>Hujjat</th><th>Kategoriya</th><th>Holat</th><th>Hajmi</th><th /></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} onClick={() => setDetail(d)}>
                  <td>
                    <span className="cell-strong">{d.name}</span>
                    {d.extracted && <div className="cell-sub">{d.extracted.amount ? fmt(d.extracted.amount) + ' · ' : ''}{d.extracted.confidence}% ishonch</div>}
                  </td>
                  <td><Badge tone="gray">{d.category}</Badge></td>
                  <td><Badge tone={DOC_STATUS[d.status].tone} dot>{DOC_STATUS[d.status].label}</Badge></td>
                  <td className="faint mono">{(d.size / 1024).toFixed(0)} KB</td>
                  <td><Icon name="chevronRight" size={15} style={{ color: 'var(--faint)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.length === 0 && <EmptyState icon="file" title={t('empty.documents')} desc="Yuklang yoki bu yerga tashlang — AI tahlil qiladi." />}
        </div>
      </Card>

      {detail && <DocDetail doc={detail} onClose={() => setDetail(null)} onScan={() => { scanDocument(detail.id); toast('info', 'AI tahlil yakunlandi — tekshirib chiqing') }} />}
    </div>
  )
}

function DocDetail({ doc, onClose, onScan }: { doc: DocRecord; onClose: () => void; onScan: () => void }) {
  const { state, session, fmt, setDocExtraction, postDocumentExpense, postDocumentInvoice, archiveDocument } = useStore()
  const toast = useToast()
  const cid = session!.companyId
  const ex = doc.extracted
  const customers = state.parties.filter((p) => p.companyId === cid && p.type === 'customer')
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')

  const update = (patch: Partial<NonNullable<DocRecord['extracted']>>) => {
    if (!ex) return
    setDocExtraction(doc.id, { ...ex, ...patch }, 'reviewed')
  }

  return (
    <Modal open onClose={onClose} title={doc.name} wide footer={
      <>
        {doc.status === 'uploaded' && <Button variant="secondary" icon="sparkles" onClick={onScan}>AI bilan o‘qish</Button>}
        {ex && <Button variant="ghost" onClick={() => { archiveDocument(doc.id); onClose(); toast('success', 'Arxivlandi') }}>Arxivlash</Button>}
        <Button variant="ghost" onClick={onClose}>Yopish</Button>
        {ex && doc.status !== 'posted' && (
          <>
            <Button variant="soft" onClick={() => { postDocumentExpense(doc.id); onClose(); toast('success', 'Xarajat provodka qilindi') }}>Xarajat sifatida</Button>
            <Button variant="primary" disabled={!customerId} onClick={() => { postDocumentInvoice(doc.id, customerId); onClose(); toast('success', 'Faktura yaratildi') }}>Faktura sifatida</Button>
          </>
        )}
      </>
    }>
      {!ex ? (
        <div className="muted">Hujjat hali AI tomonidan o‘qilmagan. «AI bilan o‘qish» tugmasini bosing — natijani provodka qilishdan oldin tekshirishingiz shart.</div>
      ) : (
        <>
          <div className="flex between mb8">
            <Badge tone={DOC_STATUS[doc.status].tone}>{DOC_STATUS[doc.status].label}</Badge>
            <Badge tone={ex.confidence >= 90 ? 'green' : ex.confidence >= 75 ? 'amber' : 'red'}>ishonch {ex.confidence}%</Badge>
          </div>
          {ex.confidence < 90 && (
            <div className="badge badge-amber mb16" style={{ whiteSpace: 'normal' }}>⚠ AI natijasi avtomatik emas — provodka qilishdan oldin qiymatlarni tekshiring.</div>
          )}
          <div className="form-grid">
            <Field label="Hujjat №"><Input value={ex.docNumber ?? ''} onChange={(e) => update({ docNumber: e.target.value })} /></Field>
            <Field label="Sana"><Input type="date" value={ex.date ?? ''} onChange={(e) => update({ date: e.target.value })} /></Field>
            <Field label="Kontragent"><Input value={ex.counterparty ?? ''} onChange={(e) => update({ counterparty: e.target.value })} /></Field>
            <Field label="STIR"><Input value={ex.taxId ?? ''} onChange={(e) => update({ taxId: e.target.value })} /></Field>
            <Field label="Summa"><Input type="number" value={ex.amount ?? ''} onChange={(e) => update({ amount: Number(e.target.value) || 0 })} /></Field>
            <Field label="QQS"><Input type="number" value={ex.vat ?? ''} onChange={(e) => update({ vat: Number(e.target.value) || 0 })} /></Field>
            <Field label="Faktura qilish (mijoz)" className="full"><Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          </div>
          {ex.items && ex.items.length > 0 && (
            <div className="table-wrap mt8">
              <table className="tbl">
                <thead><tr><th>Pozitsiya</th><th className="num">Soni</th><th className="num">Narx</th></tr></thead>
                <tbody>{ex.items.map((it, i) => <tr key={i}><td>{it.description}</td><td className="num">{it.quantity}</td><td className="num mono">{fmt(it.unitPrice)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
