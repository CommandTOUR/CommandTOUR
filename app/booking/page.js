'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { MAPS_API_KEY } from '../../lib/maps'

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

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'cancelled', 'want', 'date-hold']

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

// ── VENUE PICKER (DB search → Google Places fallback → inline create) ─────────

function VenuePicker({ city, state, venues, setVenues, mapsLoaded, value, onChange, autoFocus }) {
  const [query, setQuery] = useState(value || '')
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState('search') // 'search' | 'google' | 'create'
  const [activeIndex, setActiveIndex] = useState(-1)
  const [googleResults, setGoogleResults] = useState([])
  const [sessionToken, setSessionToken] = useState(null)
  const ref = useRef(null)

  // Inline create-venue form state
  const [newVenue, setNewVenue] = useState(null)
  const [savingVenue, setSavingVenue] = useState(false)
  const [venueError, setVenueError] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false)
  const [placeActiveIndex, setPlaceActiveIndex] = useState(-1)
  const debounceRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false)
        if (mode !== 'create') setMode('search')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mode])

  useEffect(() => {
    if (mapsLoaded && window.google && !sessionToken) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
    }
  }, [mapsLoaded, sessionToken])

  const dbResults = query.trim().length > 0
    ? venues.filter(v =>
        v.name?.toLowerCase().includes(query.toLowerCase()) ||
        v.city?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : []

  const showGoogleOption = query.trim().length > 0
  const searchOptions = [
    ...dbResults.map(v => ({ type: 'db', venue: v })),
    ...(showGoogleOption ? [{ type: 'google-search' }] : []),
    { type: 'create-new' },
  ]

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange({ venue_name: val, city, state, venue_id: null })
    setMode('search')
    setGoogleResults([])
    setActiveIndex(-1)
    setShow(true)
  }

  const handleSelectDbVenue = (venue) => {
    setQuery(venue.name)
    onChange({ venue_name: venue.name, city: venue.city || city, state: venue.state || state, venue_id: venue.id })
    setShow(false)
    setMode('search')
    setActiveIndex(-1)
  }

  const fetchGoogleResults = useCallback((input) => {
    if (!input || !window.google) { setGoogleResults([]); return }
    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      { input, types: ['establishment'], sessionToken },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) setGoogleResults(predictions)
        else setGoogleResults([])
      }
    )
  }, [sessionToken])

  const handleSearchGoogle = () => {
    setMode('google')
    setActiveIndex(-1)
    fetchGoogleResults(query)
  }

  const handleSelectGooglePlace = (prediction) => {
    if (!window.google) return
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'))
    placesService.getDetails(
      { placeId: prediction.place_id, fields: ['name', 'formatted_address', 'address_components', 'place_id'] },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return
        const get = (type) => place.address_components?.find(c => c.types.includes(type))
        const placeCity = get('locality')?.long_name || get('postal_town')?.long_name || get('sublocality')?.long_name || ''
        const placeState = get('administrative_area_level_1')?.short_name || ''
        setQuery(place.name || '')
        onChange({ venue_name: place.name || '', city: placeCity || city, state: placeState || state, venue_id: null })
        setShow(false)
        setMode('search')
        setGoogleResults([])
        setActiveIndex(-1)
        setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
      }
    )
  }

  const handleOpenCreate = () => {
    setNewVenue({ name: query, address: '', city: '', state: '', country: '', full_address: '', place_id: '', latitude: null, longitude: null, zip: '', region: '' })
    setVenueError('')
    setMode('create')
    setShow(false)
    setActiveIndex(-1)
  }

  const fetchPlaceSuggestions = useCallback((input) => {
    if (!input || input.length < 2 || !window.google) { setPlaceSuggestions([]); return }
    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      { input, types: ['establishment'], sessionToken },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPlaceSuggestions(predictions)
          setShowPlaceSuggestions(true)
        } else {
          setPlaceSuggestions([])
        }
      }
    )
  }, [sessionToken])

  const handlePlaceNameChange = (e) => {
    const val = e.target.value
    setNewVenue(prev => ({ ...prev, name: val }))
    setPlaceActiveIndex(-1)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPlaceSuggestions(val), 250)
  }

  const handlePlaceSelect = (prediction) => {
    if (!window.google) return
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'))
    placesService.getDetails(
      { placeId: prediction.place_id, fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'] },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return
        const get = (type) => place.address_components?.find(c => c.types.includes(type))
        const streetNum = get('street_number')?.long_name || ''
        const route = get('route')?.long_name || ''
        const placeCity = get('locality')?.long_name || get('postal_town')?.long_name || get('sublocality')?.long_name || ''
        const placeState = get('administrative_area_level_1')?.short_name || ''
        const placeCountry = get('country')?.long_name || ''
        const zip = get('postal_code')?.long_name || ''
        setNewVenue({
          name: place.name || '',
          address: [streetNum, route].filter(Boolean).join(' '),
          city: placeCity, state: placeState, country: placeCountry, zip,
          full_address: place.formatted_address || '',
          place_id: place.place_id || '',
          latitude: place.geometry?.location?.lat() || null,
          longitude: place.geometry?.location?.lng() || null,
          region: '',
        })
        setShowPlaceSuggestions(false)
        setPlaceSuggestions([])
        setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
      }
    )
  }

  const handlePlaceKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setPlaceActiveIndex(i => Math.min(i + 1, placeSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPlaceActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && placeActiveIndex >= 0) { e.preventDefault(); handlePlaceSelect(placeSuggestions[placeActiveIndex]) }
    else if (e.key === 'Escape') { setShowPlaceSuggestions(false); setPlaceActiveIndex(-1) }
  }

  const handleCancelCreate = () => {
    setMode('search')
    setNewVenue(null)
    setVenueError('')
  }

  const handleSaveNewVenue = async () => {
    if (!newVenue.name.trim()) { setVenueError('Venue name is required'); return }
    setSavingVenue(true)
    setVenueError('')
    const supabase = getSupabase()
    const { data, error } = await supabase.from('venues').insert([newVenue]).select().single()
    if (error) { setVenueError(error.message); setSavingVenue(false); return }
    setVenues(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setQuery(data.name)
    onChange({ venue_name: data.name, city: data.city || city, state: data.state || state, venue_id: data.id })
    setMode('search')
    setNewVenue(null)
    setSavingVenue(false)
  }

  const handleKeyDown = (e) => {
    if (mode === 'search') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setShow(true); setActiveIndex(i => Math.min(i + 1, searchOptions.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        if (!show || activeIndex < 0) return
        e.preventDefault()
        const opt = searchOptions[activeIndex]
        if (opt.type === 'db') handleSelectDbVenue(opt.venue)
        else if (opt.type === 'google-search') handleSearchGoogle()
        else if (opt.type === 'create-new') handleOpenCreate()
      } else if (e.key === 'Escape') { setShow(false); setActiveIndex(-1) }
    } else if (mode === 'google') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, googleResults.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelectGooglePlace(googleResults[activeIndex]) }
      else if (e.key === 'Escape') { setMode('search'); setGoogleResults([]); setActiveIndex(-1) }
    }
  }

  const optionStyle = (active) => ({
    padding: '8px 10px', cursor: 'pointer', fontSize: 12,
    borderBottom: '0.5px solid var(--glass-border)',
    background: active ? 'rgba(51,255,153,0.08)' : 'transparent',
    color: active ? 'var(--mint)' : 'var(--text-primary)',
  })

  if (mode === 'create') {
    return (
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, width: 320, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, padding: 10, zIndex: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mint)', marginBottom: 8 }}>New Venue</div>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <label style={labelStyle}>Venue Name *</label>
          <input
            style={inputStyle}
            placeholder="Search venue name..."
            value={newVenue?.name || ''}
            onChange={handlePlaceNameChange}
            onKeyDown={handlePlaceKeyDown}
            onFocus={() => placeSuggestions.length > 0 && setShowPlaceSuggestions(true)}
            autoComplete="off"
          />
          {showPlaceSuggestions && placeSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              {placeSuggestions.map((p, i) => (
                <div key={p.place_id}
                  onMouseDown={() => handlePlaceSelect(p)}
                  onMouseEnter={() => setPlaceActiveIndex(i)}
                  onMouseLeave={() => setPlaceActiveIndex(-1)}
                  style={optionStyle(i === placeActiveIndex)}>
                  <div style={{ fontWeight: 500 }}>{p.structured_formatting?.main_text}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{p.structured_formatting?.secondary_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} placeholder="City" value={newVenue?.city || ''} onChange={e => setNewVenue(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} placeholder="ST" value={newVenue?.state || ''} onChange={e => setNewVenue(p => ({ ...p, state: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} placeholder="Country" value={newVenue?.country || ''} onChange={e => setNewVenue(p => ({ ...p, country: e.target.value }))} />
        </div>
        {venueError && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{venueError}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancelCreate}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button className="btn-primary" onClick={handleSaveNewVenue} disabled={savingVenue} style={{ fontSize: 12, padding: '6px 14px' }}>{savingVenue ? 'Saving...' : 'Save & Select'}</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <input
        style={inputStyle}
        placeholder="Search venue..."
        value={query}
        onChange={handleQueryChange}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {show && mode === 'search' && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: 260, zIndex: 1100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {dbResults.map((v, i) => (
            <div key={v.id}
              onMouseDown={() => handleSelectDbVenue(v)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={optionStyle(i === activeIndex)}>
              <div style={{ fontWeight: 500 }}>{v.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{[v.city, v.state].filter(Boolean).join(', ')}</div>
            </div>
          ))}
          {showGoogleOption && (
            <div
              onMouseDown={handleSearchGoogle}
              onMouseEnter={() => setActiveIndex(dbResults.length)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={optionStyle(dbResults.length === activeIndex)}>
              Search Google Places for &quot;{query}&quot;
            </div>
          )}
          <div
            onMouseDown={handleOpenCreate}
            onMouseEnter={() => setActiveIndex(searchOptions.length - 1)}
            onMouseLeave={() => setActiveIndex(-1)}
            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--mint)', background: searchOptions.length - 1 === activeIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
            + Create New Venue
          </div>
        </div>
      )}
      {show && mode === 'google' && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: 260, zIndex: 1100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {googleResults.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>Searching Google Places...</div>
          ) : googleResults.map((p, i) => (
            <div key={p.place_id}
              onMouseDown={() => handleSelectGooglePlace(p)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={optionStyle(i === activeIndex)}>
              <div style={{ fontWeight: 500 }}>{p.structured_formatting?.main_text}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{p.structured_formatting?.secondary_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── INLINE STATUS PICKER ────────────────────────────────────────────────────

function InlineStatusPicker({ status, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const s = STATUS_STYLES[status] || STATUS_STYLES.tentative

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: s.color, background: s.background, border: `0.5px solid ${s.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {statusLabel(status)}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, zIndex: 700, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', minWidth: 120 }}>
          {STATUS_OPTIONS.map(opt => {
            const os = STATUS_STYLES[opt] || STATUS_STYLES.tentative
            return (
              <div key={opt}
                onMouseDown={() => { onChange(opt); setOpen(false) }}
                style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: os.color, background: status === opt ? 'rgba(255,255,255,0.06)' : 'transparent', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = status === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
              >{statusLabel(opt)}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── INLINE NOTE EDITOR ──────────────────────────────────────────────────────

function InlineNoteEditor({ value, onChange, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 700, width: 200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', padding: 6 }}>
      <textarea
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onClose}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
        style={{ ...inputStyle, height: 64, resize: 'vertical', fontSize: 12 }}
        placeholder="Booking note..."
      />
    </div>
  )
}

// ── CONTEXT MENU (right-click on a filled cell) ────────────────────────────────

function ContextMenu({ x, y, onEdit, onDelete, onClose }) {
  const ref = useRef(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const left = Math.min(x, window.innerWidth - 170)
  const top = Math.min(y, window.innerHeight - 90)

  return createPortal(
    <div ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', top, left, zIndex: 2000, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', minWidth: 150, overflow: 'hidden' }}>
      {confirming ? (
        <div style={{ padding: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Delete this event?</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.12)', color: '#FF6666', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      ) : (
        <>
          <div onClick={onEdit} style={{ padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Edit</div>
          <div onClick={() => setConfirming(true)} style={{ padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: '#FF6666' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Delete Event</div>
        </>
      )}
    </div>,
    document.body
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

function PastYearPills({ years, activeYears, onToggle }) {
  if (years.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
      {years.map(y => {
        const active = activeYears.has(y)
        return (
          <div key={y} onClick={() => onToggle(y)}
            style={{ border: `0.5px solid ${active ? 'var(--mint)' : 'var(--glass-border)'}`, color: active ? 'var(--mint)' : 'var(--text-muted)', borderRadius: 20, padding: '3px 14px', fontSize: 12, cursor: 'pointer' }}>
            {y}
          </div>
        )
      })}
    </div>
  )
}

// ── EDITABLE CELL GROUP (City / Venue / Status / Note for one tour x weekend) ──

function EditableCellGroup({
  row, tour, event, isEditing, editForm, onStartEdit, onSaveEdit, onChangeForm,
  venues, setVenues, mapsLoaded, widths, isLast, rowHeight,
  onCityDrop, onContextMenu, noteOpen, setNoteOpen,
  dragOverKey, cellKey, onDragEnterCell, onDragLeaveCell,
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

  const handleCityClick = (e) => {
    e.stopPropagation()
    router.push(`/tours/${event.tour_id}/events/${event.id}`)
  }

  const handleCellClick = () => {
    if (isEditing) return
    onStartEdit()
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
  }

  const dragHandlers = !event ? {
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' },
    onDragEnter: (e) => { e.preventDefault(); onDragEnterCell(cellKey) },
    onDragLeave: () => onDragLeaveCell(cellKey),
    onDrop: (e) => {
      e.preventDefault()
      onDragLeaveCell(cellKey)
      const idStr = e.dataTransfer.getData('text/plain')
      if (idStr) onCityDrop(idStr)
    },
  } : {}

  return (
    <>
      <td
        onClick={handleCellClick}
        onContextMenu={event && !isEditing ? (e) => { e.preventDefault(); onContextMenu(e, event) } : undefined}
        {...dragHandlers}
        style={{
          ...cellBase, width: widths.city, minWidth: widths.city, borderRight: innerBorder,
          cursor: 'pointer', zIndex: isEditing ? 300 : 1, overflow: isEditing ? 'visible' : 'hidden',
          outline: isDragOver ? '1px dashed var(--mint)' : 'none',
          background: isDragOver ? 'rgba(51,255,153,0.06)' : undefined,
        }}>
        {isEditing ? (
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}>
            <VenuePicker
              value={editForm.venue_name}
              onChange={({ venue_name, city, state, venue_id }) => onChangeForm({ venue_name, city: city || editForm.city, state: state || editForm.state, venue_id })}
              city={editForm.city} state={editForm.state}
              venues={venues} setVenues={setVenues} mapsLoaded={mapsLoaded}
              autoFocus
            />
            {editForm.city && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatCityState(editForm)}
              </div>
            )}
          </div>
        ) : event ? (
          <span
            draggable
            onDragStart={handleDragStart}
            onClick={handleCityClick}
            style={{ cursor: 'grab', textDecoration: 'underline dotted rgba(255,255,255,0.25)', textUnderlineOffset: 3 }}>
            {formatCityState(event)}
          </span>
        ) : null}
      </td>
      <td onClick={handleCellClick} style={{ ...cellBase, width: widths.venue, minWidth: widths.venue, borderRight: innerBorder, cursor: 'pointer' }}>
        {isEditing ? (editForm.venue_name || '') : (event?.venue_name || '')}
      </td>
      <td
        onClick={!isEditing ? handleCellClick : undefined}
        style={{ ...cellBase, width: widths.status, minWidth: widths.status, borderRight: innerBorder, cursor: isEditing ? 'default' : 'pointer', zIndex: isEditing ? 300 : 1, overflow: isEditing ? 'visible' : 'hidden' }}>
        {isEditing ? (
          <InlineStatusPicker status={editForm.status} onChange={(status) => onChangeForm({ status })} />
        ) : statusStyle ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: statusStyle.color, background: statusStyle.background, border: `0.5px solid ${statusStyle.border}` }}>
            {statusLabel(event.status)}
          </div>
        ) : null}
      </td>
      <td
        onClick={!isEditing ? handleCellClick : undefined}
        style={{ ...cellBase, width: widths.note, minWidth: widths.note, borderRight: isLast ? innerBorder : groupBorder, cursor: isEditing ? 'default' : 'pointer', zIndex: isEditing ? 300 : 1, overflow: 'visible' }}>
        {isEditing ? (
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}>
            <div
              onClick={() => setNoteOpen(o => !o)}
              title="Note"
              style={{ width: 17, height: 17, borderRadius: '50%', cursor: 'pointer', border: '0.5px solid var(--glass-border)', background: editForm.booking_note ? 'rgba(51,255,153,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)' }}>
              ✎
            </div>
            <div
              onClick={onSaveEdit}
              title="Save"
              style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', background: 'var(--mint)', color: '#04140b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              ✓
            </div>
            {noteOpen && (
              <InlineNoteEditor value={editForm.booking_note} onChange={(v) => onChangeForm({ booking_note: v })} onClose={() => setNoteOpen(false)} />
            )}
          </div>
        ) : event?.booking_note ? (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
        ) : null}
      </td>
    </>
  )
}

// ── YEAR SECTION (collapsible grid for one calendar year) ──────────────────────

const WEEK_W = 44
const HOLIDAY_W = 120
const SAT_W = 100
const SUN_W = 100

const CITY_W = 130
const VENUE_W = 160
const STATUS_W = 110
const NOTE_W = 60

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

function YearSection({
  year, rows, yearTours, eventMap, collapsed, onToggleCollapse, currentWeekendSaturday,
  sectionRef, onSaveHoliday,
  editing, editForm, onStartEdit, onSaveEdit, onChangeForm,
  venues, setVenues, mapsLoaded, onCityDrop, onContextMenu, noteOpen, setNoteOpen,
  dragOverKey, onDragEnterCell, onDragLeaveCell,
}) {
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
                    <th key={tour.id} colSpan={4} style={{ height: H1, background: HDR_BG, borderBottom: `2px solid ${tourColor}`, borderRight: ti < yearTours.length - 1 ? B_TOUR_GROUP : B_INNER, textAlign: 'center', fontSize: 13, fontWeight: 600, color: tourColor }}>
                      {tour.name}
                    </th>
                  )
                })}
                {yearTours.length === 0 && <th />}
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
                      const isEditingThis = !!(editing && editing.saturday === row.saturday && editing.tourId === tour.id)
                      return (
                        <EditableCellGroup
                          key={tour.id}
                          row={row} tour={tour} event={event}
                          isEditing={isEditingThis}
                          editForm={editForm}
                          onStartEdit={() => onStartEdit(row, tour, event)}
                          onSaveEdit={onSaveEdit}
                          onChangeForm={onChangeForm}
                          venues={venues} setVenues={setVenues} mapsLoaded={mapsLoaded}
                          widths={widths} isLast={ti === yearTours.length - 1} rowHeight={ROW_H}
                          onCityDrop={(eventId) => onCityDrop(eventId, row, tour)}
                          onContextMenu={(e, ev) => onContextMenu(e, ev, row, tour)}
                          noteOpen={isEditingThis && noteOpen}
                          setNoteOpen={setNoteOpen}
                          dragOverKey={dragOverKey}
                          cellKey={cellKey}
                          onDragEnterCell={onDragEnterCell}
                          onDragLeaveCell={onDragLeaveCell}
                        />
                      )
                    })}
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
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [holidayOverrides, setHolidayOverrides] = useState({})

  const [editing, setEditing] = useState(null) // { saturday, sunday, tourId, eventId }
  const [editForm, setEditForm] = useState({ city: '', state: '', venue_name: '', venue_id: null, status: 'tentative', booking_note: '' })
  const [noteOpen, setNoteOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)

  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [activePastYears, setActivePastYears] = useState(new Set())

  const linkedEventsRef = useRef(false)
  const cleanedShowsRef = useRef(false)
  const sectionRefs = useRef({})

  // Load Google Maps script (same pattern as app/venues/new/page.js)
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return }
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) { existing.addEventListener('load', () => setMapsLoaded(true)); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places`
    script.async = true
    script.dataset.gmaps = 'true'
    script.onload = () => setMapsLoaded(true)
    document.head.appendChild(script)
  }, [])

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

  // ── Inline editing ──────────────────────────────────────────────────────────

  const startEdit = (row, tour, event) => {
    setEditing({ saturday: row.saturday, sunday: row.sunday, tourId: tour.id, eventId: event?.id || null })
    setEditForm(event ? {
      city: event.city || '', state: event.state || '', venue_name: event.venue_name || '',
      venue_id: event.venue_id || null, status: event.status || 'tentative', booking_note: event.booking_note || '',
    } : { city: '', state: '', venue_name: '', venue_id: null, status: 'tentative', booking_note: '' })
    setNoteOpen(false)
    setContextMenu(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setNoteOpen(false)
  }

  const changeEditForm = (patch) => setEditForm(prev => ({ ...prev, ...patch }))

  const saveEdit = async () => {
    if (!editing) return
    const supabase = getSupabase()
    if (editing.eventId) {
      const { data, error } = await supabase.from('events').update({
        city: editForm.city,
        state: editForm.state,
        venue_name: editForm.venue_name,
        venue_id: editForm.venue_id,
        status: editForm.status,
        booking_note: editForm.booking_note,
      }).eq('id', editing.eventId).select().single()
      if (!error && data) setEvents(prev => prev.map(e => e.id === data.id ? data : e))
    } else {
      if (!editForm.city && !editForm.venue_name) { cancelEdit(); return }
      const { data, error } = await supabase.from('events').insert([{
        tour_id: editing.tourId,
        city: editForm.city,
        state: editForm.state,
        venue_name: editForm.venue_name,
        venue_id: editForm.venue_id,
        status: editForm.status,
        booking_note: editForm.booking_note,
        saturday_date: editing.saturday,
        sunday_date: editing.sunday,
        load_in_date: editing.saturday,
      }]).select().single()
      if (!error && data) setEvents(prev => [...prev, data])
    }
    setEditing(null)
    setNoteOpen(false)
  }

  // Escape cancels the active edit; Enter (outside text inputs) saves it
  useEffect(() => {
    if (!editing) return
    const handleKey = (e) => {
      if (e.key === 'Escape') cancelEdit()
      else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') saveEdit()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editForm])

  const deleteEvent = async (event) => {
    const supabase = getSupabase()
    await supabase.from('show_list').delete().eq('event_id', event.id)
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== event.id))
  }

  // ── Context menu ───────────────────────────────────────────────────────────

  const openContextMenu = (e, event, row, tour) => setContextMenu({ x: e.clientX, y: e.clientY, event, row, tour })
  const closeContextMenu = () => setContextMenu(null)

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragEnterCell = (key) => setDragOverKey(key)
  const handleDragLeaveCell = (key) => setDragOverKey(prev => (prev === key ? null : prev))

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

  // ── Past year pills ───────────────────────────────────────────────────────

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

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading booking grid...</div>
    </div>
  )

  const activePastYearsSorted = [...activePastYears].sort((a, b) => b - a)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{ marginTop: 62, padding: '14px 28px 0', background: 'var(--bg)' }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>All Events</div>
        <PastYearPills years={pastYears} activeYears={activePastYears} onToggle={togglePastYear} />
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
              currentWeekendSaturday={currentWeekendSaturday}
              sectionRef={(el) => { sectionRefs.current[year] = el }}
              onSaveHoliday={saveHolidayOverride}
              editing={editing}
              editForm={editForm}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onChangeForm={changeEditForm}
              venues={venues}
              setVenues={setVenues}
              mapsLoaded={mapsLoaded}
              onCityDrop={handleCityDrop}
              onContextMenu={openContextMenu}
              noteOpen={noteOpen}
              setNoteOpen={setNoteOpen}
              dragOverKey={dragOverKey}
              onDragEnterCell={handleDragEnterCell}
              onDragLeaveCell={handleDragLeaveCell}
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
              currentWeekendSaturday={currentWeekendSaturday}
              sectionRef={(el) => { sectionRefs.current[year] = el }}
              onSaveHoliday={saveHolidayOverride}
              editing={editing}
              editForm={editForm}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onChangeForm={changeEditForm}
              venues={venues}
              setVenues={setVenues}
              mapsLoaded={mapsLoaded}
              onCityDrop={handleCityDrop}
              onContextMenu={openContextMenu}
              noteOpen={noteOpen}
              setNoteOpen={setNoteOpen}
              dragOverKey={dragOverKey}
              onDragEnterCell={handleDragEnterCell}
              onDragLeaveCell={handleDragLeaveCell}
            />
          )
        })}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={() => { startEdit(contextMenu.row, contextMenu.tour, contextMenu.event); closeContextMenu() }}
          onDelete={async () => { await deleteEvent(contextMenu.event); closeContextMenu() }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
