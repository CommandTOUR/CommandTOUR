'use client'

// Add / Edit Trip, styled like the mockup's Flight Request modal. Renders in a portal on document.body at the shared popup z-index.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSupabase } from '@/lib/supabase'
import { TRIP_MODES, TRIP_TYPES, TRIP_STATUS_MENU, TRIP_STATUSES, COST_CATEGORIES, hasFlightFields, segmentModeFor } from '@/lib/travel/trips'
import { mileageAmount } from '@/lib/travel/costs'
import MoneyInput, { formatMoneyInput } from '@/components/MoneyInput'
import { loadTravelerPrefs } from '@/lib/travel/prefs'
import { parseTime, formatTime } from '@/lib/travel/time'
import { Z_POPUP } from '@/components/staffing/shared'
import { personName, FONT, LINE, SMALL_LABEL, INPUT, BTN, BTN_P, BTN_S } from './shared'

const blankSegment = (mode, airline = '') => ({ mode: segmentModeFor(mode), airline, flight_number: '', from_airport: '', to_airport: '', depart_date: '', depart_time: '', arrive_date: '', arrive_time: '' })
const fromTrip = (t) => (t.segments || []).map(s => ({
  mode: s.mode, airline: s.airline || '', flight_number: s.flight_number || '', from_airport: s.from_airport || '', to_airport: s.to_airport || '',
  depart_date: s.depart_date || '', depart_time: (s.depart_time || '').slice(0, 5), arrive_date: s.arrive_date || '', arrive_time: (s.arrive_time || '').slice(0, 5),
}))
const segmentHasData = (s, flight) => ['depart_date', 'depart_time', 'arrive_date', 'arrive_time', ...(flight ? ['airline', 'flight_number', 'from_airport', 'to_airport'] : [])].some(k => String(s[k] || '').trim() !== '')

const Fld = ({ label, children, flex = 1, basis }) => (
  <div style={{ flex: basis ? `0 0 ${basis}` : flex, minWidth: 0 }}>
    <div style={{ ...SMALL_LABEL, marginBottom: 5 }}>{label}</div>
    {children}
  </div>
)
const Who = ({ label, value }) => (
  <div style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: '7px 12px', background: 'var(--surface-raised, rgba(0,0,0,0.03))' }}>
    <div style={SMALL_LABEL}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</div>
  </div>
)

// "2:30p", "1430" ... accepted; shown as "2:30 PM" once you leave the field; stored as HH:MM
function TimeField({ value, onChange, onInvalid, onEnter }) {
  const [text, setText] = useState(value ? formatTime(value) : '')
  const [bad, setBad] = useState(false)
  useEffect(() => { setText(value ? formatTime(value) : '') }, [value])
  const commit = () => {
    const r = parseTime(text)
    setBad(!r.ok); onInvalid?.(!r.ok)
    if (r.ok) { onChange(r.value); setText(r.value ? formatTime(r.value) : '') }
  }
  return <input style={{ ...INPUT, borderColor: bad ? 'var(--color-danger)' : LINE }} value={text} placeholder="2:30 PM" onChange={e => setText(e.target.value)} onBlur={commit}
    onKeyDown={e => { if (e.key === 'Enter') { commit(); onEnter?.() } }} />
}

//   trip     existing trip (edit) or null (add)
//   preset   { staffId, direction, role } when adding from a row
//   trips    entered trips for the event (to stop a second trip in the same direction for one person)
//   suggest  { airlines, airports } already used on other trips
export default function TripModal({ trip, preset, staffList, trips, suggest, mileageRate = 0, saving, onSave, onClose }) {
  const editing = !!trip
  const [staffId, setStaffId] = useState(trip?.staff_id || preset?.staffId || '')
  const [direction, setDirection] = useState(trip?.direction || preset?.direction || 'in')
  const [mode, setMode] = useState(trip?.mode || 'flying')
  const [tripType, setTripType] = useState(trip?.trip_type || '')
  const [status, setStatus] = useState(trip?.status || 'hold')
  const [confirmation, setConfirmation] = useState(trip?.confirmation || '')
  const [notes, setNotes] = useState(trip?.notes || '')
  const [segments, setSegments] = useState(() => (trip && trip.segments?.length ? fromTrip(trip) : [blankSegment(trip?.mode || 'flying')]))
  const [costs, setCosts] = useState(() => (trip?.costs || []).map(c => ({ category: c.category, miles: c.miles ?? '', estimated: formatMoneyInput(c.estimated), actual: c.actual === null || c.actual === undefined ? '' : formatMoneyInput(c.actual), note: c.note || '' })))
  const [prefs, setPrefs] = useState({ homeAirport: '', preferredAirline: '', airlines: [], airports: [] })
  const [badTimes, setBadTimes] = useState(0)
  const [error, setError] = useState('')
  const filledByPrefs = useRef({ home: '', airline: '' }) // what we pre-filled, so a change of traveler can replace it but never a typed value
  const flight = hasFlightFields(mode)
  const uid = useRef(`m${Math.random().toString(36).slice(2, 8)}`).current
  const person = staffList.find(s => s.id === staffId)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // what we know about this traveler (their airlines and airports come first in the suggestions)
  useEffect(() => {
    let live = true
    loadTravelerPrefs(getSupabase(), staffId).then(p => { if (live) setPrefs(p) }).catch(() => {})
    return () => { live = false }
  }, [staffId])

  // Pre-fill (new trips only; never over something typed): the first segment's From (To trips) or the last segment's To (From trips)
  // is the home airport, and each blank Airline is the preferred airline.
  useEffect(() => {
    if (editing || !flight) return
    const prev = filledByPrefs.current
    setSegments(list => list.map((s, i) => {
      const next = { ...s }
      if (!next.airline || next.airline === prev.airline) next.airline = prefs.preferredAirline || ''
      const homeField = direction === 'in' ? 'from_airport' : 'to_airport'
      const homeIndex = direction === 'in' ? 0 : list.length - 1
      const otherField = direction === 'in' ? 'to_airport' : 'from_airport'
      if (i === homeIndex) { if (!next[homeField] || next[homeField] === prev.home) next[homeField] = prefs.homeAirport || '' }
      else if (next[homeField] === prev.home && prev.home) next[homeField] = ''
      if (next[otherField] === prev.home && prev.home && i === homeIndex) next[otherField] = ''
      return next
    }))
    filledByPrefs.current = { home: prefs.homeAirport || '', airline: prefs.preferredAirline || '' }
  }, [prefs, direction, segments.length, flight, editing])

  const duplicate = useMemo(() => !editing && staffId && trips.some(t => t.staff_id === staffId && t.direction === direction), [editing, staffId, direction, trips])

  const changeMode = (m) => {
    setMode(m)
    setSegments(prev => {
      const segMode = segmentModeFor(m)
      const next = prev.map(s => ({ ...s, mode: segMode }))
      return hasFlightFields(m) ? next : [{ ...blankSegment(m), depart_date: next[0]?.depart_date || '', depart_time: next[0]?.depart_time || '', arrive_date: next[0]?.arrive_date || '', arrive_time: next[0]?.arrive_time || '' }]
    })
  }
  const setCost = (i, patch) => setCosts(prev => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const setSeg = (i, k, v) => setSegments(prev => prev.map((s, j) => (j === i ? { ...s, [k]: v } : s)))

  const submit = () => {
    setError('')
    if (!staffId) { setError('Choose a staff member.'); return }
    if (duplicate) { setError('This person already has a trip in this direction. Edit that trip instead.'); return }
    if (badTimes > 0) { setError('Check the times: use a format like 2:30 PM or 1430.'); return }
    const kept = segments.filter(s => segmentHasData(s, flight)).map(s => (flight ? s : { mode: s.mode, depart_date: s.depart_date, depart_time: s.depart_time, arrive_date: s.arrive_date, arrive_time: s.arrive_time }))
    if (status === 'hold' && kept.length === 0 && !confirmation.trim()) { setError('Enter a segment, a confirmation, or set a status to save this trip.'); return }
    const keptCosts = costs.filter(c => String(c.estimated).trim() || String(c.actual).trim() || String(c.note).trim())
    onSave({ tripId: trip?.id || null, staffId, direction, costs: keptCosts, fields: { mode, trip_type: tripType || null, status, confirmation: confirmation.trim() || null, notes: notes.trim() || null }, segments: kept })
  }

  const airlineOpts = [...new Set([...prefs.airlines, ...(suggest?.airlines || [])])]
  const airportOpts = [...new Set([...prefs.airports, ...(suggest?.airports || [])])]
  const trackBad = (bad) => setBadTimes(n => Math.max(0, n + (bad ? 1 : -1)))

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(20,33,58,0.45)', padding: '36px 20px', overflowY: 'auto', fontFamily: FONT }}>
      <div role="dialog" className="travel-modal" aria-modal="true" aria-label={editing ? 'Edit Trip' : 'Add Trip'} style={{ background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, width: 960, maxWidth: '100%', boxShadow: '0 20px 60px rgba(20,33,58,0.3)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{editing ? 'Edit Trip' : 'Add Trip'}{person ? ` · ${personName(person)}` : ''}</div>
          <button type="button" onClick={onClose} style={BTN_S}>Close</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Fld label="Staff">
              <select value={staffId} disabled={editing} onChange={e => setStaffId(e.target.value)} style={{ ...INPUT, cursor: editing ? 'default' : 'pointer', opacity: editing ? 0.7 : 1 }}>
                <option value="">Select Staff Member</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{personName(s)}</option>)}
              </select>
            </Fld>
            <Fld label="Direction" basis="190px">
              <select value={direction} disabled={editing} onChange={e => setDirection(e.target.value)} style={{ ...INPUT, cursor: editing ? 'default' : 'pointer', opacity: editing ? 0.7 : 1 }}>
                <option value="in">Travel To</option>
                <option value="out">Travel From</option>
              </select>
            </Fld>
            <Fld label="Mode" basis="160px"><select value={mode} onChange={e => changeMode(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>{TRIP_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Fld>
            <Fld label="Trip Type" basis="170px"><select value={tripType} onChange={e => setTripType(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}><option value="">None</option>{TRIP_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Fld>
            <Fld label="Status" basis="170px"><select value={status} onChange={e => setStatus(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>{(trip?.status === 'pending_approval' ? TRIP_STATUSES : TRIP_STATUS_MENU).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Fld>
          </div>

          {staffId && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {preset?.role && <Who label="Role" value={preset.role} />}
              <Who label="Home Airport" value={prefs.homeAirport} />
              <Who label="Preferred Airline" value={prefs.preferredAirline} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={SMALL_LABEL}>{flight ? `Segments · ${segments.length}` : 'Dates'}</div>
              {flight && <button type="button" onClick={() => setSegments(prev => [...prev, blankSegment(mode, prefs.preferredAirline)])} style={BTN_S}>+ Add Segment</button>}
            </div>
            <datalist id={`${uid}-airlines`}>{airlineOpts.map(a => <option key={a} value={a} />)}</datalist>
            <datalist id={`${uid}-airports`}>{airportOpts.map(a => <option key={a} value={a} />)}</datalist>
            {segments.map((s, i) => (
              <div key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 6, background: 'var(--surface-card)', padding: '10px 12px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {flight && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <Fld label={mode === 'flying' ? 'Airline' : 'Carrier'}><input style={INPUT} list={`${uid}-airlines`} value={s.airline} onChange={e => setSeg(i, 'airline', e.target.value)} /></Fld>
                    <Fld label="Flight Number" basis="150px"><input style={INPUT} value={s.flight_number} onChange={e => setSeg(i, 'flight_number', e.target.value)} /></Fld>
                    <Fld label="From" basis="110px"><input style={{ ...INPUT, textTransform: 'uppercase' }} list={`${uid}-airports`} maxLength={4} value={s.from_airport} onChange={e => setSeg(i, 'from_airport', e.target.value.toUpperCase())} placeholder="ABC" /></Fld>
                    <Fld label="To" basis="110px"><input style={{ ...INPUT, textTransform: 'uppercase' }} list={`${uid}-airports`} maxLength={4} value={s.to_airport} onChange={e => setSeg(i, 'to_airport', e.target.value.toUpperCase())} placeholder="XYZ" /></Fld>
                    {segments.length > 1 && <button type="button" tabIndex={-1} onClick={() => setSegments(prev => prev.filter((_, j) => j !== i))} style={{ ...BTN_S, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Remove</button>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <Fld label="Depart Date"><input type="date" style={INPUT} value={s.depart_date} onChange={e => setSeg(i, 'depart_date', e.target.value)} /></Fld>
                  <Fld label="Depart Time"><TimeField value={s.depart_time} onChange={v => setSeg(i, 'depart_time', v)} onInvalid={trackBad} /></Fld>
                  <Fld label="Arrive Date"><input type="date" style={INPUT} value={s.arrive_date} onChange={e => setSeg(i, 'arrive_date', e.target.value)} /></Fld>
                  <Fld label="Arrive Time"><TimeField value={s.arrive_time} onChange={v => setSeg(i, 'arrive_time', v)} onInvalid={trackBad} /></Fld>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 13, color: 'var(--text-muted-legible)' }}>Times are local to each airport, as printed on the itinerary.</div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={SMALL_LABEL}>Costs · {costs.length}</div>
              <button type="button" onClick={() => setCosts(prev => [...prev, { category: 'airfare', miles: '', estimated: '', actual: '', note: '' }])} style={BTN_S}>+ Add Cost</button>
            </div>
            {costs.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 8 }}>
                <Fld label="Category" basis="150px"><select value={c.category} onChange={e => setCost(i, { category: e.target.value })} style={{ ...INPUT, cursor: 'pointer' }}>{COST_CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Fld>
                {c.category === 'mileage' && <Fld label="Miles" basis="100px"><input style={INPUT} inputMode="decimal" value={c.miles} onChange={e => { const m = e.target.value.replace(/[^0-9.]/g, ''); setCost(i, { miles: m, estimated: m ? formatMoneyInput(mileageAmount(m, mileageRate)) : c.estimated }) }} placeholder="0" /></Fld>}
                <Fld label="Estimated" basis="140px"><MoneyInput inputStyle={INPUT} prefixLeft={10} value={c.estimated} onChange={v => setCost(i, { estimated: v })} /></Fld>
                <Fld label="Actual" basis="140px"><MoneyInput inputStyle={INPUT} prefixLeft={10} value={c.actual} onChange={v => setCost(i, { actual: v })} /></Fld>
                <Fld label="Note"><input style={INPUT} value={c.note} onChange={e => setCost(i, { note: e.target.value })} /></Fld>
                <button type="button" tabIndex={-1} onClick={() => setCosts(prev => prev.filter((_, j) => j !== i))} style={{ ...BTN_S, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Remove</button>
              </div>
            ))}
            {costs.some(c => c.category === 'mileage') && <div style={{ fontSize: 13, color: 'var(--text-muted-legible)' }}>Mileage is filled from the company rate of ${Number(mileageRate).toFixed(2)} per mile and saved on the line, so later rate changes do not change it.</div>}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Fld label="Confirmation" basis="260px"><input style={INPUT} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></Fld>
            <Fld label="Notes"><input style={INPUT} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ground Transport: …" onKeyDown={e => { if (e.key === 'Enter') submit() }} /></Fld>
          </div>

          {(error || duplicate) && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)' }}>{error || 'This person already has a trip in this direction. Edit that trip instead.'}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `1px solid ${LINE}`, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderRadius: '0 0 10px 10px', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted-legible)' }}>Enter on the last field saves.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={BTN}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving || duplicate} style={{ ...BTN_P, opacity: saving || duplicate ? 0.6 : 1, cursor: saving || duplicate ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Save Trip'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
