'use client'

// Ground Transport: how each traveler gets from the airport (Airport Arrivals) and back (Departures), and the rental cars.
// Arrivals come from To trips' last segment, departures from From trips' first segment.
import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { isLive, tripDate, tripTime, tripAirport } from '@/lib/travel/trips'
import { GROUND_METHODS, methodLabel, upsertGroundLeg, addRentalCar, updateRentalCar, deleteRentalCar } from '@/lib/travel/ground'
import { parseTime, formatTime } from '@/lib/travel/time'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import { TableShell, BodyRow, GroupRow, EmptyRow } from './DataTable'
import { FS, LINE, SMALL_LABEL, BTN_S, Chip, InlineInput, InlineMoney, fmtDay, personName, money, CARD } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const SECTION_TITLE = { ...SMALL_LABEL, margin: '4px 0 8px' }

function MethodMenu({ value, onPick, disabled }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const style = useAnchoredMenu(anchorRef, open, 190, GROUND_METHODS.length * 34 + 12)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <>
      <Chip tone={value ? 'blue' : 'yellow'} anchorRef={anchorRef} onClick={disabled ? undefined : () => setOpen(o => !o)} title={disabled ? undefined : 'Click To Choose A Method'}>{value ? methodLabel(value) : 'Needs Plan'}{disabled ? '' : ' ▾'}</Chip>
      {open && style && createPortal(
        <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
          {GROUND_METHODS.map(m => (
            <div key={m.value} role="menuitem" onClick={() => { setOpen(false); if (m.value !== value) onPick(m.value) }} style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <Chip tone="blue">{m.label}</Chip>
            </div>
          ))}
        </div>, document.body)}
    </>
  )
}

const selectStyle = { fontFamily: 'inherit', fontSize: FS.body, width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: `1px solid ${LINE}`, borderRadius: 6, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }

export default function GroundTab({ eventId, data, canEdit, reload }) {
  const { trips, legs, rentals, travelers, assignments, staffList } = data
  const people = useMemo(() => assignments.filter(a => a.staff_id), [assignments])
  const nameOf = (id) => personName(staffList.find(s => s.id === id) || people.find(p => p.staff_id === id)?.staff)
  const legOf = (staffId, direction) => legs.find(l => l.staff_id === staffId && l.direction === direction)
  const carLabel = (c) => `${c.vendor || 'Rental Car'}${c.staff_id ? ` · ${nameOf(c.staff_id)}` : ''}`
  const [busy, setBusy] = useState(false)

  const guard = async (fn) => {
    if (!canEdit) return
    setBusy(true)
    try { await fn() } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    setBusy(false)
    reload()
  }
  const saveLeg = (staffId, direction, fields) => guard(() => upsertGroundLeg(getSupabase(), eventId, staffId, direction, fields))

  const live = useMemo(() => trips.filter(isLive), [trips])
  const rows = (direction) => live.filter(t => t.direction === direction).map(t => ({ trip: t, key: t.id, leg: legOf(t.staff_id, direction), date: tripDate(t), time: tripTime(t) }))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '99').localeCompare(b.time || '99'))

  const tripCols = (direction) => [
    { key: 'time', label: direction === 'in' ? 'Arrives' : 'Leaves', width: 9, render: r => (r.time ? formatTime(r.time) : <span style={muted}>{r.trip.mode === 'books_own' ? 'Not Tracked' : r.trip.segments.length ? 'TBD' : r.trip.mode === 'driving' || r.trip.mode === 'carpool' ? 'Driving' : 'TBD'}</span>) },
    { key: 'name', label: 'Name', width: 14, render: r => <b>{personName(r.trip.staff)}</b> },
    { key: 'flight', label: 'Flight', width: 10, render: r => { const s = direction === 'in' ? r.trip.segments[r.trip.segments.length - 1] : r.trip.segments[0]; return [s?.airline, s?.flight_number].filter(Boolean).join(' ') || '—' } },
    { key: 'airport', label: 'Airport', width: 8, render: r => tripAirport(r.trip) || '—' },
    { key: 'method', label: direction === 'in' ? 'Getting To The Hotel' : 'Getting To The Airport', width: 15, render: r => <MethodMenu value={r.leg?.method} disabled={!canEdit || busy} onPick={(m) => saveLeg(r.trip.staff_id, direction, { method: m })} /> },
    { key: 'pickup', label: 'Pickup Details', width: 22, wrap: true, render: r => !r.leg ? '—' : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {r.leg.method === 'rental_car' && (
          <select aria-label="Rental Car" disabled={!canEdit} value={r.leg.rental_car_id || ''} onChange={e => saveLeg(r.trip.staff_id, direction, { method: 'rental_car', rental_car_id: e.target.value || null })} style={selectStyle}>
            <option value="">Select Rental Car</option>
            {rentals.map(c => <option key={c.id} value={c.id}>{carLabel(c)}</option>)}
          </select>
        )}
        <InlineInput ariaLabel="Pickup Location" disabled={!canEdit} value={r.leg.pickup_location} placeholder="Pickup Location" onSave={v => saveLeg(r.trip.staff_id, direction, { pickup_location: v })} />
        <InlineInput ariaLabel="Pickup Time" disabled={!canEdit} value={r.leg.pickup_time ? formatTime(r.leg.pickup_time) : ''} placeholder="Pickup Time" onSave={v => { const t = parseTime(v); if (!t.ok) { quickToast('Check the time: use a format like 2:30 PM or 1430.'); return } saveLeg(r.trip.staff_id, direction, { pickup_time: t.value }) }} />
      </div>) },
    { key: 'contact', label: 'Contact', width: 11, render: r => (r.leg ? <InlineInput ariaLabel="Contact" disabled={!canEdit} value={r.leg.contact} onSave={v => saveLeg(r.trip.staff_id, direction, { contact: v })} /> : '—') },
    { key: 'notes', label: 'Notes', width: 11, render: r => (r.leg ? <InlineInput ariaLabel="Notes" disabled={!canEdit} value={r.leg.notes} onSave={v => saveLeg(r.trip.staff_id, direction, { notes: v })} /> : '—') },
  ]

  const section = (direction, title) => {
    const list = rows(direction)
    const cols = tripCols(direction)
    const byDay = []
    for (const r of list) { const g = byDay[byDay.length - 1]; if (g && g.date === r.date) g.rows.push(r); else byDay.push({ date: r.date, rows: [r] }) }
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={SECTION_TITLE}>{title}</div>
        <TableShell cols={cols} minWidth={1000}>
          {list.length === 0 && <EmptyRow cols={cols}>No {direction === 'in' ? 'arrivals' : 'departures'} yet. Add trips on the Travelers tab.</EmptyRow>}
          {byDay.map(g => (
            <Fragment2 key={g.date || 'none'}>
              <GroupRow cols={cols}>{g.date ? fmtDay(g.date) : 'No Date Entered'} · {g.rows.length} {direction === 'in' ? (g.rows.length === 1 ? 'Arrival' : 'Arrivals') : (g.rows.length === 1 ? 'Departure' : 'Departures')}</GroupRow>
              {g.rows.map(r => <BodyRow key={r.key} cols={cols} row={r} />)}
            </Fragment2>
          ))}
        </TableShell>
      </div>
    )
  }

  // ── Rental cars ────────────────────────────────────────────────────────
  const ridersOf = (car) => legs.filter(l => l.rental_car_id === car.id).map(l => nameOf(l.staff_id))
  const needsCar = useMemo(() => {
    const covered = new Set([...rentals.map(c => c.staff_id), ...legs.filter(l => l.rental_car_id).map(l => l.staff_id)].filter(Boolean))
    return travelers.filter(t => t.needs_rental && !covered.has(t.staff_id)).map(t => t.staff_id)
  }, [travelers, rentals, legs])
  const upd = (id, patch) => guard(() => updateRentalCar(getSupabase(), id, patch))
  const driverOptions = (c) => {
    const ids = new Set(people.map(p => p.staff_id))
    return (
      <select aria-label="Driver" disabled={!canEdit} value={c.staff_id || ''} onChange={e => upd(c.id, { staff_id: e.target.value || null })} style={selectStyle}>
        <option value="">Select Driver</option>
        <optgroup label="On This Event">{people.map(p => <option key={p.staff_id} value={p.staff_id}>{personName(p.staff)}</option>)}</optgroup>
        <optgroup label="Someone Not On This Event">{staffList.filter(s => !ids.has(s.id)).map(s => <option key={s.id} value={s.id}>{personName(s)}</option>)}</optgroup>
      </select>
    )
  }
  const rentalCols = [
    { key: 'vendor', label: 'Vendor', width: 10, render: c => <InlineInput ariaLabel="Vendor" disabled={!canEdit} value={c.vendor} onSave={v => upd(c.id, { vendor: v })} /> },
    { key: 'class', label: 'Class', width: 10, render: c => <InlineInput ariaLabel="Car Class" disabled={!canEdit} value={c.car_class} onSave={v => upd(c.id, { car_class: v })} /> },
    { key: 'driver', label: 'Driver', width: 14, render: c => driverOptions(c) },
    { key: 'riders', label: 'Riders', width: 12, wrap: true, render: c => (ridersOf(c).join(', ') || <span style={muted}>—</span>) },
    { key: 'dates', label: 'Pickup / Return', width: 24, wrap: true, render: c => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ ...muted, fontSize: FS.small, minWidth: 48 }}>Pickup</span><InlineInput type="date" ariaLabel="Pickup Date" disabled={!canEdit} value={c.pickup_date} onSave={v => upd(c.id, { pickup_date: v })} style={{ width: 140, flexShrink: 0 }} /><InlineInput ariaLabel="Pickup Location" disabled={!canEdit} value={c.pickup_location} placeholder="Location" onSave={v => upd(c.id, { pickup_location: v })} /></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ ...muted, fontSize: FS.small, minWidth: 48 }}>Return</span><InlineInput type="date" ariaLabel="Return Date" disabled={!canEdit} value={c.return_date} onSave={v => upd(c.id, { return_date: v })} style={{ width: 140, flexShrink: 0 }} /><InlineInput ariaLabel="Return Location" disabled={!canEdit} value={c.return_location} placeholder="Location" onSave={v => upd(c.id, { return_location: v })} /></div>
      </div>) },
    { key: 'confirmation', label: 'Confirmation', width: 10, render: c => <InlineInput ariaLabel="Confirmation" disabled={!canEdit} value={c.confirmation_number} onSave={v => upd(c.id, { confirmation_number: v })} /> },
    { key: 'estimated', label: 'Budget', width: 9, align: 'right', render: c => <InlineMoney ariaLabel="Budget" disabled={!canEdit} value={c.estimated_cost} onSave={v => upd(c.id, { estimated_cost: v })} /> },
    { key: 'actual', label: 'Actual', width: 9, align: 'right', render: c => <InlineMoney ariaLabel="Actual" disabled={!canEdit} value={c.actual_cost} onSave={v => upd(c.id, { actual_cost: v })} /> },
    { key: 'remove', label: '', width: 2, align: 'center', render: c => (canEdit ? <span role="button" aria-label="Remove Rental Car" title="Remove Rental Car" onClick={() => { if (confirm('Remove this rental car? Anyone linked to it goes back to Needs Plan.')) guard(() => deleteRentalCar(getSupabase(), c.id)) }} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}>×</span> : null) },
  ]

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      {section('in', 'Airport Arrivals')}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
          <div style={{ ...SMALL_LABEL }}>Rental Cars · {rentals.length}</div>
          {canEdit && <button type="button" disabled={busy} onClick={() => guard(() => addRentalCar(getSupabase(), eventId, {}))} style={BTN_S}>Add Rental Car</button>}
        </div>
        {needsCar.length > 0 && (
          <div style={{ ...CARD, padding: '8px 12px', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={SMALL_LABEL}>Needs A Rental Car · {needsCar.length}</span>
            {needsCar.map(id => (
              <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Chip tone="yellow">{nameOf(id)}</Chip>
                {canEdit && <button type="button" disabled={busy} onClick={() => guard(() => addRentalCar(getSupabase(), eventId, { staff_id: id }))} style={BTN_S}>Add Car</button>}
              </span>
            ))}
          </div>
        )}
        <TableShell cols={rentalCols} minWidth={1100}>
          {rentals.length === 0 && <EmptyRow cols={rentalCols}>No rental cars yet.</EmptyRow>}
          {rentals.map(c => <BodyRow key={c.id} cols={rentalCols} row={c} hover={false} />)}
          {rentals.length > 0 && (
            <tr><td colSpan={rentalCols.length} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>
              Total · Budget {money(rentals.reduce((a, c) => a + (Number(c.estimated_cost) || 0), 0))} · Actual {rentals.some(c => c.actual_cost !== null && c.actual_cost !== undefined) ? money(rentals.reduce((a, c) => a + (Number(c.actual_cost) || 0), 0)) : '—'}
            </td></tr>
          )}
        </TableShell>
      </div>

      {section('out', 'Departures')}
    </div>
  )
}

function Fragment2({ children }) { return <>{children}</> }
