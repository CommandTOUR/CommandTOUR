'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const STATUS_STYLES = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.1)',  border: 'rgba(51,255,153,0.35)' },
  tentative:   { color: '#FF69B4', background: 'rgba(255,105,180,0.1)', border: 'rgba(255,105,180,0.35)' },
  '1-hold':    { color: '#FFCC00', background: 'rgba(255,204,0,0.1)',   border: 'rgba(255,204,0,0.35)' },
  '2-hold':    { color: '#FF8C00', background: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.35)' },
  '3-hold':    { color: '#FF3333', background: 'rgba(255,51,51,0.1)',   border: 'rgba(255,51,51,0.35)' },
  cancelled:   { color: '#888',    background: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.35)' },
  want:        { color: '#aaa',    background: 'rgba(170,170,170,0.1)', border: 'rgba(170,170,170,0.35)' },
  'date-hold': { color: '#aaa',    background: 'rgba(170,170,170,0.1)', border: 'rgba(170,170,170,0.35)' },
}

const PANEL_STATUSES = ['confirmed', 'tentative', '1-hold', '2-hold', '3-hold', 'cancelled']

const statusLabel = (s) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')

// ── TOUR ORDERING ─────────────────────────────────────────────────────────────

const TOUR_ORDER = ['HWMTL Orange', 'HWMTL Blue', 'HWSS North America', 'HWMTL Purple', 'HWMTL Yellow', 'HWSS Gold']

const COLOR_NAME_HEX = {
  orange: '#FF8C00',
  blue: '#0061FF',
  red: '#FF3333',
  purple: '#A855F7',
  yellow: '#FFCC00',
  gold: '#C9A84C',
}

function matchesTourLabel(tour, label) {
  const words = label.toLowerCase().split(' ')
  const colorWord = words.find(w => COLOR_NAME_HEX[w])
  const nameWords = colorWord ? words.filter(w => w !== colorWord) : words
  const nameLower = (tour.name || '').toLowerCase()
  if (!nameWords.every(w => nameLower.includes(w))) return false
  if (!colorWord) return true
  const tourHex = (tour.color || '').toLowerCase()
  return tourHex === COLOR_NAME_HEX[colorWord].toLowerCase() || nameLower.includes(colorWord)
}

function tourOrderIndex(tour) {
  for (let i = 0; i < TOUR_ORDER.length; i++) {
    if (matchesTourLabel(tour, TOUR_ORDER[i])) return i
  }
  return TOUR_ORDER.length
}

function tourSort(a, b) {
  const ai = tourOrderIndex(a)
  const bi = tourOrderIndex(b)
  if (ai !== bi) return ai - bi
  const at = a.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b.created_at ? new Date(b.created_at).getTime() : 0
  return at - bt
}

// ── DATE HELPERS ──────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0') }
function toYMD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

// All Saturdays that fall within the given calendar year
function getSaturdaysOfYear(year) {
  const sats = []
  const d = new Date(year, 0, 1)
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1)
  while (d.getFullYear() === year) {
    sats.push(toYMD(d))
    d.setDate(d.getDate() + 7)
  }
  return sats
}

// The Saturday that begins the show weekend for a given load-in date
function nextSaturdayOnOrAfter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  return toYMD(d)
}

// The Saturday of the weekend containing "today"
function getCurrentWeekendSaturday() {
  const d = new Date()
  const day = d.getDay()
  if (day === 0) { d.setDate(d.getDate() - 1); return toYMD(d) }
  if (day === 6) return toYMD(d)
  d.setDate(d.getDate() + (6 - day))
  return toYMD(d)
}

function fmtDay(dateStr, prefix) {
  const d = new Date(dateStr + 'T00:00:00')
  return prefix + ', ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getEventSaturday(ev) {
  if (ev.saturday_date) return ev.saturday_date
  if (ev.load_in_date) return nextSaturdayOnOrAfter(ev.load_in_date)
  return null
}

function formatCityState(ev) {
  if (!ev) return ''
  if (ev.state) return `${ev.city || ''}, ${ev.state}`
  return ev.city || ''
}

// One-time migration: link pre-existing events (booked before saturday/sunday columns
// existed) to their show weekend, based on the week of their load_in_date.
async function linkExistingEvents(supabase) {
  const { data: unlinked, error } = await supabase
    .from('events')
    .select('id, city, load_in_date, saturday_date')
    .not('load_in_date', 'is', null)
    .is('saturday_date', null)

  if (error || !unlinked || unlinked.length === 0) return []

  const updates = []
  let linked = 0
  let needsReview = 0

  for (const ev of unlinked) {
    const saturday = nextSaturdayOnOrAfter(ev.load_in_date)
    const sunday = addDays(saturday, 1)
    const diffDays = Math.round((new Date(saturday + 'T00:00:00') - new Date(ev.load_in_date + 'T00:00:00')) / 86400000)

    if (diffDays <= 7) {
      await supabase.from('events').update({ saturday_date: saturday, sunday_date: sunday }).eq('id', ev.id)
      updates.push({ id: ev.id, saturday_date: saturday, sunday_date: sunday })
      linked++
    } else {
      console.warn('Event needs manual review for weekend linking:', { id: ev.id, city: ev.city, load_in_date: ev.load_in_date })
      needsReview++
    }
  }

  console.log(`Linked ${linked} events, ${needsReview} events need manual review`)
  return updates
}

// One-time cleanup: remove show_list rows that were auto-created by the booking
// page to mirror an event's saturday_date/sunday_date. If an event's show_list
// entries all exactly match its weekend dates (nothing manual was added), delete
// them — saturday_date/sunday_date are reference dates only, not actual shows.
async function cleanupAutoCreatedShows(supabase) {
  const { data: showList, error } = await supabase
    .from('show_list')
    .select('id, event_id, show_date')

  if (error || !showList || showList.length === 0) return

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, saturday_date, sunday_date')

  if (eventsError || !events) return

  const eventById = new Map(events.map(e => [e.id, e]))
  const showsByEvent = new Map()
  for (const show of showList) {
    if (!showsByEvent.has(show.event_id)) showsByEvent.set(show.event_id, [])
    showsByEvent.get(show.event_id).push(show)
  }

  const idsToDelete = []
  for (const [eventId, shows] of showsByEvent) {
    const event = eventById.get(eventId)
    if (!event) continue
    const allMatch = shows.every(s => s.show_date === event.saturday_date || s.show_date === event.sunday_date)
    if (allMatch) idsToDelete.push(...shows.map(s => s.id))
  }

  if (idsToDelete.length > 0) {
    await supabase.from('show_list').delete().in('id', idsToDelete)
  }
  console.log(`Cleaned up ${idsToDelete.length} auto-created show entries`)
}

// ── HOLIDAYS ──────────────────────────────────────────────────────────────────

function nthWeekday(year, month, weekday, n) {
  const d = new Date(year, month, 1)
  let count = 0
  while (true) {
    if (d.getDay() === weekday) {
      count++
      if (count === n) return toYMD(d)
    }
    d.setDate(d.getDate() + 1)
  }
}

function lastWeekday(year, month, weekday) {
  const d = new Date(year, month + 1, 0)
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1)
  return toYMD(d)
}

function computeHolidays(year) {
  return {
    "New Year's Day": year + '-01-01',
    "MLK Day": nthWeekday(year, 0, 1, 3),
    "Presidents Day": nthWeekday(year, 1, 1, 3),
    "Memorial Day": lastWeekday(year, 4, 1),
    "Juneteenth": year + '-06-19',
    "Independence Day": year + '-07-04',
    "Labor Day": nthWeekday(year, 8, 1, 1),
    "Columbus Day": nthWeekday(year, 9, 1, 2),
    "Veterans Day": year + '-11-11',
    "Thanksgiving": nthWeekday(year, 10, 4, 4),
    "Christmas Day": year + '-12-25',
    "New Year's Eve": year + '-12-31',
  }
}

// Maps each holiday onto the nearest Saturday row for that year
function buildHolidayMap(year, saturdays) {
  const holidays = computeHolidays(year)
  const map = {}
  for (const [name, dateStr] of Object.entries(holidays)) {
    const target = new Date(dateStr + 'T00:00:00').getTime()
    let best = null
    let bestDiff = Infinity
    for (const sat of saturdays) {
      const diff = Math.abs(new Date(sat + 'T00:00:00').getTime() - target)
      if (diff < bestDiff) { bestDiff = diff; best = sat }
    }
    if (best) map[best] = map[best] ? map[best] + ' / ' + name : name
  }
  return map
}

// ── SHARED STYLES ─────────────────────────────────────────────────────────────

const inputStyle = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 10px',
  borderRadius: 6, border: '0.5px solid var(--glass-border)',
  background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 4, display: 'block',
}

const mintOutlineBtn = {
  fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px 14px', borderRadius: 6,
  border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer',
}

// ── INLINE VENUE SEARCH (DB-only — clicking an empty venue cell) ───────────────

function InlineVenueSearch({ venues, setVenues, onSelect, onCancel }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [mode, setMode] = useState('search') // 'search' | 'create'
  const [newVenue, setNewVenue] = useState({ name: '', city: '', state: '', country: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const blurTimeout = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => clearTimeout(blurTimeout.current)
  }, [])

  const results = query.trim()
    ? venues.filter(v =>
        v.name?.toLowerCase().includes(query.toLowerCase()) ||
        v.city?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : []

  const optionCount = results.length + 1 // + "Create New Venue"

  const handleSelect = (venue) => {
    clearTimeout(blurTimeout.current)
    onSelect(venue)
  }

  const handleOpenCreate = () => {
    clearTimeout(blurTimeout.current)
    setNewVenue({ name: query, city: '', state: '', country: '' })
    setError('')
    setMode('create')
  }

  const handleSaveNew = async () => {
    if (!newVenue.name.trim()) { setError('Venue name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { data, error } = await supabase.from('venues').insert([newVenue]).select().single()
    if (error) { setError(error.message); setSaving(false); return }
    setVenues(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    onSelect(data)
  }

  const handleKeyDown = (e) => {
    if (mode !== 'search') return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, optionCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      if (activeIndex < 0) return
      e.preventDefault()
      if (activeIndex < results.length) handleSelect(results[activeIndex])
      else handleOpenCreate()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
    }
  }

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => { onCancel() }, 150)
  }
  const handleFocus = () => clearTimeout(blurTimeout.current)

  if (mode === 'create') {
    return (
      <div onMouseDown={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, width: 280, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, padding: 10, zIndex: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mint)', marginBottom: 8 }}>New Venue</div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Venue Name *</label>
          <input autoFocus style={inputStyle} value={newVenue.name} onChange={e => setNewVenue(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={newVenue.city} onChange={e => setNewVenue(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={newVenue.state} onChange={e => setNewVenue(p => ({ ...p, state: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} value={newVenue.country} onChange={e => setNewVenue(p => ({ ...p, country: e.target.value }))} />
        </div>
        {error && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
          >Cancel</button>
          <button className="btn-primary" onClick={handleSaveNew} disabled={saving} style={{ fontSize: 12, padding: '6px 14px' }}>{saving ? 'Saving...' : 'Save & Select'}</button>
        </div>
      </div>
    )
  }

  return (
    <div onMouseDown={e => e.stopPropagation()} style={{ position: 'relative', textAlign: 'left' }}>
      <input
        ref={inputRef}
        style={inputStyle}
        placeholder="Search venue..."
        value={query}
        onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        autoComplete="off"
      />
      {query.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: 240, zIndex: 1100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {results.map((v, i) => (
            <div key={v.id}
              onMouseDown={() => handleSelect(v)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '0.5px solid var(--glass-border)', background: i === activeIndex ? 'rgba(51,255,153,0.08)' : 'transparent', color: i === activeIndex ? 'var(--mint)' : 'var(--text-primary)' }}>
              <div style={{ fontWeight: 500 }}>{v.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{[v.city, v.state].filter(Boolean).join(', ')}</div>
            </div>
          ))}
          <div
            onMouseDown={handleOpenCreate}
            onMouseEnter={() => setActiveIndex(results.length)}
            onMouseLeave={() => setActiveIndex(-1)}
            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--mint)', background: results.length === activeIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
            + Create New Venue
          </div>
        </div>
      )}
    </div>
  )
}

// ── HOLIDAY CELL (auto-populated, manually editable) ───────────────────────────

function HolidayCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)

  useEffect(() => { setText(value) }, [value])

  const commit = () => { setEditing(false); if (text !== value) onSave(text) }

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') { setText(value); setEditing(false) }
        }}
        style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', textAlign: 'center' }}
      />
    )
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 16, fontSize: 12, color: value ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'normal', wordWrap: 'break-word', overflowWrap: 'break-word', textAlign: 'center' }}>
      {value || '—'}
    </div>
  )
}

// ── PAST YEAR PILLS ────────────────────────────────────────────────────────────

function PastYearPills({ years, activeYears, onToggle, dragging, hoveredPillYear, onPillDragOver, onPillDragLeave }) {
  if (years.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
      {years.map(y => {
        const active = activeYears.has(y)
        const glow = dragging && hoveredPillYear === y
        return (
          <div key={y}
            onClick={() => onToggle(y)}
            onDragOver={dragging ? (e) => { e.preventDefault(); onPillDragOver(y) } : undefined}
            onDragLeave={dragging ? () => onPillDragLeave(y) : undefined}
            style={{
              border: `0.5px solid ${glow || active ? 'var(--mint)' : 'var(--glass-border)'}`,
              color: glow || active ? 'var(--mint)' : 'var(--text-muted)',
              background: glow ? 'rgba(51,255,153,0.1)' : 'transparent',
              borderRadius: 20, padding: '3px 14px', fontSize: 12, cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}>
            {y}
          </div>
        )
      })}
    </div>
  )
}

// ── EVENT SIDE PANEL (slide-in from the right for a filled cell) ──────────────

function EventSidePanel({ event, tour, tours, row, onClose, onSaved, onDeleted, onMoved }) {
  const router = useRouter()
  const [status, setStatus] = useState(event.status || 'tentative')
  const [loadInDate, setLoadInDate] = useState(event.load_in_date || '')
  const [bookingNote, setBookingNote] = useState(event.booking_note || '')
  const [shows, setShows] = useState([])
  const [initialShows, setInitialShows] = useState([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTourId, setMoveTourId] = useState(event.tour_id)
  const [moveSaturday, setMoveSaturday] = useState(row?.saturday || getEventSaturday(event) || '')
  const [moving, setMoving] = useState(false)
  const [visible, setVisible] = useState(false)

  const [initial] = useState({ status: event.status || 'tentative', loadInDate: event.load_in_date || '', bookingNote: event.booking_note || '' })

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const fetchShows = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('show_list').select('*').eq('event_id', event.id).order('show_date', { ascending: true }).order('show_time', { ascending: true })
      setShows(data || [])
      setInitialShows(data || [])
      setLoadingShows(false)
    }
    fetchShows()
  }, [event.id])

  const dirty = status !== initial.status
    || loadInDate !== initial.loadInDate
    || bookingNote !== initial.bookingNote
    || JSON.stringify(shows) !== JSON.stringify(initialShows)

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const handleAddShow = () => setShows(prev => [...prev, { id: null, show_date: '', show_time: '' }])
  const handleShowChange = (idx, patch) => setShows(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))

  const handleDeleteShow = async (idx) => {
    const show = shows[idx]
    if (show.id) {
      const supabase = getSupabase()
      await supabase.from('show_list').delete().eq('id', show.id)
      setInitialShows(prev => prev.filter(s => s.id !== show.id))
    }
    setShows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSaveClose = async () => {
    setSaving(true)
    const supabase = getSupabase()
    const { data: updatedEvent, error } = await supabase.from('events').update({
      status, load_in_date: loadInDate || null, booking_note: bookingNote,
    }).eq('id', event.id).select().single()

    for (const show of shows) {
      if (!show.id) {
        if (show.show_date) await supabase.from('show_list').insert([{ event_id: event.id, show_date: show.show_date, show_time: show.show_time || null }])
      } else {
        const orig = initialShows.find(s => s.id === show.id)
        if (orig && (orig.show_date !== show.show_date || orig.show_time !== show.show_time)) {
          await supabase.from('show_list').update({ show_date: show.show_date, show_time: show.show_time || null }).eq('id', show.id)
        }
      }
    }

    await supabase.from('event_notes').upsert({ event_id: event.id, content: bookingNote, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })

    setSaving(false)
    if (!error && updatedEvent) onSaved(updatedEvent)
    handleClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDeleted(event)
    setDeleting(false)
    handleClose()
  }

  const handleMove = async () => {
    setMoving(true)
    const supabase = getSupabase()
    const saturday = nextSaturdayOnOrAfter(moveSaturday)
    const sunday = addDays(saturday, 1)
    const { data, error } = await supabase.from('events').update({
      tour_id: moveTourId, saturday_date: saturday, sunday_date: sunday, load_in_date: saturday,
    }).eq('id', event.id).select().single()
    setMoving(false)
    if (!error && data) {
      onMoved(data)
      handleClose()
    }
  }

  const sortedTours = [...tours].sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))

  return createPortal(
    <div style={{
      position: 'fixed', top: 62, right: 0, width: 480, height: 'calc(100vh - 62px)',
      background: '#0d1f3a', borderLeft: '1px solid var(--glass-border)', zIndex: 200,
      transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.2s ease',
      display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{formatCityState(event)}</div>
            {event.country && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{event.country}</div>}
            {event.venue_name && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{event.venue_name}</div>}
          </div>
          <button
            onClick={() => { if (!dirty) handleClose() }}
            disabled={dirty}
            title="Close"
            style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 16, cursor: dirty ? 'default' : 'pointer', opacity: dirty ? 0.3 : 1, flexShrink: 0, lineHeight: 1 }}>
            ×
          </button>
        </div>
        {dirty && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={handleSaveClose} disabled={saving} style={{ flex: 1, fontSize: 12, padding: '8px' }}>{saving ? 'Saving...' : 'Save & Close'}</button>
            <button onClick={handleClose} style={{ flex: 1, ...mintOutlineBtn, padding: '8px' }}>Discard</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PANEL_STATUSES.map(opt => {
              const s = STATUS_STYLES[opt]
              const selected = status === opt
              return (
                <div key={opt} onClick={() => setStatus(opt)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    color: selected ? '#04140b' : s.color,
                    background: selected ? s.color : 'transparent',
                    border: `0.5px solid ${s.color}`,
                  }}>
                  {statusLabel(opt)}
                </div>
              )
            })}
          </div>
        </div>

        {/* Load-In Date */}
        <div>
          <label style={labelStyle}>Load-In Date</label>
          <input type="date" style={inputStyle} value={loadInDate || ''} onChange={e => setLoadInDate(e.target.value)} />
        </div>

        {/* Shows */}
        <div>
          <label style={labelStyle}>Shows</label>
          {loadingShows ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shows.map((s, i) => (
                <div key={s.id || 'new-' + i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" style={{ ...inputStyle, flex: 2 }} value={s.show_date || ''} onChange={e => handleShowChange(i, { show_date: e.target.value })} />
                  <input type="time" style={{ ...inputStyle, flex: 1 }} value={s.show_time || ''} onChange={e => handleShowChange(i, { show_time: e.target.value })} />
                  <div onClick={() => handleDeleteShow(i)}
                    style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>×</div>
                </div>
              ))}
              <button onClick={handleAddShow} style={mintOutlineBtn}>+ Add Show</button>
            </div>
          )}
        </div>

        {/* Booking Note */}
        <div>
          <label style={labelStyle}>Booking Note</label>
          <textarea style={{ ...inputStyle, height: 90, resize: 'vertical' }} value={bookingNote} onChange={e => setBookingNote(e.target.value)} placeholder="Booking note..." />
        </div>

        {/* Move Event */}
        <div>
          <div onClick={() => setMoveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-block', transform: moveOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>▾</span>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Move Event</span>
          </div>
          {moveOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={labelStyle}>Move to Tour</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={moveTourId} onChange={e => setMoveTourId(e.target.value)}>
                  {sortedTours.map(t => <option key={t.id} value={t.id}>{t.name} ({t.year})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Move to Weekend (Saturday)</label>
                <input type="date" style={inputStyle} value={moveSaturday} onChange={e => setMoveSaturday(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleMove} disabled={moving} style={{ fontSize: 12, padding: '8px' }}>{moving ? 'Moving...' : 'Move'}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderTop: '0.5px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => router.push(`/tours/${event.tour_id}/events/${event.id}`)} style={{ ...mintOutlineBtn, width: '100%', boxSizing: 'border-box' }}>→ Go to Event</button>
        {confirmingDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Delete this event? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmingDelete(false)} style={{ flex: 1, ...mintOutlineBtn }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px', borderRadius: 6, border: '0.5px solid rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.12)', color: '#FF6666', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '8px', border: 'none', background: 'transparent', color: '#FF6666', cursor: 'pointer' }}>Delete Event</button>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── GRID CELL (City / Venue / Status / Note for one tour x weekend) ────────────

const WEEK_W = 44
const HOLIDAY_W = 120
const SAT_W = 100
const SUN_W = 100

const CITY_W = 130
const VENUE_W = 160
const STATUS_W = 110
const NOTE_W = 60
const PLACEHOLDER_W = 180

const H1 = 40
const H2 = 34
const ROW_H = 36

const HDR_BG = '#0a1628'
const STICKY_BG = 'rgba(5,14,28,1)'
const B_INNER = '0.5px solid rgba(255,255,255,0.07)'
const B_HEADER_BOTTOM = '2px solid rgba(255,255,255,0.18)'
const B_LEFT_COL = '2px solid rgba(255,255,255,0.18)'
const B_TOUR_GROUP = '2px solid rgba(255,255,255,0.18)'

const widths = { city: CITY_W, venue: VENUE_W, status: STATUS_W, note: NOTE_W }

const leftThStyle = (left, width) => ({
  position: 'sticky', left, zIndex: 60, width, minWidth: width, height: H1 + H2,
  background: HDR_BG, padding: '0 10px', textAlign: 'center', verticalAlign: 'middle',
  fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
  borderBottom: B_HEADER_BOTTOM, borderRight: B_INNER,
})

const subHeaderStyle = (width, borderRight) => ({
  height: H2, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight,
  padding: '0 8px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em', width, minWidth: width,
})

function GridCell({
  row, tour, event, isActive, activeCellRef, isLast, rowHeight,
  venues, setVenues, onStartSearch, onSelectVenue, onCancelSearch, onOpenPanel,
  onCityDrop, dragOverKey, cellKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent,
}) {
  const router = useRouter()
  const statusStyle = event?.status ? (STATUS_STYLES[event.status] || STATUS_STYLES.tentative) : null
  const isDragOver = dragOverKey === cellKey
  const cellBase = {
    height: rowHeight, padding: '0 8px',
    borderBottom: '0.5px solid rgba(255,255,255,0.07)',
    fontSize: 12, color: 'var(--text-secondary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    verticalAlign: 'middle', textAlign: 'center', position: 'relative',
  }
  const innerBorder = '0.5px solid rgba(255,255,255,0.07)'
  const groupBorder = '2px solid rgba(255,255,255,0.18)'

  const handleVenueClick = () => {
    if (event) onOpenPanel(event, row, tour)
    else onStartSearch(row, tour)
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', String(event.id))
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.textContent = formatCityState(event)
    ghost.style.position = 'absolute'
    ghost.style.top = '-1000px'
    ghost.style.padding = '4px 10px'
    ghost.style.background = '#0d1f3a'
    ghost.style.color = '#fff'
    ghost.style.fontSize = '12px'
    ghost.style.borderRadius = '6px'
    ghost.style.border = '0.5px solid rgba(255,255,255,0.2)'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => { if (ghost.parentNode) document.body.removeChild(ghost) }, 0)
    onDragStartEvent(event, tour)
  }

  const dropHandlers = !event ? {
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
    onDragEnter: (e) => { e.preventDefault(); onDragEnterCell(cellKey) },
    onDragLeave: () => onDragLeaveCell(cellKey),
    onDrop: (e) => {
      e.preventDefault()
      onDragLeaveCell(cellKey)
      const idStr = e.dataTransfer.getData('text/plain')
      if (idStr) onCityDrop(idStr, row, tour)
    },
  } : {}

  const dropHighlight = isDragOver ? {
    outline: '1px dashed var(--mint)',
    background: 'rgba(51,255,153,0.08)',
  } : {}

  return (
    <>
      <td
        draggable={!!event}
        onDragStart={event ? handleDragStart : undefined}
        onDragEnd={event ? onDragEndEvent : undefined}
        {...dropHandlers}
        style={{
          ...cellBase, width: widths.city, minWidth: widths.city, borderRight: innerBorder,
          cursor: event ? 'grab' : 'default',
          ...dropHighlight,
        }}>
        {event ? (
          <span
            onClick={(e) => { e.stopPropagation(); router.push(`/tours/${event.tour_id}/events/${event.id}`) }}
            style={{ cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.25)', textUnderlineOffset: 3 }}>
            {formatCityState(event)}
          </span>
        ) : null}
      </td>
      <td
        ref={isActive ? activeCellRef : null}
        onClick={handleVenueClick}
        {...dropHandlers}
        style={{
          ...cellBase, width: widths.venue, minWidth: widths.venue, borderRight: innerBorder,
          cursor: 'pointer', zIndex: isActive ? 300 : 1, overflow: isActive ? 'visible' : 'hidden',
          ...dropHighlight,
        }}>
        {isActive ? (
          <InlineVenueSearch
            venues={venues} setVenues={setVenues}
            onSelect={(venue) => onSelectVenue(venue, row, tour)}
            onCancel={onCancelSearch}
          />
        ) : (event?.venue_name || '')}
      </td>
      <td style={{ ...cellBase, width: widths.status, minWidth: widths.status, borderRight: innerBorder }}>
        {statusStyle ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: statusStyle.color, background: statusStyle.background, border: `0.5px solid ${statusStyle.border}` }}>
            {statusLabel(event.status)}
          </div>
        ) : null}
      </td>
      <td style={{ ...cellBase, width: widths.note, minWidth: widths.note, borderRight: isLast ? innerBorder : groupBorder }}>
        {event?.booking_note ? (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
        ) : null}
      </td>
    </>
  )
}

// ── YEAR SECTION (collapsible grid for one calendar year) ──────────────────────

function YearSection({
  year, rows, yearTours, eventMap, collapsed, onToggleCollapse, currentWeekendSaturday,
  sectionRef, onSaveHoliday,
  activeCell, activeCellRef, venues, setVenues,
  onStartSearch, onSelectVenue, onCancelSearch, onOpenPanel,
  onCityDrop, dragOverKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent,
  draggedTour, onPlaceholderDrop,
}) {
  const showPlaceholder = !!draggedTour && !yearTours.some(t => t.id === draggedTour.id)

  return (
    <div ref={sectionRef}>
      <div onClick={onToggleCollapse}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(5,14,28,1)', borderTop: '2px solid var(--mint)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', fontSize: 12, color: 'var(--text-muted)' }}>▾</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{year}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{yearTours.length} {yearTours.length === 1 ? 'tour' : 'tours'}</span>
      </div>
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={leftThStyle(0, WEEK_W)}>Wk</th>
                <th rowSpan={2} style={leftThStyle(WEEK_W, HOLIDAY_W)}>Holiday</th>
                <th rowSpan={2} style={leftThStyle(WEEK_W + HOLIDAY_W, SAT_W)}>Sat</th>
                <th rowSpan={2} style={{ ...leftThStyle(WEEK_W + HOLIDAY_W + SAT_W, SUN_W), borderRight: B_LEFT_COL }}>Sun</th>
                {yearTours.map((tour, ti) => {
                  const tourColor = tour.color || '#C9A84C'
                  return (
                    <th key={tour.id} colSpan={4} style={{ height: H1, background: HDR_BG, borderBottom: `2px solid ${tourColor}`, borderRight: ti < yearTours.length - 1 ? B_TOUR_GROUP : (showPlaceholder ? B_TOUR_GROUP : B_INNER), textAlign: 'center', fontSize: 13, fontWeight: 600, color: tourColor }}>
                      {tour.name}
                    </th>
                  )
                })}
                {yearTours.length === 0 && !showPlaceholder && <th />}
                {showPlaceholder && (
                  <th rowSpan={2} style={{ height: H1 + H2, width: PLACEHOLDER_W, minWidth: PLACEHOLDER_W, background: 'rgba(51,255,153,0.06)', border: '1px dashed var(--mint)', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--mint)', padding: '0 8px', verticalAlign: 'middle' }}>
                    + Add {draggedTour.name} to {year}
                  </th>
                )}
              </tr>
              <tr>
                {yearTours.map((tour, ti) => {
                  const isLastTour = ti === yearTours.length - 1
                  return (
                    <React.Fragment key={tour.id}>
                      <th style={subHeaderStyle(CITY_W, B_INNER)}>City</th>
                      <th style={subHeaderStyle(VENUE_W, B_INNER)}>Venue</th>
                      <th style={subHeaderStyle(STATUS_W, B_INNER)}>Status</th>
                      <th style={subHeaderStyle(NOTE_W, isLastTour ? B_INNER : B_TOUR_GROUP)}>Note</th>
                    </React.Fragment>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isCurrentWeek = row.saturday === currentWeekendSaturday
                return (
                  <tr key={row.saturday} style={{ background: isCurrentWeek ? 'rgba(51,255,153,0.04)' : undefined }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 20, width: WEEK_W, minWidth: WEEK_W, height: ROW_H, background: STICKY_BG, borderRight: B_INNER, borderBottom: B_INNER, padding: '0 8px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', verticalAlign: 'middle' }}>
                      {row.weekNum}
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W, zIndex: 20, width: HOLIDAY_W, minWidth: HOLIDAY_W, height: ROW_H, background: STICKY_BG, borderRight: B_INNER, borderBottom: B_INNER, padding: '0 10px', verticalAlign: 'middle' }}>
                      <HolidayCell value={row.holiday} onSave={(text) => onSaveHoliday(row.saturday, text)} />
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W + HOLIDAY_W, zIndex: 20, width: SAT_W, minWidth: SAT_W, height: ROW_H, background: STICKY_BG, borderRight: B_INNER, borderBottom: B_INNER, padding: '0 10px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {fmtDay(row.saturday, 'Sat')}
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W + HOLIDAY_W + SAT_W, zIndex: 20, width: SUN_W, minWidth: SUN_W, height: ROW_H, background: STICKY_BG, borderRight: B_LEFT_COL, borderBottom: B_INNER, padding: '0 10px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {fmtDay(row.sunday, 'Sun')}
                    </td>
                    {yearTours.map((tour, ti) => {
                      const event = eventMap[tour.id + '__' + row.saturday]
                      const cellKey = row.saturday + '__' + tour.id
                      const isActive = !!(activeCell && activeCell.type === 'search' && activeCell.saturday === row.saturday && activeCell.tourId === tour.id)
                      return (
                        <GridCell
                          key={tour.id}
                          row={row} tour={tour} event={event}
                          isActive={isActive}
                          activeCellRef={activeCellRef}
                          isLast={ti === yearTours.length - 1} rowHeight={ROW_H}
                          venues={venues} setVenues={setVenues}
                          onStartSearch={onStartSearch}
                          onSelectVenue={onSelectVenue}
                          onCancelSearch={onCancelSearch}
                          onOpenPanel={onOpenPanel}
                          onCityDrop={onCityDrop}
                          dragOverKey={dragOverKey}
                          cellKey={cellKey}
                          onDragEnterCell={onDragEnterCell}
                          onDragLeaveCell={onDragLeaveCell}
                          onDragStartEvent={onDragStartEvent}
                          onDragEndEvent={onDragEndEvent}
                        />
                      )
                    })}
                    {showPlaceholder && (
                      <td
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                        onDrop={e => {
                          e.preventDefault()
                          const idStr = e.dataTransfer.getData('text/plain')
                          if (idStr) onPlaceholderDrop(idStr, row, year)
                        }}
                        style={{ height: ROW_H, width: PLACEHOLDER_W, minWidth: PLACEHOLDER_W, border: '1px dashed rgba(51,255,153,0.3)', background: 'rgba(51,255,153,0.04)', borderBottom: B_INNER }}
                      />
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [holidayOverrides, setHolidayOverrides] = useState({})

  // activeCell: { type: 'search', saturday, sunday, tourId } | { type: 'panel', event, row, tour } | null
  const [activeCell, setActiveCell] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [draggedTour, setDraggedTour] = useState(null)
  const [hoveredPillYear, setHoveredPillYear] = useState(null)

  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [activePastYears, setActivePastYears] = useState(new Set())

  const linkedEventsRef = useRef(false)
  const cleanedShowsRef = useRef(false)
  const sectionRefs = useRef({})
  const activeCellElRef = useRef(null)
  const pillHoverTimerRef = useRef(null)

  useEffect(() => {
    const fetchAll = async () => {
      const res = await fetch('/api/booking')
      const data = await res.json()
      setTours(data.tours || [])
      setEvents(data.events || [])
      setVenues(data.venues || [])
      setLoading(false)

      // One-time migration (per session): link pre-existing events to their show weekend
      if (!linkedEventsRef.current) {
        linkedEventsRef.current = true
        const supabase = getSupabase()
        const updates = await linkExistingEvents(supabase)
        if (updates.length > 0) {
          setEvents(prev => prev.map(ev => {
            const u = updates.find(x => x.id === ev.id)
            return u ? { ...ev, ...u } : ev
          }))
        }
      }

      // One-time cleanup (per session): remove show_list rows that were auto-created
      // by the booking page to mirror an event's saturday_date/sunday_date
      if (!cleanedShowsRef.current) {
        cleanedShowsRef.current = true
        const supabase = getSupabase()
        await cleanupAutoCreatedShows(supabase)
      }
    }
    fetchAll()
  }, [])

  const currentYear = new Date().getFullYear()
  const currentWeekendSaturday = getCurrentWeekendSaturday()

  // All distinct years derived from tours.year and event dates (saturday_date / load_in_date)
  const yearsSet = new Set([currentYear])
  tours.forEach(t => {
    const ty = parseInt(t.year, 10)
    if (!isNaN(ty)) yearsSet.add(ty)
  })
  events.forEach(ev => {
    if (ev.saturday_date) yearsSet.add(new Date(ev.saturday_date + 'T00:00:00').getFullYear())
    if (ev.load_in_date) yearsSet.add(new Date(ev.load_in_date + 'T00:00:00').getFullYear())
  })
  const allYears = [...yearsSet].sort((a, b) => a - b)
  const sectionYears = allYears.filter(y => y >= currentYear)
  const pastYears = allYears.filter(y => y < currentYear).sort((a, b) => b - a)

  // Persist holiday overrides per-year in localStorage, merged for all rendered years
  const renderedYearsKey = [...sectionYears, ...activePastYears].sort((a, b) => a - b).join(',')
  useEffect(() => {
    let merged = {}
    for (const y of renderedYearsKey.split(',')) {
      if (!y) continue
      try {
        const raw = localStorage.getItem('booking_holidays_' + y)
        if (raw) merged = { ...merged, ...JSON.parse(raw) }
      } catch {}
    }
    setHolidayOverrides(merged)
  }, [renderedYearsKey])

  const saveHolidayOverride = (saturday, text) => {
    const y = saturday.slice(0, 4)
    setHolidayOverrides(prev => {
      const next = { ...prev, [saturday]: text }
      try {
        const raw = localStorage.getItem('booking_holidays_' + y)
        const yearObj = raw ? JSON.parse(raw) : {}
        yearObj[saturday] = text
        localStorage.setItem('booking_holidays_' + y, JSON.stringify(yearObj))
      } catch {}
      return next
    })
  }

  // Build the Sat/Sun backbone, tour columns, and event map for a given year
  const buildYearData = (year) => {
    const saturdays = getSaturdaysOfYear(year)
    const satSet = new Set(saturdays)
    const autoHolidays = buildHolidayMap(year, saturdays)
    const rows = saturdays.map((sat, i) => ({
      weekNum: i + 1,
      saturday: sat,
      sunday: addDays(sat, 1),
      holiday: holidayOverrides[sat] !== undefined ? holidayOverrides[sat] : (autoHolidays[sat] || ''),
    }))

    const tourIdsWithEvents = new Set(
      events.filter(ev => satSet.has(getEventSaturday(ev))).map(ev => ev.tour_id)
    )
    const yearTours = tours
      .filter(t => parseInt(t.year, 10) === year || tourIdsWithEvents.has(t.id))
      .sort(tourSort)

    const eventMap = {}
    events.forEach(ev => {
      const sat = getEventSaturday(ev)
      if (sat && satSet.has(sat)) eventMap[ev.tour_id + '__' + sat] = ev
    })

    return { rows, yearTours, eventMap }
  }

  // ── Cursor / outside-click cleanup for the active inline search cell ───────

  useEffect(() => {
    if (!activeCell || activeCell.type !== 'search') return
    const handleMouseDown = (e) => {
      if (activeCellElRef.current && !activeCellElRef.current.contains(e.target)) {
        setActiveCell(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [activeCell])

  const handleStartSearch = (row, tour) => {
    setActiveCell({ type: 'search', saturday: row.saturday, sunday: row.sunday, tourId: tour.id })
  }

  const handleCancelSearch = () => setActiveCell(null)

  const handleSelectVenue = async (venue, row, tour) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').insert([{
      tour_id: tour.id,
      city: venue.city || '',
      state: venue.state || '',
      venue_name: venue.name,
      venue_id: venue.id,
      status: 'tentative',
      saturday_date: row.saturday,
      sunday_date: row.sunday,
      load_in_date: row.saturday,
    }]).select().single()
    if (!error && data) setEvents(prev => [...prev, data])
    setActiveCell(null)
  }

  // ── Side panel ───────────────────────────────────────────────────────────

  const handleOpenPanel = (event, row, tour) => {
    setActiveCell({ type: 'panel', event, row, tour })
  }

  const handleClosePanel = () => setActiveCell(null)

  const handlePanelSaved = (updatedEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
  }

  const handlePanelMoved = (updatedEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
  }

  const deleteEvent = async (event) => {
    const supabase = getSupabase()
    await supabase.from('show_list').delete().eq('event_id', event.id)
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== event.id))
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragEnterCell = (key) => setDragOverKey(key)
  const handleDragLeaveCell = (key) => setDragOverKey(prev => (prev === key ? null : prev))

  const handleDragStartEvent = (event, tour) => {
    setDraggedEvent(event)
    setDraggedTour(tour)
  }

  const resetDragState = () => {
    setDraggedEvent(null)
    setDraggedTour(null)
    setDragOverKey(null)
    setHoveredPillYear(null)
    clearTimeout(pillHoverTimerRef.current)
  }

  useEffect(() => {
    document.addEventListener('dragend', resetDragState)
    return () => document.removeEventListener('dragend', resetDragState)
  }, [])

  const handleCityDrop = async (eventIdStr, row, tour) => {
    const dragged = events.find(e => String(e.id) === eventIdStr)
    if (!dragged) return
    const currentSat = getEventSaturday(dragged)
    if (dragged.tour_id === tour.id && currentSat === row.saturday) return // no-op drop
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').update({
      saturday_date: row.saturday,
      sunday_date: row.sunday,
      load_in_date: row.saturday,
      tour_id: tour.id,
    }).eq('id', dragged.id).select().single()
    if (!error && data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
  }

  // ── Drag to a missing tour column in another year ───────────────────────────

  const handlePlaceholderDrop = async (eventIdStr, row, year) => {
    const dragged = events.find(e => String(e.id) === eventIdStr)
    if (!dragged) return
    const supabase = getSupabase()
    const { data: fullTour } = await supabase.from('tours').select('*').eq('id', dragged.tour_id).single()
    if (!fullTour) return
    const { id: _id, created_at: _createdAt, ...rest } = fullTour
    const { data: newTour, error: tourError } = await supabase.from('tours').insert([{ ...rest, year, status: 'upcoming' }]).select('id, name, color, status, tour_type, year, created_at').single()
    if (tourError || !newTour) return
    setTours(prev => [...prev, newTour])
    const { data: updatedEvent, error } = await supabase.from('events').update({
      tour_id: newTour.id, saturday_date: row.saturday, sunday_date: row.sunday, load_in_date: row.saturday,
    }).eq('id', dragged.id).select().single()
    if (!error && updatedEvent) setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
  }

  // ── Past year pills ───────────────────────────────────────────────────────

  const expandPastYear = (y) => {
    setActivePastYears(prev => {
      if (prev.has(y)) return prev
      const next = new Set(prev)
      next.add(y)
      setCollapsedSections(c => { const n = new Set(c); n.delete(y); return n })
      setTimeout(() => {
        const el = sectionRefs.current[y]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return next
    })
  }

  const togglePastYear = (y) => {
    setActivePastYears(prev => {
      const next = new Set(prev)
      if (next.has(y)) {
        next.delete(y)
      } else {
        next.add(y)
        setCollapsedSections(c => { const n = new Set(c); n.delete(y); return n })
        setTimeout(() => {
          const el = sectionRefs.current[y]
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 60)
      }
      return next
    })
  }

  const toggleCollapse = (y) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(y)) next.delete(y)
      else next.add(y)
      return next
    })
  }

  const handlePillDragOver = (year) => {
    if (hoveredPillYear !== year) {
      setHoveredPillYear(year)
      clearTimeout(pillHoverTimerRef.current)
      pillHoverTimerRef.current = setTimeout(() => expandPastYear(year), 600)
    }
  }

  const handlePillDragLeave = (year) => {
    if (hoveredPillYear === year) {
      setHoveredPillYear(null)
      clearTimeout(pillHoverTimerRef.current)
    }
  }

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading booking grid...</div>
    </div>
  )

  const activePastYearsSorted = [...activePastYears].sort((a, b) => b - a)

  const yearSectionCommonProps = {
    activeCell, activeCellRef: activeCellElRef, venues, setVenues,
    onStartSearch: handleStartSearch, onSelectVenue: handleSelectVenue, onCancelSearch: handleCancelSearch,
    onOpenPanel: handleOpenPanel,
    onCityDrop: handleCityDrop, dragOverKey, onDragEnterCell: handleDragEnterCell, onDragLeaveCell: handleDragLeaveCell,
    onDragStartEvent: handleDragStartEvent, onDragEndEvent: resetDragState,
    draggedTour, onPlaceholderDrop: handlePlaceholderDrop,
    onSaveHoliday: saveHolidayOverride,
    currentWeekendSaturday,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{ marginTop: 62, padding: '14px 28px 0', background: 'var(--bg)' }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>All Events</div>
        <PastYearPills
          years={pastYears} activeYears={activePastYears} onToggle={togglePastYear}
          dragging={!!draggedEvent} hoveredPillYear={hoveredPillYear}
          onPillDragOver={handlePillDragOver} onPillDragLeave={handlePillDragLeave}
        />
      </div>

      <div style={{ padding: '14px 28px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sectionYears.map(year => {
          const { rows, yearTours, eventMap } = buildYearData(year)
          return (
            <YearSection
              key={year}
              year={year}
              rows={rows}
              yearTours={yearTours}
              eventMap={eventMap}
              collapsed={collapsedSections.has(year)}
              onToggleCollapse={() => toggleCollapse(year)}
              sectionRef={(el) => { sectionRefs.current[year] = el }}
              {...yearSectionCommonProps}
            />
          )
        })}

        {activePastYearsSorted.map(year => {
          const { rows, yearTours, eventMap } = buildYearData(year)
          return (
            <YearSection
              key={year}
              year={year}
              rows={rows}
              yearTours={yearTours}
              eventMap={eventMap}
              collapsed={collapsedSections.has(year)}
              onToggleCollapse={() => toggleCollapse(year)}
              sectionRef={(el) => { sectionRefs.current[year] = el }}
              {...yearSectionCommonProps}
            />
          )
        })}
      </div>

      {activeCell && activeCell.type === 'panel' && (
        <EventSidePanel
          event={activeCell.event}
          tour={activeCell.tour}
          tours={tours}
          row={activeCell.row}
          onClose={handleClosePanel}
          onSaved={handlePanelSaved}
          onDeleted={deleteEvent}
          onMoved={handlePanelMoved}
        />
      )}
    </div>
  )
}
