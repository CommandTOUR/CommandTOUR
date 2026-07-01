'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../../../components/TopNav'
import { getSupabase } from '../../../../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'

export default function EditEvent() {
  const router = useRouter()
  const { id, eventId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extendedLoadOut, setExtendedLoadOut] = useState(false)
  const [venues, setVenues] = useState([])
  const [venueSearch, setVenueSearch] = useState('')
  const [showVenueList, setShowVenueList] = useState(false)
  const [venueActiveIndex, setVenueActiveIndex] = useState(-1)
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [allCountries, setAllCountries] = useState([])
  const [countrySuggestions, setCountrySuggestions] = useState([])
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false)
  const [countryActiveIndex, setCountryActiveIndex] = useState(-1)
  const countryRef = useRef(null)
  const [form, setForm] = useState({
    city: '',
    state: '',
    country: '',
    venue_name: '',
    venue_id: null,
    status: 'tentative',
    event_type: '',
    load_in_date: '',
    load_out_date: '',
    notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [eventRes, venuesRes, countriesRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('venues').select('id, name, city, state, country, address').order('name', { ascending: true }),
        supabase.from('events').select('country').not('country', 'is', null),
      ])

      if (!eventRes.error && eventRes.data) {
        const data = eventRes.data
        setForm({
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          venue_name: data.venue_name || '',
          venue_id: data.venue_id || null,
          status: data.status || 'tentative',
          event_type: data.event_type || '',
          load_in_date: data.load_in_date || '',
          load_out_date: data.load_out_date || '',
          notes: data.notes || '',
        })
        if (data.load_out_date && data.load_out_date !== data.load_in_date) setExtendedLoadOut(true)
        if (data.venue_id && venuesRes.data) {
          const linked = venuesRes.data.find(v => v.id === data.venue_id)
          if (linked) { setSelectedVenue(linked); setVenueSearch(linked.name) }
        }
      }
      if (!venuesRes.error) setVenues(venuesRes.data || [])
      if (countriesRes.data) {
        const unique = [...new Set(countriesRes.data.map(r => r.country).filter(Boolean))].sort()
        setAllCountries(unique)
      }
      setLoading(false)
    }
    fetchData()
  }, [eventId])

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
    if (!showVenueList || filteredVenues.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setVenueActiveIndex(i => Math.min(i + 1, filteredVenues.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setVenueActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && venueActiveIndex >= 0) { e.preventDefault(); handleSelectVenue(filteredVenues[venueActiveIndex]) }
    else if (e.key === 'Escape') { setShowVenueList(false); setVenueActiveIndex(-1) }
  }

  const handleClearVenue = () => {
    setSelectedVenue(null)
    setVenueSearch('')
    setForm(prev => ({ ...prev, venue_id: null, venue_name: '' }))
  }

  const handleSave = async () => {
    if (!form.city.trim()) { setError('City is required'); return }
    if (!form.load_in_date) { setError('Load-in date is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const payload = {
      city: form.city,
      state: form.state,
      country: form.country,
      venue_name: form.venue_name,
      venue_id: form.venue_id || null,
      status: form.status,
      event_type: form.event_type || null,
      load_in_date: form.load_in_date,
      notes: form.notes,
      load_out_date: extendedLoadOut && form.load_out_date ? form.load_out_date : undefined,
    }
    const { error } = await supabase.from('events').update(payload).eq('id', eventId)
    if (error) { setError(error.message); setSaving(false) }
    else router.push(`/tours/${id}/events/${eventId}`)
  }

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
    color: '#f1f5f9', caretColor: '#33FF99', outline: 'none', width: '100%',
  }
  const labelStyle = { fontSize: 12, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/tours/${id}/events/${eventId}`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ← Back
          </button>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Edit Event</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Venue picker */}
          <div>
            <label style={labelStyle}>Venue</label>
            {selectedVenue ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(51,255,153,0.4)', background: 'rgba(51,255,153,0.08)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#33FF99' }}>{selectedVenue.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{formatLocation(selectedVenue.city, selectedVenue.state, selectedVenue.country, 'full')}</div>
                </div>
                <div onClick={handleClearVenue} style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                  x Clear
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
                {showVenueList && filteredVenues.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {filteredVenues.map((venue, i) => (
                      <div key={venue.id} onMouseDown={() => handleSelectVenue(venue)}
                        onMouseEnter={() => setVenueActiveIndex(i)}
                        onMouseLeave={() => setVenueActiveIndex(-1)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)', background: i === venueActiveIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: i === venueActiveIndex ? 'var(--mint)' : 'var(--text-primary)' }}>{venue.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{formatLocation(venue.city, venue.state, venue.country, 'full')}</div>
                      </div>
                    ))}
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
                <option value="3-hold">3+ Hold</option>
                <option value="confirmed">Confirmed</option>
                <option value="date-hold">Date Hold</option>
              </select>
            </div>
          </div>

          {/* Load-In Date */}
          <div>
            <label style={labelStyle}>Load-In Date *</label>
            <input style={inputStyle} type="date" value={form.load_in_date} onChange={e => set('load_in_date', e.target.value)} />
          </div>

          {/* Extended Load-Out toggle */}
          <div>
            <div onClick={() => setExtendedLoadOut(!extendedLoadOut)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: extendedLoadOut ? 'var(--mint)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: extendedLoadOut ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: extendedLoadOut ? '#0a1628' : '#ffffff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: extendedLoadOut ? '#f1f5f9' : '#94a3b8' }}>Extended Load-Out</span>
            </div>
            {extendedLoadOut && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Load-Out Date</label>
                <input style={inputStyle} type="date" value={form.load_out_date} onChange={e => set('load_out_date', e.target.value)} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Any notes about this event..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}/events/${eventId}`)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>

        </div>
      </div>
    </div>
  )
}