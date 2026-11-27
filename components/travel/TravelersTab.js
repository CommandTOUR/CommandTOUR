'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronDown, IconChevronRight, IconAlertTriangle } from '@tabler/icons-react'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { TRIP_STATUSES, statusLabel, modeLabel, isEntered, tripDate, tripTime, tripAirport, hasFlightFields,
  upsertTrip, saveSegments, setTripStatus, deleteTrip, resolveRework } from '@/lib/travel/trips'
import { describeTrip } from '@/lib/travelRework'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import TripModal from './TripModal'
import { GLASS, HEADER_CELL, BTN_PRIMARY, BTN_SMALL, StatusChip, fmtDay, fmtClock, personName } from './shared'

const GRID = '1.15fr 1.25fr 0.85fr 0.7fr 1.05fr 1.05fr 0.75fr 0.6fr 0.9fr 1fr 40px'
const CELL = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15, color: 'var(--text-primary)' }
const MUTED = { ...CELL, color: 'var(--text-muted)' }
const DIRS = [{ key: 'both', label: 'Both' }, { key: 'in', label: 'To' }, { key: 'out', label: 'From' }]
const SECTION = { in: 'To The Event', out: 'From The Event' }

const flyerRank = (t) => (hasFlightFields(t.mode) ? 0 : 1) // flyers before drivers

function StatusMenu({ trip, canEdit, onChange }) {
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
  return (
    <>
      <StatusChip status={trip.status} label={statusLabel(trip.status)} interactive={canEdit} anchorRef={anchorRef} onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }} />
      {open && style && createPortal(
        <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
          {TRIP_STATUSES.map(o => (
            <div key={o.value} role="menuitem" onClick={() => { setOpen(false); if (o.value !== trip.status) onChange(o.value) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: o.value === trip.status ? 700 : 500, color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <StatusChip status={o.value} label={o.label} />
            </div>
          ))}
        </div>, document.body)}
    </>
  )
}

export default function TravelersTab({ eventId, people, tbdRoles, trips, staffList, canEdit, undoable, reload, modalRequest, onModalHandled }) {
  const [dir, setDir] = useState('both')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null) // { trip } | { preset }
  const [saving, setSaving] = useState(false)

  // "+ Add Traveler" in the workspace header asks this tab to open the modal
  useEffect(() => { if (modalRequest) { setModal({ trip: null, preset: null }); onModalHandled?.() } }, [modalRequest, onModalHandled])

  const nameOf = (staffId) => personName(staffList.find(s => s.id === staffId) || people.find(p => p.staff_id === staffId)?.staff)
  const entered = useMemo(() => trips.filter(t => isEntered(t) && !t.needs_rework), [trips])
  const rework = useMemo(() => trips.filter(t => t.needs_rework), [trips])
  const assignedIds = useMemo(() => new Set(people.map(p => p.staff_id)), [people])

  // one row per assigned person per direction, then everyone else with entered travel
  const sections = useMemo(() => {
    const build = (direction) => {
      const rows = people.map(p => ({ key: `${p.staff_id}-${direction}`, person: p, trip: entered.find(t => t.staff_id === p.staff_id && t.direction === direction) || null }))
      const withTrip = rows.filter(r => r.trip).sort((a, b) =>
        (tripDate(a.trip) || '9999').localeCompare(tripDate(b.trip) || '9999') || flyerRank(a.trip) - flyerRank(b.trip) || (tripTime(a.trip) || '99').localeCompare(tripTime(b.trip) || '99') || personName(a.person.staff).localeCompare(personName(b.person.staff)))
      const without = rows.filter(r => !r.trip) // already in position order
      const others = entered.filter(t => t.direction === direction && !assignedIds.has(t.staff_id)).sort((a, b) =>
        (tripDate(a) || '9999').localeCompare(tripDate(b) || '9999') || flyerRank(a) - flyerRank(b) || (tripTime(a) || '99').localeCompare(tripTime(b) || '99'))
        .map(t => ({ key: t.id, person: { staff_id: t.staff_id, staff: t.staff, position: { title: '—' } }, trip: t }))
      return { direction, rows: [...withTrip, ...without], others }
    }
    return [build('in'), build('out')].filter(s => dir === 'both' || s.direction === dir)
  }, [people, entered, assignedIds, dir])

  const run = async (message, fn) => {
    try { await undoable(message, [eventId], fn) } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    reload()
  }
  const changeStatus = (trip, status) => run(`${personName(trip.staff) || nameOf(trip.staff_id)}: ${statusLabel(status)}`, () => setTripStatus(getSupabase(), trip.id, status))
  const removeTrip = (trip) => { if (!confirm(`Delete this trip for ${nameOf(trip.staff_id)}?`)) return; run('Trip deleted', () => deleteTrip(getSupabase(), trip.id)) }

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

  const renderHeader = () => (
    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 8px', padding: '12px 16px 6px', alignItems: 'center' }}>
      {['Role', 'Name', 'Travel Date', 'Mode', 'Status', 'Airline And Flight', 'Time', 'Airport', 'Confirmation', 'Notes'].map(h => <div key={h} style={HEADER_CELL}>{h}</div>)}<div />
    </div>
  )

  const renderRow = (row) => {
    const { person, trip } = row
    const open = !!expanded[row.key]
    const lead = trip ? (trip.direction === 'in' ? trip.segments[trip.segments.length - 1] : trip.segments[0]) : null
    return (
      <div key={row.key} style={{ borderTop: '0.5px solid var(--border-default)' }}>
        <div onClick={() => trip && setExpanded(p => ({ ...p, [row.key]: !p[row.key] }))} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 8px', alignItems: 'center', padding: '8px 16px', cursor: trip ? 'pointer' : 'default' }}>
          <div style={{ ...CELL, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{person.position?.title || '—'}</div>
          <div style={{ ...CELL, fontWeight: 600 }}>{personName(person.staff)}</div>
          {trip ? (
            <>
              <div style={CELL}>{fmtDay(tripDate(trip))}</div>
              <div style={CELL}>{modeLabel(trip.mode)}</div>
              <div onClick={e => e.stopPropagation()}><StatusMenu trip={trip} canEdit={canEdit} onChange={(s) => changeStatus(trip, s)} /></div>
              <div style={CELL}>{[lead?.airline, lead?.flight_number].filter(Boolean).join(' ') || '—'}{trip.segments.length > 1 ? ` +${trip.segments.length - 1}` : ''}</div>
              <div style={CELL}>{fmtClock(tripTime(trip))}</div>
              <div style={CELL}>{tripAirport(trip) || '—'}</div>
              <div style={trip.confirmation ? CELL : MUTED}>{trip.confirmation || '—'}</div>
              <div style={MUTED}>{trip.notes || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>{open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}</div>
            </>
          ) : (
            <>
              <div style={{ ...MUTED, gridColumn: '3 / span 4', fontStyle: 'italic' }}>No Travel Entered</div>
              <div style={{ gridColumn: '7 / span 4' }}>{canEdit && person.staff_id && <button type="button" onClick={() => setModal({ trip: null, preset: { staffId: person.staff_id, direction: row.direction } })} style={{ ...BTN_SMALL, border: '0.5px solid var(--color-info)', color: 'var(--color-info)' }}>+ Add</button>}</div>
              <div />
            </>
          )}
        </div>
        {trip && open && (
          <div style={{ padding: '4px 16px 14px 32px', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(26,86,219,0.03)' }}>
            <div style={{ ...HEADER_CELL, fontSize: 12 }}>Full Schedule</div>
            {trip.segments.length === 0 && <div style={MUTED}>No segments entered.</div>}
            {trip.segments.map((s, i) => (
              <div key={s.id || i} style={{ display: 'flex', gap: 16, fontSize: 15, color: 'var(--text-primary)', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, minWidth: 90 }}>{[s.airline, s.flight_number].filter(Boolean).join(' ') || `Segment ${i + 1}`}</span>
                <span style={{ minWidth: 120 }}>{[s.from_airport, s.to_airport].filter(Boolean).join(' → ') || '—'}</span>
                <span>{fmtDay(s.depart_date)} · {fmtClock(s.depart_time)} → {s.arrive_date && s.arrive_date !== s.depart_date ? `${fmtDay(s.arrive_date)} · ` : ''}{fmtClock(s.arrive_time)}</span>
              </div>
            ))}
            {trip.notes && <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Notes: {trip.notes}</div>}
            {canEdit && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setModal({ trip })} style={{ ...BTN_SMALL, border: '0.5px solid var(--color-info)', color: 'var(--color-info)' }}>Edit Trip</button>
                <button type="button" onClick={() => removeTrip(trip)} style={{ ...BTN_SMALL, border: '0.5px solid var(--color-danger)', color: 'var(--color-danger)' }}>Delete Trip</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', gap: 12, paddingBottom: 12 }}>
      {rework.length > 0 && (
        <div style={{ ...GLASS, border: '1.5px solid var(--color-warning)', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ ...HEADER_CELL, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><IconAlertTriangle size={16} /> Needs Action</div>
          {rework.map(t => (
            <div key={t.id} data-rework-row="" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: '0.5px solid var(--border-default)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{personName(t.staff)} · {t.direction === 'in' ? 'To' : 'From'}: {describeTrip(t)}</div>
                {t.rework_note && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t.rework_note}</div>}
              </div>
              {canEdit && (
                <>
                  <button type="button" onClick={() => run('Travel marked resolved', () => resolveRework(getSupabase(), t.id))} style={{ ...BTN_SMALL, border: '1px solid var(--color-success)' }}>Mark Resolved</button>
                  <button type="button" onClick={() => run('Travel row deleted', () => deleteTrip(getSupabase(), t.id))} style={{ ...BTN_SMALL, border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>Delete Row</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4 }}>
          {DIRS.map(d => (
            <button key={d.key} type="button" onClick={() => setDir(d.key)} style={{ fontSize: 15, padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: dir === d.key ? 'rgba(26,86,219,0.08)' : 'transparent', color: dir === d.key ? 'var(--color-info)' : 'var(--text-secondary)', fontWeight: dir === d.key ? 600 : 400 }}>{d.label}</button>
          ))}
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.direction} style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-info)', padding: '0 4px 6px' }}>{SECTION[sec.direction]}</div>
          <div style={{ ...GLASS, overflow: 'hidden' }}>
            {renderHeader()}
            {sec.rows.length === 0 && sec.others.length === 0 && <div style={{ ...MUTED, padding: '12px 16px' }}>No one is assigned to this event yet.</div>}
            {sec.rows.map(r => renderRow({ ...r, direction: sec.direction }))}
            {tbdRoles.length > 0 && sec.direction === 'in' && tbdRoles.map(r => (
              <div key={`tbd-${r.id}`} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 8px', alignItems: 'center', padding: '8px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                <div style={{ ...CELL, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{r.title}</div>
                <div style={{ ...MUTED, fontStyle: 'italic' }}>TBD</div>
              </div>
            ))}
            {sec.others.length > 0 && (
              <>
                <div style={{ padding: '6px 16px', background: 'rgba(26,86,219,0.05)', borderTop: '0.5px solid var(--border-default)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-info)' }}>Other Travelers</div>
                {sec.others.map(r => renderRow({ ...r, direction: sec.direction }))}
              </>
            )}
          </div>
        </div>
      ))}

      {modal && (
        <TripModal trip={modal.trip} preset={modal.preset} staffList={staffList} trips={trips.filter(isEntered)} saving={saving} onSave={save} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
