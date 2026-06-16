'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../../components/TopNav'
import { getSupabase } from '../../../../../lib/supabase'

export default function NewEvent() {
  const router = useRouter()
  const { id } = useParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extendedLoadOut, setExtendedLoadOut] = useState(false)
  const [venues, setVenues] = useState([])
  const [venueSearch, setVenueSearch] = useState('')
  const [showVenueList, setShowVenueList] = useState(false)
  const [venueActiveIndex, setVenueActiveIndex] = useState(-1)
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [countrySuggestions, setCountrySuggestions] = useState([])
  const [allCountries, setAllCountries] = useState([])
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false)
  const [countryActiveIndex, setCountryActiveIndex] = useState(-1)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  // Inline create venue state
  const [creatingVenue, setCreatingVenue] = useState(false)
  const [savingVenue, setSavingVenue] = useState(false)
  const [venueError, setVenueError] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false)
  const [placeActiveIndex, setPlaceActiveIndex] = useState(-1)
  const [sessionToken, setSessionToken] = useState(null)
  const [newVenue, setNewVenue] = useState({
    name: '', address: '', city: '', state: '', country: '',
    full_address: '', place_id: '', latitude: null, longitude: null, zip: '', region: '',
  })

  const countryRef = useRef(null)
  const debounceRef = useRef(null)
  const placeInputRef = useRef(null)

  const [form, setForm] = useState({
    city: '', country: '', venue_name: '', venue_id: null,
    state: '', event_type: '', status: 'tentative',
    load_in_date: '', load_out_date: '', notes: '',
  })

  const [shows, setShows] = useState([{ show_date: '', show_time: '' }])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Load Google Maps
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
    if (mapsLoaded && window.google && !sessionToken) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
    }
  }, [mapsLoaded])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [venuesRes, tourRes, countriesRes] = await Promise.all([
        supabase.from('venues').select('id, name, city, state, country, address').order('name', { ascending: true }),
        supabase.from('tours').select('tour_type').eq('id', id).single(),
        supabase.from('events').select('country').not('country', 'is', null),
      ])
      if (venuesRes.data) setVenues(venuesRes.data)
      if (tourRes.data?.tour_type) setForm(prev => ({ ...prev, event_type: tourRes.data.tour_type }))
      if (countriesRes.data) {
        const unique = [...new Set(countriesRes.data.map(r => r.country).filter(Boolean))].sort()
        setAllCountries(unique)
      }
    }
    fetchData()
  }, [id])

  const handleCountryChange = (val) => {
    set('country', val)
    setCountryActiveIndex(-1)
    if (val.trim().length > 0) {
      const filtered = allCountries.filter(c => c.toLowerCase().startsWith(val.toLowerCase()))
      setCountrySuggestions(filtered)
      setShowCountrySuggestions(filtered.length > 0)
    } else {
      setShowCountrySuggestions(false)
    }
  }

  const handleCountryKeyDown = (e) => {
    if (!showCountrySuggestions) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCountryActiveIndex(i => Math.min(i + 1, countrySuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCountryActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && countryActiveIndex >= 0) { e.preventDefault(); set('country', countrySuggestions[countryActiveIndex]); setShowCountrySuggestions(false); setCountryActiveIndex(-1) }
    else if (e.key === 'Escape') { setShowCountrySuggestions(false); setCountryActiveIndex(-1) }
  }

  const filteredVenues = venues.filter(v =>
    v.name?.toLowerCase().includes(venueSearch.toLowerCase()) ||
    v.city?.toLowerCase().includes(venueSearch.toLowerCase())
  )

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue)
    setForm(prev => ({
      ...prev,
      venue_id: venue.id,
      venue_name: venue.name,
      city: venue.city || prev.city,
      state: venue.state || prev.state,
      country: venue.country || prev.country,
    }))
    setVenueSearch(venue.name)
    setShowVenueList(false)
    setVenueActiveIndex(-1)
  }

  const handleVenueKeyDown = (e) => {
    if (!showVenueList) return
    const optionsCount = filteredVenues.length + 1 // +1 for "Create New Venue"
    if (e.key === 'ArrowDown') { e.preventDefault(); setVenueActiveIndex(i => Math.min(i + 1, optionsCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setVenueActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      if (venueActiveIndex < 0) return
      e.preventDefault()
      if (venueActiveIndex < filteredVenues.length) handleSelectVenue(filteredVenues[venueActiveIndex])
      else { setCreatingVenue(true); setShowVenueList(false); setVenueActiveIndex(-1) }
    }
    else if (e.key === 'Escape') { setShowVenueList(false); setVenueActiveIndex(-1) }
  }

  const handleClearVenue = () => {
    setSelectedVenue(null)
    setVenueSearch('')
    setForm(prev => ({ ...prev, venue_id: null, venue_name: '' }))
  }

  // Google Places for inline venue creation
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
        const city = get('locality')?.long_name || get('postal_town')?.long_name || get('sublocality')?.long_name || ''
        const state = get('administrative_area_level_1')?.short_name || ''
        const country = get('country')?.long_name || ''
        const zip = get('postal_code')?.long_name || ''
        setNewVenue({
          name: place.name || '',
          address: [streetNum, route].filter(Boolean).join(' '),
          city, state, country, zip,
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

  const handleSaveNewVenue = async () => {
    if (!newVenue.name.trim()) { setVenueError('Venue name is required'); return }
    setSavingVenue(true)
    setVenueError('')
    const supabase = getSupabase()
    const { data, error } = await supabase.from('venues').insert([newVenue]).select().single()
    if (error) { setVenueError(error.message); setSavingVenue(false); return }
    // Add to venues list and auto-select
    setVenues(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    handleSelectVenue(data)
    setCreatingVenue(false)
    setNewVenue({ name: '', address: '', city: '', state: '', country: '', full_address: '', place_id: '', latitude: null, longitude: null, zip: '', region: '' })
    setSavingVenue(false)
  }

  const addShow = () => setShows(prev => [...prev, { show_date: '', show_time: '' }])
  const removeShow = (i) => setShows(prev => prev.filter((_, idx) => idx !== i))
  const updateShow = (i, key, val) => setShows(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s))

  const handleSave = async () => {
    if (!form.city.trim()) { setError('City is required'); return }
    if (!form.load_in_date) { setError('Load-in date is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const payload = {
      city: form.city, country: form.country, venue_name: form.venue_name,
      venue_id: form.venue_id || null, state: form.state,
      event_type: form.event_type || null, status: form.status,
      load_in_date: form.load_in_date, notes: form.notes, tour_id: id,
    }
    if (extendedLoadOut && form.load_out_date) payload.load_out_date = form.load_out_date
    const { data, error } = await supabase.from('events').insert([payload]).select().single()
    if (error) { setError(error.message); setSaving(false); return }

    const showRows = shows
      .filter(s => s.show_date)
      .map(s => ({ event_id: data.id, show_date: s.show_date, show_time: s.show_time || null, completed: false }))
    if (showRows.length > 0) {
      const { error: showError } = await supabase.from('show_list').insert(showRows)
      if (showError) { setError(showError.message); setSaving(false); return }
    }

    router.push(`/tours/${id}`)
  }

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '10px 14px',
    borderRadius: 8, border: '1px solid #d4cfc8',
    background: '#ffffff', color: '#1a1a1a', caretColor: '#0a1628',
    outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 12, color: '#6b6b6b', letterSpacing: '0.05em',
    marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/tours/${id}`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ← Back
          </button>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Add Event</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Venue picker */}
          <div>
            <label style={labelStyle}>Venue</label>
            {selectedVenue ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, border: '1px solid #16a34a', background: 'rgba(22,163,74,0.08)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>{selectedVenue.name}</div>
                  <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>{[selectedVenue.city, selectedVenue.country].filter(Boolean).join(', ')}</div>
                </div>
                <div onClick={handleClearVenue} style={{ fontSize: 13, color: '#6b6b6b', cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b6b6b'}>
                  × Clear
                </div>
              </div>
            ) : creatingVenue ? (
              /* Inline Create Venue Form */
              <div style={{ background: '#faf8f4', border: '1px solid #e8e2d9', borderRadius: 10, padding: '20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 16 }}>New Venue</div>

                {/* Google Places name search */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <label style={labelStyle}>Venue Name *</label>
                  <input
                    ref={placeInputRef}
                    style={inputStyle}
                    placeholder="Search venue name..."
                    value={newVenue.name}
                    onChange={handlePlaceNameChange}
                    onKeyDown={handlePlaceKeyDown}
                    onFocus={() => placeSuggestions.length > 0 && setShowPlaceSuggestions(true)}
                    autoComplete="off"
                  />
                  {showPlaceSuggestions && placeSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                      {placeSuggestions.map((p, i) => (
                        <div key={p.place_id}
                          onMouseDown={() => handlePlaceSelect(p)}
                          onMouseEnter={() => setPlaceActiveIndex(i)}
                          onMouseLeave={() => setPlaceActiveIndex(-1)}
                          style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid var(--glass-border)', background: i === placeActiveIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
                          <div style={{ color: i === placeActiveIndex ? 'var(--mint)' : 'var(--text-primary)', fontWeight: 500 }}>{p.structured_formatting?.main_text}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{p.structured_formatting?.secondary_text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Auto-filled address fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Street Address</label>
                    <input style={inputStyle} placeholder="Auto-filled" value={newVenue.address} onChange={e => setNewVenue(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input style={inputStyle} placeholder="City" value={newVenue.city} onChange={e => setNewVenue(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input style={inputStyle} placeholder="State" value={newVenue.state} onChange={e => setNewVenue(p => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Country</label>
                    <input style={inputStyle} placeholder="Country" value={newVenue.country} onChange={e => setNewVenue(p => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>

                {venueError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{venueError}</div>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setCreatingVenue(false); setNewVenue({ name: '', address: '', city: '', state: '', country: '', full_address: '', place_id: '', latitude: null, longitude: null, zip: '', region: '' }); setVenueError('') }}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'transparent', color: '#1a1a1a', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0ece5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleSaveNewVenue} disabled={savingVenue} style={{ fontSize: 13, padding: '7px 16px' }}>
                    {savingVenue ? 'Saving...' : 'Save & Select Venue'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} placeholder="Search venues or leave blank to enter manually..."
                  value={venueSearch}
                  onChange={e => { setVenueSearch(e.target.value); setShowVenueList(true); setVenueActiveIndex(-1) }}
                  onFocus={() => setShowVenueList(true)}
                  onBlur={() => setTimeout(() => setShowVenueList(false), 150)}
                  onKeyDown={handleVenueKeyDown}
                />
                {showVenueList && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {filteredVenues.map((venue, i) => (
                      <div key={venue.id} onMouseDown={() => handleSelectVenue(venue)}
                        onMouseEnter={() => setVenueActiveIndex(i)}
                        onMouseLeave={() => setVenueActiveIndex(-1)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)', background: i === venueActiveIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: i === venueActiveIndex ? 'var(--mint)' : 'var(--text-primary)' }}>{venue.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{[venue.city, venue.country].filter(Boolean).join(', ')}</div>
                      </div>
                    ))}
                    {/* Create new venue option */}
                    <div
                      onMouseDown={() => { setCreatingVenue(true); setShowVenueList(false) }}
                      onMouseEnter={() => setVenueActiveIndex(filteredVenues.length)}
                      onMouseLeave={() => setVenueActiveIndex(-1)}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: filteredVenues.length === venueActiveIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
                      <span style={{ color: 'var(--mint)', fontSize: 16, lineHeight: 1 }}>+</span>
                      <span style={{ fontSize: 14, color: 'var(--mint)' }}>Create New Venue</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* City + State + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input style={inputStyle} placeholder="e.g. Manchester" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>State / Province</label>
              <input style={inputStyle} placeholder="e.g. CA" value={form.state} onChange={e => set('state', e.target.value)} />
            </div>
            <div ref={countryRef} style={{ position: 'relative' }}>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} placeholder="e.g. United Kingdom" value={form.country}
                onChange={e => handleCountryChange(e.target.value)}
                onFocus={() => { if (form.country.trim().length > 0 && countrySuggestions.length > 0) setShowCountrySuggestions(true) }}
                onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 150)}
                onKeyDown={handleCountryKeyDown}
              />
              {showCountrySuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  {countrySuggestions.map((c, i) => (
                    <div key={c} onMouseDown={() => { set('country', c); setShowCountrySuggestions(false); setCountryActiveIndex(-1) }}
                      onMouseEnter={() => setCountryActiveIndex(i)}
                      onMouseLeave={() => setCountryActiveIndex(-1)}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '0.5px solid var(--glass-border)', background: i === countryActiveIndex ? 'rgba(51,255,153,0.08)' : 'transparent', color: i === countryActiveIndex ? 'var(--mint)' : 'var(--text-primary)' }}>
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Event Type + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Event Type</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                <option value="">— Select event type —</option>
                <option value="hwss">Hot Wheels Stunt Show</option>
                <option value="hwmt">Hot Wheels Monster Trucks Live</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="tentative">Tentative</option>
                <option value="1-hold">1-Hold</option>
                <option value="2-hold">2-Hold</option>
                <option value="3-hold">3-Hold</option>
                <option value="confirmed">Confirmed</option>
                <option value="want">Want</option>
                <option value="date-hold">Date Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Load-In Date */}
          <div>
            <label style={labelStyle}>Load-In Date *</label>
            <input style={inputStyle} type="date" value={form.load_in_date} onChange={e => set('load_in_date', e.target.value)} />
          </div>

          {/* Extended Load-Out */}
          <div>
            <div onClick={() => setExtendedLoadOut(!extendedLoadOut)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: extendedLoadOut ? 'var(--mint)' : '#d4cfc8', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: extendedLoadOut ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: extendedLoadOut ? '#0a1628' : '#ffffff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: extendedLoadOut ? '#1a1a1a' : '#6b6b6b' }}>Extended Load-Out</span>
            </div>
            {extendedLoadOut && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Load-Out Date</label>
                <input style={inputStyle} type="date" value={form.load_out_date} onChange={e => set('load_out_date', e.target.value)} />
              </div>
            )}
          </div>

          {/* Shows */}
          <div>
            <label style={labelStyle}>Shows</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shows.map((show, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input style={{ ...inputStyle, flex: 2 }} type="date" value={show.show_date} onChange={e => updateShow(i, 'show_date', e.target.value)} />
                  <input style={{ ...inputStyle, flex: 1 }} type="time" value={show.show_time} onChange={e => updateShow(i, 'show_time', e.target.value)} />
                  <div onClick={() => removeShow(i)} style={{ fontSize: 16, color: '#6b6b6b', cursor: 'pointer', padding: '0 6px', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6b6b6b'}>
                    ×
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addShow} type="button" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'transparent', color: '#16a34a', cursor: 'pointer', marginTop: 10 }}>
              + Add Show
            </button>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Any notes about this event..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}`)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '1px solid #e8e2d9', background: 'transparent', color: '#1a1a1a', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0ece5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Event'}</button>
          </div>

        </div>
      </div>
    </div>
  )
}