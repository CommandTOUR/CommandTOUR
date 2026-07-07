'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { IconClock, IconCalendarOff } from '@tabler/icons-react'
import { formatLocation, shortCountry } from '@/lib/locationFormat'

const STATUS_STYLES = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: '#FFD60A', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: '#FF9500', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: '#FF3B30', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const STATUS_PILL_LIGHT = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: '#FFD60A', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: '#FF9500', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: '#FF3B30', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const PANEL_STATUSES_ROW1 = ['confirmed', '1-hold', '2-hold', '3-hold', 'tentative']
const PANEL_STATUSES_ROW2 = ['date-hold']
const ALL_STATUSES = ['confirmed', '1-hold', '2-hold', '3-hold', 'tentative', 'date-hold']

const statusLabel = (s) => {
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

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

function hexToRgba(hex, alpha) {
  const r = parseInt((hex || '#ffffff').slice(1, 3), 16) || 255
  const g = parseInt((hex || '#ffffff').slice(3, 5), 16) || 255
  const b = parseInt((hex || '#ffffff').slice(5, 7), 16) || 255
  return `rgba(${r},${g},${b},${alpha})`
}

function tourSort(a, b) {
  const ai = tourOrderIndex(a)
  const bi = tourOrderIndex(b)
  if (ai !== bi) return ai - bi
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
  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 10px',
  borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', caretColor: '#33FF99',
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 4, display: 'block',
}

const mintOutlineBtn = {
  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '8px 14px', borderRadius: 6,
  border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer',
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
  background: '#0d1f3a',
  border: '0.5px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '4px 8px',
  cursor: 'pointer',
}

const ampmActiveStyle = {
  background: 'rgba(51,255,153,0.15)',
  color: '#33FF99',
  border: '1px solid rgba(51,255,153,0.3)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const ampmInactiveStyle = {
  background: 'rgba(255,255,255,0.06)',
  color: '#64748b',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
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
        {error && <div style={{ fontSize: 11, color: 'var(--color-red)', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
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
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{formatLocation(v.city, v.state, v.country, 'compact')}</div>
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

function InlineCityInput({ onSubmit, onCancel }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const blurTimeout = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    return () => clearTimeout(blurTimeout.current)
  }, [])

  const commit = () => {
    clearTimeout(blurTimeout.current)
    if (text.trim()) onSubmit(text.trim())
    else onCancel()
  }

  const handleBlur = () => {
    blurTimeout.current = setTimeout(commit, 150)
  }

  return (
    <input
      ref={inputRef}
      style={inputStyle}
      placeholder="City..."
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        else if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
      }}
      onMouseDown={e => e.stopPropagation()}
      autoComplete="off"
    />
  )
}

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
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 16, fontSize: 12, fontWeight: value ? 600 : 400, color: value ? '#63b3ed' : '#475569', whiteSpace: 'normal', wordWrap: 'break-word', overflowWrap: 'break-word', textAlign: 'center' }}>
      {value || '—'}
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

        let border = '1px solid rgba(255,255,255,0.20)'
        let color = '#94a3b8'
        let background = 'transparent'
        let opacity = 1
        let fontWeight = 500

        if (selected || glow) {
          border = 'none'
          color = '#0a1628'
          background = '#33FF99'
          fontWeight = 700
        } else {
          if (isPast) opacity = 0.6
          if (isHovered) {
            border = '1px solid #33FF99'
            color = '#ffffff'
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
              borderRadius: 999, padding: '4px 16px', fontSize: 13, cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}>
            {y}
          </div>
        )
      })}
    </div>
  )
}

function EventSidePanel({ event, tour, tours, row, onClose, onSaved, onDeleted, onMoved }) {
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
        {(dirty || saveSuccess) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {saveSuccess ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 7, background: 'rgba(51,255,153,0.12)', border: '0.5px solid rgba(51,255,153,0.35)' }}>
                <span style={{ color: '#33FF99', fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 13, color: '#33FF99', fontWeight: 600 }}>Shows saved</span>
              </div>
            ) : (
              <>
                <button className="btn-primary" onClick={handleSaveClose} disabled={saving} style={{ flex: 1, fontSize: 12, padding: '8px', justifyContent: 'center' }}>{saving ? 'Saving...' : 'Save & Close'}</button>
                <button onClick={handleClose} style={{ flex: 1, ...mintOutlineBtn, padding: '8px' }}>Discard</button>
              </>
            )}
          </div>
        )}
        {saveError && (
          <div style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{saveError}</div>
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
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
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
                        style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>×</div>
                    </div>
                    {showDateErr && <div style={{ fontSize: 11, color: '#f87171' }}>Show date cannot be before load-in date</div>}
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
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '8px', borderRadius: 6, border: '0.5px solid rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.12)', color: '#FF6666', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '8px', border: 'none', background: 'transparent', color: '#FF6666', cursor: 'pointer' }}>Delete Event</button>
        )}
      </div>
    </div>,
    document.body
  )
}

const WEEK_W = 44
const HOLIDAY_W = 120
const SAT_W = 100
const SUN_W = 100

const CITY_W = 130
const VENUE_W = 160
const STATUS_W = 110
const PLACEHOLDER_W = 180

const H1 = 40
const H2 = 34
const ROW_H = 36

const HDR_BG = 'rgba(255,255,255,0.06)'
const STICKY_BG = '#0d1f3c'
const B_INNER = '0.5px solid rgba(255,255,255,0.08)'
const B_HEADER_BOTTOM = '1px solid rgba(255,255,255,0.08)'
const B_LEFT_COL = '2px solid rgba(255,255,255,0.12)'
const B_TOUR_GROUP = '5px solid rgba(255,255,255,0.15)'
const B_TOUR_DIVIDER = '5px solid rgba(255,255,255,0.15)'

const widths = { city: CITY_W, venue: VENUE_W, status: STATUS_W }

const leftThStyle = (left, width) => ({
  position: 'sticky', left, top: 0, zIndex: 40, width, minWidth: width, height: H1 + H2,
  background: '#0d1f3c', padding: '0 10px', textAlign: 'center', verticalAlign: 'middle',
  fontSize: 11, fontWeight: 700, color: '#63b3ed', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '4px solid #FFD60A', borderRight: '2px solid rgba(255,255,255,0.12)',
})

const subHeaderStyle = (width, borderRight) => ({
  position: 'sticky', top: H1, zIndex: 30,
  height: H2, background: '#0d1f3c', borderBottom: '4px solid #FFD60A', borderRight,
  padding: '0 8px', textAlign: 'center', fontSize: 11, color: '#f1f5f9', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em', width, minWidth: width,
})

function GridCell({
  row, tour, event, isCityActive, isVenueActive, activeCellRef, isLast, rowHeight,
  venues, setVenues, onStartSearch, onSelectVenue, onCancelSearch, onOpenPanel,
  onStartCityText, onSubmitCityText, onCancelCityText,
  onCityDrop, dragOverKey, cellKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent, draggedEventId, onUpdateStatus,
}) {
  const [cityHovered, setCityHovered] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const pillRef = useRef(null)
  const dropRef = useRef(null)
  const statusStyle = event?.status ? (STATUS_PILL_LIGHT[event.status] || STATUS_PILL_LIGHT.tentative) : null
  const isDragOver = dragOverKey === cellKey
  const cellBase = {
    height: rowHeight, padding: '0 8px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: 12, color: '#f1f5f9',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    verticalAlign: 'middle', textAlign: 'center', position: 'relative',
  }
  const innerBorder = '0.5px solid rgba(255,255,255,0.08)'
  const groupBorder = isLast ? innerBorder : B_TOUR_DIVIDER

  useEffect(() => {
    if (!dropOpen) return
    const handleDown = (e) => {
      if (pillRef.current?.contains(e.target)) return
      if (dropRef.current?.contains(e.target)) return
      setDropOpen(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setDropOpen(false) }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dropOpen])

  const handlePillClick = (e) => {
    e.stopPropagation()
    if (!event || !pillRef.current) return
    const rect = pillRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 4, left: rect.left })
    setDropOpen(v => !v)
  }

  const handleSelectStatus = async (newStatus) => {
    setDropOpen(false)
    await onUpdateStatus(event.id, newStatus)
  }

  const handleCityClick = () => {
    if (event) onOpenPanel(event, row, tour)
    else onStartCityText(row, tour)
  }

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
    borderTop: '2px solid #33FF99',
    background: 'rgba(51,255,153,0.1)',
  } : {}

  return (
    <>
      <td
        ref={isCityActive ? activeCellRef : null}
        draggable={!!event}
        onDragStart={event ? handleDragStart : undefined}
        onDragEnd={event ? onDragEndEvent : undefined}
        onClick={handleCityClick}
        onMouseEnter={() => setCityHovered(true)}
        onMouseLeave={() => setCityHovered(false)}
        {...dropHandlers}
        style={{
          ...cellBase, width: widths.city, minWidth: widths.city, borderRight: innerBorder,
          cursor: event ? 'grab' : 'pointer',
          zIndex: isCityActive ? 300 : 1, overflow: isCityActive ? 'visible' : 'hidden',
          opacity: draggedEventId === event?.id ? 0.5 : 1,
          ...dropHighlight,
        }}>
        {isCityActive ? (
          <InlineCityInput
            onSubmit={(text) => onSubmitCityText(text, row, tour)}
            onCancel={onCancelCityText}
          />
        ) : event ? (
          <>
            {event && (
              <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', opacity: cityHovered ? 1 : 0, transition: 'opacity 0.12s ease', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
                  <polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/>
                  <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
              </div>
            )}
            <span style={{ fontWeight: 500 }}>{formatCityState(event)}</span>
          </>
        ) : ''}
      </td>
      <td
        ref={isVenueActive ? activeCellRef : null}
        onClick={handleVenueClick}
        {...dropHandlers}
        style={{
          ...cellBase, width: widths.venue, minWidth: widths.venue, borderRight: innerBorder,
          cursor: 'pointer', zIndex: isVenueActive ? 300 : 1, overflow: isVenueActive ? 'visible' : 'hidden',
          color: '#f1f5f9',
          ...dropHighlight,
        }}>
        {isVenueActive ? (
          <InlineVenueSearch
            venues={venues} setVenues={setVenues}
            onSelect={(venue) => onSelectVenue(venue, row, tour)}
            onCancel={onCancelSearch}
          />
        ) : (event?.venue_name || '')}
      </td>
      <td style={{ ...cellBase, width: widths.status, minWidth: widths.status, borderRight: groupBorder }}>
        {statusStyle ? (
          <div
            ref={pillRef}
            onClick={handlePillClick}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: statusStyle.color, background: statusStyle.background, border: `1px solid ${statusStyle.border}`, cursor: 'pointer', userSelect: 'none' }}>
            {statusLabel(event.status)}
          </div>
        ) : null}
        {dropOpen && dropPos && createPortal(
          <div ref={dropRef} style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, background: '#0d1f3c', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', padding: 6, minWidth: 140, zIndex: 1000 }}>
            {ALL_STATUSES.map(opt => {
              const s = STATUS_STYLES[opt] || STATUS_STYLES.tentative
              const isActive = event.status === opt
              return (
                <div key={opt} onClick={() => handleSelectStatus(opt)}
                  style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: s.color, background: s.background, border: `1px solid ${s.border}` }}>
                    {statusLabel(opt)}
                  </span>
                  {isActive && <span style={{ color: s.color, fontSize: 12, fontWeight: 700, marginLeft: 8 }}>✓</span>}
                </div>
              )
            })}
          </div>,
          document.body
        )}
      </td>
    </>
  )
}

function YearGrid({
  year, rows, yearTours, eventMap, currentWeekendSaturday,
  onSaveHoliday,
  activeCell, activeCellRef, venues, setVenues,
  onStartSearch, onSelectVenue, onCancelSearch, onOpenPanel,
  onStartCityText, onSubmitCityText, onCancelCityText,
  onCityDrop, dragOverKey, onDragEnterCell, onDragLeaveCell,
  onDragStartEvent, onDragEndEvent,
  draggedTour, onPlaceholderDrop, draggedEventId, onUpdateStatus,
}) {
  const showPlaceholder = !!draggedTour && !yearTours.some(t => t.id === draggedTour.id)

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ overflow: 'auto', flex: 1 }}>
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
                    <th key={tour.id} colSpan={3} style={{ position: 'sticky', top: 0, zIndex: 30, height: H1, background: '#0d1f3c', borderBottom: B_HEADER_BOTTOM, borderRight: ti < yearTours.length - 1 ? B_TOUR_DIVIDER : (showPlaceholder ? B_TOUR_DIVIDER : B_INNER), textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: tourColor }}>
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
                      <th style={subHeaderStyle(STATUS_W, isLastTour ? B_INNER : B_TOUR_GROUP)}>Status</th>
                    </React.Fragment>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isCurrentWeek = row.saturday === currentWeekendSaturday
                const rowBg = isCurrentWeek ? 'rgba(51,255,153,0.06)' : (row.weekNum % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')
                return (
                  <tr key={row.saturday} style={{ background: rowBg }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 20, width: WEEK_W, minWidth: WEEK_W, height: ROW_H, background: STICKY_BG, borderRight: B_LEFT_COL, borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: isCurrentWeek ? '3px solid #33FF99' : '3px solid transparent', padding: '0 8px', fontSize: 11, color: '#94a3b8', textAlign: 'center', verticalAlign: 'middle', textTransform: 'uppercase' }}>
                      {row.weekNum}
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W, zIndex: 20, width: HOLIDAY_W, minWidth: HOLIDAY_W, height: ROW_H, background: STICKY_BG, borderRight: B_LEFT_COL, borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: row.holiday ? '3px solid #63b3ed' : 'none', padding: '0 10px', verticalAlign: 'middle' }}>
                      <HolidayCell value={row.holiday} onSave={(text) => onSaveHoliday(row.saturday, text)} />
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W + HOLIDAY_W, zIndex: 20, width: SAT_W, minWidth: SAT_W, height: ROW_H, background: STICKY_BG, borderRight: B_LEFT_COL, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 10px', fontSize: 12, fontWeight: 500, color: '#cbd5e1', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {fmtDay(row.saturday, 'Sat')}
                    </td>
                    <td style={{ position: 'sticky', left: WEEK_W + HOLIDAY_W + SAT_W, zIndex: 20, width: SUN_W, minWidth: SUN_W, height: ROW_H, background: STICKY_BG, borderRight: B_LEFT_COL, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 10px', fontSize: 12, fontWeight: 500, color: '#cbd5e1', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {fmtDay(row.sunday, 'Sun')}
                    </td>
                    {yearTours.map((tour, ti) => {
                      const event = eventMap[tour.id + '__' + row.saturday]
                      const cellKey = row.saturday + '__' + tour.id
                      const isCityActive = !!(activeCell && activeCell.type === 'cityText' && activeCell.saturday === row.saturday && activeCell.tourId === tour.id)
                      const isVenueActive = !!(activeCell && activeCell.type === 'search' && activeCell.saturday === row.saturday && activeCell.tourId === tour.id)
                      return (
                        <GridCell
                          key={tour.id}
                          row={row} tour={tour} event={event}
                          isCityActive={isCityActive}
                          isVenueActive={isVenueActive}
                          activeCellRef={activeCellRef}
                          isLast={ti === yearTours.length - 1} rowHeight={ROW_H}
                          venues={venues} setVenues={setVenues}
                          onStartSearch={onStartSearch}
                          onSelectVenue={onSelectVenue}
                          onCancelSearch={onCancelSearch}
                          onOpenPanel={onOpenPanel}
                          onStartCityText={onStartCityText}
                          onSubmitCityText={onSubmitCityText}
                          onCancelCityText={onCancelCityText}
                          onCityDrop={onCityDrop}
                          dragOverKey={dragOverKey}
                          cellKey={cellKey}
                          onDragEnterCell={onDragEnterCell}
                          onDragLeaveCell={onDragLeaveCell}
                          onDragStartEvent={onDragStartEvent}
                          onDragEndEvent={onDragEndEvent}
                          draggedEventId={draggedEventId}
                          onUpdateStatus={onUpdateStatus}
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
    </div>
  )
}

// ── DRAFT SCHEDULE TAB CONTENT ────────────────────────────────────────────────

function DraftScheduleContent() {
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [holidayOverrides, setHolidayOverrides] = useState({})

  const [activeCell, setActiveCell] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)
  const [draggedEvent, setDraggedEvent] = useState(null)
  const [draggedTour, setDraggedTour] = useState(null)
  const [hoveredPillYear, setHoveredPillYear] = useState(null)

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [showPastWeeks, setShowPastWeeks] = useState(false)

  const linkedEventsRef = useRef(false)
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

  const currentYear = new Date().getFullYear()
  const currentWeekendSaturday = getCurrentWeekendSaturday()

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('booking_holidays_' + selectedYear)
      setHolidayOverrides(raw ? JSON.parse(raw) : {})
    } catch {
      setHolidayOverrides({})
    }
  }, [selectedYear])

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
      country: venue.country || null,
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

  const handleStartCityText = (row, tour) => {
    setActiveCell({ type: 'cityText', saturday: row.saturday, sunday: row.sunday, tourId: tour.id })
  }

  const handleCancelCityText = () => setActiveCell(null)

  const handleSubmitCityText = async (cityText, row, tour) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').insert([{
      tour_id: tour.id,
      city: cityText,
      state: '',
      country: null,
      venue_name: '',
      venue_id: null,
      status: 'tentative',
      saturday_date: row.saturday,
      sunday_date: row.sunday,
      load_in_date: row.saturday,
    }]).select().single()
    if (!error && data) setEvents(prev => [...prev, data])
    setActiveCell(null)
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
    if (dragged.tour_id === tour.id && currentSat === row.saturday) return
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').update({
      saturday_date: row.saturday,
      sunday_date: row.sunday,
      load_in_date: row.saturday,
      tour_id: tour.id,
    }).eq('id', dragged.id).select().single()
    if (!error && data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
  }

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

  const handlePillDragOver = (year) => {
    if (hoveredPillYear !== year) {
      setHoveredPillYear(year)
      clearTimeout(pillHoverTimerRef.current)
      pillHoverTimerRef.current = setTimeout(() => setSelectedYear(year), 600)
    }
  }

  const handlePillDragLeave = (year) => {
    if (hoveredPillYear === year) {
      setHoveredPillYear(null)
      clearTimeout(pillHoverTimerRef.current)
    }
  }

  const handleUpdateStatus = async (eventId, newStatus) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', eventId)
    if (!error) setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
  }

  if (loading) return (
    <div style={{ padding: '28px', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading booking grid...</div>
  )

  const { rows, yearTours, eventMap } = buildYearData(selectedYear)

  const today = toYMD(new Date())
  const pastWeekCount = rows.filter(row => row.sunday < today).length
  const visibleRows = showPastWeeks ? rows : rows.filter(row => row.sunday >= today)

  return (
    <>
      <div style={{ flexShrink: 0, padding: '14px 28px 0', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <YearPills
            years={allYears} selectedYear={selectedYear} currentYear={currentYear} onSelect={setSelectedYear}
            dragging={!!draggedEvent} hoveredPillYear={hoveredPillYear}
            onPillDragOver={handlePillDragOver} onPillDragLeave={handlePillDragLeave}
          />
          {pastWeekCount > 0 && (
            <button
              onClick={() => setShowPastWeeks(s => !s)}
              style={{ background: '#FFD60A', color: '#0a1628', fontWeight: 700, borderRadius: 999, fontSize: 12, padding: '4px 14px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', border: 'none', flexShrink: 0 }}
            >
              {showPastWeeks ? 'Hide Past Weeks' : `Show Past Weeks (${pastWeekCount})`}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px 28px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <YearGrid
          year={selectedYear}
          rows={visibleRows}
          yearTours={yearTours}
          eventMap={eventMap}
          currentWeekendSaturday={currentWeekendSaturday}
          onSaveHoliday={saveHolidayOverride}
          activeCell={activeCell} activeCellRef={activeCellElRef} venues={venues} setVenues={setVenues}
          onStartSearch={handleStartSearch} onSelectVenue={handleSelectVenue} onCancelSearch={handleCancelSearch}
          onOpenPanel={handleOpenPanel}
          onStartCityText={handleStartCityText} onSubmitCityText={handleSubmitCityText} onCancelCityText={handleCancelCityText}
          onCityDrop={handleCityDrop} dragOverKey={dragOverKey} onDragEnterCell={handleDragEnterCell} onDragLeaveCell={handleDragLeaveCell}
          onDragStartEvent={handleDragStartEvent} onDragEndEvent={resetDragState}
          draggedTour={draggedTour} onPlaceholderDrop={handlePlaceholderDrop}
          draggedEventId={draggedEvent?.id}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>

      {activeCell && activeCell.type === 'panel' && (
        <EventSidePanel
          key={activeCell.event.id}
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
    </>
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
  background: '#0d1f3a',
  border: '0.5px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  color: '#f1f5f9',
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: 'Plus Jakarta Sans, sans-serif',
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
    fontSize: 13,
    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
  }

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent', cursor: 'pointer' }}
    >
      <td style={{ ...cell, color: '#f1f5f9', fontWeight: 500, whiteSpace: 'nowrap' }} onClick={onRowClick}>{fmtLoadIn(ev.load_in_date)}</td>
      <td style={{ ...cell, color: '#f1f5f9', fontWeight: 500 }} onClick={onRowClick}>{ev.city || '—'}</td>
      <td style={{ ...cell, color: '#94a3b8' }} onClick={onRowClick}>{ev.country || '—'}</td>
      <td style={{ ...cell, color: '#94a3b8' }} onClick={onRowClick}>{ev.venue_name || '—'}</td>
      <td style={{ ...cell, fontWeight: 600, color: ev.tours?.color || '#94a3b8' }} onClick={onRowClick}>{ev.tours?.name || '—'}</td>
      <td style={{ ...cell }} onClick={onRowClick}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: s.color, background: s.background, border: `1px solid ${s.border}` }}>
          {statusLabel(ev.status)}
        </span>
      </td>
      <td style={{ ...cell, textAlign: 'center', color: '#f1f5f9' }} onClick={onRowClick}>{ev.num_shows != null ? ev.num_shows : '—'}</td>
      <td style={{ ...cell, color: '#94a3b8' }}
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
            style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid #33FF99', borderRadius: 6, color: '#f1f5f9', fontSize: 13, padding: '4px 8px', outline: 'none', width: '100%', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          />
        ) : (
          ev.booker || <span style={{ color: '#475569' }}>—</span>
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
    <div style={{ padding: 28, color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      Loading confirmed events...
    </div>
  )

  return (
    <div style={{ flex: 1, padding: '20px 28px', overflowY: 'auto', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Top bar: count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
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
          <button onClick={clearFilters} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#94a3b8', padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table / empty state */}
      {sorted.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
          <IconCalendarOff size={32} color="#64748b" />
          <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: 0 }}>No confirmed events match your filters</p>
        </div>
      ) : (
        <div style={{ border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d1f3a' }}>
                {CS_COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    style={{
                      padding: '10px 14px',
                      textAlign: col.key === 'num_shows' ? 'center' : 'left',
                      fontSize: 10.5, fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '0.5px solid var(--glass-border)',
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
      <IconClock size={32} color="#64748b" />
      <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {label}
      </p>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Coming soon
      </p>
    </div>
  )
}

// ── TAB CONFIG ────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Draft Schedule',    slug: 'draft-schedule' },
  { label: 'Confirmed Schedule', slug: 'confirmed-schedule' },
  { label: 'Contracts',         slug: 'contracts' },
  { label: 'Contract Pipeline', slug: 'contract-pipeline' },
  { label: 'Sponsorships',      slug: 'sponsorships' },
  { label: 'Competitive',       slug: 'competitive' },
  { label: 'Multi-Year Planning', slug: 'multi-year-planning' },
]

// ── BC PAGE ───────────────────────────────────────────────────────────────────

function BCContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'draft-schedule'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{ marginTop: 62, flexShrink: 0, padding: '18px 28px 0', background: 'var(--bg)' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Booking & Contracts</div>
        <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 2 }}>2026</div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginTop: 16, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <div
              key={tab.slug}
              onClick={() => router.push(`/bc?tab=${tab.slug}`)}
              style={{
                padding: '12px 16px',
                fontSize: 13,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: activeTab === tab.slug ? 600 : 400,
                color: activeTab === tab.slug ? '#f1f5f9' : '#64748b',
                borderBottom: activeTab === tab.slug ? '2px solid #33FF99' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'color 150ms',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {activeTab === 'draft-schedule' ? (
        <DraftScheduleContent />
      ) : activeTab === 'confirmed-schedule' ? (
        <ConfirmedScheduleTab />
      ) : (
        <PlaceholderTab label={TABS.find(t => t.slug === activeTab)?.label || ''} />
      )}
    </div>
  )
}

export default function BCPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        color: '#94a3b8', fontSize: 14,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}>
        Loading...
      </div>
    }>
      <BCContent />
    </Suspense>
  )
}
