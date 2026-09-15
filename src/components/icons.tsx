import React from 'react'

type P = { size?: number; className?: string; style?: React.CSSProperties }

const S = ({ size = 18, children, ...rest }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
)

export const I = {
  dashboard: (p: P) => <S {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>,
  work: (p: P) => <S {...p}><path d="M9 6h6l1 3h5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9h5l1-3Z" /><path d="m9 12 2 2 4-4" /></S>,
  calc: (p: P) => <S {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></S>,
  sales: (p: P) => <S {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></S>,
  cart: (p: P) => <S {...p}><circle cx="9" cy="21" r="1.4" /><circle cx="19" cy="21" r="1.4" /><path d="M2 3h3l2.6 12.4a1.5 1.5 0 0 0 1.47 1.16h7.9a1.5 1.5 0 0 0 1.45-1.13L21 8H6" /></S>,
  bank: (p: P) => <S {...p}><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></S>,
  box: (p: P) => <S {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></S>,
  users: (p: P) => <S {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></S>,
  file: (p: P) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></S>,
  report: (p: P) => <S {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="0.5" /><rect x="12" y="7" width="3" height="10" rx="0.5" /><rect x="17" y="13" width="3" height="4" rx="0.5" /></S>,
  sparkles: (p: P) => <S {...p}><path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15.4l-1.6-4.6L6 9.2l4.4-1.6L12 3Z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></S>,
  target: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></S>,
  percent: (p: P) => <S {...p}><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></S>,
  calendarCheck: (p: P) => <S {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18M9 16l2 2 4-4" /></S>,
  bell: (p: P) => <S {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></S>,
  gear: (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></S>,
  search: (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>,
  chevronDown: (p: P) => <S {...p}><path d="m6 9 6 6 6-6" /></S>,
  chevronRight: (p: P) => <S {...p}><path d="m9 6 6 6-6 6" /></S>,
  chevronLeft: (p: P) => <S {...p}><path d="m15 6-6 6 6 6" /></S>,
  plus: (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  arrowUp: (p: P) => <S {...p}><path d="M12 19V5M5 12l7-7 7 7" /></S>,
  arrowDown: (p: P) => <S {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></S>,
  arrowRight: (p: P) => <S {...p}><path d="M5 12h14M12 5l7 7-7 7" /></S>,
  download: (p: P) => <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></S>,
  upload: (p: P) => <S {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></S>,
  edit: (p: P) => <S {...p}><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></S>,
  trash: (p: P) => <S {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></S>,
  copy: (p: P) => <S {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></S>,
  eye: (p: P) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></S>,
  printer: (p: P) => <S {...p}><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></S>,
  dots: (p: P) => <S {...p}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></S>,
  x: (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>,
  check: (p: P) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>,
  checkCircle: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-4.5" /></S>,
  alert: (p: P) => <S {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>,
  filter: (p: P) => <S {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" /></S>,
  wallet: (p: P) => <S {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></S>,
  fileText: (p: P) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></S>,
  refresh: (p: P) => <S {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></S>,
  external: (p: P) => <S {...p}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></S>,
  send: (p: P) => <S {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></S>,
  globe: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></S>,
  building: (p: P) => <S {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></S>,
  receipt: (p: P) => <S {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 8h8M8 12h8M8 16h5" /></S>,
  shield: (p: P) => <S {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></S>,
  moon: (p: P) => <S {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></S>,
  sun: (p: P) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>,
  lock: (p: P) => <S {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></S>,
  menu: (p: P) => <S {...p}><path d="M4 6h16M4 12h16M4 18h16" /></S>,
  clock: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>,
  tag: (p: P) => <S {...p}><path d="M12 2H2v10l9.3 9.3a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8L12 2Z" /><circle cx="7" cy="7" r="1.4" /></S>,
  trend: (p: P) => <S {...p}><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></S>,
  logout: (p: P) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>,
  landmark: (p: P) => <S {...p}><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 3 7h18l-9-5Z" /></S>,
  layers: (p: P) => <S {...p}><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 12 10 5 10-5M2 17l10 5 10-5" /></S>,
  radar: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /><path d="M12 12 18 5" /></S>,
  infinity: (p: P) => <S {...p}><path d="M12 12c-2-2.5-5-2.5-7 0s-2 5 0 7 5 2.5 7 0 5-2.5 7 0 2 5 0 7-5 2.5-7 0Z" /></S>,
  flag: (p: P) => <S {...p}><path d="M4 22V4a1 1 0 0 1 1-1h14l-4 6 4 6H5" /></S>,
}

export type IconName = keyof typeof I

export function Icon({ name, ...rest }: P & { name: IconName }) {
  const C = I[name]
  return <C {...rest} />
}
