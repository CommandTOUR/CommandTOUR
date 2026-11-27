'use client'

// The Travelers tab, built from the approved mockup: one row per person, Inbound and Outbound side by side, grouped by department,
// a row opens to the full schedule and costs. Colors and type come from the app's tokens.
import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { TRIP_STATUS_MENU, TRIP_MODES, statusLabel, modeLabel, isEntered, tripDate, tripTime, tripAirport, hasFlightFields, COST_CATEGORIES,
  upsertTrip, saveSegments, saveCosts, setTripStatus, setTripMode, deleteTrip, resolveRework, copyToReturnTrip } from '@/lib/travel/trips'
import { setTravelerFlag } from '@/lib/travel/travelers'
import { runRoomOps } from '@/lib/travel/hotelData'
import { planUncheckRoom } from '@/lib/travel/rooming'
import { formatTime } from '@/lib/travel/time'
import { describeTrip } from '@/lib/travelRework'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import TripModal from './TripModal'
import { TableShell, BodyRow, GroupRow, ExpandRow, EmptyRow } from './DataTable'
import { Chevron, Caret, ModeIcon, ModeIcons, PickText } from './cells'
import { FS, CARD, LINE, SMALL_LABEL, BTN_S, Chip, Pill, STATUS_TONE, fmtDay, personName, money, Check } from './shared'

const DIRS = [{ key: 'both', label: 'Both' }, { key: 'in', label: 'Travel To' }, { key: 'out', label: 'Travel From' }]
const RANK = { hold: 0, good_to_book: 1, needs_approval: 2, booked: 3 }
const flyerRank = (t) => (t && !hasFlightFields(t.mode) ? 1 : 0)
const link = { color: 'var(--text-muted-legible)' }
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
      <Chip tone={STATUS_TONE[status]} anchorRef={anchorRef} title={interactive ? 'Click To Change Status' : undefined} onClick={interactive ? (e) => { e.stopPropagation(); setOpen(o => !o) } : undefined}>{statusLabel(status)}{interactive ? <Caret /> : null}</Chip>
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

// Two rows. Flying or rail: "Delta 1234 · 2:30 PM" over the mode icon and the airport code. Driving, carpool and books own: one row with the icon.
// Only the parts that exist are shown. The date follows the airport so rows still read in order.
function Leg({ trip }) {
  if (!trip) return <span style={link}>Not Entered</span>
  const date = tripDate(trip) ? fmtDay(tripDate(trip)) : ''
  const time = tripTime(trip) ? formatTime(tripTime(trip)) : ''
  const row = { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  if (['driving', 'carpool', 'books_own'].includes(trip.mode)) {
    return <div style={row}><ModeIcon mode={trip.mode} /><span>{modeLabel(trip.mode)}</span>{date && <span style={link}>· {date}</span>}</div>
  }
  const lead = trip.direction === 'in' ? trip.segments[trip.segments.length - 1] : trip.segments[0]
  const carrier = [lead?.airline, lead?.flight_number].filter(Boolean).join(' ')
  const first = [carrier, time].filter(Boolean).join(' · ')
  const port = tripAirport(trip)
  const second = [port, date].filter(Boolean)
  return (
    <div style={{ lineHeight: 1.35 }}>
      {first && <div style={{ ...row }}>{first}</div>}
      {(second.length > 0 || !first) && <div style={{ ...row, color: first ? 'var(--text-muted-legible)' : 'inherit' }}><ModeIcon mode={trip.mode} size={14} />{second.length ? <span>{second.join(' · ')}</span> : <span style={link}>Details Not Entered</span>}</div>}
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
    if (!on && field === 'needs_room') {
      const plan = planUncheckRoom(rooms, p.staff_id)
      if (plan.room) {
        // a person in a room always has Room checked: unchecking takes them out of it first
        if (!confirm(`Remove ${personName(p.staff)} From Their Room?`)) return
        return run(`${personName(p.staff)}: Removed From Room`, async () => {
          const sb = getSupabase()
          await runRoomOps(sb, eventId, plan.ops, () => confirm('This room has a confirmation number. Remove the room too? Cancel keeps the empty room.'))
          await setTravelerFlag(sb, eventId, p.staff_id, 'needs_room', false)
        })
      }
    }
    if (!on && field === 'needs_rental' && rentalIds.has(p.staff_id) && !confirm(`${personName(p.staff)} is on a rental car. Uncheck Rental anyway? The car is kept.`)) return
    run(`${personName(p.staff)}: ${label} ${on ? 'Added' : 'Removed'}`, () => setTravelerFlag(getSupabase(), eventId, p.staff_id, field, on))
  }
  const box = (field, label) => (p) => (p.tbd ? null : <Check checked={!!flagsByStaff[p.staff_id]?.[field]} disabled={!canEdit} label={`${label} For ${personName(p.staff)}`} onChange={() => toggle(p, field, label)} />)

  const showIn = dir !== 'out', showOut = dir !== 'in'
  const both = showIn && showOut
  const cols = [
    { key: 'role', label: 'Role', width: 10, wrap: true, render: p => p.role },
    { key: 'name', label: 'Name', width: 18, wrap: true, render: p => (p.tbd ? <span style={{ ...link, fontStyle: 'italic', fontWeight: 600 }}>TBD</span> : <b>{personName(p.staff)}</b>) },
    { key: 'mode', label: 'Mode', width: 5, render: p => <ModeIcons toMode={p.inT?.mode} fromMode={p.outT?.mode} /> },
    { key: 'status', label: 'Status', width: 11, render: p => <div onClick={e => e.stopPropagation()}><StatusMenu canEdit={canEdit} enabled={p.list.length > 0} status={p.status} onChange={(st) => setStatuses(p, st)} /></div> },
    ...(showIn ? [{ key: 'in', label: 'Inbound · Final Arrival', width: both ? 17 : 34, wrap: true, render: p => <Leg trip={p.inT} /> }] : []),
    ...(showOut ? [{ key: 'out', label: 'Outbound · First Departure', width: both ? 17 : 34, wrap: true, render: p => <Leg trip={p.outT} /> }] : []),
    { key: 'room', label: 'Room', width: 5, align: 'center', render: box('needs_room', 'Room') },
    { key: 'perdiem', label: 'Per Diem', width: 6, align: 'center', render: box('per_diem_eligible', 'Per Diem') },
    { key: 'rental', label: 'Rental', width: 7, align: 'center', render: box('needs_rental', 'Rental') },
    { key: 'chev', label: '', width: 4, align: 'center', render: p => (p.tbd ? '' : <span style={{ display: 'inline-flex' }}><Chevron open={!!expanded[p.key]} /></span>) },
  ]

  // Expanded row: flat label-and-value lines, two columns (Travel To, Travel From), no boxes
  const textBtn = (danger) => ({ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: FS.small, fontWeight: 600, color: danger ? 'var(--color-danger)' : 'var(--color-info)' })
  const line = (label, value) => (
    <div style={{ display: 'flex', gap: 10, padding: '2px 0', fontSize: FS.body }}>
      <span style={{ ...link, minWidth: 92, flexShrink: 0 }}>{label}</span><span style={{ minWidth: 0 }}>{value}</span>
    </div>
  )
  const segLine = (s, i, trip) => {
    const carrier = [s.airline, s.flight_number].filter(Boolean).join(' ')
    const from = [s.from_airport, s.depart_time ? formatTime(s.depart_time) : ''].filter(Boolean).join(' ')
    const to = [s.to_airport, s.arrive_time ? formatTime(s.arrive_time) : ''].filter(Boolean).join(' ')
    const route = [from, to].filter(Boolean).join(' → ')
    const day = s.depart_date ? fmtDay(s.depart_date) : ''
    return (
      <div key={s.id || i} style={{ display: 'flex', gap: 10, padding: '2px 0', fontSize: FS.body }}>
        <span style={{ ...link, minWidth: 92, flexShrink: 0 }}>{`Segment ${i + 1}`}</span>
        <span>{[carrier || modeLabel(trip.mode), route].filter(Boolean).join(' · ')}{day ? <span style={link}> · {day}{s.arrive_date && s.arrive_date !== s.depart_date ? ` → ${fmtDay(s.arrive_date)}` : ''}</span> : null}</span>
      </div>
    )
  }
  const infoCol = (p, trip, direction) => {
    const heading = direction === 'in' ? 'Travel To' : 'Travel From'
    if (!trip) {
      return (
        <div>
          <div style={{ ...SMALL_LABEL, marginBottom: 6 }}>{heading}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: FS.body }}>
            <span style={link}>No Travel Entered</span>
            {canEdit && p.staff_id && <button type="button" onClick={() => setModal({ trip: null, preset: { staffId: p.staff_id, direction, role: p.role } })} style={textBtn(false)}>+ Add</button>}
          </div>
        </div>
      )
    }
    const est = trip.costs.reduce((a, c) => a + (Number(c.estimated) || 0), 0)
    const actuals = trip.costs.filter(c => c.actual !== null && c.actual !== undefined)
    return (
      <div>
        <div style={{ ...SMALL_LABEL, marginBottom: 6 }}>{heading}</div>
        {line('Mode', (
          <PickText ariaLabel="Mode" disabled={!canEdit} value={trip.mode} width={190}
            options={TRIP_MODES.map(m => ({ value: m.value, label: m.label, icon: <ModeIcon mode={m.value} /> }))}
            onPick={(m) => run(`${nameOf(trip.staff_id)}: ${modeLabel(m)}`, () => setTripMode(getSupabase(), trip.id, m))}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ModeIcon mode={trip.mode} />{modeLabel(trip.mode)}</span>
          </PickText>))}
        {line('Confirmation', trip.confirmation || <span style={link}>Not Booked Yet</span>)}
        {trip.segments.length === 0 ? line('Segments', <span style={link}>None Entered</span>) : trip.segments.map((s, i) => segLine(s, i, trip))}
        {trip.notes && line('Notes', trip.notes)}
        {trip.costs.map((c, i) => line(i === 0 ? 'Costs' : '', <span>{catLabel(c.category)}{c.category === 'mileage' && c.miles ? ` · ${c.miles} Miles` : ''}{c.note ? ` · ${c.note}` : ''} · Budget {money(c.estimated)} · Actual {c.actual === null || c.actual === undefined ? '—' : money(c.actual)}</span>))}
        {trip.costs.length > 0 && line('Total', <b>Budget {money(est)} · Actual {actuals.length ? money(actuals.reduce((a, c) => a + Number(c.actual), 0)) : '—'}</b>)}
        {canEdit && (
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <button type="button" onClick={() => setModal({ trip })} style={textBtn(false)}>Edit</button>
            {!(direction === 'in' ? p.outT : p.inT) && <button type="button" onClick={() => copyReturn(trip)} style={textBtn(false)}>Copy To Return Trip</button>}
            <button type="button" onClick={() => removeTrip(trip)} style={textBtn(true)}>Delete</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      {rework.length > 0 && (
        <div style={{ border: '1.5px solid #c9a400', background: 'color-mix(in srgb, #FFD60A 14%, transparent)', borderRadius: 8, padding: '12px 16px', marginBottom: 12, flexShrink: 0 }}>
          <div style={{ fontSize: FS.small, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Needs Action · Removed From Event, Travel Still Booked</div>
          {rework.map((t, i) => (
            <div key={t.id} data-rework-row="" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '6px 0', borderTop: i ? `1px solid ${LINE}` : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div><b>{personName(t.staff)}</b> · {t.direction === 'in' ? 'Travel To' : 'Travel From'}: {describeTrip(t)}</div>
                {t.rework_note && <div style={{ fontSize: FS.body, color: 'var(--text-secondary)' }}>{t.rework_note}</div>}
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Name, Role, Flight, Confirmation" style={{ fontFamily: 'inherit', fontSize: FS.body, border: `1px solid ${LINE}`, borderRadius: 6, padding: '7px 12px', minWidth: 260, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }} />
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
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: both ? '1fr 1fr' : '1fr', gap: 32 }}>
                        {showIn && infoCol(p, p.inT, 'in')}
                        {showOut && infoCol(p, p.outT, 'out')}
                      </div>
                    </div>
                  </ExpandRow>
                )}
              </FragmentWith>
            ))}
          </FragmentWith>
        ))}
      </TableShell>
      <div style={{ marginTop: 10, color: 'var(--text-muted-legible)', fontSize: FS.small }}>Click any row to open the full schedule and costs. Names and roles come from the staffing grid. Anyone not on the grid can be added by hand.</div>

      {modal && (
        <TripModal trip={modal.trip} preset={modal.preset} staffList={staffList} trips={trips.filter(isEntered)} suggest={suggest} mileageRate={mileageRate} saving={saving} onSave={save} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function FragmentWith({ children }) { return <>{children}</> }
