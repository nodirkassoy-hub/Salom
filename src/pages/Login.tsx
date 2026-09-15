import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, Field, Input } from '../components/ui'
import { Icon, IconName } from '../components/icons'
import { initials } from '../lib/utils'
import type { Role } from '../lib/types'

const ROLES: { role: Role; label: string; desc: string; icon: IconName; hue: number }[] = [
  { role: 'owner', label: 'Direktor / Owner', desc: 'To‘liq boshqaruv, barcha modullar', icon: 'shield', hue: 156 },
  { role: 'accountant', label: 'Buxgalter', desc: 'Provodkalar, hisobotlar, soliq', icon: 'calc', hue: 210 },
  { role: 'manager', label: 'Menejer', desc: 'Savdo, mijozlar, ombor', icon: 'sales', hue: 30 },
  { role: 'viewer', label: 'Kuzatuvchi', desc: 'Faqat ko‘rish va eksport', icon: 'eye', hue: 330 },
]

export default function Login() {
  const { session, login, t } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('owner')

  if (session) return <Navigate to="/dashboard" replace />

  const enter = (r: Role) => { login(r); navigate('/dashboard') }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }} className="login-wrap">
      <div style={{ padding: '6vh 6vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <div className="flex" style={{ gap: 12 }}>
          <span className="brand-mark" style={{ width: 42, height: 42, fontSize: 18 }}>B</span>
          <div>
            <div className="brand-name" style={{ fontSize: 20 }}>BUXAI</div>
            <div className="brand-tag">{t('app.tagline')}</div>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.15 }}>
            Kompaniyangiz uchun<br />moliyaviy operatsion tizim
          </h1>
          <p className="muted" style={{ fontSize: 15, maxWidth: 440 }}>
            Real ikki tomonlama buxgalteriya, AI tahlil, Xato Radar va byudjet — hammasi bitta haqiqiy manbadan.
          </p>
        </div>

        <div className="flex-col" style={{ gap: 12 }}>
          <Field label={t('auth.email')}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.uz" autoComplete="username" />
          </Field>
          <Field label={t('auth.password')}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          <Button variant="primary" size="lg" block icon="lock" onClick={() => enter(role)} disabled={!email.trim() || !password.trim()}>
            {t('auth.signin')}
          </Button>
        </div>

        <div className="divider" />
        <div className="flex-col" style={{ gap: 10 }}>
          <div className="tiny faint uppercase" style={{ letterSpacing: '0.08em' }}>{t('auth.demo')} — {t('auth.role')}</div>
          {ROLES.map((r) => (
            <button key={r.role} className={role === r.role ? 'filter-chip active' : 'filter-chip'} style={{ justifyContent: 'flex-start', padding: '12px 14px', borderRadius: 12, width: '100%', textAlign: 'left' }} onClick={() => { setRole(r.role); enter(r.role) }}>
              <span className="company-dot" style={{ background: `hsl(${r.hue}, 62%, 45%)` }}><Icon name={r.icon} size={14} /></span>
              <span style={{ textAlign: 'left', flex: 1 }}>
                <span className="strong" style={{ display: 'block', fontSize: 13.5 }}>{r.label}</span>
                <span className="tiny muted">{r.desc}</span>
              </span>
              <Icon name="arrowRight" size={15} />
            </button>
          ))}
        </div>
      </div>

      <div className="login-art" style={{ background: 'linear-gradient(150deg, #07291f, #0b5c41 45%, #0b9f6a)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="login-glass" style={{ position: 'relative', zIndex: 2, maxWidth: 460, width: '90%' }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 20, padding: 26, color: '#fff' }}>
            <div className="flex between">
              <span className="badge badge-green" style={{ background: 'rgba(255,255,255,0.16)', color: '#d6ffe9' }}>AI CFO</span>
              <span className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>real-time</span>
            </div>
            <div className="health-ring" style={{ margin: '18px auto', width: 150, height: 150 }}>
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="64" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="12" />
                <circle cx="75" cy="75" r="64" fill="none" stroke="#35e3a6" strokeWidth="12" strokeDasharray={`${0.89 * 2 * Math.PI * 64} ${2 * Math.PI * 64}`} strokeLinecap="round" />
              </svg>
              <div className="center">
                <div className="score" style={{ color: '#fff' }}>89</div>
                <div className="tiny" style={{ color: 'rgba(255,255,255,0.7)' }}>barqarorlik</div>
              </div>
            </div>
            <div className="flex-col" style={{ gap: 10 }}>
              {[['Daromad', '+18.2%', '#5ff0b5'], ['Xarajatlar', '-3.4%', '#ffb4b4'], ['Sof foyda', '+41.0%', '#5ff0b5']].map(([k, v, c]) => (
                <div className="flex between" key={k as string} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{k}</span>
                  <span className="mono" style={{ fontWeight: 700, color: c as string }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="tiny mt16" style={{ color: 'rgba(255,255,255,0.55)' }}>Barcha raqamlar bitta real buxgalteriya daftaridan olinadi.</div>
          </div>
        </div>
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,227,166,0.25), transparent 70%)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,255,0.22), transparent 70%)', bottom: -60, left: -60 }} />
      </div>
    </div>
  )
}
