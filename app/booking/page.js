'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
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

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'cancelled', 'want', 'date-hold']

const statusLabel = (s) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')

// ── TOUR ORDERING ─────────────────────────────────────────────────────────────

const TOUR_ORDER = ['HWMTL Orange', 'HWMTL Blue', 'HWSS North America Red', 'HWMTL Purple', 'HWMTL Yellow', 'HWSS Gold']

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

// Ensure show_list rows for an event match its saturday/sunday weekend dates
async function syncShowDates(supabase, eventId, saturday, sunday) {
  const { data: existing } = await supabase
    .from('show_list')
    .select('id, show_date')
    .eq('event_id', eventId)
    .order('show_date', { ascending: true })

  if (!existing || existing.length === 0) {
    await supabase.from('show_list').insert([
      { event_id: eventId, show_date: saturday },
      { event_id: eventId, show_date: sunday },
    ])
  } else if (existing.length === 1) {
    await supabase.from('show_list').update({ show_date: saturday }).eq('id', existing[0].id)
    await supabase.from('show_list').insert([{ event_id: eventId, show_date: sunday }])
  } else {
    await supabase.from('show_list').update({ show_date: saturday }).eq('id', existing[0].id)
    await supabase.from('show_list').update({ show_date: sunday }).eq('id', existing[existing.length - 1].id)
  }
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

function VenuePicker({ city, state, venues, setVenues, mapsLoaded, value, onChange }) {
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
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid var(--glass-border)', borderRadius: 8, padding: 10 }}>
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
          <button onClick={handleCancelCreate} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveNewVenue} disabled={savingVenue} style={{ fontSize: 12, padding: '6px 14px' }}>{savingVenue ? 'Saving...' : 'Save & Select'}</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        placeholder="Search venue..."
        value={query}
        onChange={handleQueryChange}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {show && mode === 'search' && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
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
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
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

// ── EVENT POPOVER (add / edit a booking cell) ──────────────────────────────────

function EventPopover({ anchorRef, event, venues, setVenues, mapsLoaded, onSave, onDelete, onClose }) {
  const [venueName, setVenueName] = useState(event?.venue_name || '')
  const [city, setCity] = useState(event?.city || '')
  const [state, setState] = useState(event?.state || '')
  const [venueId, setVenueId] = useState(event?.venue_id || null)
  const [status, setStatus] = useState(event?.status || 'tentative')
  const [note, setNote] = useState(event?.booking_note || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  // Anchor the popover (rendered into document.body) to the cell that opened it
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const width = 270
    setPos({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - width - 12),
      anchorTop: rect.top,
    })
  }, [anchorRef])

  // After the popover is rendered, flip it upward if it would overflow the bottom of the viewport
  useLayoutEffect(() => {
    if (!pos || !ref.current) return
    const height = ref.current.getBoundingClientRect().height
    if (pos.top + height > window.innerHeight - 20) {
      const flippedTop = Math.max(8, pos.anchorTop - height - 4)
      if (flippedTop !== pos.top) {
        setPos(prev => ({ ...prev, top: flippedTop }))
      }
    }
  }, [pos])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose()
    }
    const handleScroll = () => onClose()
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, anchorRef])

  const handleVenueChange = ({ venue_name, city: newCity, state: newState, venue_id }) => {
    setVenueName(venue_name)
    if (newCity) setCity(newCity)
    if (newState) setState(newState)
    setVenueId(venue_id)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ venue_name: venueName, city, state, venue_id: venueId, status, booking_note: note })
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(event)
    setDeleting(false)
  }

  if (!pos) return null

  return createPortal(
    <div ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000, width: 270, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'default' }}>
      <div>
        <label style={labelStyle}>Venue</label>
        {mapsLoaded ? (
          <VenuePicker value={venueName} onChange={handleVenueChange} city={city} state={state} venues={venues} setVenues={setVenues} mapsLoaded={mapsLoaded} />
        ) : (
          <input style={inputStyle} value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="Venue name" />
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>City</label>
          <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>State</label>
          <input style={inputStyle} value={state} onChange={e => setState(e.target.value)} placeholder="ST" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{statusLabel(opt)}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Note</label>
        <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} placeholder="Booking note..." />
      </div>
      {confirmingDelete ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '0.5px solid var(--glass-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Are you sure? This cannot be undone.</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setConfirmingDelete(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.12)', color: '#FF6666', cursor: 'pointer' }}>{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {event ? (
            <button onClick={() => setConfirmingDelete(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#FF6666', cursor: 'pointer' }}>Delete Event</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 12, padding: '6px 14px' }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
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

// ── TOUR CELL GROUP (City / Venue / Status / Note for one tour x weekend) ──────

function TourCellGroup({ event, isActive, onOpen, onClose, onSave, onDelete, venues, setVenues, mapsLoaded, widths, isLast, rowHeight }) {
  const router = useRouter()
  const statusStyle = event?.status ? (STATUS_STYLES[event.status] || STATUS_STYLES.tentative) : null
  const cellRef = useRef(null)
  const cellBase = {
    height: rowHeight, padding: '0 8px', cursor: 'pointer',
    borderBottom: '0.5px solid rgba(255,255,255,0.07)',
    fontSize: 12, color: 'var(--text-secondary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    verticalAlign: 'middle', textAlign: 'center',
  }
  const innerBorder = '0.5px solid rgba(255,255,255,0.07)'
  const groupBorder = '2px solid rgba(255,255,255,0.18)'

  const handleCityClick = (e) => {
    e.stopPropagation()
    router.push(`/tours/${event.tour_id}/events/${event.id}`)
  }

  return (
    <>
      <td
        ref={cellRef}
        onClick={onOpen}
        style={{ ...cellBase, width: widths.city, minWidth: widths.city, borderRight: innerBorder }}>
        {event ? (
          <span onClick={handleCityClick} style={{ cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.25)', textUnderlineOffset: 3 }}>
            {formatCityState(event)}
          </span>
        ) : formatCityState(event)}
        {isActive && (
          <EventPopover anchorRef={cellRef} event={event} venues={venues} setVenues={setVenues} mapsLoaded={mapsLoaded} onSave={onSave} onDelete={onDelete} onClose={onClose} />
        )}
      </td>
      <td onClick={onOpen} style={{ ...cellBase, width: widths.venue, minWidth: widths.venue, borderRight: innerBorder }}>
        {event?.venue_name || ''}
      </td>
      <td onClick={onOpen} style={{ ...cellBase, width: widths.status, minWidth: widths.status, borderRight: innerBorder }}>
        {statusStyle && (
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, color: statusStyle.color, background: statusStyle.background, border: `0.5px solid ${statusStyle.border}` }}>
            {statusLabel(event.status)}
          </div>
        )}
      </td>
      <td onClick={onOpen} style={{ ...cellBase, width: widths.note, minWidth: widths.note, borderRight: isLast ? innerBorder : groupBorder }}>
        {event?.booking_note ? (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block' }} />
        ) : null}
      </td>
    </>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

const WEEK_W = 44
const HOLIDAY_W = 120
const SAT_W = 100
const SUN_W = 100

const CITY_W = 110
const VENUE_W = 160
const STATUS_W = 110
const NOTE_W = 50

const H1 = 40
const H2 = 34
const ROW_H = 36

const HDR_BG = '#0a1628'
const STICKY_BG = 'rgba(5,14,28,1)'
const B_INNER = '0.5px solid rgba(255,255,255,0.07)'
const B_HEADER_BOTTOM = '2px solid rgba(255,255,255,0.18)'
const B_LEFT_COL = '2px solid rgba(255,255,255,0.18)'
const B_TOUR_GROUP = '2px solid rgba(255,255,255,0.18)'

export default function BookingPage() {
  const [tours, setTours] = useState([])
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(2026)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [activeCell, setActiveCell] = useState(null)
  const [holidayOverrides, setHolidayOverrides] = useState({})
  const linkedEventsRef = useRef(false)

  // Load Google Maps script (same pattern as app/venues/new/page.js)
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return }
    const existing = document.querySelector('script[data-gmaps]')
    if (existing) { existing.addEventListener('load', () => setMapsLoaded(true)); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
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

      // Backfill show_list rows for events that have weekend dates but no shows yet
      const showList = data.showList || []
      const eventsWithShows = new Set(showList.map(s => s.event_id))
      const toBackfill = (data.events || []).filter(ev =>
        ev.saturday_date && ev.sunday_date && !eventsWithShows.has(ev.id)
      )
      if (toBackfill.length > 0) {
        const supabase = getSupabase()
        for (const ev of toBackfill) {
          await supabase.from('show_list').insert([
            { event_id: ev.id, show_date: ev.saturday_date },
            { event_id: ev.id, show_date: ev.sunday_date },
          ])
        }
      }

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
    }
    fetchAll()
  }, [])

  // Manual holiday overrides persist per-year in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('booking_holidays_' + year)
      setHolidayOverrides(raw ? JSON.parse(raw) : {})
    } catch {
      setHolidayOverrides({})
    }
  }, [year])

  const saveHolidayOverride = (saturday, text) => {
    setHolidayOverrides(prev => {
      const next = { ...prev, [saturday]: text }
      try { localStorage.setItem('booking_holidays_' + year, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Years available in the dropdown — every distinct year that has at least one event,
  // derived from saturday_date (preferred) or load_in_date. Always includes the
  // currently selected year so the select stays valid even with no events yet.
  const yearsSet = new Set([year])
  events.forEach(ev => {
    const dateStr = ev.saturday_date || ev.load_in_date
    if (dateStr) yearsSet.add(new Date(dateStr + 'T00:00:00').getFullYear())
  })
  const years = [...yearsSet].sort((a, b) => a - b)

  // Sat/Sun backbone for the selected year
  const saturdays = getSaturdaysOfYear(year)
  const satSet = new Set(saturdays)
  const autoHolidays = buildHolidayMap(year, saturdays)
  const rows = saturdays.map((sat, i) => ({
    weekNum: i + 1,
    saturday: sat,
    sunday: addDays(sat, 1),
    holiday: holidayOverrides[sat] !== undefined ? holidayOverrides[sat] : (autoHolidays[sat] || ''),
  }))

  // Tours that have at least one event in the selected year
  const tourIdsWithEvents = new Set(
    events.filter(ev => satSet.has(getEventSaturday(ev))).map(ev => ev.tour_id)
  )
  const yearTours = tours
    .filter(t => tourIdsWithEvents.has(t.id))
    .sort((a, b) => {
      const ai = tourOrderIndex(a)
      const bi = tourOrderIndex(b)
      if (ai !== bi) return ai - bi
      return (a.name || '').localeCompare(b.name || '')
    })

  // Map of "tourId__saturday" -> event
  const eventMap = {}
  events.forEach(ev => {
    const sat = getEventSaturday(ev)
    if (!sat) return
    eventMap[ev.tour_id + '__' + sat] = ev
  })

  const handleSaveCell = async (row, tour, existingEvent, formData) => {
    const supabase = getSupabase()
    if (existingEvent) {
      const { data, error } = await supabase.from('events').update({
        city: formData.city,
        state: formData.state,
        venue_name: formData.venue_name,
        venue_id: formData.venue_id,
        status: formData.status,
        booking_note: formData.booking_note,
        saturday_date: row.saturday,
        sunday_date: row.sunday,
      }).eq('id', existingEvent.id).select().single()
      if (!error && data) {
        await syncShowDates(supabase, data.id, row.saturday, row.sunday)
        setEvents(prev => prev.map(e => e.id === data.id ? data : e))
      }
    } else {
      const { data, error } = await supabase.from('events').insert([{
        tour_id: tour.id,
        city: formData.city,
        state: formData.state,
        venue_name: formData.venue_name,
        venue_id: formData.venue_id,
        status: formData.status,
        booking_note: formData.booking_note,
        saturday_date: row.saturday,
        sunday_date: row.sunday,
        load_in_date: row.saturday,
      }]).select().single()
      if (!error && data) {
        await syncShowDates(supabase, data.id, row.saturday, row.sunday)
        setEvents(prev => [...prev, data])
      }
    }
    setActiveCell(null)
  }

  const handleDeleteCell = async (existingEvent) => {
    if (!existingEvent) return
    const supabase = getSupabase()
    await supabase.from('show_list').delete().eq('event_id', existingEvent.id)
    const { error } = await supabase.from('events').delete().eq('id', existingEvent.id)
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== existingEvent.id))
    }
    setActiveCell(null)
  }

  const widths = { city: CITY_W, venue: VENUE_W, status: STATUS_W, note: NOTE_W }

  const leftThStyle = (left, width, top) => ({
    position: 'sticky', top, left, zIndex: 60, width, minWidth: width,
    background: HDR_BG, padding: '0 10px', textAlign: 'left', verticalAlign: 'middle',
    fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
    borderBottom: B_HEADER_BOTTOM, borderRight: B_INNER,
  })

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading booking grid...</div>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, flexShrink: 0, padding: '14px 28px 12px', borderBottom: '0.5px solid var(--glass-border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>All Events</div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {yearTours.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>No tours scheduled for {year}</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={leftThStyle(0, WEEK_W, 0)} />
                <th style={leftThStyle(WEEK_W, HOLIDAY_W, 0)} />
                <th style={leftThStyle(WEEK_W + HOLIDAY_W, SAT_W, 0)} />
                <th style={{ ...leftThStyle(WEEK_W + HOLIDAY_W + SAT_W, SUN_W, 0), borderRight: B_LEFT_COL }} />
                {yearTours.map((tour, ti) => {
                  const tourColor = tour.color || '#C9A84C'
                  return (
                    <th key={tour.id} colSpan={4} style={{ position: 'sticky', top: 0, zIndex: 30, height: H1, background: HDR_BG, borderBottom: `2px solid ${tourColor}`, borderRight: ti < yearTours.length - 1 ? B_TOUR_GROUP : B_INNER, textAlign: 'center', fontSize: 13, fontWeight: 600, color: tourColor }}>
                      {tour.name}
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th style={{ ...leftThStyle(0, WEEK_W, H1), top: H1, textAlign: 'center' }}>Wk</th>
                <th style={{ ...leftThStyle(WEEK_W, HOLIDAY_W, H1), top: H1, textAlign: 'center' }}>Holiday</th>
                <th style={{ ...leftThStyle(WEEK_W + HOLIDAY_W, SAT_W, H1), top: H1, textAlign: 'center' }}>Sat</th>
                <th style={{ ...leftThStyle(WEEK_W + HOLIDAY_W + SAT_W, SUN_W, H1), top: H1, textAlign: 'center', borderRight: B_LEFT_COL }}>Sun</th>
                {yearTours.map((tour, ti) => (
                  <React.Fragment key={tour.id}>
                    <th style={{ position: 'sticky', top: H1, zIndex: 30, width: CITY_W, minWidth: CITY_W, height: H2, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: B_INNER, padding: '0 8px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>City</th>
                    <th style={{ position: 'sticky', top: H1, zIndex: 30, width: VENUE_W, minWidth: VENUE_W, height: H2, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: B_INNER, padding: '0 8px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Venue</th>
                    <th style={{ position: 'sticky', top: H1, zIndex: 30, width: STATUS_W, minWidth: STATUS_W, height: H2, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: B_INNER, padding: '0 8px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                    <th style={{ position: 'sticky', top: H1, zIndex: 30, width: NOTE_W, minWidth: NOTE_W, height: H2, background: HDR_BG, borderBottom: B_HEADER_BOTTOM, borderRight: ti < yearTours.length - 1 ? B_TOUR_GROUP : B_INNER, padding: '0 4px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Note</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.saturday}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 20, width: WEEK_W, minWidth: WEEK_W, height: ROW_H, background: STICKY_BG, borderRight: B_INNER, borderBottom: B_INNER, padding: '0 8px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', verticalAlign: 'middle' }}>
                    {row.weekNum}
                  </td>
                  <td style={{ position: 'sticky', left: WEEK_W, zIndex: 20, width: HOLIDAY_W, minWidth: HOLIDAY_W, height: ROW_H, background: STICKY_BG, borderRight: B_INNER, borderBottom: B_INNER, padding: '0 10px', verticalAlign: 'middle' }}>
                    <HolidayCell value={row.holiday} onSave={(text) => saveHolidayOverride(row.saturday, text)} />
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
                    const isActive = activeCell === cellKey
                    return (
                      <TourCellGroup
                        key={tour.id}
                        event={event}
                        isActive={isActive}
                        onOpen={() => setActiveCell(isActive ? null : cellKey)}
                        onClose={() => setActiveCell(null)}
                        onSave={(formData) => handleSaveCell(row, tour, event, formData)}
                        onDelete={() => handleDeleteCell(event)}
                        venues={venues}
                        setVenues={setVenues}
                        mapsLoaded={mapsLoaded}
                        widths={widths}
                        isLast={ti === yearTours.length - 1}
                        rowHeight={ROW_H}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
