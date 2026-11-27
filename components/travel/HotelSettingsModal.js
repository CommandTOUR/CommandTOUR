'use client'

// Hotel Settings: every field of the event's hotel. Renders in a portal at the shared popup z-index.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import MoneyInput, { formatMoneyInput } from '@/components/MoneyInput'
import { Z_POPUP } from '@/components/staffing/shared'
import { FONT, FS, LINE, SMALL_LABEL, INPUT, BTN, BTN_P, BTN_S } from './shared'

const TEXT = ['hotel_name', 'address', 'phone', 'onsite_contact', 'notes']
const MONEY = ['single_rate', 'double_rate', 'suite_rate', 'other_fee', 'self_parking_rate', 'valet_parking_rate']
const DATES = ['check_in_date', 'check_out_date', 'cutoff_date', 'reservation_date', 'rooming_list_sent_on']

const initial = (hotel) => {
  const f = {}
  for (const k of TEXT) f[k] = hotel?.[k] || ''
  for (const k of MONEY) f[k] = hotel?.[k] === null || hotel?.[k] === undefined ? '' : formatMoneyInput(hotel[k])
  f.tax_rate = hotel?.tax_rate === null || hotel?.tax_rate === undefined ? '' : String(hotel.tax_rate)
  for (const k of DATES) f[k] = hotel?.[k] || ''
  return f
}

const Fld = ({ label, children, span = 1 }) => (
  <div style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
    <div style={{ ...SMALL_LABEL, marginBottom: 5 }}>{label}</div>
    {children}
  </div>
)

export default function HotelSettingsModal({ hotel, saving, onSave, onClose }) {
  const [f, setF] = useState(() => initial(hotel))
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const text = (k, label, span) => <Fld label={label} span={span}><input style={INPUT} value={f[k]} onChange={e => set(k, e.target.value)} /></Fld>
  const money = (k, label) => <Fld label={label}><MoneyInput inputStyle={INPUT} prefixLeft={10} value={f[k]} onChange={v => set(k, v)} /></Fld>
  const date = (k, label) => <Fld label={label}><input type="date" style={INPUT} value={f[k]} onChange={e => set(k, e.target.value)} /></Fld>

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} className="travel-modal" style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(20,33,58,0.45)', padding: '36px 20px', overflowY: 'auto', fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-label="Hotel Settings" style={{ background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, width: 860, maxWidth: '100%', boxShadow: '0 20px 60px rgba(20,33,58,0.3)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: FS.title, fontWeight: 700 }}>Hotel Settings</div>
          <button type="button" onClick={onClose} style={BTN_S}>Close</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 14px' }}>
          {text('hotel_name', 'Hotel Name', 2)}{text('address', 'Address', 2)}
          {text('phone', 'Phone')}{text('onsite_contact', 'Onsite Contact', 3)}
          {money('single_rate', 'Single Rate')}{money('double_rate', 'Double Rate')}{money('suite_rate', 'Suite Rate')}
          <Fld label="Tax Percent"><input style={INPUT} inputMode="decimal" value={f.tax_rate} onChange={e => set('tax_rate', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /></Fld>
          {money('other_fee', 'Other Fee Per Night')}{money('self_parking_rate', 'Self Parking Rate')}{money('valet_parking_rate', 'Valet Parking Rate')}<div />
          {date('check_in_date', 'Group Check In')}{date('check_out_date', 'Group Check Out')}{date('cutoff_date', 'Cutoff Date')}{date('reservation_date', 'Reservation Date')}
          {date('rooming_list_sent_on', 'Rooming List Sent On')}{text('notes', 'Notes', 3)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${LINE}`, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderRadius: '0 0 10px 10px' }}>
          <button type="button" onClick={onClose} style={BTN}>Cancel</button>
          <button type="button" disabled={saving} onClick={() => onSave(f)} style={{ ...BTN_P, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save Hotel'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
