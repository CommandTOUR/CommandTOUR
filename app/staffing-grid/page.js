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
  { value: 'scheduled', label: 'Scheduled', color: '#FFCC00', pill: 'rgba(255,204,0,0.18)', border: 'rgba(255,204,0,0.5)' },
  { value: 'confirmed', label: 'Confirmed', color: '#33FF99', pill: 'rgba(51,255,153,0.18)', border: 'rgba(51,255,153,0.5)' },
  { value: 'attention', label: 'Attention', color: '#FF3333', pill: 'rgba(255,51,51,0.18)', border: 'rgba(255,51,51,0.5)' },
]

function getStatusStyle(status) { return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0] }

// Single consistent dot pattern for all locked/hatched cells
const HATCH_BG = 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)'
const HATCH_SIZE = '6px 6px'

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

function InlineStaffSearch({ eventId, event, onAssign, onClose, initialValue }) {
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
      const { data: staffData } = await supabase.from('staff').select('id, first_name, last_name')
        .or('first_name.ilike.%' + query + '%,last_name.ilike.%' + query + '%')
        .order('last_name', { ascending: true }).limit(8)
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
    }, 200)
    return () => clearTimeout(timer)
  }, [query, event, eventId])

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
    if (a.status === 'conflict') return 'Booked — ' + (a.city || 'another event')
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
        style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: '4px 6px', borderRadius: 5, border: '0.5px solid var(--mint)', background: 'rgba(255,255,255,0.07)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {showDropdown && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1100, width: 200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 230, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
          {loading && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>No results</div>}
          {results.map((s, i) => {
            const color = dotColor(s.id)
            const t = tipText(s.id)
            return (
              <div key={s.id}
                onMouseDown={e => { e.preventDefault(); selectIndex(i) }}
                onMouseEnter={() => setActiveIndex(i)}
                title={t}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer', background: i === activeIndex ? 'rgba(51,255,153,0.1)' : 'transparent', color: i === activeIndex ? 'var(--mint)' : 'var(--text-primary)' }}>
                {color && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.first_name} {s.last_name}</span>
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
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: assignment && assignment.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = assignment && assignment.status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
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
          <button
            onClick={onCancel}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={onConfirm} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>Assign Anyway</button>
        </div>
      </div>
    </div>
  )
}

// ── GRID CELL ─────────────────────────────────────────────────────────────────

function GridCell({ eventId, event, positionRow, assignment, isHatched, onRefresh, onAssignSuccess, isActive, activeType, initialValue, isFocused, cellRef, onActivate, onCloseActive, onToggleLock, COL_WIDTH, ROW_HEIGHT, borderRight }) {
  const [hovered, setHovered] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const [assignError, setAssignError] = useState(false)
  const isExec = positionRow.isExec
  const statusStyle = (!isExec && assignment && assignment.status) ? getStatusStyle(assignment.status) : null
  const staffName = assignment && assignment.staff ? assignment.staff.first_name + ' ' + assignment.staff.last_name : null

  const doAssign = async (staffMember) => {
    setConfirmOverride(null)
    const supabase = getSupabase()
    const status = isExec ? null : 'scheduled'

    // Check for an existing row by event_id + position_key to prevent duplicate inserts
    const { data: existing } = await supabase.from('event_staff')
      .select('id').eq('event_id', eventId).eq('position_key', positionRow.key).maybeSingle()

    let writeError = null
    if (existing) {
      const { error } = await supabase.from('event_staff')
        .update({ staff_id: staffMember.id, status, confirmed: false }).eq('id', existing.id)
      writeError = error
    } else {
      const { error } = await supabase.from('event_staff')
        .insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionRow.key, staff_id: staffMember.id, status, confirmed: false }])
      writeError = error
    }

    if (writeError) {
      setAssignError(true)
      setTimeout(() => setAssignError(false), 1200)
      onCloseActive()
      return
    }

    // Show pill immediately with an optimistic local row — no select after write
    const localRow = {
      id: crypto.randomUUID(),
      event_id: eventId,
      staff_id: staffMember.id,
      position_key: positionRow.key,
      status,
      staff: { id: staffMember.id, first_name: staffMember.first_name, last_name: staffMember.last_name },
    }
    onAssignSuccess(eventId, localRow)
    onCloseActive()

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
  }

  const handleAssign = (staffMember, avail) => {
    if (avail && (avail.status === 'conflict' || avail.status === 'same_event')) {
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

  const cellBg = assignError ? 'rgba(255,51,51,0.15)' : (isHatched && !assignment ? HATCH_BG : 'transparent')
  const cellBgSize = isHatched && !assignment ? HATCH_SIZE : 'auto'
  const pillColor = isExec ? 'rgba(255,255,255,0.5)' : (statusStyle ? statusStyle.color : '#FFCC00')
  const pillBg = isExec ? 'rgba(255,255,255,0.08)' : colorWithAlpha(statusStyle ? statusStyle.color : '#FFCC00', 0.2)

  const handleCellClick = () => {
    if (isActive) return
    if (assignment) { onActivate('menu'); return }
    if (isHatched) { onActivate(null); return }
    onActivate('edit')
  }

  const showLockIcon = !isExec && hovered && !isActive

  return (
    <React.Fragment>
      <td
        ref={cellRef}
        style={{
          position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH, height: ROW_HEIGHT,
          padding: '0 6px', cursor: isActive ? 'default' : 'pointer',
          background: cellBg, backgroundSize: cellBgSize, textAlign: 'center', verticalAlign: 'middle',
          boxSizing: 'border-box', borderRight, borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          boxShadow: assignError ? 'inset 0 0 0 1px #FF3333' : (isFocused && !isActive ? 'inset 0 0 0 1px var(--mint)' : 'none'),
          zIndex: isActive ? 300 : (isFocused ? 5 : 1),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleCellClick}>
        {isActive && activeType === 'edit' ? (
          <InlineStaffSearch eventId={eventId} event={event} initialValue={initialValue} onAssign={handleAssign} onClose={onCloseActive} />
        ) : staffName ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 6, background: pillBg, maxWidth: COL_WIDTH - 12, opacity: hovered && !isActive ? 0.82 : 1, transition: 'opacity 0.1s' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: pillColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffName}</span>
          </div>
        ) : isHatched ? null : (
          hovered ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ Assign</span> : null
        )}

        {isActive && activeType === 'menu' && assignment && (
          <InlineStatusMenu assignment={assignment} onSetStatus={handleSetStatus} onRemove={handleRemove} />
        )}

        {!isExec && (
          <div
            onClick={e => { e.stopPropagation(); onToggleLock() }}
            title={isHatched ? 'Unlock position' : 'Lock position'}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 4, cursor: 'pointer', zIndex: 10,
              opacity: showLockIcon ? 1 : 0, transition: 'opacity 0.1s',
            }}>
            <LockIcon locked={isHatched} size={14} color={isHatched ? 'var(--mint)' : 'var(--text-muted)'} />
          </div>
        )}
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
  const activeCellElRef = useRef(null)

  const COL_WIDTH = 140
  const LEFT_WIDTH = 220
  const ROW_HEIGHT = 38
  const DEPT_H = 34
  const H1 = 46
  const H2 = 32
  const H3 = 32
  const H4 = 32
  const H5 = 32
  const TOTAL_HDR = H1 + H2 + H3 + H4 + H5

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
      supabase.from('events').select('id, city, state, venue_name, num_shows, load_in_date, load_out_date, tour_id, event_type, status, hidden_positions, unlocked_positions').order('load_in_date', { ascending: true }),
      supabase.from('event_staff').select('*, staff(id, first_name, last_name)'),
    ])
    setTours(toursRes.data || [])
    setEvents(eventsRes.data || [])
    const metas = {}
    for (const ev of (eventsRes.data || [])) {
      metas[ev.id] = { hidden_positions: ev.hidden_positions || [], unlocked_positions: ev.unlocked_positions || [] }
    }
    setEventMetas(metas)
    const aMap = {}
    const customMap = {}
    for (const a of (assignmentsRes.data || [])) {
      if (!aMap[a.event_id]) aMap[a.event_id] = []
      aMap[a.event_id].push(a)
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
    if (hidden.includes(positionKey)) return
    const nextHidden = [...hidden, positionKey]
    await supabase.from('events').update({ hidden_positions: nextHidden }).eq('id', eventId)
    // Also delete any unassigned event_staff row for this position
    await supabase.from('event_staff').delete().eq('event_id', eventId).eq('position_key', positionKey)
    setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], hidden_positions: nextHidden } }))
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
      const existing = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('position_key', positionKey).maybeSingle()
      if (!existing.data) {
        await supabase.from('event_staff').insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionKey, confirmed: false, status: 'scheduled' }])
      }
      setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], hidden_positions: nextHidden } }))
    } else {
      // Case B: template-hatched → add to unlocked + insert blank event_staff row
      const nextUnlocked = [...unlocked, positionKey]
      await supabase.from('events').update({ unlocked_positions: nextUnlocked }).eq('id', eventId)
      const existing = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('position_key', positionKey).maybeSingle()
      if (!existing.data) {
        await supabase.from('event_staff').insert([{ event_id: eventId, position: positionRow.displayLabel, position_key: positionKey, confirmed: false, status: 'scheduled' }])
      }
      setEventMetas(prev => ({ ...prev, [eventId]: { ...prev[eventId], unlocked_positions: nextUnlocked } }))
    }
    fetchAll()
  }

  const handleToggleLock = (eventId, positionKey, isHatched, positionRow, event) => {
    if (isHatched) handleUnlockPosition(eventId, positionKey, positionRow, event)
    else handleLockPosition(eventId, positionKey)
  }

  const handleCellActivate = (eventId, positionKey, type) => {
    setFocusedCell({ eventId, positionKey })
    setActiveCell(type ? { eventId, positionKey, type } : null)
  }

  const today = toYMD(new Date())

  // Build weekend groups from ALL events first (for past count)
  const allWeekendGroups = []
  const allWeekendMap = {}
  events.forEach(ev => {
    const wk = getWeekendGroup(ev.load_in_date) || ev.load_in_date
    if (!allWeekendMap[wk]) { allWeekendMap[wk] = []; allWeekendGroups.push(wk) }
    allWeekendMap[wk].push(ev)
  })
  allWeekendGroups.sort()
  const allOrderedEvents = allWeekendGroups.flatMap(wk => allWeekendMap[wk])
  const pastEvents = allOrderedEvents.filter(ev => (ev.load_out_date || ev.load_in_date) < today)

  // Filter events first, then rebuild weekend groups from filtered set
  const filteredEvents = showPast ? allOrderedEvents : allOrderedEvents.filter(ev => (ev.load_out_date || ev.load_in_date) >= today)
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

  const cellBorderRight = (ev, i) => {
    if (i === orderedEvents.length - 1) return '0.5px solid rgba(255,255,255,0.06)'
    return isLastInGroup(ev) ? B_WEEKEND : '0.5px solid rgba(255,255,255,0.06)'
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
    return [...templateRows, ...customRows]
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
        }
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
  }, [activeCell, focusedCell, orderedEvents, visiblePositionRows, eventMetas, assignments])

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Staffing Grid</div>
          {pastEvents.length > 0 && (
            <button
              onClick={() => setShowPast(p => !p)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: showPast ? 'rgba(255,255,255,0.08)' : 'transparent', color: showPast ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
              {showPast ? 'Hide Past Events' : 'Show Past Events (' + pastEvents.length + ')'}
            </button>
          )}
        </div>
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
                <th style={{ position: 'sticky', top: H1 + H2, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H3, background: DEPT_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>City</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H3, background: DEPT_BG, borderBottom: B_INNER, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                    <span
                      onClick={() => router.push('/tours/' + ev.tour_id + '/events/' + ev.id + '?tab=staffing')}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                      {ev.city}{ev.state ? ', ' + ev.state : ''}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2 + H3, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H4, background: DEPT_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</span>
                </th>
                {orderedEvents.map((ev, i) => {
                  const statusColor = getEventStatusColor(ev.status)
                  return (
                    <th key={ev.id} style={{ position: 'sticky', top: H1 + H2 + H3, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H4, background: DEPT_BG, borderBottom: B_INNER, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                      <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '0.5px solid ' + statusColor, background: colorWithAlpha(statusColor, 0.1), color: statusColor }}>
                        {formatStatusLabel(ev.status)}
                      </span>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: H1 + H2 + H3 + H4, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H5, background: HDR_BG, borderRight: B_LEFT_COL, borderBottom: B_HEADER_BOTTOM, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Venue</span>
                </th>
                {orderedEvents.map((ev, i) => (
                  <th key={ev.id} style={{ position: 'sticky', top: H1 + H2 + H3 + H4, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H5, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: cellBorderRight(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.venue_name || '\u2014'}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {DEPARTMENT_ORDER.map(dept => {
                const deptRows = getPositionRowsForDept(dept)
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
                          const meta = eventMetas[ev.id] || {}
                          const assignment = getAssignment(ev.id, posRow.key)
                          const hatched = isHatchedCell(posRow, ev, meta)
                          const isActiveCell = !!activeCell && activeCell.eventId === ev.id && activeCell.positionKey === posRow.key
                          const isFocusedCell = !!focusedCell && focusedCell.eventId === ev.id && focusedCell.positionKey === posRow.key
                          return (
                            <GridCell
                              key={ev.id}
                              eventId={ev.id}
                              event={ev}
                              positionRow={posRow}
                              assignment={assignment}
                              isHatched={hatched}
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