'use client'

// The Travelers tab, built from the approved mockup: one row per person, Inbound and Outbound side by side, grouped by department,
// a row opens to the full schedule and costs. Colors and type come from the app's tokens.
import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { TRIP_STATUS_MENU, statusLabel, modeLabel, isEntered, tripDate, tripTime, tripAirport, hasFlightFields, COST_CATEGORIES,
  upsertTrip, saveSegments, saveCosts, setTripStatus, deleteTrip, resolveRework, copyToReturnTrip } from '@/lib/travel/trips'
import { setTravelerFlag } from '@/lib/travel/travelers'
import { formatTime } from '@/lib/travel/time'
import { describeTrip } from '@/lib/travelRework'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import TripModal from './TripModal'
import { TableShell, BodyRow, GroupRow, ExpandRow, EmptyRow } from './DataTable'
import { CARD, LINE, SMALL_LABEL, BTN_S, Chip, Pill, STATUS_TONE, fmtDay, personName, money, Check } from './shared'

const DIRS = [{ key: 'both', label: 'Both' }, { key: 'in', label: 'Travel To' }, { key: 'out', label: 'Travel From' }]
const RANK = { hold: 0, good_to_book: 1, needs_approval: 2, booked: 3 }
const flyerRank = (t) => (t && !hasFlightFields(t.mode) ? 1 : 0)
const link = { color: 'var(--text-muted-legible)' }
const LOCAL_TIME_HINT = 'Times are local to each airport, as printed on the itinerary.'
const catLabel = (v) => COST_CATEGORIES.find(c => c.value === v)?.label || v

// one pill for a person: the least advanced of their live trips (Cancelled only when every trip is cancelled)
function personStatus(list) {
  if (!list.length) return 'hold'
  const live = list.filter(t => t.status !== 'cancelled')
  if (!live.length) return 'cancelled'
  return live.reduce((m, t) => (RANK[t.status] < RANK[m] ? t.status : m), 'booked')
}

function StatusMenu({ canEdit, onChange, status, enabled = true }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const style = useAnchoredMenu(anchorRef, open, 190, TRIP_STATUS_MENU.length * 34 + 12)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const interactive = canEdit && enabled
  return (
    <>
      <Chip tone={STATUS_TONE[status]} anchorRef={anchorRef} title={interactive ? 'Click To Change Status' : undefined} onClick={interactive ? (e) => { e.stopPropagation(); setOpen(o => !o) } : undefined}>{statusLabel(status)}{interactive ? ' ▾' : ''}</Chip>
      {open && style && createPortal(
        <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
          {TRIP_STATUS_MENU.map(o => (
            <div key={o.value} role="menuitem" onClick={() => { setOpen(false); if (o.value !== status) onChange(o.value) }}
              style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <Chip tone={STATUS_TONE[o.value]}>{o.label}</Chip>
            </div>
          ))}
        </div>, document.body)}
    </>
  )
}

// "Mon, Jan 4 · 4:17 PM" over "AA 5309 → PIA"
function Leg({ trip }) {
  if (!trip) return <span style={link}>Not Entered</span>
  if (trip.mode === 'books_own' && !trip.segments.length) return <span style={link}>Not Tracked</span>
  const lead = trip.direction === 'in' ? trip.segments[trip.segments.length - 1] : trip.segments[0]
  const when = [fmtDay(tripDate(trip)), tripTime(trip) ? formatTime(tripTime(trip)) : ''].filter(Boolean).join(' · ')
  const flight = [lead?.airline, lead?.flight_number].filter(Boolean).join(' ')
  const port = tripAirport(trip)
  const detail = hasFlightFields(trip.mode)
    ? [flight && port ? `${flight} ${trip.direction === 'in' ? '→' : 'from'} ${port}` : flight || port, trip.segments.length > 1 ? `${trip.segments.length} Segments` : ''].filter(Boolean).join(' · ')
    : modeLabel(trip.mode)
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{when}</div>
      {detail && <div style={{ fontSize: 12.5, color: 'var(--text-muted-legible)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>}
    </div>
  )
}

export default function TravelersTab({ eventId, data, canEdit, undoable, reload, modalRequest, onModalHandled }) {
  const { assignments, trips, staffList, travelers, rooms, legs, rentals, suggest, mileageRate } = data
  const [dir, setDir] = useState('both')
  const [filter, setFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null) // { trip, preset }
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (modalRequest) { setModal({ trip: null, preset: null }); onModalHandled?.() } }, [modalRequest, onModalHandled])

  const people = useMemo(() => assignments.filter(a => a.staff_id), [assignments])
  const tbdRoles = useMemo(() => assignments.filter(a => !a.staff_id && a.position.title), [assignments])
  const flagsByStaff = useMemo(() => Object.fromEntries(travelers.map(t => [t.staff_id, t])), [travelers])
  const roomedIds = useMemo(() => new Set(rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)), [rooms])
  const rentalIds = useMemo(() => new Set([...rentals.map(r => r.staff_id), ...legs.filter(l => l.rental_car_id).map(l => l.staff_id)].filter(Boolean)), [rentals, legs])

  const nameOf = (staffId) => personName(staffList.find(s => s.id === staffId) || people.find(p => p.staff_id === staffId)?.staff)
  const entered = useMemo(() => trips.filter(t => isEntered(t) && !t.needs_rework), [trips])
  const rework = useMemo(() => trips.filter(t => t.needs_rework), [trips])
  const assignedIds = useMemo(() => new Set(people.map(p => p.staff_id)), [people])

  const persons = useMemo(() => {
    const mk = (base) => {
      const inT = entered.find(t => t.staff_id === base.staff_id && t.direction === 'in') || null
      const outT = entered.find(t => t.staff_id === base.staff_id && t.direction === 'out') || null
      const list = [inT, outT].filter(Boolean)
      return { ...base, inT, outT, list, status: personStatus(list) }
    }
    const assigned = people.map(p => mk({ key: p.id, staff_id: p.staff_id, staff: p.staff, role: p.position?.title || '—', dept: p.position?.department || 'Other', deptOrder: p.position?.deptSortOrder ?? 999, posOrder: p.position?.sortOrder ?? 999 }))
    const others = [...new Set(entered.filter(t => !assignedIds.has(t.staff_id)).map(t => t.staff_id))]
      .map(id => mk({ key: `o-${id}`, staff_id: id, staff: entered.find(t => t.staff_id === id)?.staff, role: '—', dept: 'Other Travelers', deptOrder: 10000, posOrder: 0 }))
    const open = tbdRoles.map(r => ({ key: `tbd-${r.id}`, staff_id: null, staff: null, role: r.position.title, dept: r.position.department, deptOrder: r.position.deptSortOrder, posOrder: r.position.sortOrder, inT: null, outT: null, list: [], status: 'hold', tbd: true }))
    return [...assigned, ...others, ...open]
  }, [people, entered, assignedIds, tbdRoles])

  const filters = useMemo(() => {
    const base = [{ key: 'hold', label: 'Hold' }, { key: 'good_to_book', label: 'Good To Book' }, { key: 'needs_approval', label: 'Needs Approval' }, { key: 'booked', label: 'Booked' }]
    if (persons.some(p => !p.tbd && p.status === 'cancelled')) base.push({ key: 'cancelled', label: 'Cancelled' })
    return base
  }, [persons])
  const counts = useMemo(() => Object.fromEntries(filters.map(f => [f.key, persons.filter(p => !p.tbd && p.status === f.key).length])), [persons, filters])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const visible = persons.filter(p => (!filter || (!p.tbd && p.status === filter)) && (!q || [p.role, p.tbd ? 'tbd' : personName(p.staff), ...p.list.flatMap(t => [t.confirmation, ...t.segments.map(s => `${s.airline || ''} ${s.flight_number || ''}`)])].filter(Boolean).join(' ').toLowerCase().includes(q)))
    const by = {}
    for (const p of visible) (by[p.dept] ||= { dept: p.dept, order: p.deptOrder, rows: [] }).rows.push(p)
    const lead = (p) => p.inT || p.outT
    for (const g of Object.values(by)) g.rows.sort((a, b) => {
      const ka = lead(a), kb = lead(b)
      if (!!ka !== !!kb) return ka ? -1 : 1 // people with travel first
      if (!ka) return a.posOrder - b.posOrder
      return (tripDate(ka) || '9999').localeCompare(tripDate(kb) || '9999') || flyerRank(ka) - flyerRank(kb) || (tripTime(ka) || '99').localeCompare(tripTime(kb) || '99') || a.posOrder - b.posOrder
    })
    return Object.values(by).sort((a, b) => a.order - b.order)
  }, [persons, filter, search])

  const run = async (message, fn) => {
    try { await undoable(message, [eventId], fn) } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    reload()
  }
  const setStatuses = (p, status) => run(`${personName(p.staff)}: ${statusLabel(status)}`, async () => { for (const t of p.list) await setTripStatus(getSupabase(), t.id, status) })
  const removeTrip = (trip) => { if (!confirm(`Delete this trip for ${nameOf(trip.staff_id)}?`)) return; run('Trip deleted', () => deleteTrip(getSupabase(), trip.id)) }
  const copyReturn = async (trip) => {
    let made = null
    await run(`${nameOf(trip.staff_id)}: Return trip created`, async () => { made = await copyToReturnTrip(getSupabase(), trip.id) })
    if (!made) quickToast('That person already has a trip in the other direction.', 'info')
  }
  const save = async (p) => {
    setSaving(true)
    await run(`${nameOf(p.staffId)}: Trip saved`, async () => {
      const sb = getSupabase()
      const t = await upsertTrip(sb, eventId, p.staffId, p.direction, p.fields)
      await saveSegments(sb, t.id, p.segments)
      await saveCosts(sb, t.id, p.costs)
    })
    setSaving(false)
    setModal(null)
  }

  // Room, Per Diem and Rental boxes: checking adds the person to that list; unchecking someone already assigned asks first and never deletes the room or car
  const toggle = (p, field, label) => {
    const on = !flagsByStaff[p.staff_id]?.[field]
    if (!on && field === 'needs_room' && roomedIds.has(p.staff_id) && !confirm(`${personName(p.staff)} is assigned a room. Uncheck Room anyway? The room is kept.`)) return
    if (!on && field === 'needs_rental' && rentalIds.has(p.staff_id) && !confirm(`${personName(p.staff)} is on a rental car. Uncheck Rental anyway? The car is kept.`)) return
    run(`${personName(p.staff)}: ${label} ${on ? 'Added' : 'Removed'}`, () => setTravelerFlag(getSupabase(), eventId, p.staff_id, field, on))
  }
  const box = (field, label) => (p) => (p.tbd ? null : <Check checked={!!flagsByStaff[p.staff_id]?.[field]} disabled={!canEdit} label={`${label} For ${personName(p.staff)}`} onChange={() => toggle(p, field, label)} />)

  const showIn = dir !== 'out', showOut = dir !== 'in'
  const both = showIn && showOut
  const cols = [
    { key: 'role', label: 'Role', width: 12, render: p => p.role },
    { key: 'name', label: 'Name', width: 13, render: p => (p.tbd ? <span style={{ ...link, fontStyle: 'italic', fontWeight: 600 }}>TBD</span> : <b>{personName(p.staff)}</b>) },
    { key: 'mode', label: 'Mode', width: 8, render: p => { const m = [...new Set(p.list.map(t => modeLabel(t.mode)))]; return m.length ? m.join(' / ') : '—' } },
    { key: 'status', label: 'Status', width: 11, render: p => <div onClick={e => e.stopPropagation()}><StatusMenu canEdit={canEdit} enabled={p.list.length > 0} status={p.status} onChange={(st) => setStatuses(p, st)} /></div> },
    ...(showIn ? [{ key: 'in', label: 'Inbound · Final Arrival', width: both ? 16 : 32, wrap: true, render: p => <Leg trip={p.inT} /> }] : []),
    ...(showOut ? [{ key: 'out', label: 'Outbound · First Departure', width: both ? 16 : 32, wrap: true, render: p => <Leg trip={p.outT} /> }] : []),
    { key: 'room', label: 'Room', width: 6, align: 'center', render: box('needs_room', 'Room') },
    { key: 'perdiem', label: 'Per Diem', width: 7, align: 'center', render: box('per_diem_eligible', 'Per Diem') },
    { key: 'rental', label: 'Rental', width: 6, align: 'center', render: box('needs_rental', 'Rental') },
    { key: 'chev', label: '', width: 5, align: 'center', render: p => (p.tbd ? '' : <span style={link}>{expanded[p.key] ? '▴' : '▾'}</span>) },
  ]

  const legBox = (p, trip, direction) => (
    <div style={{ ...CARD, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <div style={SMALL_LABEL}>Full Schedule · {direction === 'in' ? 'Travel To' : 'Travel From'}</div>
        <div title={LOCAL_TIME_HINT} style={{ fontSize: 12.5, color: 'var(--text-muted-legible)' }}>{LOCAL_TIME_HINT}</div>
      </div>
      {!trip ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={link}>No Travel Entered</span>
          {canEdit && p.staff_id && <button type="button" onClick={() => setModal({ trip: null, preset: { staffId: p.staff_id, direction, role: p.role } })} style={BTN_S}>+ Add</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trip.segments.length === 0 && <span style={link}>No segments entered.</span>}
            {trip.segments.map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, minWidth: 64 }}>{[s.airline, s.flight_number].filter(Boolean).join(' ') || `Leg ${i + 1}`}</span>
                <div style={{ flex: 1, lineHeight: 1.3 }}>
                  {[s.from_airport, s.to_airport].filter(Boolean).join(' → ') || modeLabel(trip.mode)}
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted-legible)' }}>{fmtDay(s.depart_date)}{s.depart_time ? ` · ${formatTime(s.depart_time)}` : ''}{(s.arrive_time || s.arrive_date) ? ` → ${s.arrive_date && s.arrive_date !== s.depart_date ? `${fmtDay(s.arrive_date)} · ` : ''}${formatTime(s.arrive_time)}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 8, borderTop: `1px solid ${LINE}` }}><span style={link}>Confirmation</span><b>{trip.confirmation || 'Not Booked Yet'}</b></div>
          {trip.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Notes: {trip.notes}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <StatusMenu canEdit={canEdit} status={trip.status} onChange={(st) => run(`${nameOf(trip.staff_id)}: ${statusLabel(st)}`, () => setTripStatus(getSupabase(), trip.id, st))} />
            {canEdit && (
              <>
                <button type="button" onClick={() => setModal({ trip })} style={BTN_S}>Edit Trip</button>
                {!(direction === 'in' ? p.outT : p.inT) && <button type="button" onClick={() => copyReturn(trip)} style={BTN_S}>Copy To Return Trip</button>}
                <button type="button" onClick={() => removeTrip(trip)} style={{ ...BTN_S, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Delete Trip</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )

  const costBox = (p) => {
    const lines = p.list.flatMap(t => (t.costs || []).map(c => ({ ...c, direction: t.direction })))
    const est = lines.reduce((a, c) => a + (Number(c.estimated) || 0), 0)
    const withActual = lines.filter(c => c.actual !== null && c.actual !== undefined)
    return (
      <div style={{ ...CARD, padding: '10px 12px', gridColumn: '1 / -1' }}>
        <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>Costs</div>
        {lines.length === 0 ? <span style={link}>No costs entered.</span> : (
          <>
            {lines.map((c, i) => (
              <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '14% 12% 1fr 14% 14%', gap: 10, padding: '3px 0', fontSize: 15 }}>
                <span>{catLabel(c.category)}</span><span style={link}>{c.direction === 'in' ? 'Travel To' : 'Travel From'}</span><span style={link}>{c.note || (c.category === 'mileage' && c.miles ? `${c.miles} Miles` : '')}</span>
                <span style={{ textAlign: 'right' }}>{money(c.estimated)}</span><span style={{ textAlign: 'right' }}>{c.actual === null || c.actual === undefined ? '—' : money(c.actual)}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '14% 12% 1fr 14% 14%', gap: 10, padding: '6px 0 0', marginTop: 4, borderTop: `1px solid ${LINE}`, fontWeight: 700 }}>
              <span>Total</span><span /><span style={{ ...link, fontWeight: 500 }}>Estimated · Actual</span><span style={{ textAlign: 'right' }}>{money(est)}</span><span style={{ textAlign: 'right' }}>{withActual.length ? money(withActual.reduce((a, c) => a + Number(c.actual), 0)) : '—'}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      {rework.length > 0 && (
        <div style={{ border: '1.5px solid #c9a400', background: 'color-mix(in srgb, #FFD60A 14%, transparent)', borderRadius: 8, padding: '12px 16px', marginBottom: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Needs Action · Removed From Event, Travel Still Booked</div>
          {rework.map((t, i) => (
            <div key={t.id} data-rework-row="" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '6px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div><b>{personName(t.staff)}</b> · {t.direction === 'in' ? 'Travel To' : 'Travel From'}: {describeTrip(t)}</div>
                {t.rework_note && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t.rework_note}</div>}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => run('Travel marked resolved', () => resolveRework(getSupabase(), t.id))} style={{ ...BTN_S, color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Mark Resolved</button>
                  <button type="button" onClick={() => run('Travel row deleted', () => deleteTrip(getSupabase(), t.id))} style={{ ...BTN_S, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Delete Row</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        {DIRS.map(d => <Pill key={d.key} selected={dir === d.key} onClick={() => setDir(d.key)}>{d.label}</Pill>)}
        <span style={{ width: 12 }} />
        <Pill selected={!filter} onClick={() => setFilter(null)}>All</Pill>
        {filters.map(f => <Pill key={f.key} tone={STATUS_TONE[f.key]} selected={filter === f.key} onClick={() => setFilter(filter === f.key ? null : f.key)}>{f.label} · {counts[f.key]}</Pill>)}
        <span style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Name, Role, Flight, Confirmation" style={{ fontFamily: 'inherit', fontSize: 15, border: `1px solid ${LINE}`, borderRadius: 6, padding: '7px 12px', minWidth: 260, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }} />
      </div>

      <TableShell cols={cols} minWidth={1000}>
        {groups.length === 0 && <EmptyRow cols={cols}>{persons.length ? 'No travelers match.' : 'No one is assigned to this event yet.'}</EmptyRow>}
        {groups.map(g => (
          <FragmentWith key={g.dept}>
            <GroupRow cols={cols}>{g.dept}</GroupRow>
            {g.rows.map(p => (
              <FragmentWith key={p.key}>
                <BodyRow cols={cols} row={p} onClick={p.tbd ? undefined : () => setExpanded(x => ({ ...x, [p.key]: !x[p.key] }))} />
                {expanded[p.key] && !p.tbd && (
                  <ExpandRow cols={cols}>
                    <div style={{ display: 'grid', gridTemplateColumns: both ? '1fr 1fr' : '1fr', gap: 14, padding: '14px 16px' }}>
                      {showIn && legBox(p, p.inT, 'in')}
                      {showOut && legBox(p, p.outT, 'out')}
                      {costBox(p)}
                    </div>
                  </ExpandRow>
                )}
              </FragmentWith>
            ))}
          </FragmentWith>
        ))}
      </TableShell>
      <div style={{ marginTop: 10, color: 'var(--text-muted-legible)', fontSize: 13 }}>Click any row to open the full schedule and costs. Names and roles come from the staffing grid. Anyone not on the grid can be added by hand.</div>

      {modal && (
        <TripModal trip={modal.trip} preset={modal.preset} staffList={staffList} trips={trips.filter(isEntered)} suggest={suggest} mileageRate={mileageRate} saving={saving} onSave={save} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function FragmentWith({ children }) { return <>{children}</> }
