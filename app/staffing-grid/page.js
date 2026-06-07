'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const DEPARTMENT_ORDER = [
  'Operations',
  'Lighting / Audio / Video',
  'Monster Truck Drivers',
  'Side Acts',
  'Stuntmanshow',
  'Executives & Visitors',
]

const HWSS_POSITIONS = {
  'Operations': ['Tour Director', 'Event Manager', 'Front of House Manager', 'Tour Coordinator', 'Registrar / GLT', 'Paddock Coordinator', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3'],
  'Lighting / Audio / Video': ['LAV 1', 'LAV 2', 'Lighting', 'Host (Male)', 'Host (Female)', 'Host Trainer'],
  'Monster Truck Drivers': [],
  'Side Acts': [],
  'Stuntmanshow': Array(20).fill('Stunt Team'),
  'Executives & Visitors': Array(5).fill('Executive / Visitor'),
}

const HWMTL_POSITIONS = {
  'Operations': ['Tour Director', 'Event Manager', 'Front of House Manager', 'Tour Coordinator', 'Registrar / GLT', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3', 'Tech Official 4', 'Tech Official 5'],
  'Lighting / Audio / Video': ['LAV 1', 'LAV 2', 'Lighting', 'Host (Male)', 'Host (Female)', 'Host Trainer'],
  'Monster Truck Drivers': Array(7).fill('Driver'),
  'Side Acts': ['Robot Operator', 'FMX 1', 'FMX 2', 'FMX 3'],
  'Stuntmanshow': [],
  'Executives & Visitors': Array(5).fill('Executive / Visitor'),
}

function buildMasterPositions() {
  const rows = []
  DEPARTMENT_ORDER.forEach(dept => {
    const hwssPos = HWSS_POSITIONS[dept] || []
    const hwmtPos = HWMTL_POSITIONS[dept] || []
    const max = Math.max(hwssPos.length, hwmtPos.length)
    if (dept === 'Executives & Visitors') {
      for (let i = 0; i < 5; i++) rows.push({ dept, position: 'Executive / Visitor', key: `exec__slot__${i + 1}`, displayLabel: `Exec / Visitor ${i + 1}`, isExec: true, hwssIndex: i, hwmtIndex: i })
      return
    }
    if (max === 0) return
    const uniqueHwss = [...new Set(hwssPos)]
    const uniqueHwmt = [...new Set(hwmtPos)]
    const isDuplicate = (uniqueHwss.length <= 1 && hwssPos.length > 1) || (uniqueHwmt.length <= 1 && hwmtPos.length > 1)
    if (isDuplicate) {
      const posLabel = hwssPos[0] || hwmtPos[0]
      for (let i = 0; i < max; i++) rows.push({ dept, position: posLabel, key: `${dept}__${posLabel}__${i + 1}`, displayLabel: `${posLabel} ${i + 1}`, hwssIndex: i < hwssPos.length ? i : null, hwmtIndex: i < hwmtPos.length ? i : null })
    } else {
      const allPos = [...new Set([...hwssPos, ...hwmtPos])]
      const seen = {}
      allPos.forEach(pos => { seen[pos] = (seen[pos] || 0) + 1; rows.push({ dept, position: pos, key: `${dept}__${pos}__${seen[pos]}`, displayLabel: pos, inHwss: hwssPos.includes(pos), inHwmt: hwmtPos.includes(pos) }) })
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
  return `${fri.toLocaleDateString('en-US', opts)} \u2013 ${sun.toLocaleDateString('en-US', opts)}`
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: '#FFCC00', pill: 'rgba(255,204,0,0.18)', border: 'rgba(255,204,0,0.5)' },
  { value: 'confirmed', label: 'Confirmed', color: '#33FF99', pill: 'rgba(51,255,153,0.18)', border: 'rgba(51,255,153,0.5)' },
  { value: 'attention', label: 'Attention', color: '#FF3333', pill: 'rgba(255,51,51,0.18)', border: 'rgba(255,51,51,0.5)' },
]

function getStatusStyle(status) { return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0] }

const HATCH_BG = 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)'

function isHatchedCell(posRow, event) {
  if (posRow.isExec) return false
  const type = event && event.event_type
  if (!type) return false
  if (posRow.hwssIndex !== undefined || posRow.hwmtIndex !== undefined) {
    if (type === 'hwss') return posRow.hwssIndex === null
    if (type === 'hwmt') return posRow.hwmtIndex === null
  }
  if (type === 'hwss') return posRow.inHwss === false
  if (type === 'hwmt') return posRow.inHwmt === false
  return false
}

function StaffSearch({ eventId, event, onAssign, onClose }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const ref = useRef(null)

  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [])
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); setAvailability({}); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data: staffData } = await supabase.from('staff').select('id, first_name, last_name')
        .or('first_name.ilike.%' + search + '%,last_name.ilike.%' + search + '%')
        .order('last_name', { ascending: true }).limit(10)
      if (!staffData || staffData.length === 0) { setResults([]); setAvailability({}); setLoading(false); return }
      setResults(staffData)
      const staffIds = staffData.map(s => s.id)
      const { data: bookings } = await supabase.from('event_staff')
        .select('staff_id, event_id, events(id, city, load_in_date, load_out_date)')
        .in('staff_id', staffIds)
      const loadIn = event && event.load_in_date
      const loadOut = (event && event.load_out_date) || loadIn
      const avail = {}
      staffIds.forEach(staffId => {
        const records = (bookings || []).filter(r => r.staff_id === staffId)
        if (records.length === 0) { avail[staffId] = { status: 'free' }; return }
        const sameEvent = records.find(r => r.event_id === eventId)
        if (sameEvent) { avail[staffId] = { status: 'same_event' }; return }
        if (loadIn) {
          const conflict = records.find(r => {
            const s = r.events && r.events.load_in_date
            const e = (r.events && r.events.load_out_date) || s
            if (!s) return false
            return loadIn <= e && loadOut >= s
          })
          if (conflict) { avail[staffId] = { status: 'conflict', city: conflict.events && conflict.events.city }; return }
        }
        avail[staffId] = { status: 'free' }
      })
      setAvailability(avail)
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const dotColor = (id) => {
    const a = availability[id]
    if (!a) return null
    if (a.status === 'free') return '#33FF99'
    if (a.status === 'same_event') return '#FFCC00'
    if (a.status === 'conflict') return '#FF3333'
    return null
  }
  const tipText = (id) => {
    const a = availability[id]
    if (!a || a.status === 'free') return ''
    if (a.status === 'same_event') return 'Already on this event'
    if (a.status === 'conflict') return 'Booked \u2014 ' + (a.city || 'another event')
    return ''
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, width: 260, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', marginTop: 2, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '0.5px solid var(--glass-border)' }}>
        <input ref={inputRef}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '5px 8px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          placeholder="Search staff..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }} />
      </div>
      {loading && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}
      {!loading && search.trim().length >= 2 && results.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No results</div>}
      {results.map(s => {
        const color = dotColor(s.id)
        const t = tipText(s.id)
        return (
          <div key={s.id}
            onMouseDown={e => { e.preventDefault(); onAssign(s, availability[s.id]) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            title={t}>
            {color && <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
            <span>{s.first_name} {s.last_name}</span>
            {t && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{t}</span>}
          </div>
        )
      })}
    </div>
  )
}

function StatusDropdown({ assignment, onSetStatus, onRemove, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 160, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', marginTop: 4, overflow: 'hidden' }}>
      {STATUS_OPTIONS.map(opt => (
        <div key={opt.value}
          onMouseDown={e => { e.preventDefault(); onSetStatus(opt.value); onClose() }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: assignment && assignment.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = assignment && assignment.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: opt.color }}>{opt.label}</span>
        </div>
      ))}
      <div style={{ height: '0.5px', background: 'var(--glass-border)' }} />
      <div
        onMouseDown={e => { e.preventDefault(); onRemove(); onClose() }}
        style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 12, color: '#FF3333' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        x Remove
      </div>
    </div>
  )
}

function ConfirmOverride({ staffMember, avail, onConfirm, onCancel }) {
  const isSame = avail && avail.status === 'same_event'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>
          {isSame ? 'Already On This Event' : 'Double Booking Warning'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          {isSame
            ? staffMember.first_name + ' ' + staffMember.last_name + ' is already assigned to another position on this event. Assign them here as well?'
            : staffMember.first_name + ' ' + staffMember.last_name + ' is already booked' + (avail && avail.city ? ' in ' + avail.city : ' on another event') + '. Assign anyway?'}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>Assign Anyway</button>
        </div>
      </div>
    </div>
  )
}

function GridCell({ eventId, event, positionRow, assignment, isHatched, onRefresh, COL_WIDTH, ROW_HEIGHT, borderRight }) {
  const [mode, setMode] = useState(null)
  const [hovered, setHovered] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const isExec = positionRow.isExec
  const statusStyle = (!isExec && assignment && assignment.status) ? getStatusStyle(assignment.status) : null
  const staffName = assignment && assignment.staff ? assignment.staff.first_name + ' ' + assignment.staff.last_name : null

  const doAssign = async (staffMember) => {
    setMode(null)
    setConfirmOverride(null)
    const supabase = getSupabase()
    if (assignment) {
      await supabase.from('event_staff').update({ staff_id: staffMember.id, status: isExec ? null : 'scheduled', confirmed: false }).eq('id', assignment.id)
    } else {
      await supabase.from('event_staff').insert([{ event_id: eventId, staff_id: staffMember.id, position: positionRow.displayLabel, position_key: positionRow.key, status: isExec ? null : 'scheduled', confirmed: false }])
    }
    onRefresh()
  }

  const handleAssign = (staffMember, avail) => {
    if (avail && (avail.status === 'conflict' || avail.status === 'same_event')) {
      setMode(null)
      setConfirmOverride({ staffMember, avail })
      return
    }
    doAssign(staffMember)
  }

  const handleSetStatus = async (newStatus) => {
    if (!assignment) return
    const supabase = getSupabase()
    const confirmed = newStatus === 'confirmed'
    await supabase.from('event_staff').update({ status: newStatus, confirmed }).eq('id', assignment.id)
    if (confirmed && assignment.staff_id) {
      const existing = await supabase.from('event_travel_arrivals').select('id').eq('event_id', eventId).eq('staff_id', assignment.staff_id).maybeSingle()
      if (!existing.data) {
        await supabase.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
        await supabase.from('event_travel_departures').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
      }
    }
    onRefresh()
  }

  const handleRemove = async () => {
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').delete().eq('id', assignment.id)
    onRefresh()
  }

  const cellBg = isHatched && !assignment ? HATCH_BG : 'transparent'
  const cellBgSize = isHatched && !assignment ? '6px 6px' : 'auto'
  const pillBg = isExec ? 'rgba(255,255,255,0.06)' : (statusStyle ? statusStyle.pill : 'rgba(255,255,255,0.06)')
  const pillBorder = isExec ? 'rgba(255,255,255,0.12)' : (statusStyle ? statusStyle.border : 'rgba(255,255,255,0.12)')
  const pillColor = isExec ? 'var(--text-secondary)' : (statusStyle ? statusStyle.color : 'var(--text-primary)')

  return (
    <React.Fragment>
      <td
        style={{ position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH, height: ROW_HEIGHT, padding: '0 6px', cursor: 'pointer', background: cellBg, backgroundSize: cellBgSize, textAlign: 'center', verticalAlign: 'middle', boxSizing: 'border-box', borderRight: borderRight, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (staffName) setMode(mode === 'status' ? null : 'status')
          else setMode(mode === 'search' ? null : 'search')
        }}>
        {staffName ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, background: pillBg, border: '0.5px solid ' + pillBorder, maxWidth: COL_WIDTH - 12, opacity: hovered ? 0.82 : 1, transition: 'opacity 0.1s' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: pillColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffName}</span>
          </div>
        ) : (
          hovered ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ Assign</span> : null
        )}
        {mode === 'search' && <StaffSearch eventId={eventId} event={event} onAssign={handleAssign} onClose={() => setMode(null)} />}
        {mode === 'status' && assignment && <StatusDropdown assignment={assignment} onSetStatus={handleSetStatus} onRemove={handleRemove} onClose={() => setMode(null)} />}
      </td>
      {confirmOverride && (
        <ConfirmOverride
          staffMember={confirmOverride.staffMember}
          avail={confirmOverride.avail}
          onConfirm={() => doAssign(confirmOverride.staffMember)}
          onCancel={() => setConfirmOverride(null)}
        />
      )}
    </React.Fragment>
  )
}

export default function StaffingGrid() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [tours, setTours] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(true)
  const [collapsedDepts, setCollapsedDepts] = useState({})

  const COL_WIDTH = 140
  const LEFT_WIDTH = 220
  const ROW_HEIGHT = 38
  const DEPT_H = 34
  const H1 = 46
  const H2 = 32
  const H3 = 32
  const H4 = 32
  const TOTAL_HDR = H1 + H2 + H3 + H4

  const B_INNER = '0.5px solid rgba(255,255,255,0.07)'
  const B_WEEKEND = '2px solid rgba(255,255,255,0.2)'
  const B_HEADER_BOTTOM = '2px solid rgba(255,255,255,0.18)'
  const B_LEFT_COL = '2px solid rgba(255,255,255,0.18)'
  const B_DEPT_TOP = '2px solid rgba(201,168,76,0.3)'
  const HDR_BG = '#0a1628'
  const DEPT_BG = 'rgba(5,14,28,1)'
  const WHITE = 'rgba(255,255,255,1)'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [toursRes, eventsRes, assignmentsRes] = await Promise.all([
      supabase.from('tours').select('id, name, color, status').order('name', { ascending: true }),
      supabase.from('events').select('id, city, venue_name, num_shows, load_in_date, load_out_date, tour_id, event_type').order('load_in_date', { ascending: true }),
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
  const getTourColor = (tourId) => { const t = tours.find(t => t.id === tourId); return t ? t.color : '#33FF99' }
  const getTourName = (tourId) => { const t = tours.find(t => t.id === tourId); return t ? t.name : '\u2014' }
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

  const isLastInGroup = (ev) => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
    const grp = weekendMap[wk]
    return grp[grp.length - 1].id === ev.id
  }

  const cellBorderRight = (ev, i) => {
    if (i === orderedEvents.length - 1) return '0.5px solid rgba(255,255,255,0.06)'
    return isLastInGroup(ev) ? B_WEEKEND : '0.5px solid rgba(255,255,255,0.06)'
  }

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading staffing grid...</div>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />
      <div style={{ marginTop: 62, flexShrink: 0, padding: '14px 28px 12px', borderBottom: '0.5px solid var(--glass-border)', background: 'var(--bg)' }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Staffing Grid</div>
      </div>

      {events.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Create events on your tours to populate the staffing grid</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H1, background: HDR_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }} />
                {weekendGroups.map((wk, wi) => {
                  const wkEvs = weekendMap[wk]
                  return (
                    <th key={wk} colSpan={wkEvs.length} style={{ position: 'sticky', top: 0, zIndex: 30, height: H1, background: HDR_BG, borderBottom: B_INNER, borderRight: wi < weekendGroups.length - 1 ? B_WEEKEND : B_INNER, textAlign: 'center', fontWeight: 400, padding: '6px 0' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weekend</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{fmtWeekend(wk)}</div>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H2, background: HDR_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tour</span>
                </th>
                {orderedEvents.map((ev, i) => {
                  const color = getTourColor(ev.tour_id)
                  return (
                    <th key={ev.id} style={{ position: 'sticky', top: H1, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H2, background: HDR_BG, borderBottom: B_INNER, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTourName(ev.tour_id)}</span>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H3, background: HDR_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>City</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H3, background: HDR_BG, borderBottom: B_INNER, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                    <span
                      onClick={() => router.push('/tours/' + ev.tour_id + '/events/' + ev.id + '?tab=staffing')}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                      {ev.city}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2 + H3, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H4, background: HDR_BG, borderRight: B_LEFT_COL, borderBottom: B_HEADER_BOTTOM, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Venue</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2 + H3, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H4, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.venue_name || '\u2014'}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {DEPARTMENT_ORDER.map(dept => {
                const deptRows = MASTER_POSITIONS.filter(p => p.dept === dept)
                const collapsed = collapsedDepts[dept]
                return (
                  <React.Fragment key={dept}>
                    <tr>
                      <td
                        onClick={() => toggleDept(dept)}
                        style={{ position: 'sticky', left: 0, zIndex: 20, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: DEPT_H, padding: '0 14px', cursor: 'pointer', userSelect: 'none', background: DEPT_BG, borderRight: B_LEFT_COL, borderTop: B_DEPT_TOP, borderBottom: B_INNER }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = DEPT_BG }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: WHITE }}>{collapsed ? '\u25b8' : '\u25be'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: WHITE, whiteSpace: 'nowrap' }}>{dept}</span>
                        </div>
                      </td>
                      {orderedEvents.map((ev, i) => (
                        <td key={ev.id} style={{ height: DEPT_H, background: DEPT_BG, borderTop: B_DEPT_TOP, borderBottom: B_INNER, borderRight: cellBorderRight(ev, i) }} />
                      ))}
                    </tr>
                    {!collapsed && deptRows.map(posRow => (
                      <tr key={posRow.key}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 10, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: ROW_HEIGHT, padding: '0 14px', background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_INNER, fontSize: 13, color: posRow.isExec ? 'var(--text-muted)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {posRow.displayLabel}
                        </td>
                        {orderedEvents.map((ev, i) => {
                          const assignment = getAssignment(ev.id, posRow.key)
                          const hatched = isHatchedCell(posRow, ev)
                          return (
                            <GridCell
                              key={ev.id}
                              eventId={ev.id}
                              event={ev}
                              positionRow={posRow}
                              assignment={assignment}
                              isHatched={hatched}
                              onRefresh={fetchAll}
                              COL_WIDTH={COL_WIDTH}
                              ROW_HEIGHT={ROW_HEIGHT}
                              borderRight={cellBorderRight(ev, i)}
                            />
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}