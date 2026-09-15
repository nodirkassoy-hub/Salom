import React, { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Card, CardHead, Button, Field, Input, Select, Segmented, useToast, Confirm } from '../components/ui'
import type { Currency, Lang } from '../lib/types'

export default function Settings() {
  const { company, updateCompany, updateSettings, setLanguage, lang, resetDemo, t, can } = useStore()
  const toast = useToast()
  const [resetOpen, setResetOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: company?.name ?? '', fullName: company?.fullName ?? '', taxId: company?.taxId ?? '', vatNo: company?.vatNo ?? '',
    director: company?.director ?? '', accountant: company?.accountant ?? '', phone: company?.phone ?? '', email: company?.email ?? '',
    address: company?.address ?? '', bankName: company?.bankName ?? '', accountNo: company?.accountNo ?? '', mfo: company?.mfo ?? '',
  })
  const [tax, setTax] = useState({ vatRate: company?.settings.vatRate ?? 0.12, turnoverTaxRate: company?.settings.turnoverTaxRate ?? 0.04, vatRegistered: company?.settings.vatRegistered ?? false })
  const [cur, setCur] = useState<Currency>(company?.currency ?? 'UZS')

  if (!company) return null
  const allowed = can('manageSettings')

  const saveProfile = () => { updateCompany(profile); toast('success', 'Saqlandi') }
  const saveTax = () => { updateSettings({ ...tax, currency: cur }); toast('success', 'Saqlandi') }

  return (
    <div className="anim-in">
      <PageHeader title={t('nav.settings')} sub="Kompaniya rekvizitlari, soliq va valyuta sozlamalari" />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card pad>
          <CardHead title="Kompaniya rekvizitlari" sub="Fakturalar va shartnomalarda ko‘rinadi" />
          <div className="form-grid">
            <Field label="Qisqa nom"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!allowed} /></Field>
            <Field label="To‘liq nom"><Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} disabled={!allowed} /></Field>
            <Field label="STIR (INN)"><Input value={profile.taxId} onChange={(e) => setProfile({ ...profile, taxId: e.target.value })} disabled={!allowed} /></Field>
            <Field label="QQS guvohnoma №"><Input value={profile.vatNo} onChange={(e) => setProfile({ ...profile, vatNo: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Rahbar"><Input value={profile.director} onChange={(e) => setProfile({ ...profile, director: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Bosh buxgalter"><Input value={profile.accountant} onChange={(e) => setProfile({ ...profile, accountant: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Telefon"><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Email"><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Yuridik manzil"><Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Bank"><Input value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} disabled={!allowed} /></Field>
            <Field label="Hisob raqami"><Input value={profile.accountNo} onChange={(e) => setProfile({ ...profile, accountNo: e.target.value })} disabled={!allowed} /></Field>
            <Field label="MFO"><Input value={profile.mfo} onChange={(e) => setProfile({ ...profile, mfo: e.target.value })} disabled={!allowed} /></Field>
          </div>
          {allowed && <Button className="mt16" variant="primary" onClick={saveProfile}>Saqlash</Button>}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card pad>
            <CardHead title="Soliq sozlamalari" />
            <div className="form-grid">
              <Field label="QQS stavkasi (%)"><Input type="number" step={0.01} value={String(tax.vatRate)} onChange={(e) => setTax({ ...tax, vatRate: Number(e.target.value) })} disabled={!allowed} /></Field>
              <Field label="Aylanma soliq (%)"><Input type="number" step={0.01} value={String(tax.turnoverTaxRate)} onChange={(e) => setTax({ ...tax, turnoverTaxRate: Number(e.target.value) })} disabled={!allowed} /></Field>
              <Field label="QQS to‘lovchi"><input type="checkbox" checked={tax.vatRegistered} onChange={(e) => setTax({ ...tax, vatRegistered: e.target.checked })} disabled={!allowed} /></Field>
              <Field label="Valyuta">
                <Select value={cur} onChange={(e) => setCur(e.target.value as Currency)} disabled={!allowed}>
                  <option value="UZS">UZS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="RUB">RUB</option>
                </Select>
              </Field>
            </div>
            {allowed && <Button className="mt16" variant="primary" onClick={saveTax}>Saqlash</Button>}
          </Card>

          <Card pad>
            <CardHead title="Interfeys tili" />
            <Segmented<Lang> value={lang} onChange={(l) => { setLanguage(l); toast('success', 'Til o‘zgartirildi') }} options={[{ value: 'uz', label: 'O‘zbekcha' }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} />
          </Card>

          <Card pad style={{ borderColor: 'var(--danger-soft)' }}>
            <CardHead title="Xavfli hudud" />
            <Button variant="soft-danger" icon="refresh" onClick={() => setResetOpen(true)}>Demo ma’lumotlarni tiklash</Button>
          </Card>
        </div>
      </div>
      <Confirm open={resetOpen} onClose={() => setResetOpen(false)} danger title="Demo ma’lumotlarni tiklash" message="Barcha ma’lumotlar dastlabki demo holatiga qaytariladi." confirmLabel="Tiklash" onConfirm={() => { resetDemo(); toast('success', 'Tiklandi') }} />
    </div>
  )
}
