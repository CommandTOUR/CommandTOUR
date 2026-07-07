'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'

// ── HELPERS ────────────────────────────────────────────────────────────────

function staffDisplayName(staff) {
  if (!staff) return ''
  return staff.display_name?.trim() || `${staff.first_name} ${staff.last_name}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  return fri.toLocaleDateString('en-US', opts) + ' – ' + sun.toLocaleDateString('en-US', opts)
}

function travelInfoFrom(record) {
  if (!record || (!record.travel_in_date && !record.travel_out_date)) return null
  return { travel_in_date: record.travel_in_date, travel_out_date: record.travel_out_date }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const EVENT_STATUS_STYLES = {
  confirmed: { label: 'Confirmed', color: 'var(--status-confirmed)', bg: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  '1-hold': { label: '1-Hold', color: 'var(--status-1hold)', bg: 'var(--status-1hold-bg)', border: 'var(--status-1hold-border)' },
  '2-hold': { label: '2-Hold', color: 'var(--status-2hold)', bg: 'var(--status-2hold-bg)', border: 'var(--status-2hold-border)' },
  '3-hold': { label: '3+ Hold', color: 'var(--status-3hold)', bg: 'var(--status-3hold-bg)', border: 'var(--status-3hold-border)' },
  tentative: { label: 'Tentative', color: 'var(--status-tentative)', bg: 'var(--status-tentative-bg)', border: 'var(--status-tentative-border)' },
  'date-hold': { label: 'Date Hold', color: 'var(--status-dateHold)', bg: 'var(--status-dateHold-bg)', border: 'var(--status-dateHold-border)' },
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: '#33FF99', pill: 'rgba(51,255,153,0.12)', border: 'rgba(51,255,153,0.3)' },
  { value: 'pending', label: 'Pending', color: '#FFD60A', pill: 'rgba(255,214,10,0.15)', border: 'rgba(255,214,10,0.5)' },
  { value: 'needs_attention', label: 'Needs Attention', color: '#e05252', pill: 'rgba(224,82,82,0.15)', border: 'rgba(224,82,82,0.5)' },
]

const LOCKED_STRIPE = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 7px)'
const LOCKED_BG_COLOR = 'rgba(255,255,255,0.02)'
const STAFF_NAME_COLORS = { confirmed: 'var(--text-primary)', pending: 'var(--color-yellow)', needs_attention: 'var(--color-red)' }
const STAFF_NAME_WEIGHTS = { confirmed: 400 }

const CELL_COLOR_SWATCHES = [
  { label: 'Default', bg: null, text: null },
  { label: 'Mint', bg: 'rgba(51,255,153,0.15)', text: '#007744' },
  { label: 'Yellow', bg: 'rgba(255,204,0,0.15)', text: '#CC8800' },
  { label: 'Red', bg: 'rgba(255,51,51,0.15)', text: '#CC2200' },
  { label: 'Purple', bg: 'rgba(160,100,255,0.15)', text: '#7733cc' },
  { label: 'Blue', bg: 'rgba(51,153,255,0.15)', text: '#0055bb' },
  { label: 'Orange', bg: 'rgba(255,140,0,0.15)', text: '#bb5500' },
]

// ── LOCK ICON ──────────────────────────────────────────────────────────────

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

// ── INLINE STAFF SEARCH ────────────────────────────────────────────────────

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
          if (conflict) { avail[s.id] = { status: 'conflict', city: conflict.city, event_id: conflict.event_id, tour_name: conflict.tour_name, travel_in_date: conflict.travel_in_date, travel_out_date: conflict.travel_out_date }; continue }
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

// ── INLINE STATUS MENU ─────────────────────────────────────────────────────

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

// ── CONFIRM OVERRIDE ───────────────────────────────────────────────────────

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
            {travelInfo.travel_in_date && <><br />In: {fmtDate(travelInfo.travel_in_date)}</>}
            {travelInfo.travel_out_date && <><br />Out: {fmtDate(travelInfo.travel_out_date)}</>}
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

// ── GRID CELL ──────────────────────────────────────────────────────────────

function GridCell({ event, tourName, tourColor, tp, slotIndex, cellState, assignment, canRelock, onAssign, onRemove, onSetStatus, onUnlockHatched, onLockEmpty, isActive, activeType, initialValue, isFocused, cellRef, onActivate, onCloseActive, isSelected, onToggleSelect, onRightClick, cellColor, allBookings, onCellDragStart, onCellDragEnd, onCellDrop, onDragEnterCell, onDragLeaveCell, onDropOnLocked, isDragTarget, onConflictClick, COL_WIDTH, ROW_HEIGHT, borderRight, rowBg }) {
  const [hovered, setHovered] = useState(false)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const [assignError, setAssignError] = useState(false)
  const eventId = event.id
  const hasStaff = !!(assignment && assignment.staff_id && assignment.staff)
  const staffName = hasStaff ? staffDisplayName(assignment.staff) : null

  const secondaryCheck = (staffMember) => {
    if (!allBookings || !event?.load_in_date) return null
    const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(event.load_in_date)
    const bookings = allBookings[staffMember.id] || []
    const conflict = bookings.find(b =>
      b.event_id !== eventId &&
      ((evSat && b.saturday_date && b.saturday_date === evSat) ||
       (evSun && b.sunday_date && b.sunday_date === evSun))
    )
    if (conflict) return { status: 'conflict', city: conflict.city, event_id: conflict.event_id, tour_name: conflict.tour_name, travel_in_date: conflict.travel_in_date, travel_out_date: conflict.travel_out_date }
    const sameEv = bookings.find(b => b.event_id === eventId)
    if (sameEv) return { status: 'same_event', position: sameEv.position }
    return null
  }

  const commitAssign = async (staffMember, removeFromEventId) => {
    setConfirmOverride(null)
    if (!removeFromEventId) {
      const avail = secondaryCheck(staffMember)
      if (avail) { setConfirmOverride({ staffMember, avail, travelInfo: travelInfoFrom(avail) }); return }
    }
    const { error } = await onAssign(staffMember, removeFromEventId)
    if (error) {
      setAssignError(true)
      setTimeout(() => setAssignError(false), 1200)
      onCloseActive()
      return
    }
    setHovered(false)
    onCloseActive()
  }

  const handleAssign = (staffMember, avail) => {
    if (avail && (avail.status === 'conflict' || avail.status === 'same_event')) {
      setConfirmOverride({ staffMember, avail, travelInfo: travelInfoFrom(avail) })
      return
    }
    commitAssign(staffMember)
  }

  const handleSetStatus = async (newStatus) => {
    if (!assignment) return
    await onSetStatus(newStatus)
    onCloseActive()
  }

  const handleRemove = async () => {
    if (!assignment) return
    await onRemove()
    onCloseActive()
  }

  const nameColor = cellColor?.text || (STAFF_NAME_COLORS[assignment?.status] || 'var(--text-primary)')
  const nameWeight = STAFF_NAME_WEIGHTS[assignment?.status] || 500

  const existingConflict = (() => {
    if (!hasStaff || !allBookings || !event?.load_in_date) return null
    const { saturday_date: evSat, sunday_date: evSun } = getWeekendDates(event.load_in_date)
    return (allBookings[assignment.staff_id] || []).find(b =>
      b.event_id !== eventId &&
      ((evSat && b.saturday_date && b.saturday_date === evSat) ||
       (evSun && b.sunday_date && b.sunday_date === evSun))
    )
  })()

  // cellState: FULLY_LOCKED | HATCHED | EMPTY | FILLED (FILLED + existingConflict renders as the 4th visual state)
  const isFilled = cellState === 'FILLED'
  const isConflicted = isFilled && !!existingConflict

  const handleCellClick = (e) => {
    if (isActive) return
    if (isFilled && isConflicted) {
      e.stopPropagation()
      onConflictClick && onConflictClick(existingConflict)
      return
    }
    if (isFilled && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation()
      onToggleSelect()
      return
    }
    if (isFilled) { onActivate('menu'); return }
    if (cellState === 'HATCHED') { onUnlockHatched(); return }
    if (cellState === 'FULLY_LOCKED') return
    // EMPTY
    onActivate('edit')
  }

  const isDragOverLocked = isDragTarget && cellState === 'HATCHED'

  const stateBorder = null

  const stateBg = assignError ? 'rgba(220,38,38,0.12)'
    : cellColor?.bg
    || ((cellState === 'FULLY_LOCKED' || cellState === 'HATCHED') ? LOCKED_BG_COLOR
       : isDragOverLocked ? 'rgba(224,82,82,0.08)'
       : (isDragTarget && cellState !== 'FULLY_LOCKED' && cellState !== 'HATCHED') ? 'rgba(51,255,153,0.10)'
       : (cellState === 'EMPTY' && hovered) ? 'rgba(255,214,10,0.06)'
       : (hovered && !isActive) ? 'rgba(255,255,255,0.07)'
       : (rowBg || 'transparent'))

  const tooltip = cellState === 'FULLY_LOCKED'
    ? `This position isn't configured for ${tourName || 'this tour'}. Add it in Edit Tour.`
    : cellState === 'HATCHED' ? 'Click to unlock' : undefined

  return (
    <React.Fragment>
      <td
        ref={cellRef}
        className="sg-cell"
        title={tooltip}
        style={{
          position: 'relative', width: COL_WIDTH, minWidth: COL_WIDTH, maxWidth: COL_WIDTH, height: ROW_HEIGHT,
          padding: '0 8px', cursor: isActive ? 'default' : (cellState === 'FULLY_LOCKED' ? 'default' : 'pointer'),
          backgroundColor: stateBg,
          backgroundImage: (cellState === 'FULLY_LOCKED' || cellState === 'HATCHED') ? LOCKED_STRIPE : 'none',
          backgroundPosition: '0 0',
          textAlign: 'center', verticalAlign: 'middle',
          boxSizing: 'border-box',
          borderTop: stateBorder || undefined,
          borderLeft: stateBorder || undefined,
          borderRight: stateBorder || borderRight,
          borderBottom: stateBorder || '1px solid var(--border-card)',
          boxShadow: assignError ? 'inset 0 0 0 1px #dc2626'
            : isDragOverLocked ? 'inset 0 0 0 1.5px #e05252'
            : (isDragTarget && cellState !== 'FULLY_LOCKED' && cellState !== 'HATCHED') ? 'inset 0 0 0 1.5px #33FF99'
            : (isFocused && !isActive) ? 'inset 0 0 0 1.5px rgba(255,255,255,0.4)'
            : cellState === 'EMPTY' ? 'inset 0 0 0 1px rgba(255, 214, 10, 0.65)'
            : 'none',
          zIndex: isActive ? 300 : (isFocused ? 5 : 1),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); onDragLeaveCell && onDragLeaveCell() }}
        onClick={handleCellClick}
        onContextMenu={staffName ? (e) => { e.preventDefault(); onRightClick(e.clientX, e.clientY) } : undefined}
        onDragOver={e => {
          if (cellState === 'FULLY_LOCKED') return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDragEnterCell && onDragEnterCell()
        }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { onDragLeaveCell && onDragLeaveCell() } }}
        onDrop={e => {
          e.preventDefault()
          if (cellState === 'FULLY_LOCKED') return
          if (cellState === 'HATCHED') { onDropOnLocked && onDropOnLocked() }
          else { onCellDrop && onCellDrop() }
        }}>

        {isActive && activeType === 'edit' ? (
          <InlineStaffSearch eventId={eventId} event={event} initialValue={initialValue} onAssign={handleAssign} onClose={onCloseActive} allBookings={allBookings} />

        ) : isFilled ? (
          <React.Fragment>
            <span
              draggable={!isActive}
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onCellDragStart && onCellDragStart() }}
              onDragEnd={() => { onCellDragEnd && onCellDragEnd() }}
              style={{ display: 'block', width: '100%', fontSize: 13, fontWeight: nameWeight, letterSpacing: '0.01em', color: nameColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', opacity: hovered && !isActive ? 0.75 : 1, transition: 'opacity 0.15s ease', cursor: 'grab' }}>{staffName}</span>
            <div
              onClick={e => { e.stopPropagation(); onToggleSelect() }}
              style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (hovered || isSelected) ? 1 : 0, transition: 'opacity 0.15s ease', cursor: 'pointer', zIndex: 2 }}
            >
              {isSelected ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#33FF99"/><path d="M7 12l3 3 7-7" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="1.5"/></svg>
              )}
            </div>
          </React.Fragment>

        ) : (cellState === 'FULLY_LOCKED' || cellState === 'HATCHED') ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered && cellState === 'HATCHED' ? 1 : 0.55, transition: 'opacity 0.15s' }}>
            <LockIcon locked={true} size={16} color={hovered && cellState === 'HATCHED' ? '#33FF99' : '#64748b'} />
          </div>

        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: hovered ? 1 : 0.7, transition: 'opacity 0.15s ease' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none', flexShrink: 0 }}>
              <path d="M13.879 3.121a3 3 0 1 1 4.243 4.243l-9 9a2 2 0 0 1-.847.514l-4 1a1 1 0 0 1-1.23-1.23l1-4a2 2 0 0 1 .514-.847l9-9z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {canRelock && (
              <div onClick={e => { e.stopPropagation(); onLockEmpty() }} title="Re-lock this position" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
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
          onConfirm={() => commitAssign(confirmOverride.staffMember, confirmOverride.avail?.status === 'conflict' ? confirmOverride.avail.event_id : null)}
          onCancel={() => setConfirmOverride(null)}
        />
      )}
    </React.Fragment>
  )
}

// ── RIGHT-CLICK COLOR MENU ─────────────────────────────────────────────────

function RightClickMenu({ x, y, onSetBg, onSetText, onClose }) {
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
          <div key={c.label} onClick={() => { onSetBg(c.bg); onClose() }} title={c.label}
            style={{ width: 20, height: 20, borderRadius: 5, background: c.bg || 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.20)', cursor: 'pointer', flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ padding: '7px 12px', fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>Text Color</div>
      <div style={{ display: 'flex', gap: 7, padding: '9px 12px', flexWrap: 'wrap' }}>
        {CELL_COLOR_SWATCHES.map(c => (
          <div key={c.label} onClick={() => { onSetText(c.text); onClose() }} title={c.label}
            style={{ width: 20, height: 20, borderRadius: 5, background: c.text || 'rgba(255,255,255,0.15)', border: '1.5px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
        ))}
      </div>
    </div>
  )
}

// ── COPY TO EVENTS MODAL ───────────────────────────────────────────────────

function CheckboxIcon({ isChecked }) {
  return (
    <div style={{ width: 16, height: 16, flexShrink: 0, border: '1.5px solid ' + (isChecked ? '#33FF99' : 'rgba(255,255,255,0.3)'), borderRadius: 4, background: isChecked ? '#33FF99' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isChecked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function CopyToEventsModal({ selectedCells, tpByPosTour, allEvents, tours, sourceEventId, tourId, onClose, onRefreshGrid }) {
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

  const handleCopy = async () => {
    if (checked.length === 0) return
    setCopying(true)
    const supabase = getSupabase()
    const rows = selectedCells.filter(c => c.staffId)
    for (const evId of checked) {
      const targetEvent = allEvents.find(e => e.id === evId)
      if (!targetEvent) continue
      for (const c of rows) {
        const targetTp = tpByPosTour[c.positionId]?.[targetEvent.tour_id]
        if (!targetTp) continue
        try {
          const { data: existing } = await supabase.from('staff_assignments')
            .select('id').eq('tour_position_id', targetTp.id).eq('slot_index', c.slotIndex).eq('event_id', evId).limit(1)
          if (existing && existing.length > 0) {
            const { error } = await supabase.from('staff_assignments')
              .update({ staff_id: c.staffId, status: 'confirmed', confirmed: true }).eq('id', existing[0].id)
            if (error) console.error('[copy] update error:', error)
          } else {
            const { error } = await supabase.from('staff_assignments')
              .insert([{ tour_position_id: targetTp.id, slot_index: c.slotIndex, event_id: evId, staff_id: c.staffId, status: 'confirmed', confirmed: true }])
            if (error) console.error('[copy] insert error:', error)
          }
        } catch (err) {
          console.error('[copy] error for', c.positionTitle, err)
        }
      }
    }
    setDone({ staffCount: rows.length, evCount: checked.length })
    setCopying(false)
    if (onRefreshGrid) onRefreshGrid()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1f3a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '24px 0', width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 64px rgba(0,0,0,0.7)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', height: 36, borderTop: '0.5px solid rgba(255,255,255,0.08)', borderBottom: '0.5px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              <div onClick={toggleAll} style={{ cursor: 'pointer' }}>
                <CheckboxIcon isChecked={allChecked} />
              </div>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 130 }}>Dates</span>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>City</span>
              <span style={{ fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 140, textAlign: 'right' }}>Tour</span>
            </div>
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

// ── BULK ACTION BAR ────────────────────────────────────────────────────────

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

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function StaffingGrid({ tourId, year, showPastEvents = false }) {
  const router = useRouter()
  const effectiveYear = year || new Date().getFullYear()

  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [tourPositions, setTourPositions] = useState([])
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsedDepts, setCollapsedDepts] = useState({})
  const [activeCell, setActiveCell] = useState(null) // { positionId, slotIndex, eventId, type: 'edit'|'menu', initialValue? } | null
  const [focusedCell, setFocusedCell] = useState(null) // { positionId, slotIndex, eventId } | null
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [cellColors, setCellColors] = useState({})
  const [rightClickMenu, setRightClickMenu] = useState(null)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [draggedCell, setDraggedCell] = useState(null)
  const [dragOverCell, setDragOverCell] = useState(null)
  const [dragConflict, setDragConflict] = useState(null)
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

  const B_HDR_INNER = '1px solid var(--border-card)'
  const B_HDR_WEEKEND = '2px solid var(--border-card)'
  const B_BODY_INNER = '1px solid var(--border-card)'
  const B_BODY_WEEKEND = '2px solid var(--border-card)'
  const B_LEFT_COL = '1px solid var(--border-card)'
  const B_DEPT_TOP = '1px solid var(--border-card)'
  const HDR_BG = '#0d1f3c'
  const DEPT_BG = '#0d1f3c'
  const BODY_DEPT_BG = '#0f172a'

  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = getSupabase()
      const today = toYMD(new Date())

      let tpQuery = supabase.from('tour_positions').select('id, tour_id, position_id, quantity_needed')
      if (tourId) tpQuery = tpQuery.eq('tour_id', tourId)

      let eventsQuery = supabase.from('events')
        .select('id, city, state, country, venue_name, load_in_date, load_out_date, tour_id, status')
        .order('load_in_date', { ascending: true })
      if (tourId) {
        eventsQuery = eventsQuery.eq('tour_id', tourId)
      } else {
        eventsQuery = eventsQuery
          .gte('load_in_date', `${effectiveYear}-01-01`)
          .lte('load_in_date', `${effectiveYear}-12-31`)
        if (!showPastEvents) eventsQuery = eventsQuery.gte('load_in_date', today)
      }

      const [deptRes, posRes, tpRes, toursRes, eventsRes] = await Promise.all([
        supabase.from('departments').select('id, name, sort_order').order('sort_order', { ascending: true }),
        supabase.from('positions').select('id, title, sort_order, department_id').order('sort_order', { ascending: true }),
        tpQuery,
        supabase.from('tours').select('id, name, color, status').order('name', { ascending: true }),
        eventsQuery,
      ])

      setDepartments(deptRes.data || [])
      setPositions(posRes.data || [])
      setTourPositions(tpRes.data || [])
      setTours(toursRes.data || [])
      setEvents(eventsRes.data || [])

      const tpIds = (tpRes.data || []).map(tp => tp.id)
      if (tpIds.length === 0) {
        setAssignments([])
        setLoading(false)
        return
      }

      const { data: assignmentsData } = await supabase
        .from('staff_assignments')
        .select(`
          id,
          tour_position_id,
          slot_index,
          staff_id,
          event_id,
          status,
          confirmed,
          notes,
          travel_in_date,
          travel_out_date,
          staff:staff(id, first_name, last_name, display_name)
        `)
        .in('tour_position_id', tpIds)

      setAssignments(assignmentsData || [])
      setLoading(false)
    }
    fetchAll()
  }, [tourId, effectiveYear, showPastEvents, reloadKey])

  // ── DERIVED LOOKUP MAPS ─────────────────────────────────────────────────

  const departmentsSorted = useMemo(() => [...departments].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [departments])
  const positionsById = useMemo(() => Object.fromEntries(positions.map(p => [p.id, p])), [positions])
  const toursById = useMemo(() => Object.fromEntries(tours.map(t => [t.id, t])), [tours])
  const eventsById = useMemo(() => Object.fromEntries(events.map(e => [e.id, e])), [events])
  const tourPositionsById = useMemo(() => Object.fromEntries(tourPositions.map(tp => [tp.id, tp])), [tourPositions])

  const tpByPosTour = useMemo(() => {
    const m = {}
    for (const tp of tourPositions) {
      if (!m[tp.position_id]) m[tp.position_id] = {}
      m[tp.position_id][tp.tour_id] = tp
    }
    return m
  }, [tourPositions])

  const assignmentIndex = useMemo(() => {
    const m = {}
    for (const a of assignments) {
      m[a.tour_position_id + '__' + a.slot_index + '__' + (a.event_id || 'default')] = a
    }
    return m
  }, [assignments])

  const resolveAssignment = (tpId, slotIndex, eventId) =>
    assignmentIndex[tpId + '__' + slotIndex + '__' + eventId] || assignmentIndex[tpId + '__' + slotIndex + '__default'] || null

  const maxSlotsForPosition = (position) => {
    if (tourId) {
      const tp = tpByPosTour[position.id]?.[tourId]
      return tp ? tp.quantity_needed : 0
    }
    let max = 0
    for (const tp of tourPositions) { if (tp.position_id === position.id) max = Math.max(max, tp.quantity_needed) }
    return max
  }

  const departmentsWithRows = useMemo(() => {
    return departmentsSorted.map(dept => {
      const deptPositions = positions.filter(p => p.department_id === dept.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const rows = []
      deptPositions.forEach(pos => {
        const max = maxSlotsForPosition(pos)
        for (let i = 1; i <= max; i++) rows.push({ position: pos, slotIndex: i })
      })
      return { ...dept, rows }
    }).filter(d => d.rows.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsSorted, positions, tourPositions, tourId])

  const getCellInfo = (position, slotIndex, event) => {
    const tp = tpByPosTour[position.id]?.[event.tour_id]
    if (!tp) return { state: 'FULLY_LOCKED', tp: null, assignment: null, canRelock: false }
    const withinCapacity = slotIndex <= tp.quantity_needed
    const eventRow = assignmentIndex[tp.id + '__' + slotIndex + '__' + event.id] || null
    if (!withinCapacity && !eventRow) return { state: 'HATCHED', tp, assignment: null, canRelock: false }
    const assignment = eventRow || (withinCapacity ? (assignmentIndex[tp.id + '__' + slotIndex + '__default'] || null) : null)
    if (assignment && assignment.staff_id) return { state: 'FILLED', tp, assignment, canRelock: false }
    return { state: 'EMPTY', tp, assignment, canRelock: !withinCapacity && !!eventRow }
  }

  // Weekend grouping across event columns
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
  const cellBorderRightDark = (ev, i) => {
    if (i === orderedEvents.length - 1) return B_HDR_INNER
    return isLastInGroup(ev) ? B_HDR_WEEKEND : B_HDR_INNER
  }
  const cellBorderRight = (ev, i) => {
    if (i === orderedEvents.length - 1) return B_BODY_INNER
    return isLastInGroup(ev) ? B_BODY_WEEKEND : B_BODY_INNER
  }

  // staff_id -> [{ event_id, city, load_in_date, load_out_date, saturday_date, sunday_date,
  //   tour_name, position, tour_position_id, slot_index, travel_in_date, travel_out_date }]
  const bookingsByStaff = useMemo(() => {
    const map = {}
    departmentsWithRows.forEach(dept => {
      dept.rows.forEach(({ position, slotIndex }) => {
        orderedEvents.forEach(event => {
          const info = getCellInfo(position, slotIndex, event)
          if (info.state !== 'FILLED') return
          const { assignment } = info
          const tour = toursById[event.tour_id]
          const { saturday_date, sunday_date } = getWeekendDates(event.load_in_date)
          const list = map[assignment.staff_id] || (map[assignment.staff_id] = [])
          list.push({
            event_id: event.id,
            city: event.city,
            load_in_date: event.load_in_date,
            load_out_date: event.load_out_date,
            saturday_date, sunday_date,
            tour_name: tour?.name,
            position: position.title,
            tour_position_id: info.tp.id,
            slot_index: slotIndex,
            travel_in_date: assignment.travel_in_date,
            travel_out_date: assignment.travel_out_date,
          })
        })
      })
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentsWithRows, orderedEvents, tpByPosTour, assignmentIndex, toursById])

  const cellKey = (tpId, slotIndex, eventId) => tpId + '__' + slotIndex + '__' + eventId

  // ── WRITE OPERATIONS ─────────────────────────────────────────────────────

  const clearAssignment = async (tp, slotIndex, event, resolvedAssignment) => {
    if (!resolvedAssignment) return
    const supabase = getSupabase()
    if (resolvedAssignment.event_id === event.id) {
      await supabase.from('staff_assignments').delete().eq('id', resolvedAssignment.id)
      setAssignments(prev => prev.filter(a => a.id !== resolvedAssignment.id))
    } else {
      const { data, error } = await supabase.from('staff_assignments')
        .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: null, event_id: event.id, status: 'pending', confirmed: false }])
        .select().single()
      if (!error && data) setAssignments(prev => [...prev, data])
    }
  }

  const doAssign = async (tp, slotIndex, event, staffMember, removeFromEventId) => {
    const supabase = getSupabase()

    if (removeFromEventId) {
      const otherBookings = (bookingsByStaff[staffMember.id] || []).filter(b => b.event_id === removeFromEventId)
      for (const b of otherBookings) {
        const otherTp = tourPositionsById[b.tour_position_id]
        const otherEvent = eventsById[b.event_id]
        const resolved = resolveAssignment(b.tour_position_id, b.slot_index, b.event_id)
        if (otherTp && otherEvent && resolved) await clearAssignment(otherTp, b.slot_index, otherEvent, resolved)
      }
    }

    const existingEventRow = assignments.find(a => a.tour_position_id === tp.id && a.slot_index === slotIndex && a.event_id === event.id)
    if (existingEventRow) {
      const { error } = await supabase.from('staff_assignments')
        .update({ staff_id: staffMember.id, status: 'pending', confirmed: false }).eq('id', existingEventRow.id)
      if (error) return { error }
      setAssignments(prev => prev.map(a => a.id === existingEventRow.id ? { ...a, staff_id: staffMember.id, status: 'pending', confirmed: false, staff: staffMember } : a))
      return { error: null }
    }

    const { data, error } = await supabase.from('staff_assignments')
      .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: staffMember.id, event_id: event.id, status: 'pending', confirmed: false }])
      .select('id, tour_position_id, slot_index, staff_id, event_id, status, confirmed, notes, travel_in_date, travel_out_date')
      .single()
    if (error) return { error }
    setAssignments(prev => [...prev, { ...data, staff: staffMember }])
    return { error: null }
  }

  const applyStatusChange = async (tp, slotIndex, event, resolvedAssignment, status) => {
    if (!resolvedAssignment) return
    const supabase = getSupabase()
    const confirmed = status === 'confirmed'
    if (resolvedAssignment.event_id === event.id) {
      await supabase.from('staff_assignments').update({ status, confirmed }).eq('id', resolvedAssignment.id)
      setAssignments(prev => prev.map(a => a.id === resolvedAssignment.id ? { ...a, status, confirmed } : a))
    } else {
      const { data, error } = await supabase.from('staff_assignments')
        .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: resolvedAssignment.staff_id, event_id: event.id, status, confirmed }])
        .select().single()
      if (!error && data) setAssignments(prev => [...prev, { ...data, staff: resolvedAssignment.staff }])
    }
  }

  const handleUnlockHatched = async (tp, slotIndex, event) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('staff_assignments')
      .insert([{ tour_position_id: tp.id, slot_index: slotIndex, staff_id: null, event_id: event.id, status: 'pending', confirmed: false }])
      .select().single()
    if (!error && data) {
      setAssignments(prev => [...prev, data])
      setActiveCell({ positionId: tp.position_id, slotIndex, eventId: event.id, type: 'edit', initialValue: '' })
    }
  }

  const doMoveStaff = async (source, target) => {
    await clearAssignment(source.tp, source.slotIndex, source.event, source.assignment)
    await doAssign(target.tp, target.slotIndex, target.event, source.assignment.staff)
  }

  const handleBulkStatus = async (status) => {
    if (selectedKeys.size === 0) return
    for (const key of selectedKeys) {
      const [tpId, slotIndexStr, eventId] = key.split('__')
      const tp = tourPositionsById[tpId]
      const event = eventsById[eventId]
      const slotIndex = Number(slotIndexStr)
      const resolved = resolveAssignment(tpId, slotIndex, eventId)
      if (tp && event && resolved) await applyStatusChange(tp, slotIndex, event, resolved, status)
    }
    setSelectedKeys(new Set())
  }

  const toggleSelectKey = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleDept = (deptId) => setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }))

  const handleSetCellBg = (key, bg) => setCellColors(prev => ({ ...prev, [key]: { ...prev[key], bg } }))
  const handleSetCellText = (key, text) => setCellColors(prev => ({ ...prev, [key]: { ...prev[key], text } }))

  // ── DRAG & DROP ───────────────────────────────────────────────────────────

  const handleCellDragStart = (tp, slotIndex, event, assignment) => setDraggedCell({ tp, slotIndex, event, assignment })
  const handleCellDragEnd = () => { setDraggedCell(null); setDragOverCell(null) }
  const handleCellDragEnter = (tp, slotIndex, event) => setDragOverCell({ tpId: tp.id, slotIndex, eventId: event.id })
  const handleCellDragLeave = () => setDragOverCell(null)

  const handleDropOnLocked = (tp, slotIndex, event) => {
    if (!draggedCell) return
    if (draggedCell.event.id !== event.id) { setDraggedCell(null); setDragOverCell(null); return }
    setDragLockedModal({ tp, slotIndex, event, draggedCell })
    setDraggedCell(null)
    setDragOverCell(null)
  }

  const handleCellDrop = (tp, slotIndex, event) => {
    if (!draggedCell) return
    if (draggedCell.event.id !== event.id) { setDraggedCell(null); setDragOverCell(null); return }
    if (draggedCell.tp.id === tp.id && draggedCell.slotIndex === slotIndex) { setDraggedCell(null); return }
    const targetInfo = getCellInfo(positionsById[tp.position_id], slotIndex, event)
    if (targetInfo.assignment && targetInfo.assignment.staff_id) {
      setDragConflict({ source: draggedCell, target: { tp, slotIndex, event, assignment: targetInfo.assignment } })
      setDraggedCell(null)
      return
    }
    doMoveStaff(draggedCell, { tp, slotIndex, event })
    setDraggedCell(null)
  }

  // ── CONFLICT MODAL ───────────────────────────────────────────────────────

  const handleConflictClick = (tp, slotIndex, event, assignment, conflictBooking) => {
    const currentTour = toursById[event.tour_id]
    setConflictModal({
      staffId: assignment.staff_id,
      staffName: staffDisplayName(assignment.staff),
      current: {
        tp, slotIndex, event, eventId: event.id,
        city: event.city, tourName: currentTour?.name,
        weekendLabel: fmtWeekend(getWeekendGroup(event.load_in_date)),
        position: positionsById[tp.position_id]?.title,
        travel_in_date: assignment.travel_in_date, travel_out_date: assignment.travel_out_date,
      },
      conflict: {
        tourPositionId: conflictBooking.tour_position_id, slotIndex: conflictBooking.slot_index, eventId: conflictBooking.event_id,
        city: conflictBooking.city, tourName: conflictBooking.tour_name,
        weekendLabel: fmtWeekend(getWeekendGroup(conflictBooking.load_in_date)),
        position: conflictBooking.position,
        travel_in_date: conflictBooking.travel_in_date, travel_out_date: conflictBooking.travel_out_date,
      },
    })
  }

  const handleKeepHere = async (side) => {
    if (side === 'current') {
      const c = conflictModal.conflict
      const tp = tourPositionsById[c.tourPositionId]
      const event = eventsById[c.eventId]
      const resolved = resolveAssignment(c.tourPositionId, c.slotIndex, c.eventId)
      if (tp && event && resolved) await clearAssignment(tp, c.slotIndex, event, resolved)
    } else {
      const c = conflictModal.current
      const resolved = resolveAssignment(c.tp.id, c.slotIndex, c.eventId)
      if (resolved) await clearAssignment(c.tp, c.slotIndex, c.event, resolved)
    }
    setConflictModal(null)
  }

  // ── KEYBOARD NAV ──────────────────────────────────────────────────────────

  const visiblePositionRows = departmentsWithRows.flatMap(dept => collapsedDepts[dept.id] ? [] : dept.rows.map(r => ({ ...r, deptId: dept.id })))

  useEffect(() => {
    if (!activeCell) return
    const handleMouseDown = (e) => {
      if (activeCellElRef.current && !activeCellElRef.current.contains(e.target)) {
        setActiveCell(null)
        setFocusedCell(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [activeCell])

  useEffect(() => {
    const moveFocus = (dCol, dRow) => {
      if (!focusedCell || !orderedEvents.length || !visiblePositionRows.length) return
      const colIdx = orderedEvents.findIndex(e => e.id === focusedCell.eventId)
      const rowIdx = visiblePositionRows.findIndex(r => r.position.id === focusedCell.positionId && r.slotIndex === focusedCell.slotIndex)
      if (colIdx === -1 || rowIdx === -1) return
      const nextCol = Math.min(Math.max(colIdx + dCol, 0), orderedEvents.length - 1)
      const nextRow = Math.min(Math.max(rowIdx + dRow, 0), visiblePositionRows.length - 1)
      setFocusedCell({ eventId: orderedEvents[nextCol].id, positionId: visiblePositionRows[nextRow].position.id, slotIndex: visiblePositionRows[nextRow].slotIndex })
    }
    const openFocused = (initialValue) => {
      const row = visiblePositionRows.find(r => r.position.id === focusedCell.positionId && r.slotIndex === focusedCell.slotIndex)
      const ev = orderedEvents.find(e2 => e2.id === focusedCell.eventId)
      if (!row || !ev) return
      const info = getCellInfo(row.position, row.slotIndex, ev)
      if (info.state === 'FULLY_LOCKED' || info.state === 'HATCHED') return
      setActiveCell({ positionId: row.position.id, slotIndex: row.slotIndex, eventId: ev.id, type: info.state === 'FILLED' ? 'menu' : 'edit', initialValue: initialValue || '' })
    }
    const handleKeyDown = (e) => {
      if (!focusedCell) return

      if (activeCell) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setActiveCell(null)
          setSelectedKeys(new Set())
        }
        return
      }

      if (e.key === 'Escape' && selectedKeys.size > 0) {
        e.preventDefault()
        setSelectedKeys(new Set())
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
        case 'Enter':
          e.preventDefault()
          openFocused('')
          break
        default:
          if (/^[a-zA-Z0-9]$/.test(e.key)) {
            e.preventDefault()
            openFocused(e.key)
          }
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCell, focusedCell, orderedEvents, visiblePositionRows, assignmentIndex, tpByPosTour, selectedKeys])

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading staffing grid...</div>
  }

  if (tourId && tourPositions.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>No positions configured for this tour.</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set up staffing in Edit Tour → Tour Staffing.</div>
        <button className="btn-primary" onClick={() => router.push(`/tours/${tourId}/edit`)}>Go to Edit Tour</button>
      </div>
    )
  }

  if (departments.length === 0 || positions.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>No positions configured.</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set up departments and positions in Staffing Settings.</div>
        <button className="btn-primary" onClick={() => router.push('/staff/settings')}>Go to Staffing Settings</button>
      </div>
    )
  }

  const deptAccentColor = tourId ? (toursById[tourId]?.color || '#FFD60A') : '#FFD60A'
  const deptHeaderBg = tourId && toursById[tourId]?.color ? hexToRgba(toursById[tourId].color, 1) : BODY_DEPT_BG
  const deptHeaderTextColor = tourId && toursById[tourId]?.color ? '#ffffff' : deptAccentColor

  const TOP_WEEKEND = 0
  const TOP_TOUR = H1
  const TOP_CITY = tourId ? H1 : H1 + H2
  const TOP_STATUS = TOP_CITY + H3
  const TOP_VENUE = TOP_STATUS + H4
  const TOTAL_HDR = TOP_VENUE + H5

  const selectedCellsForCopy = Array.from(selectedKeys).map(key => {
    const [tpId, slotIndexStr, eventId] = key.split('__')
    const slotIndex = Number(slotIndexStr)
    const tp = tourPositionsById[tpId]
    const resolved = resolveAssignment(tpId, slotIndex, eventId)
    return { positionId: tp?.position_id, slotIndex, staffId: resolved?.staff_id || null }
  }).filter(c => c.staffId && c.positionId)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {selectedKeys.size > 0 && (
        <BulkActionBar count={selectedKeys.size} onSetStatus={handleBulkStatus} onCopyToEvents={() => setCopyModalOpen(true)} onClear={() => setSelectedKeys(new Set())} />
      )}
      {orderedEvents.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No events yet</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add events to see them in the staffing grid</div>
        </div>
      ) : (
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', overflow: 'auto', transform: 'translateZ(0)', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', minWidth: 'max-content' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H1, background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }} />
                  {weekendGroups.map((wk, wi) => {
                    const wkEvs = weekendMap[wk]
                    return (
                      <th key={wk} colSpan={wkEvs.length} style={{ position: 'sticky', top: 0, zIndex: 30, height: H1, background: 'var(--bg)', borderBottom: B_HDR_INNER, borderRight: wi < weekendGroups.length - 1 ? B_HDR_WEEKEND : B_HDR_INNER, textAlign: 'center', fontWeight: 400, padding: '6px 0' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Weekend</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.01em', marginTop: 2 }}>{fmtWeekend(wk)}</div>
                      </th>
                    )
                  })}
                </tr>
                {!tourId && (
                  <tr>
                    <th style={{ position: 'sticky', top: TOP_TOUR, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H2, background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tour</span>
                    </th>
                    {orderedEvents.map((ev, i) => {
                      const color = toursById[ev.tour_id]?.color || '#33FF99'
                      return (
                        <th key={ev.id} style={{ position: 'sticky', top: TOP_TOUR, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H2, background: 'var(--bg-card)', borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toursById[ev.tour_id]?.name || '—'}</span>
                        </th>
                      )
                    })}
                  </tr>
                )}
                <tr>
                  <th style={{ position: 'sticky', top: TOP_CITY, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H3, background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>City</span>
                  </th>
                  {orderedEvents.map((ev, i) => (
                    <th key={ev.id} style={{ position: 'sticky', top: TOP_CITY, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H3, background: 'var(--bg)', borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                      <span
                        onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
                        style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.01em', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.textDecoration = 'none' }}>
                        {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{ position: 'sticky', top: TOP_STATUS, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H4, background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_HDR_INNER, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
                  </th>
                  {orderedEvents.map((ev, i) => {
                    const st = EVENT_STATUS_STYLES[ev.status]
                    return (
                      <th key={ev.id} style={{ position: 'sticky', top: TOP_STATUS, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H4, background: 'var(--bg)', borderBottom: B_HDR_INNER, borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400 }}>
                        {st ? (
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, border: '1px solid ' + st.border, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  <th style={{ position: 'sticky', top: TOP_VENUE, left: 0, zIndex: 50, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: H5, background: 'var(--bg)', borderRight: B_LEFT_COL, padding: '0 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Venue</span>
                  </th>
                  {orderedEvents.map((ev, i) => (
                    <th key={ev.id} style={{ position: 'sticky', top: TOP_VENUE, zIndex: 30, width: COL_WIDTH, minWidth: COL_WIDTH, height: H5, background: 'var(--bg)', borderRight: cellBorderRightDark(ev, i), padding: '0 6px', textAlign: 'center', fontWeight: 400, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ color: ev.venue_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>{ev.venue_name || '—'}</span>
                    </th>
                  ))}
                </tr>
                <tr style={{ height: 3, padding: 0, margin: 0 }}>
                  <td
                    className="sg-cell"
                    colSpan={orderedEvents.length + 1}
                    style={{
                      height: 3,
                      padding: 0,
                      background: deptAccentColor,
                      position: 'sticky',
                      top: TOP_VENUE + H5,
                      zIndex: 51,
                      border: 'none',
                    }}
                  />
                </tr>
              </thead>

              <tbody>
                {departmentsWithRows.map(dept => {
                  const collapsed = collapsedDepts[dept.id]
                  return (
                    <React.Fragment key={dept.id}>
                      <tr>
                        <td
                          className="sg-dept-header"
                          onClick={() => toggleDept(dept.id)}
                          style={{ position: 'sticky', left: 0, zIndex: 20, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: DEPT_H, padding: '0 14px', cursor: 'pointer', userSelect: 'none', background: deptHeaderBg, color: deptHeaderTextColor, borderTop: '1px solid ' + deptHeaderBg, borderBottom: '1px solid ' + deptHeaderBg }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = deptHeaderBg }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="sg-dept-header" style={{ fontSize: 9, color: deptHeaderTextColor }}>{collapsed ? '▸' : '▾'}</span>
                            <span className="sg-dept-header" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: deptHeaderTextColor, whiteSpace: 'nowrap' }}>{dept.name}</span>
                          </div>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: deptAccentColor }} />
                        </td>
                        {orderedEvents.map((ev, i) => (
                          <td key={ev.id} className="sg-dept-header" style={{ height: DEPT_H, background: deptHeaderBg, color: deptHeaderTextColor, borderTop: '1px solid ' + deptHeaderBg, borderBottom: '1px solid ' + deptHeaderBg }} />
                        ))}
                      </tr>
                      {!collapsed && dept.rows.map(({ position, slotIndex }, rowIndex) => {
                        const rowStripeBg = rowIndex % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)'
                        return (
                        <tr key={position.id + '__' + slotIndex}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 10, width: LEFT_WIDTH, minWidth: LEFT_WIDTH, height: ROW_HEIGHT, padding: '0 10px 0 6px', background: 'var(--bg)', borderRight: B_LEFT_COL, borderBottom: B_BODY_INNER, fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{position.title}</span>
                          </td>
                          {orderedEvents.map((ev, i) => {
                            const info = getCellInfo(position, slotIndex, ev)
                            const tp = info.tp
                            const key = tp ? cellKey(tp.id, slotIndex, ev.id) : null
                            const isActiveCell = !!activeCell && activeCell.positionId === position.id && activeCell.slotIndex === slotIndex && activeCell.eventId === ev.id
                            const isFocusedCell = !!focusedCell && focusedCell.positionId === position.id && focusedCell.slotIndex === slotIndex && focusedCell.eventId === ev.id
                            const isDragTargetCell = !!(draggedCell && dragOverCell && tp && dragOverCell.tpId === tp.id && dragOverCell.slotIndex === slotIndex && dragOverCell.eventId === ev.id)
                            const isSelectedCell = key ? selectedKeys.has(key) : false
                            return (
                              <GridCell
                                key={ev.id}
                                event={ev}
                                tourName={toursById[ev.tour_id]?.name}
                                tourColor={toursById[ev.tour_id]?.color}
                                tp={tp}
                                slotIndex={slotIndex}
                                cellState={info.state}
                                assignment={info.assignment}
                                canRelock={info.canRelock}
                                onAssign={(staffMember, removeFromEventId) => doAssign(tp, slotIndex, ev, staffMember, removeFromEventId)}
                                onRemove={() => clearAssignment(tp, slotIndex, ev, info.assignment)}
                                onSetStatus={(status) => applyStatusChange(tp, slotIndex, ev, info.assignment, status)}
                                onUnlockHatched={() => handleUnlockHatched(tp, slotIndex, ev)}
                                onLockEmpty={() => clearAssignment(tp, slotIndex, ev, info.assignment)}
                                isActive={isActiveCell}
                                activeType={isActiveCell ? activeCell.type : null}
                                initialValue={isActiveCell ? activeCell.initialValue : undefined}
                                isFocused={isFocusedCell}
                                cellRef={isActiveCell ? activeCellElRef : null}
                                onActivate={(type) => {
                                  setFocusedCell({ positionId: position.id, slotIndex, eventId: ev.id })
                                  setActiveCell(type ? { positionId: position.id, slotIndex, eventId: ev.id, type } : null)
                                  setSelectedKeys(new Set())
                                }}
                                onCloseActive={() => setActiveCell(null)}
                                isSelected={isSelectedCell}
                                onToggleSelect={() => key && toggleSelectKey(key)}
                                onRightClick={(x, y) => key && setRightClickMenu({ x, y, key })}
                                cellColor={key ? cellColors[key] : null}
                                allBookings={bookingsByStaff}
                                onCellDragStart={() => tp && handleCellDragStart(tp, slotIndex, ev, info.assignment)}
                                onCellDragEnd={handleCellDragEnd}
                                onCellDrop={() => tp && handleCellDrop(tp, slotIndex, ev)}
                                onDragEnterCell={() => tp && handleCellDragEnter(tp, slotIndex, ev)}
                                onDragLeaveCell={handleCellDragLeave}
                                onDropOnLocked={() => tp && handleDropOnLocked(tp, slotIndex, ev)}
                                isDragTarget={isDragTargetCell}
                                onConflictClick={(conflictBooking) => tp && handleConflictClick(tp, slotIndex, ev, info.assignment, conflictBooking)}
                                COL_WIDTH={COL_WIDTH}
                                ROW_HEIGHT={ROW_HEIGHT}
                                borderRight={cellBorderRight(ev, i)}
                                rowBg={rowStripeBg}
                              />
                            )
                          })}
                        </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rightClickMenu && (
        <RightClickMenu
          x={rightClickMenu.x} y={rightClickMenu.y}
          onSetBg={(bg) => handleSetCellBg(rightClickMenu.key, bg)}
          onSetText={(text) => handleSetCellText(rightClickMenu.key, text)}
          onClose={() => setRightClickMenu(null)}
        />
      )}

      {copyModalOpen && (
        <CopyToEventsModal
          selectedCells={selectedCellsForCopy}
          tpByPosTour={tpByPosTour}
          allEvents={events}
          tours={tours}
          sourceEventId={focusedCell?.eventId}
          tourId={tourId}
          onClose={() => { setCopyModalOpen(false); setSelectedKeys(new Set()) }}
          onRefreshGrid={() => { reload(); showToast('Staff copied successfully') }}
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
              Unlock <strong style={{ color: '#f1f5f9' }}>{positionsById[dragLockedModal.tp.position_id]?.title}</strong> to assign staff here.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDragLockedModal(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Cancel</button>
              <button onClick={async () => {
                const { tp, slotIndex, event, draggedCell: dc } = dragLockedModal
                if (dc?.assignment?.staff) {
                  await doAssign(tp, slotIndex, event, dc.assignment.staff)
                  await clearAssignment(dc.tp, dc.slotIndex, dc.event, dc.assignment)
                } else {
                  await handleUnlockHatched(tp, slotIndex, event)
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
              {[{ side: 'current', ev: conflictModal.current }, { side: 'conflict', ev: conflictModal.conflict }].map(({ side, ev }) => (
                <div key={side} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ev.tourName && <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#FFD60A' }}>{ev.tourName}</div>}
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{ev.city || '—'}</div>
                  {ev.weekendLabel && <div style={{ fontSize: 12, color: '#94a3b8' }}>{ev.weekendLabel}</div>}
                  {ev.position && <div style={{ fontSize: 12, color: '#64748b' }}>{ev.position}</div>}
                  {(ev.travel_in_date || ev.travel_out_date) && (
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, paddingTop: 4, borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                      {ev.travel_in_date && <div>✈ In: {fmtDate(ev.travel_in_date)}</div>}
                      {ev.travel_out_date && <div>✈ Out: {fmtDate(ev.travel_out_date)}</div>}
                    </div>
                  )}
                  <button
                    onClick={() => handleKeepHere(side)}
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
              <button onClick={async () => { await doMoveStaff(dragConflict.source, dragConflict.target); setDragConflict(null) }}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>Move Anyway</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
