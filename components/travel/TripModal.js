'use client'

// Add / Edit Trip. Renders in a portal on document.body at the shared popup z-index.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconPlus, IconTrash } from '@tabler/icons-react'
import { TRIP_MODES, TRIP_TYPES, TRIP_STATUSES, hasFlightFields, segmentModeFor } from '@/lib/travel/trips'
import { Z_POPUP } from '@/components/staffing/shared'
import { personName, FONT, INPUT, LABEL, BTN_PRIMARY, BTN_GHOST } from './shared'

const blankSegment = (mode) => ({ mode: segmentModeFor(mode), airline: '', flight_number: '', from_airport: '', to_airport: '', depart_date: '', depart_time: '', arrive_date: '', arrive_time: '' })
const fromTrip = (t) => (t.segments || []).map(s => ({
  mode: s.mode, airline: s.airline || '', flight_number: s.flight_number || '', from_airport: s.from_airport || '', to_airport: s.to_airport || '',
  depart_date: s.depart_date || '', depart_time: (s.depart_time || '').slice(0, 5), arrive_date: s.arrive_date || '', arrive_time: (s.arrive_time || '').slice(0, 5),
}))
const segmentHasData = (s, flight) => ['depart_date', 'depart_time', 'arrive_date', 'arrive_time', ...(flight ? ['airline', 'flight_number', 'from_airport', 'to_airport'] : [])].some(k => String(s[k] || '').trim() !== '')

const Field = ({ label, children, width }) => (
  <div style={{ flex: width ? `0 0 ${width}` : 1, minWidth: 0 }}>
    <label style={LABEL}>{label}</label>
    {children}
  </div>
)

//   trip     existing trip (edit) or null (add)
//   preset   { staffId, direction } when adding from a row
//   trips    all trips for the event (to stop a second trip in the same direction for one person)
export default function TripModal({ trip, preset, staffList, trips, saving, onSave, onClose }) {
  const editing = !!trip
  const [staffId, setStaffId] = useState(trip?.staff_id || preset?.staffId || '')
  const [direction, setDirection] = useState(trip?.direction || preset?.direction || 'in')
  const [mode, setMode] = useState(trip?.mode || 'flying')
  const [tripType, setTripType] = useState(trip?.trip_type || '')
  const [status, setStatus] = useState(trip?.status || 'not_started')
  const [confirmation, setConfirmation] = useState(trip?.confirmation || '')
  const [notes, setNotes] = useState(trip?.notes || '')
  const [segments, setSegments] = useState(() => (trip && trip.segments?.length ? fromTrip(trip) : [blankSegment(trip?.mode || 'flying')]))
  const [error, setError] = useState('')
  const flight = hasFlightFields(mode)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const duplicate = useMemo(() => !editing && staffId && trips.some(t => t.staff_id === staffId && t.direction === direction), [editing, staffId, direction, trips])

  const changeMode = (m) => {
    setMode(m)
    setSegments(prev => {
      const segMode = segmentModeFor(m)
      const next = prev.map(s => ({ ...s, mode: segMode }))
      return hasFlightFields(m) ? next : [{ ...blankSegment(m), depart_date: next[0]?.depart_date || '', depart_time: next[0]?.depart_time || '', arrive_date: next[0]?.arrive_date || '', arrive_time: next[0]?.arrive_time || '' }]
    })
  }
  const setSeg = (i, k, v) => setSegments(prev => prev.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  const submit = () => {
    setError('')
    if (!staffId) { setError('Choose a staff member.'); return }
    if (duplicate) { setError('This person already has a trip in this direction. Edit that trip instead.'); return }
    const kept = segments.filter(s => segmentHasData(s, flight)).map(s => (flight ? s : { mode: s.mode, depart_date: s.depart_date, depart_time: s.depart_time, arrive_date: s.arrive_date, arrive_time: s.arrive_time }))
    if (status === 'not_started' && kept.length === 0 && !confirmation.trim()) { setError('Enter a segment, a confirmation, or set a status to save this trip.'); return }
    onSave({ tripId: trip?.id || null, staffId, direction, fields: { mode, trip_type: tripType || null, status, confirmation: confirmation.trim() || null, notes: notes.trim() || null }, segments: kept })
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit Trip' : 'Add Trip'} style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: '22px 26px', width: 760, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{editing ? 'Edit Trip' : 'Add Trip'}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}><IconX size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Staff">
            <select value={staffId} disabled={editing} onChange={e => setStaffId(e.target.value)} style={{ ...INPUT, cursor: editing ? 'default' : 'pointer', opacity: editing ? 0.7 : 1 }}>
              <option value="">Select Staff Member</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{personName(s)}</option>)}
            </select>
          </Field>
          <Field label="Direction" width="180px">
            <select value={direction} disabled={editing} onChange={e => setDirection(e.target.value)} style={{ ...INPUT, cursor: editing ? 'default' : 'pointer', opacity: editing ? 0.7 : 1 }}>
              <option value="in">To Event</option>
              <option value="out">From Event</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Mode"><select value={mode} onChange={e => changeMode(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>{TRIP_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
          <Field label="Trip Type (Optional)"><select value={tripType} onChange={e => setTripType(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}><option value="">None</option>{TRIP_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
          <Field label="Status"><select value={status} onChange={e => setStatus(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>{TRIP_STATUSES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-info)' }}>{flight ? 'Segments' : 'Dates'}</div>
            {flight && <button type="button" onClick={() => setSegments(prev => [...prev, blankSegment(mode)])} style={{ ...BTN_GHOST, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, padding: '5px 12px' }}><IconPlus size={14} /> Add Segment</button>}
          </div>
          {segments.map((s, i) => (
            <div key={i} style={{ border: '0.5px solid var(--border-default)', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flight && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <Field label={`${mode === 'flying' ? 'Airline' : 'Carrier'}`}><input style={INPUT} value={s.airline} onChange={e => setSeg(i, 'airline', e.target.value)} /></Field>
                  <Field label="Flight Number" width="150px"><input style={INPUT} value={s.flight_number} onChange={e => setSeg(i, 'flight_number', e.target.value)} /></Field>
                  <Field label="From" width="90px"><input style={{ ...INPUT, textTransform: 'uppercase' }} maxLength={4} value={s.from_airport} onChange={e => setSeg(i, 'from_airport', e.target.value)} placeholder="ABC" /></Field>
                  <Field label="To" width="90px"><input style={{ ...INPUT, textTransform: 'uppercase' }} maxLength={4} value={s.to_airport} onChange={e => setSeg(i, 'to_airport', e.target.value)} placeholder="XYZ" /></Field>
                  {segments.length > 1 && <button type="button" onClick={() => setSegments(prev => prev.filter((_, j) => j !== i))} aria-label="Remove Segment" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '10px 4px' }}><IconTrash size={18} stroke={1.75} /></button>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Depart Date"><input type="date" style={INPUT} value={s.depart_date} onChange={e => setSeg(i, 'depart_date', e.target.value)} /></Field>
                <Field label="Depart Time"><input type="time" style={INPUT} value={s.depart_time} onChange={e => setSeg(i, 'depart_time', e.target.value)} /></Field>
                <Field label="Arrive Date"><input type="date" style={INPUT} value={s.arrive_date} onChange={e => setSeg(i, 'arrive_date', e.target.value)} /></Field>
                <Field label="Arrive Time"><input type="time" style={INPUT} value={s.arrive_time} onChange={e => setSeg(i, 'arrive_time', e.target.value)} /></Field>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Times are saved as entered, in local time.</div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Confirmation" width="260px"><input style={INPUT} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></Field>
          <Field label="Notes"><input style={INPUT} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ground Transport: …" /></Field>
        </div>

        {(error || duplicate) && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)' }}>{error || 'This person already has a trip in this direction. Edit that trip instead.'}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={BTN_GHOST}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving || duplicate} style={{ ...BTN_PRIMARY, opacity: saving || duplicate ? 0.6 : 1, cursor: saving || duplicate ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Save Trip'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
