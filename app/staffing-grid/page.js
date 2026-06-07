'use client'

import { useEffect, useState, useRef } from 'react'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const DEPARTMENT_ORDER = [
  'Operations',
  'Lighting / Audio / Video',
  'Monster Truck Drivers',
  'Side Acts',
  'Stuntman Show Productions',
  'Executives & Visitors',
]

const HWSS_POSITIONS = {
  'Operations': ['Tour Director', 'Event Manager', 'Front of House Manager', 'Tour Coordinator', 'Registrar / GLT', 'Paddock Coordinator', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3'],
  'Lighting / Audio / Video': ['LAV 1', 'LAV 2', 'Lighting', 'Host (Male)', 'Host (Female)', 'Host Trainer'],
  'Monster Truck Drivers': [],
  'Side Acts': [],
  'Stuntman Show Productions': Array(20).fill('Stunt Team'),
  'Executives & Visitors': Array(5).fill('Executive / Visitor'),
}

const HWMTL_POSITIONS = {
  'Operations': ['Tour Director', 'Event Manager', 'Front of House Manager', 'Tour Coordinator', 'Registrar / GLT', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3', 'Tech Official 4', 'Tech Official 5'],
  'Lighting / Audio / Video': ['LAV 1', 'LAV 2', 'Lighting', 'Host (Male)', 'Host (Female)', 'Host Trainer'],
  'Monster Truck Drivers': Array(7).fill('Driver'),
  'Side Acts': ['Robot Operator', 'FMX 1', 'FMX 2', 'FMX 3'],
  'Stuntman Show Productions': [],
  'Executives & Visitors': Array(5).fill('Executive / Visitor'),
}

function buildMasterPositions() {
  const rows = []
  DEPARTMENT_ORDER.forEach(dept => {
    const hwssPos = HWSS_POSITIONS[dept] || []
    const hwmtPos = HWMTL_POSITIONS[dept] || []
    const max = Math.max(hwssPos.length, hwmtPos.length)

    if (dept === 'Executives & Visitors') {
      for (let i = 0; i < 5; i++) {
        rows.push({ dept, position: 'Executive / Visitor', key: `exec__slot__${i + 1}`, displayLabel: `Exec / Visitor ${i + 1}`, isExec: true, hwssIndex: i, hwmtIndex: i })
      }
      return
    }

    if (max === 0) return

    const uniqueHwss = [...new Set(hwssPos)]
    const uniqueHwmt = [...new Set(hwmtPos)]
    const isDuplicate = (uniqueHwss.length <= 1 && hwssPos.length > 1) || (uniqueHwmt.length <= 1 && hwmtPos.length > 1)

    if (isDuplicate) {
      const posLabel = hwssPos[0] || hwmtPos[0]
      for (let i = 0; i < max; i++) {
        rows.push({ dept, position: posLabel, key: `${dept}__${posLabel}__${i + 1}`, displayLabel: `${posLabel} ${i + 1}`, hwssIndex: i < hwssPos.length ? i : null, hwmtIndex: i < hwmtPos.length ? i : null })
      }
    } else {
      const allPos = [...new Set([...hwssPos, ...hwmtPos])]
      const seen = {}
      allPos.forEach(pos => {
        seen[pos] = (seen[pos] || 0) + 1
        rows.push({ dept, position: pos, key: `${dept}__${pos}__${seen[pos]}`, displayLabel: pos, inHwss: hwssPos.includes(pos), inHwmt: hwmtPos.includes(pos) })
      })
    }
  })
  return rows
}

const MASTER_POSITIONS = buildMasterPositions()

function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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

function fmtWeekend(fridayStr) {
  if (!fridayStr) return ''
  const fri = new Date(fridayStr + 'T00:00:00')
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
  const opts = { month: 'short', day: 'numeric' }
  return `${fri.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', opts)}`
}

function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCountryShort(country) {
  if (!country) return ''
  if (country === 'United States') return ''
  if (country.length <= 3) return country
  return country.split(' ').map(w => w[0]).join('').toUpperCase()
}

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(51,255,153,0.15)', color: '#33FF99' },
  scheduled: { bg: 'rgba(255,204,0,0.15)', color: '#FFCC00' },
  attention: { bg: 'rgba(255,51,51,0.15)', color: '#FF3333' },
}

const HATCH_BG = `repeating-linear-gradient(45deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)`

function isHatchedCell(posRow, event) {
  if (posRow.isExec) return false
  const type = event?.event_type
  if (!type) return false
  if (posRow.hwssIndex !== undefined || posRow.hwmtIndex !== undefined) {
    if (type === 'hwss') return posRow.hwssIndex === null
    if (type === 'hwmt') return posRow.hwmtIndex === null
  }
  if (type === 'hwss') return posRow.inHwss === false
  if (type === 'hwmt') return posRow.inHwmt === false
  return false
}

// ── INLINE SEARCH ─────────────────────────────────────────────────────────────

function InlineSearch({ existingAssignment, onAssign, onClear, onClose }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const ref = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase.from('staff').select('id, first_name, last_name')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .order('last_name', { ascending: true }).limit(10)
      setResults(data || [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, width: 240, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', marginTop: 2, overflow: 'hidden' }}>
      {existingAssignment && (
        <div onClick={onClear} style={{ padding: '7px 12px', fontSize: 13, color: '#FF3333', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)', background: 'rgba(255,51,51,0.05)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,51,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,51,51,0.05)'}>
          × Remove
        </div>
      )}
      <div style={{ padding: '6px 10px', borderBottom: '0.5px solid var(--glass-border)' }}>
        <input ref={inputRef}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '5px 8px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }} />
      </div>
      {loading && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}
      {!loading && search.trim().length >= 2 && results.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No results</div>}
      {results.map(s => (
        <div key={s.id} onClick={() => onAssign(s)} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {s.first_name} {s.last_name}
        </div>
      ))}
    </div>
  )
}

// ── GRID CELL ─────────────────────────────────────────────────────────────────

function GridCell({ eventId, positionRow, assignment, isHatched, onRefresh, COL_WIDTH }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isExec = positionRow.isExec
  const statusStyle = (!isExec && assignment?.status) ? STATUS_COLORS[assignment.status] : null
  const staffName = assignment?.staff ? `${assignment.staff.first_name} ${assignment.staff.last_name}` : null

  const handleAssign = async (staffMember) => {
    const supabase = getSupabase()
    setOpen(false)
    if (assignment) {
      await supabase.from('event_staff').update({ staff_id: staffMember.id, status: isExec ? null : 'scheduled', confirmed: false }).eq('id', assignment.id)
    } else {
      await supabase.from('event_staff').insert([{ event_id: eventId, staff_id: staffMember.id, position: positionRow.displayLabel, position_key: positionRow.key, status: isExec ? null : 'scheduled', confirmed: false }])
    }
    onRefresh()
  }

  const handleClear = async () => {
    if (!assignment) return
    const supabase = getSupabase()
    setOpen(false)
    await supabase.from('event_staff').delete().eq('id', assignment.id)
    onRefresh()
  }

  const cycleStatus = async (e) => {
    e.stopPropagation()
    if (!assignment?.staff_id || isExec) return
    const supabase = getSupabase()
    const cycle = { scheduled: 'confirmed', confirmed: 'attention', attention: 'scheduled' }
    const next = cycle[assignment.status || 'scheduled']
    const confirmed = next === 'confirmed'
    await supabase.from('event_staff').update({ status: next, confirmed }).eq('id', assignment.id)
    if (confirmed && assignment.staff_id) {
      const existing = await supabase.from('event_travel_arrivals').select('id').eq('event_id', eventId).eq('staff_id', assignment.staff_id).maybeSingle()
      if (!existing.data) {
        await supabase.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
        await supabase.from('event_travel_departures').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
      }
    }
    onRefresh()
  }

  return (
    <div style={{
      position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, height: 38,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 6px', cursor: 'pointer', boxSizing: 'border-box',
      background: isHatched && !assignment ? HATCH_BG : statusStyle ? statusStyle.bg : 'transparent',
      borderLeft: statusStyle ? `2px solid ${statusStyle.color}` : '2px solid transparent',
      transition: 'background 0.1s',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setOpen(true)}
    >
      {staffName ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center', minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: isExec ? 'var(--text-secondary)' : (statusStyle?.color || 'var(--text-primary)'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
            {staffName}
          </span>
          {hovered && !isExec && assignment?.staff_id && (
            <div onClick={cycleStatus} title="Cycle status" style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: statusStyle?.color || 'var(--text-muted)', cursor: 'pointer' }} />
          )}
        </div>
      ) : (
        hovered && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ Assign</span>
      )}
      {open && <InlineSearch existingAssignment={assignment} onAssign={handleAssign} onClear={handleClear} onClose={() => setOpen(false)} />}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function StaffingGrid() {
  const [events, setEvents] = useState([])
  const [tours, setTours] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [collapsedDepts, setCollapsedDepts] = useState({})

  const COL_WIDTH = 140
  const LEFT_WIDTH = 210
  const ROW_HEIGHT = 38

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [toursRes, eventsRes, assignmentsRes] = await Promise.all([
      supabase.from('tours').select('id, name, color, status').order('name', { ascending: true }),
      supabase.from('events').select('id, city, country, venue_name, num_shows, load_in_date, load_out_date, tour_id, event_type').order('load_in_date', { ascending: true }),
      supabase.from('event_staff').select('*, staff(id, first_name, last_name)'),
    ])
    setTours(toursRes.data || [])
    setEvents(eventsRes.data || [])
    const aMap = {}
    for (const a of (assignmentsRes.data || [])) {
      if (!aMap[a.event_id]) aMap[a.event_id] = []
      aMap[a.event_id].push(a)
    }
    setAssignments(aMap)
    setLoading(false)
  }

  const getAssignment = (eventId, positionKey) => (assignments[eventId] || []).find(a => a.position_key === positionKey)
  const getTourColor = (tourId) => tours.find(t => t.id === tourId)?.color || '#33FF99'
  const getTourName = (tourId) => tours.find(t => t.id === tourId)?.name || '—'
  const toggleDept = (dept) => setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))

  const weekendGroups = []
  const weekendMap = {}
  events.forEach(ev => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
    if (!weekendMap[wk]) { weekendMap[wk] = []; weekendGroups.push(wk) }
    weekendMap[wk].push(ev)
  })
  weekendGroups.sort()

  const orderedEvents = weekendGroups.flatMap(wk => weekendMap[wk])
  const totalEventCols = orderedEvents.length

  const borderRight = (evIndex) => {
    const ev = orderedEvents[evIndex]
    if (!ev) return '0.5px solid rgba(255,255,255,0.06)'
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
    const grp = weekendMap[wk]
    const isLast = grp[grp.length - 1].id === ev.id
    const isLastEv = evIndex === orderedEvents.length - 1
    if (isLast && !isLastEv) return '2px solid rgba(255,255,255,0.2)'
    return '0.5px solid rgba(255,255,255,0.06)'
  }

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading staffing grid...</div>
    </div>
  )

  const DEPT_H = 34
  const HDR1_H = 46
  const HDR2_H = 32
  const HDR3_H = 32
  const HDR4_H = 32
  const HDR5_H = 42

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, flexShrink: 0, padding: '14px 28px 12px', borderBottom: '0.5px solid var(--glass-border)', background: 'var(--bg)' }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Staffing Grid</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{events.length} events across {tours.length} tours</div>
      </div>

      {events.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Create events on your tours to populate the staffing grid</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ width: LEFT_WIDTH, minWidth: LEFT_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '2px solid rgba(255,255,255,0.18)', background: 'var(--bg)', zIndex: 20 }}>

            {/* Header spacers */}
            <div style={{ flexShrink: 0, background: '#0a1628' }}>
              <div style={{ height: HDR1_H, borderBottom: '0.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Weekend</span>
              </div>
              <div style={{ height: HDR2_H, borderBottom: '0.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tour</span>
              </div>
              <div style={{ height: HDR3_H, borderBottom: '0.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>City</span>
              </div>
              <div style={{ height: HDR4_H, borderBottom: '0.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Venue</span>
              </div>
              <div style={{ height: HDR5_H, borderBottom: '2px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dates / Shows</span>
              </div>
            </div>

            {/* Scrollable labels */}
            <div id="left-scroll" style={{ flex: 1, overflowY: 'scroll', overflowX: 'hidden' }}
              onScroll={e => { const r = document.getElementById('right-scroll'); if (r) r.scrollTop = e.target.scrollTop }}>
              {DEPARTMENT_ORDER.map(dept => {
                const deptRows = MASTER_POSITIONS.filter(p => p.dept === dept)
                const collapsed = collapsedDepts[dept]
                return (
                  <div key={dept}>
                    <div onClick={() => toggleDept(dept)}
                      style={{ height: DEPT_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', cursor: 'pointer', userSelect: 'none', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid var(--glass-border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{collapsed ? '▸' : '▾'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dept}</span>
                    </div>
                    {!collapsed && deptRows.map(posRow => (
                      <div key={posRow.key} style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', fontSize: 13, color: posRow.isExec ? 'var(--text-muted)' : 'var(--text-secondary)', background: 'var(--bg)' }}>
                        {posRow.displayLabel}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div id="right-scroll" style={{ flex: 1, overflow: 'scroll' }}
            onScroll={e => { const l = document.getElementById('left-scroll'); if (l) l.scrollTop = e.target.scrollTop }}>
            <div style={{ minWidth: totalEventCols * COL_WIDTH }}>

              {/* Sticky header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#0a1628' }}>

                {/* Row 1: Weekends */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid var(--glass-border)', height: HDR1_H }}>
                  {weekendGroups.map((wk, wi) => {
                    const wkEvs = weekendMap[wk]
                    return (
                      <div key={wk} style={{ width: wkEvs.length * COL_WIDTH, minWidth: wkEvs.length * COL_WIDTH, flexShrink: 0, borderRight: wi < weekendGroups.length - 1 ? '2px solid rgba(255,255,255,0.2)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weekend</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{fmtWeekend(wk)}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Row 2: Tour */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid var(--glass-border)', height: HDR2_H }}>
                  {orderedEvents.map((ev, i) => {
                    const color = getTourColor(ev.tour_id)
                    return (
                      <div key={ev.id} style={{ width: COL_WIDTH, minWidth: COL_WIDTH, flexShrink: 0, borderRight: borderRight(i), background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 6px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTourName(ev.tour_id)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Row 3: City + country */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid var(--glass-border)', height: HDR3_H }}>
                  {orderedEvents.map((ev, i) => {
                    const countryShort = getCountryShort(ev.country)
                    return (
                      <div key={ev.id} style={{ width: COL_WIDTH, minWidth: COL_WIDTH, flexShrink: 0, borderRight: borderRight(i), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.city}</span>
                        {countryShort && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{countryShort}</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Row 4: Venue */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid var(--glass-border)', height: HDR4_H }}>
                  {orderedEvents.map((ev, i) => (
                    <div key={ev.id} style={{ width: COL_WIDTH, minWidth: COL_WIDTH, flexShrink: 0, borderRight: borderRight(i), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                      {ev.venue_name || '—'}
                    </div>
                  ))}
                </div>

                {/* Row 5: Dates / Shows */}
                <div style={{ display: 'flex', borderBottom: '2px solid rgba(255,255,255,0.18)', height: HDR5_H }}>
                  {orderedEvents.map((ev, i) => (
                    <div key={ev.id} style={{ width: COL_WIDTH, minWidth: COL_WIDTH, flexShrink: 0, borderRight: borderRight(i), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtShort(ev.load_in_date)}</div>
                      <div style={{ fontSize: 11, color: 'var(--mint)', marginTop: 2 }}>{ev.num_shows || '—'} shows</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body rows */}
              {DEPARTMENT_ORDER.map(dept => {
                const deptRows = MASTER_POSITIONS.filter(p => p.dept === dept)
                const collapsed = collapsedDepts[dept]
                return (
                  <div key={dept}>
                    {/* Dept bar — full width, no inner cells */}
                    <div style={{ height: DEPT_H, background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid var(--glass-border)', minWidth: totalEventCols * COL_WIDTH }} />

                    {!collapsed && deptRows.map(posRow => (
                      <div key={posRow.key} style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.04)', height: ROW_HEIGHT }}>
                        {orderedEvents.map((ev, i) => {
                          const assignment = getAssignment(ev.id, posRow.key)
                          const hatched = isHatchedCell(posRow, ev)
                          return (
                            <div key={ev.id} style={{ borderRight: borderRight(i), flexShrink: 0 }}>
                              <GridCell eventId={ev.id} positionRow={posRow} assignment={assignment} isHatched={hatched} onRefresh={fetchAll} COL_WIDTH={COL_WIDTH} />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}