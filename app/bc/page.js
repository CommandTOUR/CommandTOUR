'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '../../lib/supabase'
import { IconClock, IconCalendarOff, IconFlag, IconLayoutGrid, IconLayoutList, IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { formatLocation, shortCountry } from '@/lib/locationFormat'
import QuickStatusPill from '../../components/QuickStatusPill'
import { getTourForLine, NO_TOUR_MSG } from '../../lib/tourLines'
import { quickToast } from '../../lib/quickToast'
import NewEventModal, { ALL_STATUSES, statusLabel, EMPTY_NEW_EVENT_FORM } from '../../components/NewEventModal'

const STATUS_STYLES = {
  confirmed:   { color: 'var(--color-success)', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: 'var(--color-warning)', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: 'var(--color-warning)', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: 'var(--color-danger)', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const STATUS_OPTIONS = ALL_STATUSES.map(v => ({ value: v, label: statusLabel(v) }))

const STATUS_PILL_LIGHT = {
  confirmed:   { color: 'var(--color-success)', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: 'var(--color-warning)', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: 'var(--color-warning)', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: 'var(--color-danger)', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const PANEL_STATUSES_ROW1 = ['confirmed', '1-hold', '2-hold', '3-hold', 'tentative']
const PANEL_STATUSES_ROW2 = ['date-hold']

function hexToRgba(hex, alpha) {
  const r = parseInt((hex || '#ffffff').slice(1, 3), 16) || 255
  const g = parseInt((hex || '#ffffff').slice(3, 5), 16) || 255
  const b = parseInt((hex || '#ffffff').slice(5, 7), 16) || 255
  return `rgba(${r},${g},${b},${alpha})`
}

function tourSort(a, b) {
  const ao = a.sort_order ?? 999
  const bo = b.sort_order ?? 999
  if (ao !== bo) return ao - bo
  const at = a.created_at ? new Date(a.created_at).getTime() : 0
  const bt = b.created_at ? new Date(b.created_at).getTime() : 0
  return at - bt
}

function pad(n) { return String(n).padStart(2, '0') }
function toYMD(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

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

function nextSaturdayOnOrAfter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  return toYMD(d)
}

function getCurrentWeekendSaturday() {
  const d = new Date()
  const day = d.getDay()
  if (day === 0) { d.setDate(d.getDate() - 1); return toYMD(d) }
  if (day === 6) return toYMD(d)
  d.setDate(d.getDate() + (6 - day))
  return toYMD(d)
}

const getCurrentWeekSaturday = () => {
  const today = new Date()
  const day = today.getDay()
  const daysUntilSat = (6 - day + 7) % 7
  const thisSaturday = new Date(today)
  thisSaturday.setDate(today.getDate() + daysUntilSat)
  thisSaturday.setHours(0, 0, 0, 0)
  return thisSaturday
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
  return formatLocation(ev.city, ev.state, ev.country, 'compact')
}

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

const EASTER_DATES = {
  2026: '-04-05',
  2027: '-03-28',
  2028: '-04-16',
}

function computeHolidays(year) {
  const holidays = {
    "New Year's Day": year + '-01-01',
    "MLK Day": nthWeekday(year, 0, 1, 3),
    "Presidents Day": nthWeekday(year, 1, 1, 3),
    "Memorial Day": lastWeekday(year, 4, 1),
    "Independence Day": year + '-07-04',
    "Labor Day": nthWeekday(year, 8, 1, 1),
    "Columbus Day": nthWeekday(year, 9, 1, 2),
    "Veterans Day": year + '-11-11',
    "Thanksgiving": nthWeekday(year, 10, 4, 4),
    "Christmas Day": year + '-12-25',
  }
  if (EASTER_DATES[year]) holidays["Easter"] = year + EASTER_DATES[year]
  return holidays
}

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

const inputStyle = {
  fontSize: 15, padding: '7px 10px',
  borderRadius: 6, border: '1px solid var(--border-default)',
  background: 'var(--surface-card)', color: 'var(--text-primary)', caretColor: 'var(--color-success)',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 4, display: 'block',
}

const mintOutlineBtn = {
  fontSize: 14, padding: '8px 14px', borderRadius: 6,
  border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer',
}

function fmtTime(t) {
  if (!t) return null
  if (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) return t.trim()
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function transformShow(show) {
  const fmt = fmtTime(show.show_time)
  return {
    ...show,
    show_hour: !fmt ? '7' : String(parseInt(fmt.split(':')[0]) % 12 || 12),
    show_minute: !fmt ? '30' : fmt.split(':')[1]?.split(' ')[0] || '30',
    show_ampm: !fmt ? 'PM' : fmt.includes('AM') ? 'AM' : 'PM',
  }
}

const timeSelectStyle = {
  background: 'var(--surface-card)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 15,
  padding: '4px 8px',
  cursor: 'pointer',
}

const ampmActiveStyle = {
  background: 'rgba(51,255,153,0.15)',
  color: 'var(--color-success)',
  border: '1px solid rgba(51,255,153,0.3)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const ampmInactiveStyle = {
  background: 'var(--surface-card)',
  color: 'var(--text-muted)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

function InlineVenueSearch({ venues, setVenues, onSelect, onCancel }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [mode, setMode] = useState('search')
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

  const optionCount = results.length + 1

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
      <div onMouseDown={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, width: 280, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: 10, zIndex: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-info)', marginBottom: 8 }}>New Venue</div>
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
        {error && <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ fontSize: 14, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }}
          >Cancel</button>
          <button className="btn-primary" onClick={handleSaveNew} disabled={saving} style={{ fontSize: 14, padding: '6px 14px' }}>{saving ? 'Saving...' : 'Save & Select'}</button>
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
        <div style={{ position: 'absolute', top: '100%', left: 0, width: 240, zIndex: 1100, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {results.map((v, i) => (
            <div key={v.id}
              onMouseDown={() => handleSelect(v)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 14, borderBottom: '0.5px solid var(--border-default)', background: i === activeIndex ? 'rgba(26,86,219,0.08)' : 'transparent', color: i === activeIndex ? 'var(--color-info)' : 'var(--text-primary)' }}>
              <div style={{ fontWeight: 500 }}>{v.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{formatLocation(v.city, v.state, v.country, 'compact')}</div>
            </div>
          ))}
          <div
            onMouseDown={handleOpenCreate}
            onMouseEnter={() => setActiveIndex(results.length)}
            onMouseLeave={() => setActiveIndex(-1)}
            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--color-info)', background: results.length === activeIndex ? 'rgba(26,86,219,0.08)' : 'transparent' }}>
            + Create New Venue
          </div>
        </div>
      )}
    </div>
  )
}

function YearPills({ years, selectedYear, currentYear, onSelect, dragging, hoveredPillYear, onPillDragOver, onPillDragLeave }) {
  const [hovered, setHovered] = useState(null)
  if (years.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {years.map(y => {
        const selected = y === selectedYear
        const isPast = y < currentYear
        const glow = dragging && hoveredPillYear === y
        const isHovered = hovered === y

        let border = '0.5px solid var(--border-default)'
        let color = 'var(--text-secondary)'
        let background = 'transparent'
        let opacity = 1
        let fontWeight = 400

        if (selected || glow) {
          border = '0.5px solid var(--color-info)'
          color = 'var(--color-info)'
          background = 'rgba(26,86,219,0.10)'
          fontWeight = 600
        } else {
          if (isPast) opacity = 0.6
          if (isHovered) {
            border = '0.5px solid var(--color-info)'
            color = 'var(--color-info)'
          }
        }

        return (
          <div key={y}
            onClick={() => onSelect(y)}
            onMouseEnter={() => setHovered(y)}
            onMouseLeave={() => setHovered(null)}
            onDragOver={dragging ? (e) => { e.preventDefault(); onPillDragOver(y) } : undefined}
            onDragLeave={dragging ? () => onPillDragLeave(y) : undefined}
            style={{
              border, color, background, opacity, fontWeight,
              borderRadius: 20, padding: '5px 14px', fontSize: 15, cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}>
            {y}
          </div>
        )
      })}
    </div>
  )
}

function EventSidePanel({ event, tour, lines, row, onClose, onSaved, onDeleted, onMoved }) {
  const router = useRouter()
  const [status, setStatus] = useState(event.status || 'tentative')
  const [loadInDate, setLoadInDate] = useState(event.load_in_date || '')
  const [bookingNote, setBookingNote] = useState(event.booking_note || '')
  const [shows, setShows] = useState([])
  const [initialShows, setInitialShows] = useState([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveLine, setMoveLine] = useState(tour?.sortOrder ?? null)
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
      setShows((data || []).map(transformShow))
      setInitialShows((data || []).map(transformShow))
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

  const handleAddShow = () => setShows(prev => [...prev, { id: null, show_date: loadInDate || '', show_hour: '7', show_minute: '30', show_ampm: 'PM' }])
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
    setSaveError(null)
    const supabase = getSupabase()
    const { data: updatedEvent, error: eventError } = await supabase.from('events').update({
      status, load_in_date: loadInDate || null, booking_note: bookingNote,
    }).eq('id', event.id).select().single()

    if (eventError) {
      setSaving(false)
      setSaveError('Failed to save: ' + eventError.message)
      return
    }

    const showErrors = []
    for (const show of shows) {
      if (!show.id) {
        if (show.show_date) {
          const composedTime = `${show.show_hour}:${show.show_minute} ${show.show_ampm}`
          const payload = { event_id: event.id, show_date: show.show_date, show_time: composedTime }
          const { error } = await supabase.from('show_list').insert([payload]).select().single()
          if (error) showErrors.push(error.message)
        }
      } else {
        const composedTime = `${show.show_hour}:${show.show_minute} ${show.show_ampm}`
        const orig = initialShows.find(s => s.id === show.id)
        const origComposed = orig ? `${orig.show_hour}:${orig.show_minute} ${orig.show_ampm}` : null
        if (orig && (orig.show_date !== show.show_date || origComposed !== composedTime)) {
          const { error } = await supabase.from('show_list').update({ show_date: show.show_date, show_time: composedTime }).eq('id', show.id).select().single()
          if (error) showErrors.push(error.message)
        }
      }
    }

    if (showErrors.length > 0) {
      setSaving(false)
      setSaveError('Show save failed: ' + showErrors[0])
      return
    }

    await supabase.from('event_notes').upsert({ event_id: event.id, content: bookingNote, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })

    const { data: freshShows } = await supabase
      .from('show_list').select('*').eq('event_id', event.id)
      .order('show_date', { ascending: true }).order('show_time', { ascending: true })
    setShows((freshShows || []).map(transformShow))
    setInitialShows((freshShows || []).map(transformShow))

    setSaving(false)
    setSaveSuccess(true)
    onSaved(updatedEvent)
    setTimeout(() => {
      setSaveSuccess(false)
      handleClose()
    }, 1000)
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
    // Same column keeps its tour (only the date moves); a different column switches tour_id.
    const changingLine = Number(moveLine) !== tour?.sortOrder
    const update = { saturday_date: saturday, sunday_date: sunday, load_in_date: saturday }
    if (changingLine) {
      let target = null
      try { target = await getTourForLine(Number(moveLine)) } catch (err) { console.error(err) }
      if (!target) {
        quickToast(NO_TOUR_MSG + '. Event not moved.')
        setMoving(false)
        return
      }
      // TODO(cross-tour staff): the event is changing tours, so its staff_assignments
      // (tour_position_id points at the OLD tour's positions) must be removed or re-mapped, behind
      // the pending confirmation modal. Hook in here, before this update.
      update.tour_id = target.id
    }
    const { data, error } = await supabase.from('events').update(update).eq('id', event.id).select().single()
    setMoving(false)
    if (!error && data) {
      onMoved(data)
      handleClose()
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', top: 88, right: 0, width: 480, height: 'calc(100vh - 88px)',
      background: 'var(--surface-card)', borderLeft: '1px solid var(--border-default)', zIndex: 200,
      transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.2s ease',
      display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCityState(event)}</div>
            {event.country && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{event.country}</div>}
            <div style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 4 }}>{event.venue_name || 'Venue TBD'}</div>
          </div>
          <button
            onClick={() => { if (!dirty) handleClose() }}
            disabled={dirty}
            title="Close"
            style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)', fontSize: 18, cursor: dirty ? 'default' : 'pointer', opacity: dirty ? 0.3 : 1, flexShrink: 0, lineHeight: 1 }}>
            ×
          </button>
        </div>
        {(dirty || saveSuccess) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {saveSuccess ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 7, background: 'rgba(51,255,153,0.12)', border: '0.5px solid rgba(51,255,153,0.35)' }}>
                <span style={{ color: 'var(--color-success)', fontSize: 18 }}>✓</span>
                <span style={{ fontSize: 15, color: 'var(--color-success)', fontWeight: 600 }}>Shows saved</span>
              </div>
            ) : (
              <>
                <button className="btn-primary" onClick={handleSaveClose} disabled={saving} style={{ flex: 1, fontSize: 14, padding: '8px', justifyContent: 'center' }}>{saving ? 'Saving...' : 'Save & Close'}</button>
                <button onClick={handleClose} style={{ flex: 1, ...mintOutlineBtn, padding: '8px' }}>Discard</button>
              </>
            )}
          </div>
        )}
        {saveError && (
          <div style={{ fontSize: 14, color: 'var(--color-danger)', marginTop: 8 }}>{saveError}</div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[PANEL_STATUSES_ROW1, PANEL_STATUSES_ROW2].map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 8 }}>
                {row.map(opt => {
                  const s = STATUS_STYLES[opt]
                  const selected = status === opt
                  return (
                    <div key={opt} onClick={() => setStatus(opt)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        color: selected ? '#04140b' : s.color,
                        background: selected ? s.color : s.background,
                        border: `1px solid ${s.border}`,
                      }}>
                      {statusLabel(opt)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Load-In Date</label>
          <input type="date" style={inputStyle} value={loadInDate || ''} onChange={e => setLoadInDate(e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Shows</label>
          {loadingShows ? (
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shows.map((s, i) => {
                const showDateErr = s.show_date && loadInDate && s.show_date < loadInDate
                return (
                  <div key={s.id || 'new-' + i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="date" style={{ ...inputStyle, flex: 2 }} value={s.show_date || ''} min={loadInDate || ''} onChange={e => handleShowChange(i, { show_date: e.target.value })} />
                      <select value={s.show_hour} onChange={e => handleShowChange(i, { show_hour: e.target.value })} style={timeSelectStyle}>
                        {['1','2','3','4','5','6','7','8','9','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select value={s.show_minute} onChange={e => handleShowChange(i, { show_minute: e.target.value })} style={timeSelectStyle}>
                        {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button onClick={() => handleShowChange(i, { show_ampm: 'AM' })} style={s.show_ampm === 'AM' ? ampmActiveStyle : ampmInactiveStyle}>AM</button>
                      <button onClick={() => handleShowChange(i, { show_ampm: 'PM' })} style={s.show_ampm === 'PM' ? ampmActiveStyle : ampmInactiveStyle}>PM</button>
                      <div onClick={() => handleDeleteShow(i)}
                        style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>×</div>
                    </div>
                    {showDateErr && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>Show date cannot be before load-in date</div>}
                  </div>
                )
              })}
              <button onClick={handleAddShow} style={mintOutlineBtn}>+ Add Show</button>
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Booking Note</label>
          <textarea style={{ ...inputStyle, height: 90, resize: 'vertical' }} value={bookingNote} onChange={e => setBookingNote(e.target.value)} placeholder="Booking note..." />
        </div>

        <div>
          <div onClick={() => setMoveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-block', transform: moveOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>▾</span>
            <span style={{ ...labelStyle, marginBottom: 0 }}>Move Event</span>
          </div>
          {moveOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={labelStyle}>Move to Tour</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={moveLine ?? ''} onChange={e => setMoveLine(e.target.value)}>
                  {lines.map(l => <option key={l.sortOrder} value={l.sortOrder}>{l.name} (line {l.sortOrder})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Move to Weekend (Saturday)</label>
                <input type="date" style={inputStyle} value={moveSaturday} onChange={e => setMoveSaturday(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={handleMove} disabled={moving} style={{ fontSize: 14, padding: '8px' }}>{moving ? 'Moving...' : 'Move'}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderTop: '0.5px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => router.push(`/tours/${event.tour_id}/events/${event.id}`)} style={{ ...mintOutlineBtn, width: '100%', boxSizing: 'border-box' }}>→ Go to Event</button>
        {confirmingDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>Delete this event? This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmingDelete(false)} style={{ flex: 1, ...mintOutlineBtn }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontSize: 14, padding: '8px', borderRadius: 6, border: '0.5px solid rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.12)', color: 'var(--color-danger)', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} style={{ fontSize: 14, padding: '8px', border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>Delete Event</button>
        )}
      </div>
    </div>,
    document.body
  )
}

// Density: "comfortable" (original look) or "compact". Tour columns are equal flexible columns
// (minmax(0, 1fr)); minCol only sets the width below which the tile scrolls sideways (phone fallback).
const DENSITY_CFG = {
  comfortable: { weekW: 104, minCol: 150, gap: 10, inset: 15, rowPad: '10px 4px', rowH: 58 },
  compact:     { weekW: 84,  minCol: 100, gap: 6,  inset: 11, rowPad: '4px 4px',  rowH: 40 },
}
const COMPACT_BELOW = 1500 // compact when the schedule tile is narrower than this (px)
const ABBREV_BELOW = 1000 // header tour names abbreviate only when the tile is this narrow (about half screen)
const DENSITY_KEY = 'masterScheduleDensity'

// One-character status codes for compact circles (C, 1, 2, 3+, T, H); others fall back to the first letter
const STATUS_CHARS = { confirmed: 'C', '1-hold': '1', '2-hold': '2', '3-hold': '3+', tentative: 'T', 'date-hold': 'H' }

const COMPACT_NAME_PARTS = [[/hwmtl/gi, 'MTL'], [/hwss/gi, 'SS'], [/international/gi, 'INTL'], [/domestic/gi, 'DOM']]
const compactLineName = (name) => COMPACT_NAME_PARTS.reduce((n, [re, to]) => n.replace(re, to), name || '').replace(/\s+/g, ' ').trim()


function WarningTriangle({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 3L22 20H2L12 3Z" fill="var(--color-warning)" />
      <rect x="11" y="9" width="2" height="6" fill="#0a1628" />
      <rect x="11" y="16" width="2" height="2" fill="#0a1628" />
    </svg>
  )
}

function GridCell({
  row, tour, event, editMode,
  onStartCityText, onOpenPanel,
  onCityDrop, dragOverKey, cellKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent, draggedEventId, onUpdateStatus, compact = false,
}) {
  const router = useRouter()
  const statusStyle = event?.status ? (STATUS_PILL_LIGHT[event.status] || STATUS_PILL_LIGHT.tentative) : null
  const isDragOver = dragOverKey === cellKey
  const showWarning = !!event && (!event.venue_name || !event.load_in_date)

  const handleTileClick = () => {
    if (event) {
      if (editMode) onOpenPanel(event, row, tour)
      else router.push(`/tours/${event.tour_id}/events/${event.id}`)
    } else if (editMode) {
      onStartCityText(row, tour)
    }
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', String(event.id))
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.textContent = formatCityState(event)
    ghost.style.position = 'absolute'
    ghost.style.top = '-1000px'
    ghost.style.padding = '4px 10px'
    ghost.style.background = 'var(--surface-card)'
    ghost.style.color = 'var(--text-primary)'
    ghost.style.fontSize = '12px'
    ghost.style.borderRadius = '6px'
    ghost.style.border = '0.5px solid var(--border-default)'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => { if (ghost.parentNode) document.body.removeChild(ghost) }, 0)
    onDragStartEvent(event, tour)
  }

  const dropHandlers = editMode && !event ? {
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
    outline: '2px solid var(--color-success)',
    background: 'rgba(51,255,153,0.1)',
  } : {}

  if (!event && !editMode) {
    return <div style={{ height: '100%' }} />
  }

  return (
    <div
      draggable={editMode && !!event}
      onDragStart={editMode && event ? handleDragStart : undefined}
      onDragEnd={editMode && event ? onDragEndEvent : undefined}
      onClick={handleTileClick}
      {...dropHandlers}
      style={{
        minHeight: DENSITY_CFG[compact ? "compact" : "comfortable"].rowH, position: 'relative', boxSizing: 'border-box',
        cursor: event ? (editMode ? 'grab' : 'pointer') : (editMode ? 'pointer' : 'default'),
        zIndex: 1, overflow: 'visible',
        opacity: draggedEventId === event?.id ? 0.5 : 1,
        borderRadius: 8,
        ...dropHighlight,
      }}>
      {event ? (() => {
        const cityLine = formatCityState(event)
        const cut = cityLine.lastIndexOf(', ')
        const cityPart = compact && cut > 0 ? cityLine.slice(0, cut) : cityLine
        const restPart = compact && cut > 0 ? cityLine.slice(cut) : ''
        const tip = `${cityLine}${event.venue_name ? ' — ' + event.venue_name : ' — Venue TBD'}`
        return (
        <div title={compact ? tip : undefined} style={{ height: '100%', boxSizing: 'border-box', background: 'var(--surface-card)', border: `1.5px solid ${tour.color || 'var(--border-default)'}`, borderRadius: 8, padding: compact ? '3px 6px' : '6px 10px', margin: compact ? 1 : 2, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: compact ? 0 : 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: compact ? 4 : 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 3 : 5, overflow: 'hidden', minWidth: 0 }}>
              {showWarning && <WarningTriangle size={compact ? 12 : 14} />}
              {compact ? (
                // State/country shrinks away first (flexShrink 100), then the city truncates
                <span style={{ display: 'flex', minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>{cityPart}</span>
                  {restPart && <span style={{ overflow: 'hidden', flexShrink: 100, minWidth: 0 }}>{restPart}</span>}
                </span>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cityLine}
                </span>
              )}
            </div>
            {statusStyle && (
              <QuickStatusPill
                value={event.status}
                options={STATUS_OPTIONS}
                styles={STATUS_PILL_LIGHT}
                optionStyles={STATUS_STYLES}
                chars={compact ? STATUS_CHARS : undefined}
                onSelect={(next) => onUpdateStatus(event.id, next)}
              />
            )}
          </div>
          <div style={{ fontSize: compact ? 11 : 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.venue_name || <span style={{ color: 'var(--text-muted)' }}>Venue TBD</span>}
          </div>
        </div>
        )
      })() : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1.5px dashed var(--border-strong)', borderRadius: 8, color: 'var(--text-muted)', fontSize: compact ? 12 : 16, fontWeight: 600, margin: compact ? 1 : 0 }}>
          +
        </div>
      )}
    </div>
  )
}

// Black or white text, whichever contrasts more with the chip color (WCAG relative luminance)
function textOnColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#000000' : '#ffffff'
}

function LineHeader({ lines, minWidth, year, cfg, compact, abbreviate }) {
  const template = `${cfg.weekW}px repeat(${lines.length}, minmax(0, 1fr))`
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20, minWidth,
      padding: `${compact ? 5 : 8}px ${cfg.inset}px`, boxSizing: 'border-box',
      background: 'color-mix(in srgb, var(--surface-card) 92%, transparent)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '0.5px solid var(--border-default)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: template, columnGap: cfg.gap, alignItems: 'center' }}>
        <div style={{ fontSize: compact ? 15 : 18, fontWeight: 700, color: 'var(--color-info)', lineHeight: 1 }}>{year}</div>
        {lines.map(line => (
          <div key={line.sortOrder} style={{ minWidth: 0, display: 'flex' }}>
            <span title={line.name} style={{
              width: '100%', boxSizing: 'border-box', textAlign: 'center',
              fontSize: compact ? 11 : 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: compact ? '0.03em' : '0.06em',
              color: textOnColor(line.color), background: line.color || 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: compact ? '4px 4px' : '5px 10px', borderRadius: 6,
            }}>{abbreviate ? compactLineName(line.name) : line.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function YearGrid({
  rows, lines, eventMap, currentWeekendSaturday,
  editMode,
  onOpenPanel,
  onStartCityText,
  onCityDrop, dragOverKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent,
  draggedEventId, onUpdateStatus, cfg, compact,
}) {
  const template = `${cfg.weekW}px repeat(${lines.length}, minmax(0, 1fr))`
  return (
    <div style={{ padding: `0 ${cfg.inset - 4}px` }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, idx) => {
          const isCurrentWeek = row.saturday === currentWeekendSaturday
          const rowBg = isCurrentWeek ? 'rgba(26,86,219,0.08)' : (idx % 2 === 0 ? 'transparent' : 'var(--surface-card)')
          const satLabel = new Date(row.saturday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div key={row.saturday} style={{ display: 'grid', gridTemplateColumns: template, columnGap: cfg.gap, alignItems: 'stretch', padding: cfg.rowPad, background: rowBg, borderRadius: 8 }}>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {compact ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Wk {row.weekNum}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{satLabel}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Wk {row.weekNum}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.2, marginTop: 2 }}>{satLabel}</div>
                  </>
                )}
                {row.holiday && (() => {
                  const note = row.holiday.split(' / ').join(' · ')
                  return (
                    <div title={note} style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: compact ? 0 : 2, fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.2, minWidth: 0 }}>
                      <IconFlag size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</span>
                    </div>
                  )
                })()}
              </div>
              {lines.map(line => {
                const event = eventMap[line.sortOrder + '__' + row.saturday]
                const cellKey = row.saturday + '__' + line.sortOrder
                return (
                  <div key={line.sortOrder} style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <GridCell
                      row={row} tour={line} event={event}
                      editMode={editMode}
                      onOpenPanel={onOpenPanel}
                      onStartCityText={onStartCityText}
                      onCityDrop={onCityDrop}
                      dragOverKey={dragOverKey}
                      cellKey={cellKey}
                      onDragEnterCell={onDragEnterCell}
                      onDragLeaveCell={onDragLeaveCell}
                      onDragStartEvent={onDragStartEvent}
                      onDragEndEvent={onDragEndEvent}
                      draggedEventId={draggedEventId}
                      onUpdateStatus={onUpdateStatus}
                      compact={compact}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function YearSection({
  year, first, sectionRef, yearData, lines, currentWeekendSaturday, editMode,
  onOpenPanel, onStartCityText,
  onCityDrop, dragOverKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent,
  draggedEventId, onUpdateStatus, cfg, compact,
}) {
  const { rows, eventMap } = yearData
  const rowsToRender = year === new Date().getFullYear()
    ? rows.filter(row => new Date(row.saturday) >= getCurrentWeekSaturday())
    : rows

  return (
    <div
      ref={sectionRef}
      data-year={year}
      style={first ? { paddingTop: 8 } : { borderTop: '1px solid var(--border-strong)', marginTop: 8, paddingTop: 12 }}
    >
      <YearGrid
        rows={rowsToRender}
        lines={lines}
        eventMap={eventMap}
        currentWeekendSaturday={currentWeekendSaturday}
        editMode={editMode}
        onOpenPanel={onOpenPanel}
        onStartCityText={onStartCityText}
        onCityDrop={onCityDrop} dragOverKey={dragOverKey} onDragEnterCell={onDragEnterCell} onDragLeaveCell={onDragLeaveCell}
        onDragStartEvent={onDragStartEvent} onDragEndEvent={onDragEndEvent}
        draggedEventId={draggedEventId}
        onUpdateStatus={onUpdateStatus}
        cfg={cfg}
        compact={compact}
      />
    </div>
  )
}

const SCHEDULE_YEARS = [2026, 2027, 2028, 2029, 2030]
const HEADER_H = 48 // approx sticky header height, for year tracking

// ── DRAFT SCHEDULE TAB CONTENT ────────────────────────────────────────────────


function DraftScheduleContent({ editMode, densityPref = 'auto' }) {
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [holidayOverrides, setHolidayOverrides] = useState({})

  const [activeCell, setActiveCell] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)

  const scrollRef = useRef(null)
  const sectionRefs = useRef({})
  const [visibleYear, setVisibleYear] = useState(SCHEDULE_YEARS[0])
  const [tileWidth, setTileWidth] = useState(0)

  // Auto density follows the width of the schedule tile itself (not the window)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => setTileWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading]) // the tile only exists once loading finishes
  const [newEventModal, setNewEventModal] = useState(null)
  const [newEventForm, setNewEventForm] = useState({ ...EMPTY_NEW_EVENT_FORM })
  const [newEventSaving, setNewEventSaving] = useState(false)
  const [newEventError, setNewEventError] = useState('')

  const linkedEventsRef = useRef(false)
  const activeCellElRef = useRef(null)

  useEffect(() => {
    const fetchAll = async () => {
      const res = await fetch('/api/booking')
      const data = await res.json()
      setTours(data.tours || [])
      setEvents(data.events || [])
      setVenues(data.venues || [])
      setLoading(false)

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
    }
    fetchAll()
  }, [])

  const currentWeekendSaturday = getCurrentWeekendSaturday()

  // Year shown in the sticky header = year of the section at the top of the scroll area
  const updateVisibleYear = () => {
    const box = scrollRef.current
    if (!box) return
    const top = box.getBoundingClientRect().top + HEADER_H
    let current = SCHEDULE_YEARS[0]
    for (const y of SCHEDULE_YEARS) {
      const el = sectionRefs.current[y]
      if (el && el.getBoundingClientRect().top <= top) current = y
    }
    setVisibleYear(current)
  }

  useEffect(() => {
    try {
      const merged = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('booking_holidays_')) {
          try { Object.assign(merged, JSON.parse(localStorage.getItem(key))) } catch {}
        }
      }
      setHolidayOverrides(merged)
    } catch {
      setHolidayOverrides({})
    }
  }, [])

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

    // Columns are tour LINES (tours.sort_order); each line has one persistent tour and events sit by date.
    const lineOfTour = {}
    tours.forEach(t => { lineOfTour[t.id] = t.sort_order })
    const eventMap = {}
    events.forEach(ev => {
      const sat = getEventSaturday(ev)
      const line = lineOfTour[ev.tour_id]
      if (line != null && sat && satSet.has(sat)) eventMap[line + '__' + sat] = ev
    })

    return { rows, eventMap }
  }

  useEffect(() => {
    if (!activeCell || (activeCell.type !== 'search' && activeCell.type !== 'cityText')) return
    const handleMouseDown = (e) => {
      if (activeCellElRef.current && !activeCellElRef.current.contains(e.target)) {
        setActiveCell(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [activeCell])

  const handleStartCityText = (row, tour) => {
    setNewEventForm({ ...EMPTY_NEW_EVENT_FORM })
    setNewEventError('')
    setNewEventModal({ sortOrder: tour.sortOrder, saturday: row.saturday, sunday: row.sunday, weekNum: row.weekNum, year: Number(row.saturday.slice(0, 4)) })
  }

  const handleCreateNewEvent = async () => {
    setNewEventSaving(true)
    setNewEventError('')
    const supabase = getSupabase()
    let eventTour = null
    try { eventTour = await getTourForLine(newEventModal.sortOrder) } catch (err) { console.error(err) }
    if (!eventTour) {
      setNewEventSaving(false)
      setNewEventError(NO_TOUR_MSG)
      return
    }
    const { data, error } = await supabase.from('events').insert([{
      tour_id: eventTour.id,
      venue_name: newEventForm.no_venue ? null : newEventForm.venue_name,
      venue_id: newEventForm.no_venue ? null : (newEventForm.venue_id || null),
      city: newEventForm.city,
      state: newEventForm.state,
      country: newEventForm.country || null,
      status: newEventForm.status,
      saturday_date: newEventModal.saturday,
      sunday_date: newEventModal.sunday,
      load_in_date: newEventModal.saturday,
    }]).select().single()
    setNewEventSaving(false)
    if (error) { console.error('Failed to create event:', error); setNewEventError(error.message); return }
    setEvents(prev => [...prev, data])
    setNewEventModal(null)
  }

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

  const handleDragEnterCell = (key) => setDragOverKey(key)
  const handleDragLeaveCell = (key) => setDragOverKey(prev => (prev === key ? null : prev))

  const handleDragStartEvent = (event) => {
    setDraggedEvent(event)
  }

  const resetDragState = () => {
    setDraggedEvent(null)
    setDragOverKey(null)
  }

  useEffect(() => {
    document.addEventListener('dragend', resetDragState)
    return () => document.removeEventListener('dragend', resetDragState)
  }, [])

  const handleCityDrop = async (eventIdStr, row, line) => {
    const dragged = events.find(e => String(e.id) === eventIdStr)
    if (!dragged) return
    const currentSat = getEventSaturday(dragged)
    const draggedLine = tours.find(t => t.id === dragged.tour_id)?.sort_order
    if (draggedLine === line.sortOrder && currentSat === row.saturday) return
    // Dragging within a column (other week/year) keeps tour_id; only a different column switches it.
    const update = { saturday_date: row.saturday, sunday_date: row.sunday, load_in_date: row.saturday }
    if (draggedLine !== line.sortOrder) {
      let target = null
      try { target = await getTourForLine(line.sortOrder) } catch (err) { console.error(err) }
      if (!target) { quickToast(NO_TOUR_MSG + '. Event not moved.'); return }
      // TODO(cross-tour staff): the event is changing tours, so its staff_assignments
      // (tour_position_id points at the OLD tour's positions) must be removed or re-mapped, behind
      // the pending confirmation modal. Hook in here, before this update.
      update.tour_id = target.id
    }
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').update(update).eq('id', dragged.id).select().single()
    if (!error && data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
  }

  const handleUpdateStatus = async (eventId, newStatus) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', eventId)
    if (error) return { error }
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
  }

  if (loading) return (
    <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Loading master schedule...</div>
  )

  // One column per tour line (sort_order); each line has a single persistent tour
  const lineTours = {}
  tours.forEach(t => {
    if (t.sort_order == null || t.deleted_at) return
    if (!lineTours[t.sort_order]) lineTours[t.sort_order] = t
  })
  const lines = Object.values(lineTours).sort(tourSort).map(t => ({
    sortOrder: t.sort_order,
    name: t.name,
    color: t.color,
  }))
  const density = densityPref === 'auto' ? (tileWidth > 0 && tileWidth < COMPACT_BELOW ? 'compact' : 'comfortable') : densityPref
  const compact = density === 'compact'
  const cfg = DENSITY_CFG[density]
  // Only a last resort: below this width the tile scrolls sideways (phones)
  const gridMinWidth = cfg.weekW + lines.length * (cfg.minCol + cfg.gap) + 8 + cfg.inset * 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Single scroll container for both axes so the sticky line header scrolls sideways with the columns */}
      <div
        ref={scrollRef}
        onScroll={updateVisibleYear}
        style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--border-default)', borderRadius: 12 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: gridMinWidth }}>
          <LineHeader lines={lines} minWidth={gridMinWidth} year={visibleYear} cfg={cfg} compact={compact} abbreviate={tileWidth > 0 && tileWidth < ABBREV_BELOW} />
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 12 }}>
          {SCHEDULE_YEARS.map(year => (
            <YearSection
              key={year}
              year={year}
              first={year === SCHEDULE_YEARS[0]}
              sectionRef={el => { sectionRefs.current[year] = el }}
              yearData={buildYearData(year)}
              lines={lines}
              currentWeekendSaturday={currentWeekendSaturday}
              editMode={editMode}
              onOpenPanel={handleOpenPanel}
              onStartCityText={handleStartCityText}
              onCityDrop={handleCityDrop} dragOverKey={dragOverKey} onDragEnterCell={handleDragEnterCell} onDragLeaveCell={handleDragLeaveCell}
              onDragStartEvent={handleDragStartEvent} onDragEndEvent={resetDragState}
              draggedEventId={draggedEvent?.id}
              onUpdateStatus={handleUpdateStatus}
              cfg={cfg}
              compact={compact}
            />
          ))}
          </div>
        </div>
      </div>

      {activeCell && activeCell.type === 'panel' && (
        <EventSidePanel
          key={activeCell.event.id}
          event={activeCell.event}
          tour={activeCell.tour}
          lines={lines}
          row={activeCell.row}
          onClose={handleClosePanel}
          onSaved={handlePanelSaved}
          onDeleted={deleteEvent}
          onMoved={handlePanelMoved}
        />
      )}

      {newEventModal && (
        <NewEventModal
          title={`Add Event — Wk ${newEventModal.weekNum} · ${new Date(newEventModal.saturday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          form={newEventForm}
          setForm={setNewEventForm}
          submitting={newEventSaving}
          error={newEventError}
          onClose={() => setNewEventModal(null)}
          onSubmit={handleCreateNewEvent}
        />
      )}
    </div>
  )
}

// ── CONFIRMED SCHEDULE TAB ───────────────────────────────────────────────────

const CS_COLS = [
  { key: 'load_in_date', label: 'Load-In Date' },
  { key: 'city',         label: 'City' },
  { key: 'country',      label: 'Country' },
  { key: 'venue',        label: 'Venue' },
  { key: 'tour',         label: 'Tour' },
  { key: 'status',       label: 'Status' },
  { key: 'num_shows',    label: '# Shows' },
  { key: 'booker',       label: 'Booker' },
]

const glassSelect = {
  background: 'var(--surface-card)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: 15,
  outline: 'none',
  cursor: 'pointer',
}

function fmtLoadIn(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function ConfirmedRow({ ev, editingBookerId, setEditingBooker, saveBooker, onRowClick }) {
  const [hovered, setHovered] = useState(false)
  const [draft, setDraft] = useState(ev.booker || '')
  const isEditing = editingBookerId === ev.id
  const s = STATUS_PILL_LIGHT[ev.status] || STATUS_PILL_LIGHT.tentative

  const cell = {
    padding: '0 14px',
    height: 48,
    verticalAlign: 'middle',
    fontSize: 15,
    borderBottom: '0.5px solid var(--border-default)',
  }

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--glass-tile-hover)' : 'transparent', cursor: 'pointer' }}
    >
      <td style={{ ...cell, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }} onClick={onRowClick}>{fmtLoadIn(ev.load_in_date)}</td>
      <td style={{ ...cell, color: 'var(--text-primary)', fontWeight: 500 }} onClick={onRowClick}>{ev.city || '—'}</td>
      <td style={{ ...cell, color: 'var(--text-secondary)' }} onClick={onRowClick}>{ev.country || '—'}</td>
      <td style={{ ...cell, color: 'var(--text-secondary)' }} onClick={onRowClick}>{ev.venue_name || <span style={{ color: 'var(--text-muted)' }}>Venue TBD</span>}</td>
      <td style={{ ...cell, fontWeight: 600, color: ev.tours?.color || 'var(--text-secondary)' }} onClick={onRowClick}>{ev.tours?.name || '—'}</td>
      <td style={{ ...cell }} onClick={onRowClick}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: s.color, background: s.background, border: `1px solid ${s.border}` }}>
          {statusLabel(ev.status)}
        </span>
      </td>
      <td style={{ ...cell, textAlign: 'center', color: 'var(--text-primary)' }} onClick={onRowClick}>{ev.num_shows != null ? ev.num_shows : '—'}</td>
      <td style={{ ...cell, color: 'var(--text-secondary)' }}
        onClick={e => { e.stopPropagation(); setDraft(ev.booker || ''); setEditingBooker(ev.id) }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => saveBooker(ev.id, draft)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveBooker(ev.id, draft)
              else if (e.key === 'Escape') setEditingBooker(null)
            }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface-card)', border: '0.5px solid var(--color-info)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 15, padding: '4px 8px', outline: 'none', width: '100%' }}
          />
        ) : (
          ev.booker || <span style={{ color: 'var(--text-secondary)' }}>—</span>
        )}
      </td>
    </tr>
  )
}

function ConfirmedScheduleTab() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTour, setFilterTour] = useState('all')
  const [filterStatus, setFilterStatus] = useState('confirmed')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterBooker, setFilterBooker] = useState('')
  const [sortCol, setSortCol] = useState('load_in_date')
  const [sortDir, setSortDir] = useState('asc')
  const [editingBookerId, setEditingBookerId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase
        .from('events')
        .select('id, city, country, load_in_date, venue_name, status, num_shows, booker, tours(id, name, color)')
        .eq('status', 'confirmed')
        .order('load_in_date', { ascending: true })
      setEvents(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const saveBooker = async (id, value) => {
    const supabase = getSupabase()
    await supabase.from('events').update({ booker: value }).eq('id', id)
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, booker: value } : ev))
    setEditingBookerId(null)
  }

  const uniqueTours = [...new Map(
    events.filter(ev => ev.tours).map(ev => [ev.tours.id, ev.tours])
  ).values()]

  const filtered = events.filter(ev => {
    if (filterTour !== 'all' && ev.tours?.id !== filterTour) return false
    if (filterStatus !== 'all' && ev.status !== filterStatus) return false
    if (filterFrom && ev.load_in_date && ev.load_in_date < filterFrom) return false
    if (filterTo && ev.load_in_date && ev.load_in_date > filterTo) return false
    if (filterBooker && !(ev.booker || '').toLowerCase().includes(filterBooker.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const vals = {
      load_in_date: [a.load_in_date || '', b.load_in_date || ''],
      city:         [a.city || '', b.city || ''],
      country:      [a.country || '', b.country || ''],
      venue:        [a.venue_name || '', b.venue_name || ''],
      tour:         [a.tours?.name || '', b.tours?.name || ''],
      status:       [a.status || '', b.status || ''],
      num_shows:    [a.num_shows ?? 0, b.num_shows ?? 0],
      booker:       [a.booker || '', b.booker || ''],
    }
    const [av, bv] = vals[sortCol] || ['', '']
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const anyFilter = filterTour !== 'all' || filterStatus !== 'confirmed' || filterFrom || filterTo || filterBooker
  const clearFilters = () => {
    setFilterTour('all'); setFilterStatus('confirmed')
    setFilterFrom(''); setFilterTo(''); setFilterBooker('')
  }

  if (loading) return (
    <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
      Loading confirmed events...
    </div>
  )

  return (
    <div>

      {/* Top bar: count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {sorted.length} confirmed event{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterTour} onChange={e => setFilterTour(e.target.value)} style={glassSelect}>
          <option value="all">All Tours</option>
          {uniqueTours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={glassSelect}>
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} title="From" style={glassSelect} />
        <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   title="To"   style={glassSelect} />
        <input
          type="text"
          value={filterBooker}
          onChange={e => setFilterBooker(e.target.value)}
          placeholder="Filter by booker..."
          style={{ ...glassSelect, cursor: 'text', minWidth: 180 }}
        />
        {anyFilter && (
          <button onClick={clearFilters} style={{ background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 6, color: 'var(--text-secondary)', padding: '7px 12px', fontSize: 14, cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table / empty state */}
      {sorted.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
          <IconCalendarOff size={32} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, margin: 0 }}>No confirmed events match your filters</p>
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-card)' }}>
                {CS_COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    style={{
                      padding: '10px 14px',
                      textAlign: col.key === 'num_shows' ? 'center' : 'left',
                      fontSize: 13, fontWeight: 700,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '0.5px solid var(--border-default)',
                      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                    }}
                  >
                    {col.label}
                    {sortCol === col.key && <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(ev => (
                <ConfirmedRow
                  key={ev.id}
                  ev={ev}
                  editingBookerId={editingBookerId}
                  setEditingBooker={setEditingBookerId}
                  saveBooker={saveBooker}
                  onRowClick={() => router.push(`/tours/${ev.tours?.id}/events/${ev.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

// ── PLACEHOLDER TAB ───────────────────────────────────────────────────────────

function PlaceholderTab({ label }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 400,
      gap: 12,
    }}>
      <IconClock size={32} color="var(--text-muted)" />
      <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, margin: 0 }}>
        {label}
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: 0 }}>
        Coming soon
      </p>
    </div>
  )
}

// ── TAB CONFIG ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Schedule', slug: 'schedule' },
  { label: 'Bullpen',  slug: 'bullpen' },
]

// ── BC PAGE ───────────────────────────────────────────────────────────────────

function BCContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'schedule'
  const [editMode, setEditMode] = useState(false)
  const [densityPref, setDensityPref] = useState(() => {
    try { const v = localStorage.getItem(DENSITY_KEY); return v === 'comfortable' || v === 'compact' ? v : 'auto' } catch { return 'auto' }
  })
  const cycleDensity = () => {
    const next = densityPref === 'auto' ? 'comfortable' : densityPref === 'comfortable' ? 'compact' : 'auto'
    setDensityPref(next)
    try { localStorage.setItem(DENSITY_KEY, next) } catch {}
  }
  const densityLabel = { auto: 'Auto', comfortable: 'Comfortable', compact: 'Compact' }[densityPref]
  const DensityIcon = densityPref === 'compact' ? IconLayoutList : densityPref === 'comfortable' ? IconLayoutGrid : IconAdjustmentsHorizontal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Master Schedule</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* One row: tabs on the left, edit button on the right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 3, width: 'fit-content', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.slug
            return (
              <div
                key={tab.slug}
                onClick={() => router.push(`/bc?tab=${tab.slug}`)}
                style={{
                  background: active ? 'rgba(26,86,219,0.08)' : 'transparent',
                  color: active ? 'var(--color-info)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 16,
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </div>
            )
          })}
        </div>
          {activeTab === 'schedule' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={cycleDensity}
              title={`Density: ${densityLabel} (click to change)`}
              aria-label={`Density: ${densityLabel}. Click to change.`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
            >
              <DensityIcon size={16} /> {densityLabel}
            </button>
            <button
              onClick={() => setEditMode(v => !v)}
              style={{
                fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                border: editMode ? 'none' : '0.5px solid var(--border-default)',
                background: editMode ? '#FFD60A' : 'transparent',
                color: editMode ? '#0a1628' : 'var(--text-secondary)',
              }}
            >{editMode ? 'Save & Exit Edit' : 'Enter Edit Mode'}</button>
          </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'schedule' ? (
            <DraftScheduleContent editMode={editMode} densityPref={densityPref} />
          ) : activeTab === 'bullpen' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 400,
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, margin: 0 }}>
                Bullpen coming soon
              </p>
            </div>
          ) : (
            // ConfirmedScheduleTab and PlaceholderTab routes disabled for now; kept for later reference.
            // ) : activeTab === 'confirmed-schedule' ? (
            //   <ConfirmedScheduleTab />
            // ) : (
            //   <PlaceholderTab label={TABS.find(t => t.slug === activeTab)?.label || ''} />
            null
          )}
        </div>
      </div>
    </div>
  )
}

export default function BCPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100%',
        color: 'var(--text-secondary)', fontSize: 16,
        }}>
        Loading...
      </div>
    }>
      <BCContent />
    </Suspense>
  )
}
