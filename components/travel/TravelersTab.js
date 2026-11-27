'use client'

// The Travelers tab, built from the approved mockup: one row per person, Inbound and Outbound side by side, grouped by department,
// a row opens to the full schedule. Colors and type come from the app's tokens.
import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { TRIP_STATUSES, statusLabel, modeLabel, isEntered, tripDate, tripTime, tripAirport, hasFlightFields,
  upsertTrip, saveSegments, setTripStatus, deleteTrip, resolveRework, copyToReturnTrip } from '@/lib/travel/trips'
import { formatTime } from '@/lib/travel/time'
import { describeTrip } from '@/lib/travelRework'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import TripModal from './TripModal'
import { CARD, LINE, SMALL_LABEL, TH, TD, BTN_S, Chip, STATUS_TONE, fmtDay, personName } from './shared'

const DIRS = [{ key: 'both', label: 'Both' }, { key: 'in', label: 'Travel To' }, { key: 'out', label: 'Travel From' }]
const FILTERS = [{ key: 'not_started', label: 'Not Started' }, { key: 'good_to_book', label: 'Good To Book' }, { key: 'pending_approval', label: 'Pending Approval' }, { key: 'booked', label: 'Booked' }]
const RANK = { not_started: 0, good_to_book: 1, pending_approval: 2, booked: 3 }
const flyerRank = (t) => (t && !hasFlightFields(t.mode) ? 1 : 0)
const link = { color: 'var(--text-muted)' }

// one pill for a person: the least advanced of their live trips (Cancelled only when every trip is cancelled)
function personStatus(list) {
  if (!list.length) return 'not_started'
  const live = list.filter(t => t.status !== 'cancelled')
  if (!live.length) return 'cancelled'
  return live.reduce((m, t) => (RANK[t.status] < RANK[m] ? t.status : m), 'booked')
}

function StatusMenu({ trips, canEdit, onChange, status }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const style = useAnchoredMenu(anchorRef, open, 190, TRIP_STATUSES.length * 34 + 12)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const interactive = canEdit && trips.length > 0
  return (
    <>
      <Chip tone={STATUS_TONE[status]} anchorRef={anchorRef} onClick={interactive ? (e) => { e.stopPropagation(); setOpen(o => !o) } : undefined}>{statusLabel(status)}</Chip>
      {open && style && createPortal(
        <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
          {TRIP_STATUSES.map(o => (
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
      {detail && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>}
    </div>
  )
}

export default function TravelersTab({ eventId, people, tbdRoles, trips, staffList, canEdit, undoable, reload, modalRequest, onModalHandled, roomedIds, needsByStaff, suggest }) {
  const [dir, setDir] = useState('both')
  const [filter, setFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null) // { trip, preset }
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (modalRequest) { setModal({ trip: null, preset: null }); onModalHandled?.() } }, [modalRequest, onModalHandled])

  const nameOf = (staffId) => personName(staffList.find(s => s.id === staffId) || people.find(p => p.staff_id === staffId)?.staff)
  const entered = useMemo(() => trips.filter(t => isEntered(t) && !t.needs_rework), [trips])
  const rework = useMemo(() => trips.filter(t => t.needs_rework), [trips])
  const assignedIds = useMemo(() => new Set(people.map(p => p.staff_id)), [people])

  // one record per person; assigned people first by department, then anyone else with entered travel, then open roles
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
    const open = tbdRoles.map(r => ({ key: `tbd-${r.id}`, staff_id: null, staff: null, role: r.title, dept: r.department || 'Other', deptOrder: r.deptSortOrder ?? 999, posOrder: r.sortOrder ?? 999, inT: null, outT: null, list: [], status: 'not_started', tbd: true }))
    return [...assigned, ...others, ...open]
  }, [people, entered, assignedIds, tbdRoles])

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f.key, persons.filter(p => !p.tbd && p.status === f.key).length])), [persons])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const visible = persons.filter(p => (!filter || (!p.tbd && p.status === filter)) && (!q || [p.role, p.tbd ? 'tbd' : personName(p.staff), ...p.list.flatMap(t => [t.confirmation, ...t.segments.map(s => `${s.airline || ''} ${s.flight_number || ''}`)])].filter(Boolean).join(' ').toLowerCase().includes(q)))
    const by = {}
    for (const p of visible) (by[p.dept] ||= { dept: p.dept, order: p.deptOrder, rows: [] }).rows.push(p)
    const key = (p) => p.inT || p.outT
    for (const g of Object.values(by)) g.rows.sort((a, b) => {
      const ka = key(a), kb = key(b)
      if (!!ka !== !!kb) return ka ? -1 : 1 // people with travel first
      if (!ka) return a.posOrder - b.posOrder
      return (tripDate(a.inT || a.outT) || '9999').localeCompare(tripDate(b.inT || b.outT) || '9999') || flyerRank(a.inT || a.outT) - flyerRank(b.inT || b.outT) || (tripTime(a.inT || a.outT) || '99').localeCompare(tripTime(b.inT || b.outT) || '99') || a.posOrder - b.posOrder
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
    })
    setSaving(false)
    setModal(null)
  }

  const showIn = dir !== 'out', showOut = dir !== 'in'
  const widths = { role: 13, name: 14, mode: 9, status: 12, inn: showIn && showOut ? 17 : 29, out: showIn && showOut ? 17 : 29, room: 8, pd: 7, chev: 3 }
  const colCount = 7 + (showIn ? 1 : 0) + (showOut ? 1 : 0) + 1

  const roomChip = (p) => (p.tbd ? <Chip tone="grey">Hold</Chip> : roomedIds.has(p.staff_id) ? <Chip tone="green">Room</Chip> : needsByStaff[p.staff_id]?.needs_hotel ? <Chip tone="blue">Unassigned</Chip> : <Chip tone="grey">—</Chip>)
  const pdChip = (p) => (p.tbd ? <Chip tone="grey">—</Chip> : needsByStaff[p.staff_id]?.needs_perdiem ? <Chip tone="green">Eligible</Chip> : <Chip tone="grey">—</Chip>)

  const legBox = (p, trip, direction) => (
    <div style={{ ...CARD, padding: '10px 12px', background: 'var(--surface-card)' }}>
      <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>Full Schedule · {direction === 'in' ? 'Travel To' : 'Travel From'}</div>
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
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{fmtDay(s.depart_date)}{s.depart_time ? ` · ${formatTime(s.depart_time)}` : ''}{(s.arrive_time || s.arrive_date) ? ` → ${s.arrive_date && s.arrive_date !== s.depart_date ? `${fmtDay(s.arrive_date)} · ` : ''}${formatTime(s.arrive_time)}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 8, borderTop: `1px solid ${LINE}` }}><span style={link}>Confirmation</span><b>{trip.confirmation || 'Not Booked Yet'}</b></div>
          {trip.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Notes: {trip.notes}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <StatusMenu trips={[trip]} canEdit={canEdit} status={trip.status} onChange={(st) => run(`${nameOf(trip.staff_id)}: ${statusLabel(st)}`, () => setTripStatus(getSupabase(), trip.id, st))} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      {rework.length > 0 && (
        <div style={{ border: '1.5px solid color-mix(in srgb, var(--color-warning) 70%, transparent)', background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', borderRadius: 8, padding: '12px 16px', marginBottom: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Needs Action · Removed From Event, Travel Still Booked</div>
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
        <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-card)' }}>
          {DIRS.map(d => (
            <button key={d.key} type="button" onClick={() => setDir(d.key)} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: 600, border: 0, padding: '6px 14px', cursor: 'pointer', background: dir === d.key ? 'color-mix(in srgb, var(--color-info) 12%, transparent)' : 'transparent', color: dir === d.key ? 'var(--color-info)' : 'var(--text-muted)' }}>{d.label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setFilter(null)} style={{ ...BTN_S, opacity: filter ? 0.7 : 1 }}>All</button>
        {FILTERS.map(f => (
          <Chip key={f.key} tone={STATUS_TONE[f.key]} onClick={() => setFilter(filter === f.key ? null : f.key)}>{f.label} · {counts[f.key]}</Chip>
        ))}
        <span style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Name, Role, Flight, Confirmation" style={{ fontFamily: 'inherit', fontSize: 15, border: `1px solid ${LINE}`, borderRadius: 6, padding: '7px 12px', minWidth: 260, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }} />
      </div>

      <div style={{ ...CARD, overflow: 'auto', flexShrink: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', minWidth: 980 }}>
          <colgroup>
            <col style={{ width: `${widths.role}%` }} /><col style={{ width: `${widths.name}%` }} /><col style={{ width: `${widths.mode}%` }} /><col style={{ width: `${widths.status}%` }} />
            {showIn && <col style={{ width: `${widths.inn}%` }} />}{showOut && <col style={{ width: `${widths.out}%` }} />}
            <col style={{ width: `${widths.room}%` }} /><col style={{ width: `${widths.pd}%` }} /><col style={{ width: `${widths.chev}%` }} />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Role</th><th style={TH}>Name</th><th style={TH}>Mode</th><th style={TH}>Status</th>
              {showIn && <th style={TH}>Inbound · Final Arrival</th>}{showOut && <th style={TH}>Outbound · First Departure</th>}
              <th style={TH}>Room</th><th style={TH}>Per Diem</th><th style={TH} />
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && <tr><td colSpan={colCount} style={{ ...TD, color: 'var(--text-muted)' }}>{persons.length ? 'No travelers match.' : 'No one is assigned to this event yet.'}</td></tr>}
            {groups.map(g => (
              <FragmentGroup key={g.dept} dept={g.dept} colCount={colCount}>
                {g.rows.map(p => {
                  const open = !!expanded[p.key]
                  const modes = [...new Set(p.list.map(t => modeLabel(t.mode)))]
                  return (
                    <RowPair key={p.key}>
                      <tr onClick={() => !p.tbd && setExpanded(x => ({ ...x, [p.key]: !x[p.key] }))} style={{ cursor: p.tbd ? 'default' : 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        <td style={TD}>{p.role}</td>
                        <td style={{ ...TD, fontWeight: 600, ...(p.tbd ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}) }}>{p.tbd ? 'TBD' : personName(p.staff)}</td>
                        <td style={TD}>{modes.length ? modes.join(' / ') : '—'}</td>
                        <td style={TD} onClick={e => e.stopPropagation()}><StatusMenu trips={p.list} canEdit={canEdit} status={p.status} onChange={(st) => setStatuses(p, st)} /></td>
                        {showIn && <td style={{ ...TD, whiteSpace: 'normal' }}><Leg trip={p.inT} /></td>}
                        {showOut && <td style={{ ...TD, whiteSpace: 'normal' }}><Leg trip={p.outT} /></td>}
                        <td style={TD}>{roomChip(p)}</td>
                        <td style={TD}>{pdChip(p)}</td>
                        <td style={{ ...TD, color: 'var(--text-muted)', textAlign: 'center' }}>{p.tbd ? '' : open ? '▴' : '▾'}</td>
                      </tr>
                      {open && (
                        <tr><td colSpan={colCount} style={{ padding: 0, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderBottom: `1px solid ${LINE}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: showIn && showOut ? '1fr 1fr' : '1fr', gap: 14, padding: '14px 16px' }}>
                            {showIn && legBox(p, p.inT, 'in')}
                            {showOut && legBox(p, p.outT, 'out')}
                          </div>
                        </td></tr>
                      )}
                    </RowPair>
                  )
                })}
              </FragmentGroup>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>Click any row to open the full schedule. Names and roles come from the staffing grid. Anyone not on the grid can be added by hand.</div>

      {modal && (
        <TripModal trip={modal.trip} preset={modal.preset} staffList={staffList} trips={trips.filter(isEntered)} suggest={suggest} saving={saving} onSave={save} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// a department sub-header row followed by its rows
function FragmentGroup({ dept, colCount, children }) {
  return (
    <>
      <tr><td colSpan={colCount} style={{ ...SMALL_LABEL, fontSize: 12, padding: '6px 10px', background: 'color-mix(in srgb, var(--color-info) 6%, transparent)', borderBottom: `1px solid ${LINE}`, color: 'var(--color-info)' }}>{dept}</td></tr>
      {children}
    </>
  )
}
function RowPair({ children }) { return <>{children}</> }
