'use client'

import { useEffect, useState, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react'

function staffDisplayName(staff) {
  if (!staff) return ''
  return staff.display_name?.trim() || `${staff.first_name} ${staff.last_name}`
}

function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function getWeekendGroup(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay()
  const friday = new Date(date)
  if (day === 0) friday.setDate(date.getDate() - 2)
  else if (day === 6) friday.setDate(date.getDate() - 1)
  else if (day !== 5) friday.setDate(date.getDate() + (5 - day))
  return toYMD(friday)
}

function fmtWeekendRange(fridayStr) {
  if (!fridayStr) return ''
  const fri = new Date(fridayStr + 'T00:00:00')
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
  const opts = { month: 'short', day: 'numeric' }
  return fri.toLocaleDateString('en-US', opts) + ' – ' + sun.toLocaleDateString('en-US', opts)
}

function fmtLoadIn(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EVENT_STATUS_STYLES = {
  confirmed: { label: 'Confirmed', color: 'var(--status-confirmed)', bg: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  '1-hold': { label: '1-Hold', color: 'var(--status-1hold)', bg: 'var(--status-1hold-bg)', border: 'var(--status-1hold-border)' },
  '2-hold': { label: '2-Hold', color: 'var(--status-2hold)', bg: 'var(--status-2hold-bg)', border: 'var(--status-2hold-border)' },
  '3-hold': { label: '3+ Hold', color: 'var(--status-3hold)', bg: 'var(--status-3hold-bg)', border: 'var(--status-3hold-border)' },
  tentative: { label: 'Tentative', color: 'var(--status-tentative)', bg: 'var(--status-tentative-bg)', border: 'var(--status-tentative-border)' },
  'date-hold': { label: 'Date Hold', color: 'var(--status-dateHold)', bg: 'var(--status-dateHold-bg)', border: 'var(--status-dateHold-border)' },
}

const LOCKED_STRIPE = 'repeating-linear-gradient(45deg, var(--border-card) 0px, var(--border-card) 1px, transparent 1px, transparent 7px)'

const LEFT_WIDTH = 220
const COL_WIDTH = 140
const ROW_HEIGHT = 38
const DEPT_H = 32
const H1 = 46
const H2 = 32
const H3 = 32
const H4 = 32
const H5 = 32

function StaffPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    const timer = setTimeout(async () => {
      if (!q) { setResults([]); return }
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase
        .from('staff')
        .select('id, first_name, last_name, display_name')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .order('last_name', { ascending: true })
        .limit(6)
      setResults(data || [])
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        placeholder="Search staff..."
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {query.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 8, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {loading && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No results</div>}
          {results.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {staffDisplayName(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConflictConfirm({ staffName, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: 24, width: 400 }}>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 20 }}>
          {staffName} is already assigned to another position on this tour. Assign here anyway?
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm}>Assign Anyway</button>
        </div>
      </div>
    </div>
  )
}

function GridCell({ tourPositionId, slotIndex, eventId, assignment, locked, onAssign, onRemove, zebra, borderRight }) {
  const [picking, setPicking] = useState(false)
  const [hovered, setHovered] = useState(false)
  const hasStaff = !!(assignment && assignment.staff_id && assignment.staff)

  return (
    <td
      style={{
        position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH, height: ROW_HEIGHT,
        padding: '0 8px', boxSizing: 'border-box',
        borderBottom: '1px solid var(--border-card)', borderRight,
        background: locked ? LOCKED_STRIPE : (zebra ? 'var(--bg-card)' : 'transparent'),
        cursor: locked ? 'default' : 'pointer',
        verticalAlign: 'middle',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!locked && !picking) setPicking(true) }}
    >
      {picking ? (
        <StaffPicker
          onSelect={s => { setPicking(false); onAssign(tourPositionId, slotIndex, eventId, s) }}
          onClose={() => setPicking(false)}
        />
      ) : locked ? null : hasStaff ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {staffDisplayName(assignment.staff)}
          </span>
          {hovered && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(tourPositionId, slotIndex, eventId) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: hovered ? 1 : 0.5 }}>+</span>
      )}
    </td>
  )
}

export default function TourStaffingGrid({ tourId }) {
  const router = useRouter()
  const [tourColor, setTourColor] = useState('var(--color-mint)')
  const [events, setEvents] = useState([])
  const [departments, setDepartments] = useState([])
  const [defaultAssignments, setDefaultAssignments] = useState([])
  const [eventOverrides, setEventOverrides] = useState([])
  const [tourPositionIds, setTourPositionIds] = useState([])
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [conflict, setConflict] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabase()

      const [tourRes, eventsRes, tourPositionsRes] = await Promise.all([
        supabase.from('tours').select('color').eq('id', tourId).single(),
        supabase.from('events')
          .select('id, load_in_date, city, state, country, status, venue_name')
          .eq('tour_id', tourId)
          .order('load_in_date', { ascending: true }),
        supabase.from('tour_positions')
          .select(`
            id,
            quantity_needed,
            position:positions(
              id,
              title,
              sort_order,
              department:departments(id, name, sort_order)
            )
          `)
          .eq('tour_id', tourId)
          .order('created_at', { ascending: true }),
      ])

      if (tourRes.data?.color) setTourColor(tourRes.data.color)
      setEvents(eventsRes.data || [])

      const tps = tourPositionsRes.data || []
      const tpIds = tps.map(tp => tp.id)
      setTourPositionIds(tpIds)

      let defaultsData = []
      let overridesData = []
      if (tpIds.length > 0) {
        const [defaultsRes, overridesRes] = await Promise.all([
          supabase
            .from('staff_assignments')
            .select(`
              id,
              tour_position_id,
              slot_index,
              staff_id,
              status,
              confirmed,
              notes,
              staff:staff(id, first_name, last_name, display_name)
            `)
            .in('tour_position_id', tpIds)
            .is('event_id', null),
          supabase
            .from('staff_assignments')
            .select(`
              id,
              tour_position_id,
              slot_index,
              staff_id,
              event_id,
              staff:staff(id, first_name, last_name, display_name)
            `)
            .in('tour_position_id', tpIds)
            .not('event_id', 'is', null),
        ])
        defaultsData = defaultsRes.data || []
        overridesData = overridesRes.data || []
      }

      const deptMap = {}
      tps.forEach(tp => {
        const dept = tp.position.department
        if (!deptMap[dept.id]) deptMap[dept.id] = { id: dept.id, name: dept.name, sortOrder: dept.sort_order, positions: [] }
        deptMap[dept.id].positions.push({
          tourPositionId: tp.id,
          title: tp.position.title,
          sortOrder: tp.position.sort_order,
          quantityNeeded: tp.quantity_needed,
        })
      })
      const deptList = Object.values(deptMap)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(d => ({ ...d, positions: d.positions.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) }))

      setDepartments(deptList)
      setDefaultAssignments(defaultsData)
      setEventOverrides(overridesData)
      setExpandedDepts(new Set(deptList.map(d => d.id)))
      setLoading(false)
    }
    loadData()
  }, [tourId, reloadKey])

  const toggleDept = (id) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resolveCell = (tourPositionId, slotIndex, eventId) => {
    const override = eventOverrides.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex && a.event_id === eventId)
    if (override) return { assignment: override, locked: false }
    const def = defaultAssignments.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex)
    if (def) return { assignment: def, locked: false }
    const existsForOtherEvents = eventOverrides.some(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex)
    if (existsForOtherEvents) return { assignment: null, locked: true }
    return { assignment: null, locked: false }
  }

  const doAssign = async (tourPositionId, slotIndex, eventId, staffMember) => {
    const supabase = getSupabase()
    const existingOverride = eventOverrides.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex && a.event_id === eventId)
    if (existingOverride) {
      const { error } = await supabase.from('staff_assignments').update({ staff_id: staffMember.id }).eq('id', existingOverride.id)
      if (!error) {
        setEventOverrides(prev => prev.map(a => a.id === existingOverride.id ? { ...a, staff_id: staffMember.id, staff: staffMember } : a))
      }
    } else {
      const { data, error } = await supabase
        .from('staff_assignments')
        .insert({ tour_position_id: tourPositionId, slot_index: slotIndex, staff_id: staffMember.id, event_id: eventId })
        .select()
        .single()
      if (!error && data) {
        setEventOverrides(prev => [...prev, { ...data, staff: staffMember }])
      }
    }
  }

  const handleAssign = async (tourPositionId, slotIndex, eventId, staffMember) => {
    const supabase = getSupabase()
    const { data: conflicts } = await supabase
      .from('staff_assignments')
      .select('id, tour_position_id')
      .eq('staff_id', staffMember.id)
      .is('event_id', null)
      .in('tour_position_id', tourPositionIds)
    const conflictRow = (conflicts || []).find(c => c.tour_position_id !== tourPositionId)
    if (conflictRow) {
      setConflict({ staffMember, tourPositionId, slotIndex, eventId })
      return
    }
    await doAssign(tourPositionId, slotIndex, eventId, staffMember)
  }

  const handleRemove = async (tourPositionId, slotIndex, eventId) => {
    const { assignment: resolved } = resolveCell(tourPositionId, slotIndex, eventId)
    if (!resolved) return
    const supabase = getSupabase()
    if (resolved.event_id === eventId) {
      setEventOverrides(prev => prev.filter(a => a.id !== resolved.id))
      const { error } = await supabase.from('staff_assignments').delete().eq('id', resolved.id)
      if (error) reload()
    } else {
      const { data, error } = await supabase
        .from('staff_assignments')
        .insert({ tour_position_id: tourPositionId, slot_index: slotIndex, staff_id: null, event_id: eventId })
        .select()
        .single()
      if (!error && data) setEventOverrides(prev => [...prev, data])
    }
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  if (departments.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>No positions configured for this tour.</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set up staffing in Edit Tour → Tour Staffing.</div>
        <button className="btn-primary" onClick={() => router.push(`/tours/${tourId}/edit`)}>Go to Edit Tour</button>
      </div>
    )
  }

  // Weekend grouping across event columns
  const weekendMap = {}
  const weekendGroups = []
  events.forEach(ev => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date || 'unknown'
    if (!weekendMap[wk]) { weekendMap[wk] = []; weekendGroups.push(wk) }
    weekendMap[wk].push(ev)
  })

  const TOP_1 = H1
  const TOP_2 = H1 + H2
  const TOP_3 = H1 + H2 + H3
  const TOP_4 = H1 + H2 + H3 + H4

  const headerCellBase = { position: 'sticky', zIndex: 30, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)', borderRight: '1px solid var(--border-card)', padding: '0 6px', textAlign: 'center', boxSizing: 'border-box' }
  const leftHeaderCellBase = { position: 'sticky', left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, background: 'var(--bg)', borderBottom: '1px solid var(--border-card)', borderRight: '1px solid var(--border-card)', padding: '0 14px', textAlign: 'left', boxSizing: 'border-box' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-card)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 'max-content', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...leftHeaderCellBase, top: 0, height: H1 }} />
              {weekendGroups.map((wk, wi) => (
                <th key={wk} colSpan={weekendMap[wk].length} style={{ ...headerCellBase, top: 0, height: H1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weekend</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtWeekendRange(wk)}</div>
                </th>
              ))}
            </tr>
            <tr>
              <th style={{ ...leftHeaderCellBase, top: TOP_1, height: H2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>City</span>
              </th>
              {events.map(ev => (
                <th key={ev.id} style={{ ...headerCellBase, top: TOP_1, height: H2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                  </span>
                </th>
              ))}
            </tr>
            <tr>
              <th style={{ ...leftHeaderCellBase, top: TOP_2, height: H3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
              </th>
              {events.map(ev => {
                const st = EVENT_STATUS_STYLES[ev.status]
                return (
                  <th key={ev.id} style={{ ...headerCellBase, top: TOP_2, height: H3 }}>
                    {st ? (
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: `1px solid ${st.border}`, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </th>
                )
              })}
            </tr>
            <tr>
              <th style={{ ...leftHeaderCellBase, top: TOP_3, height: H4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Load-In</span>
              </th>
              {events.map(ev => (
                <th key={ev.id} style={{ ...headerCellBase, top: TOP_3, height: H4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtLoadIn(ev.load_in_date)}</span>
                </th>
              ))}
            </tr>
            <tr>
              <th style={{ ...leftHeaderCellBase, top: TOP_4, height: H5, borderBottom: `3px solid ${tourColor}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Venue</span>
              </th>
              {events.map(ev => (
                <th key={ev.id} style={{ ...headerCellBase, top: TOP_4, height: H5, borderBottom: `3px solid ${tourColor}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontSize: 11, color: ev.venue_name ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{ev.venue_name || '—'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => {
              const expanded = expandedDepts.has(dept.id)
              let rowIndex = 0
              return (
                <Fragment key={dept.id}>
                  <tr>
                    <td
                      onClick={() => toggleDept(dept.id)}
                      style={{ position: 'sticky', left: 0, zIndex: 20, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: DEPT_H, background: 'var(--bg-card-hover)', borderLeft: `3px solid ${tourColor}`, borderRight: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)', padding: '0 14px', cursor: 'pointer', boxSizing: 'border-box' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {expanded ? <IconChevronDown size={14} color="var(--text-muted)" /> : <IconChevronRight size={14} color="var(--text-muted)" />}
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)' }}>{dept.name}</span>
                      </div>
                    </td>
                    {events.map((ev, i) => (
                      <td key={ev.id} style={{ height: DEPT_H, background: 'var(--bg-card-hover)', borderRight: i < events.length - 1 ? '1px solid var(--border-card)' : 'none', borderBottom: '1px solid var(--border-card)' }} />
                    ))}
                  </tr>
                  {expanded && dept.positions.map(pos => (
                    Array.from({ length: pos.quantityNeeded }, (_, i) => i + 1).map(slotIndex => {
                      const zebra = rowIndex % 2 === 1
                      rowIndex += 1
                      return (
                        <tr key={`${pos.tourPositionId}-${slotIndex}`}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 10, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: ROW_HEIGHT, padding: '0 10px 0 6px', background: zebra ? 'var(--bg-card)' : 'var(--bg)', borderRight: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)', boxSizing: 'border-box' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pos.title}</span>
                          </td>
                          {events.map((ev, i) => {
                            const { assignment, locked } = resolveCell(pos.tourPositionId, slotIndex, ev.id)
                            return (
                              <GridCell
                                key={ev.id}
                                tourPositionId={pos.tourPositionId}
                                slotIndex={slotIndex}
                                eventId={ev.id}
                                assignment={assignment}
                                locked={locked}
                                onAssign={handleAssign}
                                onRemove={handleRemove}
                                zebra={zebra}
                                borderRight={i < events.length - 1 ? '1px solid var(--border-card)' : 'none'}
                              />
                            )
                          })}
                        </tr>
                      )
                    })
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {conflict && (
        <ConflictConfirm
          staffName={staffDisplayName(conflict.staffMember)}
          onConfirm={() => { doAssign(conflict.tourPositionId, conflict.slotIndex, conflict.eventId, conflict.staffMember); setConflict(null) }}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}
