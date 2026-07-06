'use client'

import React, { useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { confirmStaffMember } from '../../lib/confirmStaffMember'
import { formatLocation } from '@/lib/locationFormat'

function staffDisplayName(staff) {
  if (!staff) return ''
  return staff.display_name?.trim() || `${staff.first_name} ${staff.last_name}`
}

function normalizeStatus(s) {
  if (s === 'scheduled') return 'pending'
  if (s === 'attention') return 'needs_attention'
  return s
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
      for (let i = 0; i < 5; i++) rows.push({ dept, position: 'Executive / Visitor', key: 'exec__slot__' + (i + 1), displayLabel: 'Exec / Visitor ' + (i + 1), isExec: true, hwssIndex: i, hwmtIndex: i })
      return
    }
    if (max === 0) return
    const uniqueHwss = [...new Set(hwssPos)]
    const uniqueHwmt = [...new Set(hwmtPos)]
    const isDuplicate = (uniqueHwss.length <= 1 && hwssPos.length > 1) || (uniqueHwmt.length <= 1 && hwmtPos.length > 1)
    if (isDuplicate) {
      const posLabel = hwssPos[0] || hwmtPos[0]
      for (let i = 0; i < max; i++) rows.push({ dept, position: posLabel, key: dept + '__' + posLabel + '__' + (i + 1), displayLabel: posLabel + ' ' + (i + 1), hwssIndex: i < hwssPos.length ? i : null, hwmtIndex: i < hwmtPos.length ? i : null })
    } else {
      const allPos = [...new Set([...hwssPos, ...hwmtPos])]
      const seen = {}
      allPos.forEach(pos => {
        seen[pos] = (seen[pos] || 0) + 1
        rows.push({ dept, position: pos, key: dept + '__' + pos + '__' + seen[pos], displayLabel: pos, inHwss: hwssPos.includes(pos), inHwmt: hwmtPos.includes(pos) })
      })
    }
  })
  return rows
}

const MASTER_POSITIONS = buildMasterPositions()

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

function getWeekendDates(dateStr) {
  const fri = getWeekendGroup(dateStr)
  if (!fri) return { saturday_date: null, sunday_date: null }
  const sat = new Date(fri + 'T00:00:00'); sat.setDate(sat.getDate() + 1)
  const sun = new Date(fri + 'T00:00:00'); sun.setDate(sun.getDate() + 2)
  return { saturday_date: toYMD(sat), sunday_date: toYMD(sun) }
}

function fmtWeekend(fridayStr) {
  if (!fridayStr) return ''
  const fri = new Date(fridayStr + 'T00:00:00')
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
  const opts = { month: 'short', day: 'numeric' }
  return fri.toLocaleDateString('en-US', opts) + ' \u2013 ' + sun.toLocaleDateString('en-US', opts)
}

const STATUS_STYLES = {
  confirmed: '#33FF99',
  tentative: '#FF69B4',
  '1-hold': '#FFCC00',
  '2-hold': '#FF8C00',
  '3-hold': '#FF3333',
  cancelled: 'rgba(255,255,255,0.3)',
  want: 'rgba(255,255,255,0.3)',
  'date-hold': 'rgba(255,255,255,0.3)',
}

function getEventStatusColor(status) {
  return STATUS_STYLES[status] || '#FFCC00'
}

function colorWithAlpha(color, alpha) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
  }
  const m = color.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(',').map(s => s.trim())
    return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + alpha + ')'
  }
  return color
}

function formatStatusLabel(status) {
  if (!status) return '—'
  return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: '#33FF99', pill: 'rgba(51,255,153,0.12)', border: 'rgba(51,255,153,0.3)' },
  { value: 'pending', label: 'Pending', color: '#FFD60A', pill: 'rgba(255,214,10,0.15)', border: 'rgba(255,214,10,0.5)' },
  { value: 'needs_attention', label: 'Needs Attention', color: '#e05252', pill: 'rgba(224,82,82,0.15)', border: 'rgba(224,82,82,0.5)' },
]

function getStatusStyle(status) { return STATUS_OPTIONS.find(s => s.value === normalizeStatus(status)) || STATUS_OPTIONS[0] }

const LOCKED_STRIPE = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 7px)'
const LOCKED_BG_COLOR = 'rgba(255,255,255,0.02)'

const STAFF_NAME_COLORS = { confirmed: '#e2e8f0', pending: '#FFD60A', needs_attention: '#e05252' }
const STAFF_NAME_WEIGHTS = { confirmed: 400, scheduled: 400, attention: 400 }

// SVG lock icon (locked = closed padlock "ti-lock", unlocked = open padlock "ti-lock-open")
function LockIcon({ locked, size = 13, color = 'rgba(255,255,255,0.5)' }) {
  if (locked) {
    return (
      <svg width={size} height={size} viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.2"/>
        <path d="M4.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="7" cy="11" r="1" fill={color}/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.2"/>
      <path d="M4.5 7V5a2.5 2.5 0 0 1 5 0" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="7" cy="11" r="1" fill={color}/>
    </svg>
  )
}

function isHatchedCell(posRow, event, eventMeta) {
  if (posRow.isExec) return false
  const type = event && event.event_type
  if (!type) return false
  const unlocked = (eventMeta && eventMeta.unlocked_positions) || []
  if (unlocked.includes(posRow.key)) return false
  const hidden = (eventMeta && eventMeta.hidden_positions) || []
  if (hidden.includes(posRow.key)) return true // hidden = locked = hatched
  if (posRow.hwssIndex !== undefined || posRow.hwmtIndex !== undefined) {
    if (type === 'hwss') return posRow.hwssIndex === null
    if (type === 'hwmt') return posRow.hwmtIndex === null
  }
  if (type === 'hwss') return posRow.inHwss === false
  if (type === 'hwmt') return posRow.inHwmt === false
  return false
}

// ── INLINE STAFF SEARCH ───────────────────────────────────────────────────────
// Rendered inside an empty cell once it enters edit mode. Typing filters an
// autocomplete dropdown; arrow keys navigate it, Enter selects, Escape cancels.

function InlineStaffSearch({ eventId, event, onAssign, onClose, initialValue, allBookings }) {
  const [query, setQuery] = useState(initialValue || '')
  const [results, setResults] = useState([])
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) return
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data: staffData } = await supabase.from('staff').select('id, first_name, last_name, display_name')
        .or('first_name.ilike.%' + query + '%,last_name.ilike.%' + query + '%')
        .order('last_name', { ascending: true }).limit(8)
      if (!staffData || staffData.length === 0) { setResults([]); setAvailability({}); setLoading(false); return }
      setResults(staffData)
      const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(event?.load_in_date)
      const avail = {}
      for (const s of staffData) {
        const records = (allBookings && allBookings[s.id]) || []
        if (records.length === 0) { avail[s.id] = { status: 'free' }; continue }
        const sameEventRec = records.find(r => r.event_id === eventId)
        if (sameEventRec) { avail[s.id] = { status: 'same_event', position: sameEventRec.position }; continue }
        if (evSat || evSun) {
          const conflict = records.find(r =>
            r.event_id !== eventId &&
            ((evSat && r.saturday_date && r.saturday_date === evSat) ||
             (evSun && r.sunday_date && r.sunday_date === evSun))
          )
          if (conflict) { avail[s.id] = { status: 'conflict', city: conflict.city, event_id: conflict.event_id, tour_name: conflict.tour_name }; continue }
        }
        avail[s.id] = { status: 'free' }
      }
      setAvailability(avail)
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, event, eventId, allBookings])

  const availStatus = (id) => availability[id]?.status || null
  const tipText = (id) => {
    const a = availability[id]
    if (!a || a.status === 'free') return ''
    if (a.status === 'same_event') return 'Already on this event' + (a.position ? ' as ' + a.position : '')
    if (a.status === 'conflict') return 'Already assigned — ' + (a.city || 'another city') + (a.tour_name ? ', ' + a.tour_name : '')
    return ''
  }

  const showDropdown = query.trim().length >= 1
  const optionCount = results.length + (showDropdown ? 1 : 0)

  const handleCreate = async () => {
    const parts = query.trim().split(' ')
    const firstName = parts[0]
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
    const supabase = getSupabase()
    const { data, error } = await supabase.from('staff').insert([{ first_name: firstName, last_name: lastName }]).select().single()
    if (!error && data) onAssign(data, { status: 'free' })
  }

  const selectIndex = (idx) => {
    if (idx < 0 || idx >= optionCount) return
    if (idx < results.length) onAssign(results[idx], availability[results[idx].id])
    else handleCreate()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (optionCount > 0) setActiveIndex(i => (i + 1) % optionCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (optionCount > 0) setActiveIndex(i => (i - 1 + optionCount) % optionCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectIndex(activeIndex >= 0 ? activeIndex : 0)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      onClose()
    }
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'left' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          const val = e.target.value
          setQuery(val)
          setActiveIndex(-1)
          if (val.trim().length < 1) { setResults([]); setAvailability({}) }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        placeholder="Type a name..."
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, padding: '4px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', caretColor: '#33FF99', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {showDropdown && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1100, width: 200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 230, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
          {loading && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>No results</div>}
          {results.map((s, i) => {
            const status = availStatus(s.id)
            const t = tipText(s.id)
            return (
              <div key={s.id}
                onMouseDown={e => { e.preventDefault(); selectIndex(i) }}
                onMouseEnter={() => setActiveIndex(i)}
                title={t}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer', background: i === activeIndex ? 'rgba(51,255,153,0.1)' : 'transparent', color: i === activeIndex ? 'var(--mint)' : 'var(--text-primary)' }}>
                {(status === 'conflict' || status === 'same_event') ? (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD60A', flexShrink: 0 }} />
                ) : status === 'free' ? (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#33FF99', flexShrink: 0 }} />
                ) : null}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffDisplayName(s)}</span>
              </div>
            )
          })}
          <div
            onMouseDown={e => { e.preventDefault(); selectIndex(results.length) }}
            onMouseEnter={() => setActiveIndex(results.length)}
            style={{ padding: '7px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--mint)', background: activeIndex === results.length ? 'rgba(51,255,153,0.1)' : 'transparent', borderTop: results.length > 0 ? '0.5px solid var(--glass-border)' : 'none' }}>
            + Create &quot;{query.trim()}&quot;
          </div>
        </div>
      )}
    </div>
  )
}

// ── INLINE STATUS MENU ────────────────────────────────────────────────────────
// Compact dropdown shown when clicking a filled staff pill: status options + remove.

function InlineStatusMenu({ assignment, onSetStatus, onRemove }) {
  return (
    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, width: 150, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
      {STATUS_OPTIONS.map(opt => (
        <div key={opt.value}
          onMouseDown={e => { e.preventDefault(); onSetStatus(opt.value) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: assignment && normalizeStatus(assignment.status) === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = assignment && normalizeStatus(assignment.status) === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: opt.color }}>{opt.label}</span>
        </div>
      ))}
      <div style={{ height: '0.5px', background: 'var(--glass-border)' }} />
      <div
        onMouseDown={e => { e.preventDefault(); onRemove() }}
        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#FF3333' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        × Remove
      </div>
    </div>
  )
}

// ── CONFIRM OVERRIDE ──────────────────────────────────────────────────────────

function ConfirmOverride({ staffMember, avail, travelInfo, onConfirm, onCancel }) {
  const isSame = avail && avail.status === 'same_event'
  if (typeof document === 'undefined') return null
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 440 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>
          {isSame ? 'Already On This Event' : 'Double Booking Warning'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: travelInfo ? 16 : 20 }}>
          {isSame
            ? staffDisplayName(staffMember) + ' is already assigned to another position on this event.'
            : staffDisplayName(staffMember) + ' is already booked' + (avail?.city ? ' in ' + avail.city : ' on another event') + '.'}
        </div>
        {travelInfo && !isSame && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#f87171', lineHeight: 1.8 }}>
            ⚠ {staffMember.first_name} has existing travel booked for {avail?.city}:
            {travelInfo.arrival?.travel_date && <><br />Arrival: {fmtDate(travelInfo.arrival.travel_date)}{travelInfo.arrival.flight_number ? ' · ' + travelInfo.arrival.flight_number : ''}</>}
            {travelInfo.departure?.travel_date && <><br />Departure: {fmtDate(travelInfo.departure.travel_date)}{travelInfo.departure.flight_number ? ' · ' + travelInfo.departure.flight_number : ''}</>}
            <br />Reassigning will require travel changes.
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={onConfirm} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>
            {isSame ? 'Assign Dual Roles' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── GRID CELL ─────────────────────────────────────────────────────────────────

function GridCell({ eventId, event, positionRow, assignment, isHatched, isExplicitlyUnlocked, onRefresh, onAssignSuccess, isActive, activeType, initialValue, isFocused, cellRef, onActivate, onCloseActive, onToggleLock, isSelected, onToggleSelect, onRightClick, cellColor, allBookings, onCellDragStart, onCellDragEnd, onCellDrop, onDragEnterCell, onDragLeaveCell, onDropOnLocked, isDragTarget, onClearAssignment, onConflictClick, COL_WIDTH, ROW_HEIGHT, borderRight }) {
  const [hovered, setHovered] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const [assignError, setAssignError] = useState(false)
  const isExec = positionRow.isExec
  const hasStaff = !!(assignment && assignment.staff_id && assignment.staff)
  const staffName = hasStaff ? staffDisplayName(assignment.staff) : null

  const doAssign = async (staffMember, removeFromEventId = null) => {
    setConfirmOverride(null)

    // Secondary conflict check — catches cases where avail wasn't pre-checked (Fix 3)
    if (!removeFromEventId && allBookings && event?.load_in_date) {
      const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(event.load_in_date)
      const bookings = allBookings[staffMember.id] || []
      const conflict = bookings.find(b =>
        b.event_id !== eventId &&
        ((evSat && b.saturday_date && b.saturday_date === evSat) ||
         (evSun && b.sunday_date && b.sunday_date === evSun))
      )
      if (conflict) {
        const supabase2 = getSupabase()
        const [arrRes, depRes] = await Promise.all([
          supabase2.from('event_travel_arrivals').select('travel_date, flight_number').eq('event_id', conflict.event_id).eq('staff_id', staffMember.id).maybeSingle(),
          supabase2.from('event_travel_departures').select('travel_date, flight_number').eq('event_id', conflict.event_id).eq('staff_id', staffMember.id).maybeSingle(),
        ])
        const travelInfo = (arrRes.data?.travel_date || depRes.data?.travel_date) ? { arrival: arrRes.data, departure: depRes.data } : null
        setConfirmOverride({ staffMember, avail: { status: 'conflict', city: conflict.city, event_id: conflict.event_id, tour_name: conflict.tour_name }, travelInfo })
        return
      }
      const sameEv = bookings.find(b => b.event_id === eventId)
      if (sameEv) {
        setConfirmOverride({ staffMember, avail: { status: 'same_event', position: sameEv.position }, travelInfo: null })
        return
      }
    }

    const supabase = getSupabase()
    if (removeFromEventId) {
      await supabase.from('event_staff')
        .update({ staff_id: null, status: 'pending', confirmed: false })
        .eq('event_id', removeFromEventId)
        .eq('staff_id', staffMember.id)
      onClearAssignment && onClearAssignment(removeFromEventId, staffMember.id)
    }
    const status = isExec ? null : 'confirmed'
    const confirmed = status === 'confirmed'

    // Check for an existing row by event_id + position_key to prevent duplicate inserts
    const { data: existingRows } = await supabase.from('event_staff')
      .select('id').eq('event_id', eventId).eq('position_key', positionRow.key).limit(1)
    const existing = existingRows && existingRows[0]

    let writeError = null
    if (existing) {
      const { error } = await supabase.from('event_staff')
        .update({ staff_id: staffMember.id, status, confirmed }).eq('id', existing.id)
      writeError = error
    } else {
      const { error } = await supabase.from('event_staff')
        .insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionRow.key, staff_id: staffMember.id, status, confirmed }])
      writeError = error
    }

    if (writeError) {
      setAssignError(true)
      setTimeout(() => setAssignError(false), 1200)
      onCloseActive()
      return
    }

    // Show name immediately with an optimistic local row — no select after write
    const localRow = {
      id: crypto.randomUUID(),
      event_id: eventId,
      staff_id: staffMember.id,
      position_key: positionRow.key,
      status,
      staff: { id: staffMember.id, first_name: staffMember.first_name, last_name: staffMember.last_name, display_name: staffMember.display_name },
    }
    onAssignSuccess(eventId, localRow)
    onCloseActive()
    // Render the cell solid immediately — drop hover affordance (lock icon / dimmed name)
    // so the staff name shows without requiring the user to click elsewhere.
    setHovered(false)

    // Swap the temporary UUID for the real DB id so status/remove actions work correctly.
    // This is a targeted single-row fetch — no full grid refresh that could wipe the pill.
    const { data: newRow } = await supabase
      .from('event_staff')
      .select('id, event_id, staff_id, position_key, status')
      .eq('event_id', eventId)
      .eq('position_key', positionRow.key)
      .single()
    if (newRow) {
      onAssignSuccess(eventId, { ...localRow, id: newRow.id })
    }
    // If the targeted fetch fails, the optimistic row stays — pill remains visible

    // Update bookings map for this staff member so conflict detection reflects the new assignment
    refreshBookingsForStaff(staffMember.id)

    if (!isExec && staffMember.id) {
      const { error: travelErr } = await confirmStaffMember({ supabase, eventId, staffId: staffMember.id, confirm: true })
      if (travelErr) console.error('Travel auto-populate failed:', travelErr)
    }
  }

  const handleAssign = async (staffMember, avail) => {
    if (avail && (avail.status === 'conflict' || avail.status === 'same_event')) {
      let travelInfo = null
      if (avail.status === 'conflict' && avail.event_id) {
        const supabase = getSupabase()
        const [arrRes, depRes] = await Promise.all([
          supabase.from('event_travel_arrivals').select('travel_date, flight_number').eq('event_id', avail.event_id).eq('staff_id', staffMember.id).maybeSingle(),
          supabase.from('event_travel_departures').select('travel_date, flight_number').eq('event_id', avail.event_id).eq('staff_id', staffMember.id).maybeSingle(),
        ])
        if (arrRes.data?.travel_date || depRes.data?.travel_date) {
          travelInfo = { arrival: arrRes.data, departure: depRes.data }
        }
      }
      setConfirmOverride({ staffMember, avail, travelInfo })
      return
    }
    doAssign(staffMember)
  }

  const handleSetStatus = async (newStatus) => {
    if (!assignment) return
    const supabase = getSupabase()
    const confirmed = newStatus === 'confirmed'
    await supabase.from('event_staff').update({ status: newStatus, confirmed }).eq('id', assignment.id)
    if (assignment.staff_id && !isExec) {
      const wasConfirmed = assignment.status === 'confirmed'
      if (confirmed || wasConfirmed) {
        const { error } = await confirmStaffMember({ supabase, eventId, staffId: assignment.staff_id, confirm: confirmed })
        if (error) console.error('Travel sync failed:', error)
      }
    }
    onCloseActive()
    onRefresh()
  }

  const handleRemove = async () => {
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').delete().eq('id', assignment.id)
    onCloseActive()
    onRefresh()
  }

  // ── 4-STATE CELL MODEL ───────────────────────────────────────────────────────
  // Priority: hasStaff wins, then isLocked, then empty (STATE 2)
  const isLocked = isHatched && !hasStaff
  const status = normalizeStatus(assignment?.status)
  const nameColor = cellColor?.text || (isExec ? '#e2e8f0' : (STAFF_NAME_COLORS[status] || '#FFD60A'))
  const nameWeight = isExec ? 500 : (STAFF_NAME_WEIGHTS[status] || 500)

  // STATE 4 condition: filled + weekend conflict
  const existingConflict = (() => {
    if (!hasStaff || !allBookings || !event?.load_in_date) return null
    const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(event.load_in_date)
    return (allBookings[assignment.staff_id] || []).find(b =>
      b.event_id !== eventId &&
      ((evSat && b.saturday_date && b.saturday_date === evSat) ||
       (evSun && b.sunday_date && b.sunday_date === evSun))
    )
  })()

  // cellState: 1=locked, 2=unlocked+empty, 3=filled, 4=filled+conflict
  const cellState = hasStaff ? (existingConflict ? 4 : 3) : isLocked ? 1 : 2

  const handleCellClick = (e) => {
    if (isActive) return
    if (cellState === 4) {
      e.stopPropagation()
      onConflictClick && onConflictClick(assignment, existingConflict, event)
      return
    }
    if (cellState === 3 && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation()
      onToggleSelect(assignment.id)
      return
    }
    if (cellState === 3) { onActivate('menu'); return }
    if (cellState === 1) { onToggleLock(); return }
    // STATE 2: open staff search
    onActivate('edit')
  }

  const isDragOverLocked = isDragTarget && isHatched

  // Per-state border
  const stateBorder = cellState === 1 ? '1px solid rgba(255,255,255,0.08)'
    : cellState === 2 ? '2px solid #FFD60A'
    : cellState === 4 ? '2px solid #f87171'
    : null

  // Per-state background
  const stateBg = assignError ? 'rgba(220,38,38,0.12)'
    : cellColor?.bg
    || (cellState === 1 ? LOCKED_BG_COLOR
       : isDragOverLocked ? 'rgba(224,82,82,0.08)'
       : (isDragTarget && cellState !== 1) ? 'rgba(51,255,153,0.10)'
       : (cellState === 2 && hovered) ? 'rgba(255,214,10,0.06)'
       : (hovered && !isActive) ? 'rgba(255,255,255,0.07)'
       : 'transparent')

  return (
    <React.Fragment>
      <td
        ref={cellRef}
        title={cellState === 1 ? 'Click to unlock' : undefined}
        style={{
          position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH, height: ROW_HEIGHT,
          padding: '0 8px', cursor: isActive ? 'default' : 'pointer',
          backgroundColor: stateBg,
          backgroundImage: cellState === 1 ? LOCKED_STRIPE : 'none',
          backgroundPosition: '0 0',
          textAlign: 'center', verticalAlign: 'middle',
          boxSizing: 'border-box',
          borderTop: stateBorder || undefined,
          borderLeft: stateBorder || undefined,
          borderRight: stateBorder || borderRight,
          borderBottom: stateBorder || '1px solid rgba(255,255,255,0.06)',
          boxShadow: assignError ? 'inset 0 0 0 1px #dc2626'
            : isDragOverLocked ? 'inset 0 0 0 1.5px #e05252'
            : (isDragTarget && cellState !== 1) ? 'inset 0 0 0 1.5px #33FF99'
            : (isFocused && !isActive) ? 'inset 0 0 0 1.5px rgba(255,255,255,0.4)'
            : 'none',
          zIndex: isActive ? 300 : (isFocused ? 5 : 1),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); onDragLeaveCell && onDragLeaveCell() }}
        onClick={handleCellClick}
        onContextMenu={staffName ? (e) => { e.preventDefault(); onRightClick(e.clientX, e.clientY, eventId, positionRow.key) } : undefined}
        onDragOver={e => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDragEnterCell && onDragEnterCell(eventId, positionRow.key)
        }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { onDragLeaveCell && onDragLeaveCell() } }}
        onDrop={e => {
          e.preventDefault()
          if (isHatched) { onDropOnLocked && onDropOnLocked(eventId, positionRow.key) }
          else { onCellDrop && onCellDrop(eventId, positionRow.key) }
        }}>

        {isActive && activeType === 'edit' ? (
          // Edit mode overlay — stays on top of all states
          <InlineStaffSearch eventId={eventId} event={event} initialValue={initialValue} onAssign={handleAssign} onClose={onCloseActive} allBookings={allBookings} />

        ) : cellState === 3 || cellState === 4 ? (
          // STATE 3 / 4 — FILLED (± conflict border handled via stateBorder above)
          <React.Fragment>
            <span
              draggable={!isActive}
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onCellDragStart && onCellDragStart(eventId, positionRow.key, assignment) }}
              onDragEnd={() => { onCellDragEnd && onCellDragEnd() }}
              style={{ display: 'block', width: '100%', fontSize: 13, fontWeight: nameWeight, letterSpacing: '0.01em', color: nameColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', opacity: hovered && !isActive ? 0.75 : 1, transition: 'opacity 0.15s ease', cursor: 'grab' }}>{staffName}</span>
            <div
              onClick={e => { e.stopPropagation(); onToggleSelect(assignment.id) }}
              style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (hovered || isSelected) ? 1 : 0, transition: 'opacity 0.15s ease', cursor: 'pointer', zIndex: 2 }}
            >
              {isSelected ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#33FF99"/><path d="M7 12l3 3 7-7" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              )}
            </div>
          </React.Fragment>

        ) : cellState === 1 ? (
          // STATE 1 — LOCKED: single gray padlock, mint on hover
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0.55, transition: 'opacity 0.15s' }}>
            <LockIcon locked={true} size={16} color={hovered ? '#33FF99' : '#64748b'} />
          </div>

        ) : (
          // STATE 2 — UNLOCKED + EMPTY: pencil + lock centered as a pair
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: hovered ? 1 : 0.7, transition: 'opacity 0.15s ease' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none', flexShrink: 0 }}>
              <path d="M13.879 3.121a3 3 0 1 1 4.243 4.243l-9 9a2 2 0 0 1-.847.514l-4 1a1 1 0 0 1-1.23-1.23l1-4a2 2 0 0 1 .514-.847l9-9z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!isExec && (
              <div onClick={e => { e.stopPropagation(); onToggleLock() }} title="Re-lock this position" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <LockIcon locked={false} size={14} color='#f87171' />
              </div>
            )}
          </div>
        )}

        {isActive && activeType === 'menu' && assignment && (
          <InlineStatusMenu assignment={assignment} onSetStatus={handleSetStatus} onRemove={handleRemove} />
        )}
      </td>
      {confirmOverride && (
        <ConfirmOverride
          staffMember={confirmOverride.staffMember}
          avail={confirmOverride.avail}
          travelInfo={confirmOverride.travelInfo}
          onConfirm={() => doAssign(confirmOverride.staffMember, confirmOverride.avail?.status === 'conflict' ? confirmOverride.avail.event_id : null)}
          onCancel={() => setConfirmOverride(null)}
        />
      )}
    </React.Fragment>
  )
}

// ── RIGHT-CLICK COLOR MENU ────────────────────────────────────────────────────

const CELL_COLOR_SWATCHES = [
  { label: 'Default', bg: null, text: null },
  { label: 'Mint', bg: 'rgba(51,255,153,0.15)', text: '#007744' },
  { label: 'Yellow', bg: 'rgba(255,204,0,0.15)', text: '#CC8800' },
  { label: 'Red', bg: 'rgba(255,51,51,0.15)', text: '#CC2200' },
  { label: 'Purple', bg: 'rgba(160,100,255,0.15)', text: '#7733cc' },
  { label: 'Blue', bg: 'rgba(51,153,255,0.15)', text: '#0055bb' },
  { label: 'Orange', bg: 'rgba(255,140,0,0.15)', text: '#bb5500' },
]

function RightClickMenu({ x, y, eventId, positionKey, onSetBg, onSetText, onClose }) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div onMouseDown={e => e.stopPropagation()} style={{ position: 'fixed', left: x, top: y, zIndex: 3000, background: '#0d1f3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', overflow: 'hidden', minWidth: 186, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ padding: '7px 12px', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>Cell Background</div>
      <div style={{ display: 'flex', gap: 7, padding: '9px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
        {CELL_COLOR_SWATCHES.map(c => (
          <div key={c.label} onClick={() => { onSetBg(eventId, positionKey, c.bg); onClose() }} title={c.label}
            style={{ width: 20, height: 20, borderRadius: 5, background: c.bg || 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.20)', cursor: 'pointer', flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ padding: '7px 12px', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>Text Color</div>
      <div style={{ display: 'flex', gap: 7, padding: '9px 12px', flexWrap: 'wrap' }}>
        {CELL_COLOR_SWATCHES.map(c => (
          <div key={c.label} onClick={() => { onSetText(eventId, positionKey, c.text); onClose() }} title={c.label}
            style={{ width: 20, height: 20, borderRadius: 5, background: c.text || 'rgba(255,255,255,0.15)', border: '1.5px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
        ))}
      </div>
    </div>
  )
}

// ── COPY TO EVENTS MODAL ──────────────────────────────────────────────────────

function CopyToEventsModal({ selectedIds, assignments, allEvents, tours, sourceEventId, tourId, onClose, onRefreshGrid }) {
  const [checked, setChecked] = useState([])
  const [copying, setCopying] = useState(false)
  const [done, setDone] = useState(null)

  const today = toYMD(new Date())
  const futureEvents = allEvents
    .filter(e =>
      e.load_in_date &&
      e.load_in_date >= today &&
      e.id !== sourceEventId &&
      (tourId ? e.tour_id === tourId : true)
    )
    .sort((a, b) => a.load_in_date.localeCompare(b.load_in_date))

  const allChecked = futureEvents.length > 0 && futureEvents.every(e => checked.includes(e.id))
  const toggle = (id) => setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => setChecked(allChecked ? [] : futureEvents.map(e => e.id))

  const fmtDateRange = (loadIn, loadOut) => {
    const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    const a = fmt(loadIn)
    if (!loadOut || loadOut === loadIn) return a
    return a + ' – ' + fmt(loadOut)
  }

  const CheckboxIcon = ({ isChecked }) => (
    <div style={{ width: 16, height: 16, flexShrink: 0, border: '1.5px solid ' + (isChecked ? '#33FF99' : 'rgba(255,255,255,0.3)'), borderRadius: 4, background: isChecked ? '#33FF99' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isChecked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )

  const handleCopy = async () => {
    if (checked.length === 0) return
    setCopying(true)
    const supabase = getSupabase()
    const allRows = Object.values(assignments).flat()
    const selectedRows = allRows.filter(a => selectedIds.has(a.id) && a.staff_id)
    for (const evId of checked) {
      for (const a of selectedRows) {
        try {
          const { data: existing } = await supabase.from('event_staff')
            .select('id').eq('event_id', evId).eq('position_key', a.position_key).limit(1)
          if (existing && existing.length > 0) {
            const { error } = await supabase.from('event_staff')
              .update({ staff_id: a.staff_id, status: 'confirmed', confirmed: true }).eq('id', existing[0].id)
            if (error) console.error('[copy] update error:', error)
          } else {
            const { error } = await supabase.from('event_staff')
              .insert([{ event_id: evId, staff_id: a.staff_id, position: a.position, position_key: a.position_key, status: 'confirmed', confirmed: true }])
            if (error) console.error('[copy] insert error:', error)
          }
        } catch (err) {
          console.error('[copy] error for', a.position_key, err)
        }
      }
    }
    const travelRows = selectedRows.filter(a => !a.position_key?.startsWith('exec__'))
    await Promise.all(checked.flatMap(evId =>
      travelRows.map(a =>
        confirmStaffMember({ supabase, eventId: evId, staffId: a.staff_id, confirm: true })
          .then(({ error }) => { if (error) console.error('[copy] travel sync failed:', error) })
      )
    ))
    setDone({ staffCount: selectedRows.length, evCount: checked.length })
    setCopying(false)
    if (onRefreshGrid) onRefreshGrid()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1f3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '24px 0', width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 64px rgba(0,0,0,0.7)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Copy to Events</div>
          <div onClick={onClose} style={{ fontSize: 22, color: '#64748b', cursor: 'pointer', lineHeight: 1 }}>×</div>
        </div>
        {done != null ? (
          <div style={{ textAlign: 'center', padding: '28px 24px', color: '#33FF99', fontSize: 15 }}>
            ✓ {done.staffCount} staff copied to {done.evCount} event{done.evCount === 1 ? '' : 's'}
          </div>
        ) : (
          <>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', height: 36, borderTop: '0.5px solid rgba(255,255,255,0.08)', borderBottom: '0.5px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              <div onClick={toggleAll} style={{ cursor: 'pointer' }}>
                <CheckboxIcon isChecked={allChecked} />
              </div>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 130 }}>Dates</span>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>City</span>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 140, textAlign: 'right' }}>Tour</span>
            </div>
            {/* Event list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {futureEvents.length === 0 && (
                <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>No upcoming events to copy to</div>
              )}
              {futureEvents.map(ev => {
                const tour = tours.find(t => t.id === ev.tour_id)
                const tourColor = tour?.color || '#33FF99'
                const isChecked = checked.includes(ev.id)
                return (
                  <div key={ev.id} onClick={() => toggle(ev.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44, padding: '0 24px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.06)', borderLeft: isChecked ? '3px solid #33FF99' : '3px solid transparent', background: isChecked ? 'rgba(51,255,153,0.06)' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}>
                    <CheckboxIcon isChecked={isChecked} />
                    <span style={{ fontSize: 13, color: '#f1f5f9', minWidth: 130, whiteSpace: 'nowrap' }}>{fmtDateRange(ev.load_in_date, ev.load_out_date)}</span>
                    <span style={{ fontSize: 13, color: '#f1f5f9', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatLocation(ev.city, ev.state, ev.country, 'compact')}</span>
                    {tour && <span style={{ fontSize: 12, fontWeight: 600, color: tourColor, minWidth: 140, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tour.name}</span>}
                  </div>
                )
              })}
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 0', borderTop: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{checked.length} event{checked.length === 1 ? '' : 's'} selected</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCopy} disabled={copying || checked.length === 0}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', background: checked.length === 0 ? 'rgba(255,255,255,0.15)' : '#33FF99', color: checked.length === 0 ? '#64748b' : '#0a1628', cursor: checked.length === 0 ? 'default' : 'pointer', fontWeight: 600 }}>
                  {copying ? 'Copying…' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── BULK ACTION BAR ───────────────────────────────────────────────────────────

function BulkActionBar({ count, onSetStatus, onCopyToEvents, onClear }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: '#1a2a42', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{count} selected</span>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
      {STATUS_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => onSetStatus(opt.value)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '0.5px solid ' + opt.border, background: opt.pill, color: opt.color, cursor: 'pointer' }}>
          {opt.label}
        </button>
      ))}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
      <button onClick={onCopyToEvents} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}>
        Copy to Events
      </button>
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
      <button onClick={onClear} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
        Clear
      </button>
      <button onClick={onClear} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>×</button>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function StaffingGrid() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [tours, setTours] = useState([])
  const [assignments, setAssignments] = useState({})
  const [eventMetas, setEventMetas] = useState({})
  const [customPositions, setCustomPositions] = useState({})
  const [loading, setLoading] = useState(true)
  const [collapsedDepts, setCollapsedDepts] = useState({})
  const [showPast, setShowPast] = useState(false)
  const [activeCell, setActiveCell] = useState(null) // { eventId, positionKey, type: 'edit'|'menu', initialValue? } | null
  const [focusedCell, setFocusedCell] = useState(null) // { eventId, positionKey } | null
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [cellColors, setCellColors] = useState({})
  const [rightClickMenu, setRightClickMenu] = useState(null)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [toast, setToast] = useState(null)
  const [draggedPosKey, setDraggedPosKey] = useState(null)
  const [dropPosKey, setDropPosKey] = useState(null)
  const [positionOrder, setPositionOrder] = useState({})
  const [staffBookingsMap, setStaffBookingsMap] = useState({})
  const [draggedCell, setDraggedCell] = useState(null)
  const [dragConflict, setDragConflict] = useState(null)
  const [dragOverCell, setDragOverCell] = useState(null)
  const [dragLockedModal, setDragLockedModal] = useState(null)
  const [conflictModal, setConflictModal] = useState(null)
  const activeCellElRef = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const COL_WIDTH = 140
  const LEFT_WIDTH = 220
  const ROW_HEIGHT = 38
  const DEPT_H = 32
  const H1 = 46
  const H2 = 32
  const H3 = 32
  const H4 = 32
  const H5 = 32
  const TOTAL_HDR = H1 + H2 + H3 + H4 + H5

  const B_HDR_INNER = '1px solid rgba(255,255,255,0.06)'
  const B_HDR_WEEKEND = '2px solid rgba(255,255,255,0.14)'
  const B_BODY_INNER = '1px solid rgba(255,255,255,0.06)'
  const B_BODY_WEEKEND = '2px solid rgba(255,255,255,0.14)'
  const B_HEADER_BOTTOM = '1px solid rgba(255,255,255,0.08)'
  const B_LEFT_COL = '1px solid rgba(255,255,255,0.10)'
  const B_DEPT_TOP = '1px solid rgba(255,255,255,0.08)'
  const HDR_BG = '#0d1f3c'
  const WEEKEND_HDR_BG = '#0d1f3c'
  const DEPT_BG = '#0d1f3c'
  const BODY_DEPT_BG = '#0f172a'

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [toursRes, eventsRes, assignmentsRes] = await Promise.all([
      supabase.from('tours').select('id, name, color, status').order('name', { ascending: true }),
      supabase.from('events').select('id, city, state, country, venue_name, venue_id, num_shows, load_in_date, load_out_date, tour_id, event_type, status, hidden_positions, unlocked_positions').order('load_in_date', { ascending: true }),
      supabase.from('event_staff').select('*, events(id, city, load_in_date, load_out_date, tour_id, tours(name))'),
    ])
    setTours(toursRes.data || [])
    setEvents(eventsRes.data || [])
    const metas = {}
    for (const ev of (eventsRes.data || [])) {
      metas[ev.id] = { hidden_positions: ev.hidden_positions || [], unlocked_positions: ev.unlocked_positions || [] }
    }
    setEventMetas(metas)

    const assignmentRows = assignmentsRes.data || []
    const staffIds = [...new Set(assignmentRows.map(a => a.staff_id).filter(Boolean))]
    let staffMap = {}
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase.from('staff').select('id, first_name, last_name, display_name').in('id', staffIds)
      for (const s of (staffData || [])) staffMap[s.id] = s
    }

    // Build staff conflict map keyed by staff_id with weekend dates for conflict detection (Fix 2)
    const bookingsMap = {}
    for (const a of assignmentRows) {
      if (!a.staff_id) continue
      if (!bookingsMap[a.staff_id]) bookingsMap[a.staff_id] = []
      const { saturday_date, sunday_date } = getWeekendDates(a.events?.load_in_date)
      bookingsMap[a.staff_id].push({
        event_id: a.event_id,
        city: a.events?.city,
        load_in_date: a.events?.load_in_date,
        load_out_date: a.events?.load_out_date,
        saturday_date,
        sunday_date,
        tour_name: a.events?.tours?.name,
        position: a.position,
      })
    }
    setStaffBookingsMap(bookingsMap)

    const aMap = {}
    const customMap = {}
    for (const a of assignmentRows) {
      const enriched = { ...a, staff: a.staff_id ? (staffMap[a.staff_id] || null) : null }
      if (!aMap[a.event_id]) aMap[a.event_id] = []
      aMap[a.event_id].push(enriched)
      if (a.position_key && a.position_key.startsWith('custom__')) {
        if (!customMap[a.event_id]) customMap[a.event_id] = []
        if (!customMap[a.event_id].find(p => p.key === a.position_key)) {
          const parts = a.position_key.split('__')
          const dept = parts[1] || 'Operations'
          customMap[a.event_id].push({ dept, position: a.position, key: a.position_key, displayLabel: a.position, isCustom: true })
        }
      }
    }
    setAssignments(aMap)
    setCustomPositions(customMap)
    setLoading(false)
  }

  const getAssignment = (eventId, positionKey) => (assignments[eventId] || []).find(a => a.position_key === positionKey)

  // Optimistically merge a freshly written event_staff row into local state so the pill appears immediately
  const updateAssignmentLocal = (eventId, row) => {
    setAssignments(prev => {
      const list = prev[eventId] || []
      const idx = list.findIndex(a => a.position_key === row.position_key)
      const nextList = idx >= 0 ? list.map((a, i) => (i === idx ? row : a)) : [...list, row]
      return { ...prev, [eventId]: nextList }
    })
  }
  const getTourColor = (tourId) => { const t = tours.find(t => t.id === tourId); return t ? t.color : '#33FF99' }
  const getTourName = (tourId) => { const t = tours.find(t => t.id === tourId); return t ? t.name : '\u2014' }
  const toggleDept = (dept) => setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))

  // Lock an open position: add to hidden_positions → shows dots in grid, removed from event staffing tab
  const handleLockPosition = async (eventId, positionKey) => {
    const supabase = getSupabase()
    const meta = eventMetas[eventId] || {}
    const hidden = meta.hidden_positions || []
    const unlocked = meta.unlocked_positions || []
    const nextHidden = hidden.includes(positionKey) ? hidden : [...hidden, positionKey]
    const nextUnlocked = unlocked.filter(k => k !== positionKey)
    await supabase.from('events').update({ hidden_positions: nextHidden, unlocked_positions: nextUnlocked }).eq('id', eventId)
    await supabase.from('event_staff').delete().eq('event_id', eventId).eq('position_key', positionKey)
    setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], hidden_positions: nextHidden, unlocked_positions: nextUnlocked } }))
  }

  // Unlock a position: handle two cases
  // Case A: was in hidden_positions (locked from event tab or grid) → remove from hidden
  // Case B: was template-hatched (not applicable to this show type) → add to unlocked_positions + insert blank event_staff row
  const handleUnlockPosition = async (eventId, positionKey, positionRow, event) => {
    const supabase = getSupabase()
    const meta = eventMetas[eventId] || {}
    const hidden = meta.hidden_positions || []
    const unlocked = meta.unlocked_positions || []

    if (hidden.includes(positionKey)) {
      // Case A: remove from hidden
      const nextHidden = hidden.filter(k => k !== positionKey)
      await supabase.from('events').update({ hidden_positions: nextHidden }).eq('id', eventId)
      // Re-insert blank event_staff row so it shows on event tab
      const { data: existingRowsA } = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('position_key', positionKey).limit(1)
      if (!existingRowsA || existingRowsA.length === 0) {
        await supabase.from('event_staff').insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionKey, confirmed: false, status: 'pending' }])
      }
      setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], hidden_positions: nextHidden } }))
    } else {
      // Case B: template-hatched → add to unlocked + insert blank event_staff row
      const nextUnlocked = [...unlocked, positionKey]
      await supabase.from('events').update({ unlocked_positions: nextUnlocked }).eq('id', eventId)
      const { data: existingRowsB } = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('position_key', positionKey).limit(1)
      if (!existingRowsB || existingRowsB.length === 0) {
        await supabase.from('event_staff').insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionKey, confirmed: false, status: 'pending' }])
      }
      setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], unlocked_positions: nextUnlocked } }))
    }
    setActiveCell({ eventId, positionKey, type: 'edit', initialValue: '' })
  }

  // Re-fetch bookings for one staff member and patch the map in-place (Fix 2)
  const refreshBookingsForStaff = async (staffId) => {
    if (!staffId) return
    const supabase = getSupabase()
    const { data } = await supabase
      .from('event_staff')
      .select('event_id, position, events(id, city, load_in_date, load_out_date, tour_id, tours(name))')
      .eq('staff_id', staffId)
    const bookings = (data || [])
      .filter(a => a.events)
      .map(a => {
        const { saturday_date, sunday_date } = getWeekendDates(a.events.load_in_date)
        return {
          event_id: a.event_id,
          city: a.events.city,
          load_in_date: a.events.load_in_date,
          load_out_date: a.events.load_out_date,
          saturday_date,
          sunday_date,
          tour_name: a.events.tours?.name,
          position: a.position,
        }
      })
    setStaffBookingsMap(prev => ({ ...prev, [staffId]: bookings }))
  }

  const handleToggleLock = (eventId, positionKey, isHatched, positionRow, event) => {
    if (isHatched) handleUnlockPosition(eventId, positionKey, positionRow, event)
    else handleLockPosition(eventId, positionKey)
  }

  // Immediately clear a staff member from an event's assignment in local state (Fix 4)
  const handleClearStaffFromEvent = (eventId, staffId) => {
    setAssignments(prev => {
      const next = { ...prev }
      if (next[eventId]) {
        next[eventId] = next[eventId].map(a =>
          a.staff_id === staffId ? { ...a, staff_id: null, staff: null, status: 'pending', confirmed: false } : a
        )
      }
      return next
    })
    setStaffBookingsMap(prev => ({
      ...prev,
      [staffId]: (prev[staffId] || []).filter(b => b.event_id !== eventId)
    }))
  }

  // Open resolve-conflict modal when clicking a double-booked cell (Fix 3)
  const handleConflictClick = async (assignment, conflictBooking, event) => {
    const supabase = getSupabase()
    const [arrConflict, depConflict, arrCurrent, depCurrent] = await Promise.all([
      supabase.from('event_travel_arrivals').select('travel_date, flight_number, airline').eq('event_id', conflictBooking.event_id).eq('staff_id', assignment.staff_id).maybeSingle(),
      supabase.from('event_travel_departures').select('travel_date, flight_number, airline').eq('event_id', conflictBooking.event_id).eq('staff_id', assignment.staff_id).maybeSingle(),
      supabase.from('event_travel_arrivals').select('travel_date, flight_number, airline').eq('event_id', event.id).eq('staff_id', assignment.staff_id).maybeSingle(),
      supabase.from('event_travel_departures').select('travel_date, flight_number, airline').eq('event_id', event.id).eq('staff_id', assignment.staff_id).maybeSingle(),
    ])
    const currentTour = tours.find(t => t.id === event.tour_id)
    setConflictModal({
      staffName: staffDisplayName(assignment.staff),
      staffId: assignment.staff_id,
      current: {
        eventId: event.id,
        assignmentId: assignment.id,
        city: event.city,
        tourName: currentTour?.name,
        weekendLabel: fmtWeekend(getWeekendGroup(event.load_in_date)),
        position: assignment.position,
        arrival: arrCurrent.data,
        departure: depCurrent.data,
      },
      conflict: {
        eventId: conflictBooking.event_id,
        city: conflictBooking.city,
        tourName: conflictBooking.tour_name,
        weekendLabel: fmtWeekend(getWeekendGroup(conflictBooking.load_in_date)),
        position: conflictBooking.position,
        arrival: arrConflict.data,
        departure: depConflict.data,
      },
    })
  }

  // "Keep Here" — clear the other event, update local state immediately
  const handleKeepHere = async (keepEventId, removeEventId) => {
    const staffId = conflictModal.staffId
    const supabase = getSupabase()
    await supabase.from('event_staff')
      .update({ staff_id: null, status: 'pending', confirmed: false })
      .eq('event_id', removeEventId)
      .eq('staff_id', staffId)
    await confirmStaffMember({ supabase, eventId: removeEventId, staffId, confirm: false })
    handleClearStaffFromEvent(removeEventId, staffId)
    // Re-fetch ground-truth bookings so conflict detection reflects the cleared state
    await refreshBookingsForStaff(staffId)
    setConflictModal(null)
  }

  // Unlock a locked cell and immediately assign dragged staff
  const handleUnlockAndAssign = async (eventId, positionKey, staffMember) => {
    const supabase = getSupabase()
    const meta = eventMetas[eventId] || {}
    const hidden = meta.hidden_positions || []
    const unlocked = meta.unlocked_positions || []
    const nextHidden = hidden.filter(k => k !== positionKey)
    const nextUnlocked = unlocked.includes(positionKey) ? unlocked : [...unlocked, positionKey]
    await supabase.from('events').update({ hidden_positions: nextHidden, unlocked_positions: nextUnlocked }).eq('id', eventId)
    setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], hidden_positions: nextHidden, unlocked_positions: nextUnlocked } }))
    const { data: existing } = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('position_key', positionKey).limit(1)
    const posRow = MASTER_POSITIONS.find(p => p.key === positionKey)
    const status = posRow?.isExec ? null : 'confirmed'
    const confirmed = status === 'confirmed'
    if (existing && existing.length > 0) {
      await supabase.from('event_staff').update({ staff_id: staffMember.id, status, confirmed }).eq('id', existing[0].id)
    } else {
      await supabase.from('event_staff').insert([{ event_id: eventId, position: posRow?.displayLabel || positionKey, position_key: positionKey, staff_id: staffMember.id, status, confirmed }])
    }
    // Update assignments in local state immediately — no fetchAll to avoid column reorder
    const localRow = {
      id: crypto.randomUUID(),
      event_id: eventId,
      staff_id: staffMember.id,
      position_key: positionKey,
      position: posRow?.displayLabel || positionKey,
      status,
      confirmed,
      staff: { id: staffMember.id, first_name: staffMember.first_name, last_name: staffMember.last_name, display_name: staffMember.display_name },
    }
    updateAssignmentLocal(eventId, localRow)
    if (staffMember.id && !posRow?.isExec) {
      await confirmStaffMember({ supabase, eventId, staffId: staffMember.id, confirm: true })
    }
    refreshBookingsForStaff(staffMember.id)
  }

  // ── STAFF DRAG (Fix 8) ──────────────────────────────────────────────────────
  const handleCellDragStart = (eventId, positionKey, assignment) => {
    setDraggedCell({ eventId, positionKey, assignment })
  }
  const handleCellDragEnd = () => {
    setDraggedCell(null)
    setDragOverCell(null)
  }
  const handleCellDragEnter = (eventId, positionKey) => {
    setDragOverCell({ eventId, positionKey })
  }
  const handleCellDragLeave = () => {
    setDragOverCell(null)
  }
  const handleDropOnLocked = (eventId, positionKey) => {
    if (!draggedCell) return
    setDragLockedModal({ eventId, positionKey, draggedCell })
    setDraggedCell(null)
    setDragOverCell(null)
  }
  const doMoveStaff = async (fromEventId, fromPosKey, fromAssignment, toPosKey) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ staff_id: null, status: 'pending', confirmed: false }).eq('id', fromAssignment.id)
    const existingTarget = (assignments[fromEventId] || []).find(a => a.position_key === toPosKey)
    if (existingTarget) {
      await supabase.from('event_staff').update({ staff_id: fromAssignment.staff_id, status: fromAssignment.status || 'pending', confirmed: fromAssignment.confirmed || false }).eq('id', existingTarget.id)
    } else {
      const posRow = MASTER_POSITIONS.find(p => p.key === toPosKey)
      await supabase.from('event_staff').insert([{ event_id: fromEventId, staff_id: fromAssignment.staff_id, position: posRow?.displayLabel || fromAssignment.position, position_key: toPosKey, status: fromAssignment.status || 'pending', confirmed: fromAssignment.confirmed || false }])
    }
    fetchAll()
  }
  const handleCellDrop = async (toEventId, toPosKey) => {
    if (!draggedCell) return
    if (draggedCell.eventId !== toEventId) { setDraggedCell(null); return }
    if (draggedCell.positionKey === toPosKey) { setDraggedCell(null); return }
    const toAssignment = getAssignment(toEventId, toPosKey)
    if (toAssignment && toAssignment.staff_id) {
      setDragConflict({ source: draggedCell, target: { eventId: toEventId, positionKey: toPosKey, assignment: toAssignment } })
      setDraggedCell(null)
      return
    }
    await doMoveStaff(draggedCell.eventId, draggedCell.positionKey, draggedCell.assignment, toPosKey)
    setDraggedCell(null)
  }

  const handleCellActivate = (eventId, positionKey, type) => {
    setFocusedCell({ eventId, positionKey })
    setActiveCell(type ? { eventId, positionKey, type } : null)
    setSelectedIds(new Set())
  }

  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) return
    const supabase = getSupabase()
    const ids = Array.from(selectedIds)
    const confirmed = status === 'confirmed'
    await supabase.from('event_staff').update({ status, confirmed }).in('id', ids)
    if (confirmed) {
      const allRows = Object.values(assignments).flat()
      const selectedRows = allRows.filter(a => ids.includes(a.id) && a.staff_id && !a.position_key?.startsWith('exec__'))
      await Promise.all(selectedRows.map(a =>
        confirmStaffMember({ supabase, eventId: a.event_id, staffId: a.staff_id, confirm: true })
          .then(({ error }) => { if (error) console.error('Travel bulk sync failed:', error) })
      ))
    }
    setAssignments(prev => {
      const next = { ...prev }
      for (const eid of Object.keys(next)) {
        next[eid] = next[eid].map(a => ids.includes(a.id) ? { ...a, status, confirmed } : a)
      }
      return next
    })
    setSelectedIds(new Set())
  }

  const today = toYMD(new Date())

  // Build weekend groups from ALL events first
  const allWeekendGroups = []
  const allWeekendMap = {}
  events.forEach(ev => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
    if (!allWeekendMap[wk]) { allWeekendMap[wk] = []; allWeekendGroups.push(wk) }
    allWeekendMap[wk].push(ev)
  })
  allWeekendGroups.sort()
  const allOrderedEvents = allWeekendGroups.flatMap(wk => allWeekendMap[wk])

  const availableYears = [...new Set(allOrderedEvents.map(ev => ev.load_in_date ? new Date(ev.load_in_date + 'T00:00:00').getFullYear() : null).filter(Boolean))].sort()

  // Apply year filter, then past/future filter
  const yearFilteredEvents = allOrderedEvents.filter(ev => ev.load_in_date && new Date(ev.load_in_date + 'T00:00:00').getFullYear() === selectedYear)
  const pastEvents = yearFilteredEvents.filter(ev => (ev.load_out_date || ev.load_in_date) < today)
  const filteredEvents = showPast ? yearFilteredEvents : yearFilteredEvents.filter(ev => (ev.load_out_date || ev.load_in_date) >= today)
  const weekendGroups = []
  const weekendMap = {}
  filteredEvents.forEach(ev => {
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

  const cellBorderRightDark = (ev, i) => {
    if (i === orderedEvents.length - 1) return B_HDR_INNER
    return isLastInGroup(ev) ? B_HDR_WEEKEND : B_HDR_INNER
  }
  const cellBorderRight = (ev, i) => {
    if (i === orderedEvents.length - 1) return B_BODY_INNER
    return isLastInGroup(ev) ? B_BODY_WEEKEND : B_BODY_INNER
  }

  const handleSetCellBg = (eventId, positionKey, bg) => {
    const key = eventId + '__' + positionKey
    setCellColors(prev => ({ ...prev, [key]: { ...prev[key], bg } }))
  }
  const handleSetCellText = (eventId, positionKey, text) => {
    const key = eventId + '__' + positionKey
    setCellColors(prev => ({ ...prev, [key]: { ...prev[key], text } }))
  }

  const getPositionRowsForDept = (dept) => {
    const templateRows = MASTER_POSITIONS.filter(p => p.dept === dept)
    const customRows = []
    const seenKeys = new Set()
    for (const eventId of Object.keys(customPositions)) {
      for (const cp of (customPositions[eventId] || [])) {
        if (cp.dept === dept && !seenKeys.has(cp.key)) {
          seenKeys.add(cp.key)
          customRows.push(cp)
        }
      }
    }
    const allRows = [...templateRows, ...customRows]
    const order = positionOrder[dept]
    if (!order || order.length === 0) return allRows
    return [...allRows].sort((a, b) => {
      const ai = order.indexOf(a.key)
      const bi = order.indexOf(b.key)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }

  const handlePosDragStart = (dept, posKey) => {
    setDraggedPosKey(posKey)
  }
  const handlePosDragOver = (dept, posKey) => {
    if (posKey !== draggedPosKey) setDropPosKey(posKey)
  }
  const handlePosDrop = (dept, posKey) => {
    if (!draggedPosKey || draggedPosKey === posKey) { setDraggedPosKey(null); setDropPosKey(null); return }
    const rows = getPositionRowsForDept(dept)
    const keys = rows.map(r => r.key)
    const fromIdx = keys.indexOf(draggedPosKey)
    const toIdx = keys.indexOf(posKey)
    if (fromIdx === -1 || toIdx === -1) { setDraggedPosKey(null); setDropPosKey(null); return }
    const reordered = [...keys]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, draggedPosKey)
    setPositionOrder(prev => ({ ...prev, [dept]: reordered }))
    setDraggedPosKey(null)
    setDropPosKey(null)
  }

  const visiblePositionRows = DEPARTMENT_ORDER.flatMap(dept => collapsedDepts[dept] ? [] : getPositionRowsForDept(dept))

  // Close the active cell on outside click
  useEffect(() => {
    if (!activeCell) return
    const handleMouseDown = (e) => {
      if (activeCellElRef.current && !activeCellElRef.current.contains(e.target)) setActiveCell(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [activeCell])

  // Excel-style keyboard navigation between cells when nothing is being edited
  useEffect(() => {
    const moveFocus = (dCol, dRow) => {
      if (!focusedCell || !orderedEvents.length || !visiblePositionRows.length) return
      const colIdx = orderedEvents.findIndex(e => e.id === focusedCell.eventId)
      const rowIdx = visiblePositionRows.findIndex(r => r.key === focusedCell.positionKey)
      if (colIdx === -1 || rowIdx === -1) return
      const nextCol = Math.min(Math.max(colIdx + dCol, 0), orderedEvents.length - 1)
      const nextRow = Math.min(Math.max(rowIdx + dRow, 0), visiblePositionRows.length - 1)
      setFocusedCell({ eventId: orderedEvents[nextCol].id, positionKey: visiblePositionRows[nextRow].key })
    }
    const handleKeyDown = (e) => {
      if (!focusedCell) return

      // While a cell is active (editing/menu), only Escape is handled here —
      // InlineStaffSearch stops propagation for its own Escape handling.
      if (activeCell) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setActiveCell(null)
          setSelectedIds(new Set())
        }
        return
      }

      if (e.key === 'Escape' && selectedIds.size > 0) {
        e.preventDefault()
        setSelectedIds(new Set())
        return
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          moveFocus(e.shiftKey ? -1 : 1, 0)
          break
        case 'ArrowRight': e.preventDefault(); moveFocus(1, 0); break
        case 'ArrowLeft': e.preventDefault(); moveFocus(-1, 0); break
        case 'ArrowDown': e.preventDefault(); moveFocus(0, 1); break
        case 'ArrowUp': e.preventDefault(); moveFocus(0, -1); break
        case 'Enter': {
          const posRow = visiblePositionRows.find(r => r.key === focusedCell.positionKey)
          const ev = orderedEvents.find(e2 => e2.id === focusedCell.eventId)
          if (!posRow || !ev) return
          const meta = eventMetas[ev.id] || {}
          const assignment = (assignments[ev.id] || []).find(a => a.position_key === posRow.key)
          const hatched = isHatchedCell(posRow, ev, meta)
          if (hatched && !assignment) return
          e.preventDefault()
          setActiveCell({ eventId: ev.id, positionKey: posRow.key, type: assignment ? 'menu' : 'edit', initialValue: '' })
          break
        }
        default: {
          // Any letter/number key on a focused cell jumps straight into edit mode,
          // seeding the search input with that character (Excel-style "just type to search").
          if (/^[a-zA-Z0-9]$/.test(e.key)) {
            const posRow = visiblePositionRows.find(r => r.key === focusedCell.positionKey)
            const ev = orderedEvents.find(e2 => e2.id === focusedCell.eventId)
            if (!posRow || !ev) return
            const meta = eventMetas[ev.id] || {}
            const assignment = (assignments[ev.id] || []).find(a => a.position_key === posRow.key)
            const hatched = isHatchedCell(posRow, ev, meta)
            if (hatched && !assignment) return
            e.preventDefault()
            setActiveCell({ eventId: ev.id, positionKey: posRow.key, type: 'edit', initialValue: e.key })
          }
          break
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeCell, focusedCell, orderedEvents, visiblePositionRows, eventMetas, assignments, selectedIds])

  if (loading) return (
    <div style={{ height: '100vh', background: '#0d1628' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading staffing grid...</div>
    </div>
  )

  return (
    <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1628', overflow: 'hidden', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <TopNav />
      <div style={{ marginTop: 62, flexShrink: 0, padding: '14px 28px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0d1628' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <button
            onClick={() => router.push('/staff')}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer', flexShrink: 0 }}>
            ← Back to Staff
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>All Tours Staffing Grid</div>
          {pastEvents.length > 0 ? (
            <button
              onClick={() => setShowPast(p => !p)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: showPast ? 'rgba(255,255,255,0.08)' : 'transparent', color: showPast ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
              {showPast ? 'Hide Past Events' : 'Show Past Events (' + pastEvents.length + ')'}
            </button>
          ) : <div />}
        </div>
        {availableYears.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', cursor: 'pointer', outline: 'none' }}>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Create events on your tours to populate the staffing grid</div>
        </div>
      ) : (
        <React.Fragment>
          {selectedIds.size > 0 && (
            <BulkActionBar count={selectedIds.size} onSetStatus={handleBulkStatus} onCopyToEvents={() => setCopyModalOpen(true)} onClear={() => setSelectedIds(new Set())} />
          )}
          <div style={{ flex: 1 }}>
          <div style={{ margin: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ overflow: 'auto', height: 'calc(100vh - 160px)', transform: 'translateZ(0)', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H1, background: '#111827', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }} />
                {weekendGroups.map((wk, wi) => {
                  const wkEvs = weekendMap[wk]
                  return (
                    <th key={wk} colSpan={wkEvs.length} style={{ position: 'sticky', top: 0, zIndex: 30, height: H1, background: WEEKEND_HDR_BG, borderBottom: B_HDR_INNER, borderRight: wi < weekendGroups.length - 1 ? B_HDR_WEEKEND : B_HDR_INNER, textAlign: 'center', fontWeight: 400, padding: '6px 0' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Weekend</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.01em', marginTop: 2 }}>{fmtWeekend(wk)}</div>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H2, background: '#111827', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tour</span>
                </th>
                {orderedEvents.map((ev, i) => {
                  const color = getTourColor(ev.tour_id)
                  return (
                    <th key={ev.id} style={{ position: 'sticky', top: H1, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H2, background: HDR_BG, borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTourName(ev.tour_id)}</span>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H3, background: '#111827', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>City</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H3, background: DEPT_BG, borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                    <span
                      onClick={() => router.push('/tours/' + ev.tour_id + '/events/' + ev.id + '?tab=staffing')}
                      style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.01em', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.55' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                      {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2 + H3, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H4, background: '#111827', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                </th>
                {orderedEvents.map((ev, i) => {
                  const statusColor = getEventStatusColor(ev.status)
                  const pillBg = colorWithAlpha(statusColor, 0.12)
                  const pillBorder = colorWithAlpha(statusColor, 0.40)
                  return (
                    <th key={ev.id} style={{ position: 'sticky', top: H1 + H2 + H3, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H4, background: DEPT_BG, borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, letterSpacing: '0.01em', padding: '2px 8px', borderRadius: 20, border: '0.5px solid ' + pillBorder, background: pillBg, color: statusColor }}>
                        {formatStatusLabel(ev.status)}
                      </span>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2 + H3 + H4, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H5, background: '#111827', borderRight: B_LEFT_COL, borderBottom: '5px solid #FFD60A', padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Venue</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2 + H3 + H4, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H5, background: HDR_BG, borderBottom: '5px solid #FFD60A', borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.venue_id ? (
                      <span
                        onClick={() => router.push('/venues/' + ev.venue_id)}
                        style={{ fontWeight: 500, letterSpacing: '0.01em', color: '#f1f5f9', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                        {ev.venue_name || '\u2014'}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>{ev.venue_name || '\u2014'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {DEPARTMENT_ORDER.filter(dept => dept !== 'Monster Truck Drivers' /* TODO: re-enable via settings toggle */).map(dept => {
                const deptRows = getPositionRowsForDept(dept)
                const collapsed = collapsedDepts[dept]
                return (
                  <React.Fragment key={dept}>
                    <tr>
                      <td
                        onClick={() => toggleDept(dept)}
                        style={{ position: 'sticky', left: 0, zIndex: 20, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: DEPT_H, padding: '0 14px', cursor: 'pointer', userSelect: 'none', background: BODY_DEPT_BG, borderLeft: '4px solid #FFD60A', borderRight: B_LEFT_COL, borderTop: B_DEPT_TOP, borderBottom: B_DEPT_TOP, willChange: 'transform' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = BODY_DEPT_BG }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#FFD60A' }}>{collapsed ? '\u25b8' : '\u25be'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFD60A', whiteSpace: 'nowrap' }}>{dept}</span>
                        </div>
                      </td>
                      {orderedEvents.map((ev, i) => (
                        <td key={ev.id} style={{ height: DEPT_H, background: BODY_DEPT_BG, borderTop: B_DEPT_TOP, borderBottom: B_DEPT_TOP, borderRight: cellBorderRight(ev, i) }} />
                      ))}
                    </tr>
                    {!collapsed && deptRows.map((posRow, posIdx) => {
                      const rowBg = 'rgba(255,255,255,0.03)'
                      return (
                      <tr key={posRow.key} style={{ background: rowBg }}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 10, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: ROW_HEIGHT, padding: '0 10px 0 6px', background: '#111827', borderRight: B_LEFT_COL, borderBottom: B_BODY_INNER, fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', willChange: 'transform' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{posRow.displayLabel}</span>
                          </div>
                        </td>
                        {orderedEvents.map((ev, i) => {
                          const meta = eventMetas[ev.id] || {}
                          const assignment = getAssignment(ev.id, posRow.key)
                          const hatched = isHatchedCell(posRow, ev, meta)
                          const isActiveCell = !!activeCell && activeCell.eventId === ev.id && activeCell.positionKey === posRow.key
                          const isFocusedCell = !!focusedCell && focusedCell.eventId === ev.id && focusedCell.positionKey === posRow.key
                          const ck = ev.id + '__' + posRow.key
                          const isCellDragTarget = !!(draggedCell && dragOverCell?.eventId === ev.id && dragOverCell?.positionKey === posRow.key)
                          const isExpUnlocked = !!(meta.unlocked_positions || []).includes(posRow.key)
                          return (
                            <GridCell
                              key={ev.id}
                              eventId={ev.id}
                              event={ev}
                              positionRow={posRow}
                              assignment={assignment}
                              isHatched={hatched}
                              isExplicitlyUnlocked={isExpUnlocked}
                              onRefresh={fetchAll}
                              onAssignSuccess={updateAssignmentLocal}
                              isActive={isActiveCell}
                              activeType={isActiveCell ? activeCell.type : null}
                              initialValue={isActiveCell ? activeCell.initialValue : undefined}
                              isFocused={isFocusedCell}
                              cellRef={isActiveCell ? activeCellElRef : null}
                              onActivate={(type) => handleCellActivate(ev.id, posRow.key, type)}
                              onCloseActive={() => setActiveCell(null)}
                              onToggleLock={() => handleToggleLock(ev.id, posRow.key, hatched, posRow, ev)}
                              isSelected={!!(assignment?.staff_id) && selectedIds.has(assignment.id)}
                              onToggleSelect={toggleSelectId}
                              onRightClick={(x, y, eid, pk) => setRightClickMenu({ x, y, eventId: eid, positionKey: pk })}
                              cellColor={cellColors[ck] || null}
                              allBookings={staffBookingsMap}
                              onCellDragStart={handleCellDragStart}
                              onCellDragEnd={handleCellDragEnd}
                              onCellDrop={handleCellDrop}
                              onDragEnterCell={handleCellDragEnter}
                              onDragLeaveCell={handleCellDragLeave}
                              onDropOnLocked={handleDropOnLocked}
                              isDragTarget={isCellDragTarget}
                              onClearAssignment={handleClearStaffFromEvent}
                              onConflictClick={handleConflictClick}
                              COL_WIDTH={COL_WIDTH}
                              ROW_HEIGHT={ROW_HEIGHT}
                              borderRight={cellBorderRight(ev, i)}
                            />
                          )
                        })}
                      </tr>
                    )})}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
          </div>
          </div>
        </React.Fragment>
      )}
      {rightClickMenu && (
        <RightClickMenu
          x={rightClickMenu.x} y={rightClickMenu.y}
          eventId={rightClickMenu.eventId} positionKey={rightClickMenu.positionKey}
          onSetBg={handleSetCellBg} onSetText={handleSetCellText}
          onClose={() => setRightClickMenu(null)}
        />
      )}
      {copyModalOpen && (
        <CopyToEventsModal
          selectedIds={selectedIds}
          assignments={assignments}
          allEvents={events}
          tours={tours}
          sourceEventId={focusedCell?.eventId}
          onClose={() => { setCopyModalOpen(false); setSelectedIds(new Set()) }}
          onRefreshGrid={() => { fetchAll(); showToast('Staff copied successfully') }}
        />
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 4000, background: '#33FF99', color: '#0a1628', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          ✓ {toast}
        </div>
      )}
      {dragLockedModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(224,82,82,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#e05252' }}>Position Is Locked</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Unlock <strong style={{ color: '#f1f5f9' }}>{MASTER_POSITIONS.find(p => p.key === dragLockedModal.positionKey)?.displayLabel || dragLockedModal.positionKey}</strong> to assign staff here.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDragLockedModal(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button onClick={async () => {
                const { eventId, positionKey, draggedCell: dc } = dragLockedModal
                if (dc?.assignment?.staff) {
                  await handleUnlockAndAssign(eventId, positionKey, dc.assignment.staff)
                } else {
                  const posRow = MASTER_POSITIONS.find(p => p.key === positionKey)
                  const ev = events.find(e => e.id === eventId)
                  if (posRow && ev) handleUnlockPosition(eventId, positionKey, posRow, ev)
                }
                setDragLockedModal(null)
              }} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#e05252', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                {dragLockedModal.draggedCell?.assignment?.staff ? 'Unlock & Assign' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {conflictModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,214,10,0.35)', borderRadius: 14, padding: 32, width: 560, maxWidth: '95vw' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFD60A', marginBottom: 6 }}>
              Scheduling Conflict — {conflictModal.staffName}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
              {conflictModal.staffName} is assigned to two events on the same weekend. Choose which event to keep them on.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[conflictModal.current, conflictModal.conflict].map((ev, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ev.tourName && <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#FFD60A' }}>{ev.tourName}</div>}
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{ev.city || '—'}</div>
                  {ev.weekendLabel && <div style={{ fontSize: 12, color: '#94a3b8' }}>{ev.weekendLabel}</div>}
                  {ev.position && <div style={{ fontSize: 12, color: '#64748b' }}>{ev.position}</div>}
                  {(ev.arrival?.travel_date || ev.departure?.travel_date) && (
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, paddingTop: 4, borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                      {ev.arrival?.travel_date && <div>✈ In: {fmtDate(ev.arrival.travel_date)}{ev.arrival.flight_number ? ' · ' + ev.arrival.flight_number : ''}</div>}
                      {ev.departure?.travel_date && <div>✈ Out: {fmtDate(ev.departure.travel_date)}{ev.departure.flight_number ? ' · ' + ev.departure.flight_number : ''}</div>}
                    </div>
                  )}
                  <button
                    onClick={() => handleKeepHere(ev.eventId, idx === 0 ? conflictModal.conflict.eventId : conflictModal.current.eventId)}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 'auto', fontSize: 13, padding: '8px 14px', borderRadius: 7, border: 'none', background: '#33FF99', color: '#0a1628', cursor: 'pointer', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2be88a'}
                    onMouseLeave={e => e.currentTarget.style.background = '#33FF99'}
                  >Keep Here</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setConflictModal(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {dragConflict && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>Position Already Filled</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {staffDisplayName(dragConflict.target.assignment.staff)} is already in this position. Move {staffDisplayName(dragConflict.source.assignment.staff)} here anyway?
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDragConflict(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button onClick={async () => { await doMoveStaff(dragConflict.source.eventId, dragConflict.source.positionKey, dragConflict.source.assignment, dragConflict.target.positionKey); setDragConflict(null) }}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>Move Anyway</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    </>
  )
}