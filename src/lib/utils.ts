export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function initials(name: string): string {
  const parts = (name || '?').trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + second).toUpperCase() || '?'
}

const AVATAR_COLORS = [
  '#0b9f6a', '#2f7cf6', '#7c5cff', '#e5484d', '#f5a623',
  '#0ea5e9', '#d946ef', '#f97316', '#14b8a6', '#6366f1',
]

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]): void {
  const esc = (v: string | number | boolean | null | undefined): string => {
    const s = String(v ?? '')
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const body = rows.map((r) => r.map(esc).join(',')).join('\n')
  downloadBlob(filename, body, 'text/csv;charset=utf-8')
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json')
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const k = keyFn(it)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(it)
  }
  return map
}

export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((s, it) => s + fn(it), 0)
}

export function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n))
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 250) {
  let t: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
