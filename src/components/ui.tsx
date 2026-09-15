import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { cx } from '../lib/utils'
import { Icon, IconName } from './icons'
import { fmtCompact, fmtMoney } from '../lib/money'
import type { Currency, Lang } from '../lib/types'

// ============================== Toast ==============================
type ToastKind = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: number; kind: ToastKind; message: string }
const ToastCtx = createContext<{ toast: (kind: ToastKind, message: string) => void }>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)
  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = idRef.current++
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  const icon: Record<ToastKind, IconName> = { success: 'check', error: 'alert', info: 'bell', warning: 'alert' }
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="t-icon"><Icon name={icon[t.kind]} size={15} /></span>
            <span className="grow">{t.message}</span>
            <button className="icon-btn" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}><Icon name="x" size={15} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export function useToast() { return useContext(ToastCtx).toast }

// ============================== Button ==============================
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft-danger' | 'soft'
export function Button({ children, variant = 'secondary', size, icon, className, block, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'lg'; icon?: IconName; block?: boolean }) {
  return (
    <button className={cx('btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

export function IconBtn({ icon, className, label, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label?: string }) {
  return (
    <button className={cx('icon-btn', className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  )
}

// ============================== Badge ==============================
export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet' | 'sky'
export function Badge({ tone = 'gray', children, dot, className, style }: { tone?: Tone; children?: React.ReactNode; dot?: boolean; className?: string; style?: React.CSSProperties }) {
  return <span className={cx('badge', `badge-${tone}`, className)} style={style}>{dot && <span className="dot" />}{children}</span>
}

// ============================== Card ==============================
export function Card({ children, className, pad, hover, style, onClick }: { children: React.ReactNode; className?: string; pad?: boolean; hover?: boolean; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={cx('card', pad && 'card-pad', hover && 'hoverable', className)} style={style} onClick={onClick}>{children}</div>
}

export function CardHead({ title, sub, actions, icon }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; icon?: IconName }) {
  return (
    <div className="card-head">
      <div className="flex">
        {icon && <span className="kpi-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}><Icon name={icon} size={16} /></span>}
        <div>
          <h3>{title}</h3>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
      {actions && <div className="flex">{actions}</div>}
    </div>
  )
}

// ============================== KPI ==============================
export function KPI({ label, value, icon, tone = 'green', delta, deltaGood, sub, onClick, style }: {
  label: React.ReactNode; value: React.ReactNode; icon?: IconName; tone?: Tone; delta?: React.ReactNode; deltaGood?: boolean; sub?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <div className="card kpi hoverable" style={onClick ? { cursor: 'pointer', ...style } : style} onClick={onClick}>
      <div className="flex between">
        <div className="kpi-label">{icon && <span className="kpi-icon" style={toneIcon(tone)}><Icon name={icon} size={16} /></span>}{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {(delta || sub) && (
        <div className="flex between">
          <span className={cx('kpi-delta', deltaGood ? '' : 'muted')}>
            {delta && <Icon name={deltaGood ? 'arrowUp' : 'arrowDown'} size={13} style={{ color: deltaGood ? 'var(--primary)' : 'var(--danger)' }} />}
            {delta}
          </span>
          {sub && <span className="tiny faint">{sub}</span>}
        </div>
      )}
    </div>
  )
}
function toneIcon(tone: Tone): React.CSSProperties {
  const map: Record<Tone, [string, string]> = {
    green: ['var(--primary-soft)', 'var(--primary-ink)'],
    red: ['var(--danger-soft)', 'var(--danger-ink)'],
    amber: ['var(--warning-soft)', 'var(--warning-ink)'],
    blue: ['var(--blue-soft)', 'var(--blue-ink)'],
    violet: ['var(--violet-soft)', 'var(--violet-ink)'],
    sky: ['var(--sky-soft)', 'var(--sky-ink)'],
    gray: ['var(--gray-soft)', 'var(--muted)'],
  }
  const [bg, color] = map[tone] || map.gray
  return { background: bg, color }
}

// ============================== Modal ==============================
export function Modal({ open, onClose, title, children, footer, wide, xwide }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; xwide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cx('modal', wide && 'wide', xwide && 'xwide')}>
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            <IconBtn icon="x" onClick={onClose} label="Close" />
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message?: React.ReactNode; confirmLabel?: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </>
    }>
      <div className="muted" style={{ fontSize: 13.5 }}>{message}</div>
    </Modal>
  )
}

// ============================== Empty / Skeleton ==============================
export function EmptyState({ icon = 'file', title, desc, action }: { icon?: IconName; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <h4>{title}</h4>
      {desc && <p>{desc}</p>}
      {action && <div className="mt16">{action}</div>}
    </div>
  )
}

export function Skeleton({ h = 14, w = '100%', style }: { h?: number; w?: string | number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />
}

export function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card card-pad">
      <Skeleton h={22} w="38%" />
      <div className="mt16">
        {Array.from({ length: rows }).map((_, i) => (
          <div className="sk-row" key={i}>
            <Skeleton h={14} /><Skeleton h={14} /><Skeleton h={14} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================== Form controls ==============================
export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />
}

// ============================== Segmented / Tabs ==============================
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={cx(value === o.value && 'active')} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: React.ReactNode; icon?: IconName }[] }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.value} className={cx('tab', value === t.value && 'active')} onClick={() => onChange(t.value)}>
          {t.icon && <Icon name={t.icon} size={15} style={{ marginRight: 6, verticalAlign: -3 }} />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ============================== Money / Delta ==============================
export function Money({ value, currency, lang, sign, className }: { value: number; currency: Currency; lang: Lang; sign?: boolean; className?: string }) {
  const formatted = fmtMoney(value, currency, lang, { sign })
  return <span className={cx('mono', className)}>{formatted}</span>
}

export function MoneyCompact({ value, currency, lang, className }: { value: number; currency: Currency; lang: Lang; className?: string }) {
  return <span className={cx('mono', className)}>{fmtCompact(value, currency, lang)}</span>
}

export function Delta({ cur, prev, lang, invert = false }: { cur: number; prev: number; lang: Lang; invert?: boolean }) {
  if (!prev) return <span className="tiny faint">—</span>
  const pct = ((cur - prev) / Math.abs(prev)) * 100
  const flat = Math.abs(pct) < 0.05
  if (flat) return <span className="tiny faint">0%</span>
  const good = invert ? pct < 0 : pct > 0
  return (
    <span className="kpi-delta" style={{ color: good ? 'var(--primary)' : 'var(--danger)' }}>
      <Icon name={pct > 0 ? 'arrowUp' : 'arrowDown'} size={13} />
      {new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'uz-UZ', { maximumFractionDigits: 1 }).format(Math.abs(pct))}%
    </span>
  )
}

export function Progress({ value, tone = 'green', className }: { value: number; tone?: 'green' | 'warn' | 'danger'; className?: string }) {
  return (
    <div className={cx('progress', tone === 'warn' && 'warn', tone === 'danger' && 'danger', className)}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

// ============================== PageHeader ==============================
export function PageHeader({ title, sub, actions }: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  )
}

// ============================== Dropdown Menu ==============================
export interface MenuItem { label: React.ReactNode; icon?: IconName; onClick?: () => void; danger?: boolean; disabled?: boolean; divider?: boolean }
export function Menu({ trigger, items, align = 'right' }: { trigger: React.ReactNode; items: MenuItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex' }}>{trigger}</span>
      {open && (
        <div className={cx('menu-panel', align === 'left' && 'left')}>
          {items.map((it, i) => it.divider
            ? <div className="menu-divider" key={i} />
            : (
              <button key={i} className={cx('menu-item', it.danger && 'danger')} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick?.() }}>
                {it.icon && <Icon name={it.icon} size={15} />}
                {it.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
