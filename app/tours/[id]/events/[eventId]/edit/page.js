'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../../../components/TopNav'
import { getSupabase } from '../../../../../../lib/supabase'

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
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [form, setForm] = useState({
    city: '',
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
      const [eventRes, venuesRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('venues').select('id, name, city, country, address').order('name', { ascending: true }),
      ])

      if (!eventRes.error && eventRes.data) {
        const data = eventRes.data
        setForm({
          city: data.city || '',
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
      setLoading(false)
    }
    fetchData()
  }, [eventId])

  const filteredVenues = venues.filter(v =>
    v.name?.toLowerCase().includes(venueSearch.toLowerCase()) ||
    v.city?.toLowerCase().includes(venueSearch.toLowerCase())
  )

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue)
    setForm(prev => ({ ...prev, venue_id: venue.id, venue_name: venue.name, city: venue.city || prev.city, country: venue.country || prev.country }))
    setVenueSearch(venue.name)
    setShowVenueList(false)
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
    fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px', borderRadius: 8,
    border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
  }

  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.push(`/tours/${id}/events/${eventId}`)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Edit Event</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Venue picker */}
          <div>
            <label style={labelStyle}>Venue</label>
            {selectedVenue ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, border: '0.5px solid rgba(51,255,153,0.35)', background: 'rgba(51,255,153,0.06)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--mint)' }}>{selectedVenue.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{[selectedVenue.city, selectedVenue.country].filter(Boolean).join(', ')}</div>
                </div>
                <div onClick={handleClearVenue} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >✕ Clear</div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} placeholder="Search venues or leave blank to enter manually..."
                  value={venueSearch}
                  onChange={e => { setVenueSearch(e.target.value); setShowVenueList(true) }}
                  onFocus={() => setShowVenueList(true)}
                  onBlur={() => setTimeout(() => setShowVenueList(false), 150)}
                />
                {showVenueList && filteredVenues.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {filteredVenues.map(venue => (
                      <div key={venue.id} onMouseDown={() => handleSelectVenue(venue)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{venue.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{[venue.city, venue.country].filter(Boolean).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* City + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input style={inputStyle} placeholder="e.g. Manchester" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} placeholder="e.g. United Kingdom" value={form.country} onChange={e => set('country', e.target.value)} />
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

          {/* Extended Load-Out toggle */}
          <div>
            <div onClick={() => setExtendedLoadOut(!extendedLoadOut)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: extendedLoadOut ? 'var(--mint)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: extendedLoadOut ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: extendedLoadOut ? '#0a1628' : 'rgba(255,255,255,0.4)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: extendedLoadOut ? 'var(--text-primary)' : 'var(--text-muted)' }}>Extended Load-Out</span>
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

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => router.push(`/tours/${id}/events/${eventId}`)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}