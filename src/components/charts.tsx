import React from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, ComposedChart, Legend, Line,
} from 'recharts'
import { fmtMoney, fmtCompact } from '../lib/money'
import type { Currency, Lang } from '../lib/types'

export const PALETTE = ['#0b9f6a', '#2f7cf6', '#7c5cff', '#f59e0b', '#0ea5e9', '#e5484d', '#14b8a6', '#f97316', '#6366f1', '#d946ef']
export const DONUT_COLORS = ['#0b9f6a', '#2f7cf6', '#7c5cff', '#0ea5e9', '#f59e0b', '#14b8a6', '#f97316', '#e5484d', '#94a3b8', '#6366f1']

interface ChartProps {
  height?: number
  currency: Currency
  lang: Lang
}

const axisFmt = (currency: Currency, lang: Lang) => (v: number) => fmtCompact(Math.round(v), currency, lang)

interface TooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  currency: Currency
  lang: Lang
  moneyKeys: string[]
}

function ChartTooltip({ active, payload, label, currency, lang, moneyKeys }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e7eaf0', borderRadius: 10, padding: '10px 12px', boxShadow: '0 12px 32px rgba(16,24,40,.14)', fontSize: 12.5 }}>
      {label != null && <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color || p.fill }} />
          <span style={{ color: '#64748b' }}>{p.name}:</span>
          <span className="mono" style={{ fontWeight: 650 }}>
            {moneyKeys.includes(p.dataKey) ? fmtMoney(Math.round(p.value), currency, lang) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Grid() {
  return <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
}

// Revenue vs expenses area
export function TrendArea({ data, height = 280, currency, lang }: ChartProps & { data: { label: string; revenue: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b9f6a" stopOpacity={0.28} /><stop offset="100%" stopColor="#0b9f6a" stopOpacity={0} /></linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5484d" stopOpacity={0.18} /><stop offset="100%" stopColor="#e5484d" stopOpacity={0} /></linearGradient>
        </defs>
        <Grid />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={axisFmt(currency, lang)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
        <Tooltip content={<ChartTooltip currency={currency} lang={lang} moneyKeys={['revenue', 'expenses']} />} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0b9f6a" strokeWidth={2.2} fill="url(#gRev)" />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e5484d" strokeWidth={2.2} fill="url(#gExp)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Profit trend line
export function ProfitLine({ data, height = 260, currency, lang }: ChartProps & { data: { label: string; profit: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c5cff" stopOpacity={0.28} /><stop offset="100%" stopColor="#7c5cff" stopOpacity={0} /></linearGradient>
        </defs>
        <Grid />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={axisFmt(currency, lang)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
        <Tooltip content={<ChartTooltip currency={currency} lang={lang} moneyKeys={['profit']} />} />
        <Area type="monotone" dataKey="profit" name="Profit" stroke="#7c5cff" strokeWidth={2.2} fill="url(#gProfit)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Donut breakdown
export function Donut({ data, height = 260, currency, lang }: ChartProps & { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={<ChartTooltip currency={currency} lang={lang} moneyKeys={['value']} />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="tiny faint uppercase">Total</div>
          <div className="mono strong" style={{ fontSize: 15 }}>{fmtMoney(total, currency, lang)}</div>
        </div>
      </div>
    </div>
  )
}

// Legend list for donut
export function DonutLegend({ data, currency, lang }: { data: { name: string; value: number }[]; currency: Currency; lang: Lang }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <div className="flex-col" style={{ gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} className="flex between" style={{ fontSize: 12.5 }}>
          <span className="flex" style={{ gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
            <span className="muted">{d.name}</span>
          </span>
          <span className="flex" style={{ gap: 10 }}>
            <span className="mono">{fmtMoney(d.value, currency, lang)}</span>
            <span className="tiny faint" style={{ width: 40, textAlign: 'right' }}>{((d.value / total) * 100).toFixed(0)}%</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// Cash-flow forecast: inflow/outflow bars + balance line
export function ForecastChart({ data, height = 320, currency, lang }: ChartProps & { data: { label: string; inflow: number; outflow: number; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <Grid />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={axisFmt(currency, lang)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
        <Tooltip content={<ChartTooltip currency={currency} lang={lang} moneyKeys={['inflow', 'outflow', 'balance']} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="inflow" name="Inflow" fill="#0b9f6a" radius={[4, 4, 0, 0]} barSize={14} />
        <Bar dataKey="outflow" name="Outflow" fill="#fda4af" radius={[4, 4, 0, 0]} barSize={14} />
        <Line type="monotone" dataKey="balance" name="Balance" stroke="#2f7cf6" strokeWidth={2.2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Simple vertical bars
export function BarSeries({ data, height = 260, currency, lang, bars }: ChartProps & { data: Record<string, number | string>[]; bars: { key: string; name: string; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <Grid />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={axisFmt(currency, lang)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
        <Tooltip content={<ChartTooltip currency={currency} lang={lang} moneyKeys={bars.map((b) => b.key)} />} />
        {bars.map((b) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[4, 4, 0, 0]} barSize={16} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
