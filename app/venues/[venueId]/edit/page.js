'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'
import { MAPS_API_KEY } from '../../../../lib/maps'

const AUTOCOMPLETE_FIELDS = [
  'city', 'state', 'country', 'floor_size', 'surface_coating',
  'max_height', 'floor_weight_capacity', 'slope_angle', 'video_board_location',
  'tunnel_dims', 'tunnel_position', 'loading_docks', 'pit_trailer_parking',
  'permits', 'noise_restrictions',
]

const REGIONS = ['North America', 'Europe', 'Latin America', 'Asia-Pacific', 'Middle East', 'Africa']
function AutoInput({ fieldKey, label, placeholder, value, onChange, suggestions, inputStyle, labelStyle }) {
  const [show, setShow] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef(null)
  const filtered = (suggestions[fieldKey] || []).filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  )

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleKeyDown = (e) => {
    if (!show || filtered.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); onChange(filtered[activeIndex]); setShow(false); setActiveIndex(-1) }
    else if (e.key === 'Escape') { setShow(false); setActiveIndex(-1) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true); setActiveIndex(-1) }}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
      />
      {show && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {filtered.map((s, i) => (
            <div key={s}
              onMouseDown={() => { onChange(s); setShow(false); setActiveIndex(-1) }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid var(--glass-border)', background: i === activeIndex ? 'rgba(51,255,153,0.08)' : 'transparent', color: i === activeIndex ? 'var(--mint)' : 'var(--text-primary)' }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlacesAutocomplete({ value, onChange, onPlaceSelect, inputStyle, labelStyle }) {
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [sessionToken, setSessionToken] = useState(null)
  const ref = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (window.google && !sessionToken) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
    }
  }, [])

  const fetchSuggestions = useCallback((input) => {
    if (!input || input.length < 2 || !window.google) { setSuggestions([]); return }
    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      { input, types: ['establishment'], sessionToken },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
          setShow(true)
        } else {
          setSuggestions([])
        }
      }
    )
  }, [sessionToken])

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    setActiveIndex(-1)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  const handleSelect = (prediction) => {
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
        const streetAddress = [streetNum, route].filter(Boolean).join(' ')
        const fullAddress = place.formatted_address || ''
        const lat = place.geometry?.location?.lat()
        const lng = place.geometry?.location?.lng()
        const placeId = place.place_id

        onPlaceSelect({
          name: place.name || '',
          address: streetAddress,
          city,
          state,
          country,
          full_address: fullAddress,
          zip,
          place_id: placeId,
          latitude: lat,
          longitude: lng,
        })
        setShow(false)
        setSuggestions([])
        setSessionToken(new window.google.maps.places.AutocompleteSessionToken())
      }
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); handleSelect(suggestions[activeIndex]) }
    else if (e.key === 'Escape') { setShow(false); setActiveIndex(-1) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={labelStyle}>Venue Name *</label>
      <input
        style={inputStyle}
        placeholder="Search to re-link to Google, or edit directly..."
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShow(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          {suggestions.map((p, i) => (
            <div key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid var(--glass-border)', background: i === activeIndex ? 'rgba(51,255,153,0.08)' : 'transparent' }}>
              <div style={{ color: i === activeIndex ? 'var(--mint)' : 'var(--text-primary)', fontWeight: 500 }}>{p.structured_formatting?.main_text}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{p.structured_formatting?.secondary_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditVenue() {
  const router = useRouter()
  const { venueId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [suggestions, setSuggestions] = useState({})
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', country: '',
    full_address: '', place_id: '', latitude: null, longitude: null,
    floor_size: '', surface_coating: '', max_height: '', floor_weight_capacity: '',
    loading_docks: '', tunnel_dims: '', tunnel_position: '', slope_angle: '',
    video_board_location: '', pit_trailer_parking: '', union_status: '',
    noise_restrictions: '', permits: '', notes: '', region: '',
    custom_fields: [], custom_sections: [],
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Custom fields helpers
  const addCustomField = (section) => {
    setForm(prev => ({ ...prev, custom_fields: [...prev.custom_fields, { section, label: '', value: '' }] }))
  }
  const updateCustomField = (index, key, val) => {
    setForm(prev => {
      const updated = [...prev.custom_fields]
      updated[index] = { ...updated[index], [key]: val }
      return { ...prev, custom_fields: updated }
    })
  }
  const removeCustomField = (index) => {
    setForm(prev => ({ ...prev, custom_fields: prev.custom_fields.filter((_, i) => i !== index) }))
  }

  // Custom sections helpers
  const addCustomSection = () => {
    setForm(prev => ({ ...prev, custom_sections: [...prev.custom_sections, { id: crypto.randomUUID(), title: 'New Section', fields: [] }] }))
  }
  const removeCustomSection = (sectionId) => {
    setForm(prev => ({ ...prev, custom_sections: prev.custom_sections.filter(s => s.id !== sectionId) }))
  }
  const updateCustomSectionTitle = (sectionId, title) => {
    setForm(prev => ({ ...prev, custom_sections: prev.custom_sections.map(s => s.id === sectionId ? { ...s, title } : s) }))
  }
  const addCustomSectionField = (sectionId) => {
    setForm(prev => ({ ...prev, custom_sections: prev.custom_sections.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, { label: '', value: '' }] } : s) }))
  }
  const updateCustomSectionField = (sectionId, index, key, val) => {
    setForm(prev => ({ ...prev, custom_sections: prev.custom_sections.map(s => s.id === sectionId ? { ...s, fields: s.fields.map((f, i) => i === index ? { ...f, [key]: val } : f) } : s) }))
  }
  const removeCustomSectionField = (sectionId, index) => {
    setForm(prev => ({ ...prev, custom_sections: prev.custom_sections.map(s => s.id === sectionId ? { ...s, fields: s.fields.filter((_, i) => i !== index) } : s) }))
  }

  // Load Google Maps script
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
    const fetchVenue = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('venues').select('*').eq('id', venueId).single()
      if (!error && data) {
        setForm({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          full_address: data.full_address || '',
          place_id: data.place_id || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          floor_size: data.floor_size || '',
          surface_coating: data.surface_coating || '',
          max_height: data.max_height || '',
          floor_weight_capacity: data.floor_weight_capacity || '',
          loading_docks: data.loading_docks || '',
          tunnel_dims: data.tunnel_dims || '',
          tunnel_position: data.tunnel_position || '',
          slope_angle: data.slope_angle || '',
          video_board_location: data.video_board_location || '',
          pit_trailer_parking: data.pit_trailer_parking || '',
          union_status: data.union_status || '',
          noise_restrictions: data.noise_restrictions || '',
          permits: data.permits || '',
          notes: data.notes || '',
          region: data.region || '',
          custom_fields: data.custom_fields || [],
          custom_sections: data.custom_sections || [],
        })
      }
      setLoading(false)
    }
    fetchVenue()
  }, [venueId])

  useEffect(() => {
    const fetchSuggestions = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('venues').select(AUTOCOMPLETE_FIELDS.join(', '))
      if (!data) return
      const map = {}
      AUTOCOMPLETE_FIELDS.forEach(field => {
        map[field] = [...new Set(data.map(r => r[field]).filter(Boolean))].sort()
      })
      setSuggestions(map)
    }
    fetchSuggestions()
  }, [])

  const handlePlaceSelect = (placeData) => {
    setForm(prev => ({ ...prev, ...placeData }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Venue name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.from('venues').update(form).eq('id', venueId)
    if (error) { setError(error.message); setSaving(false) }
    else router.push(`/venues/${venueId}`)
  }

  const inputStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '10px 14px',
    borderRadius: 8, border: '0.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
    outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em',
    marginBottom: 6, display: 'block',
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', paddingBottom: 10, borderBottom: '0.5px solid var(--glass-border)', marginBottom: 4 }}>
      {title}
    </div>
  )

  const ai = (fieldKey, label, placeholder) => (
    <AutoInput fieldKey={fieldKey} label={label} placeholder={placeholder}
      value={form[fieldKey]} onChange={val => set(fieldKey, val)}
      suggestions={suggestions} inputStyle={inputStyle} labelStyle={labelStyle} />
  )

  const removeBtnStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: 18, lineHeight: 1, padding: '0 8px',
    background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  }

  const addFieldBtnStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7,
    border: '0.5px dashed var(--glass-border)', background: 'transparent', color: 'var(--text-muted)',
    cursor: 'pointer', alignSelf: 'flex-start',
  }

  // Renders the editable rows for a given custom_fields section key (e.g. 'floor', 'access', 'rules')
  const customFieldRows = (sectionKey) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {form.custom_fields.map((f, i) => f.section === sectionKey && (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Field name" value={f.label} onChange={e => updateCustomField(i, 'label', e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Value" value={f.value} onChange={e => updateCustomField(i, 'value', e.target.value)} />
          <button
            onClick={() => removeCustomField(i)}
            style={removeBtnStyle}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >×</button>
        </div>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />

      <div style={{ marginTop: 62 }}>

        {/* Sticky header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'rgba(10,22,40,0.95)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid var(--glass-border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push(`/venues/${venueId}`)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >← Back</button>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>Editing: {form.name || 'Venue'}</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => router.push(`/venues/${venueId}`)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 20 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Basic Info */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Basic Info')}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              {mapsLoaded ? (
                <PlacesAutocomplete
                  value={form.name}
                  onChange={val => set('name', val)}
                  onPlaceSelect={handlePlaceSelect}
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                />
              ) : (
                <div>
                  <label style={labelStyle}>Venue Name *</label>
                  <input style={inputStyle} placeholder="Loading search..." value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Region</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.region} onChange={e => set('region', e.target.value)}>
                  <option value="">Select region...</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Street Address</label>
                <input style={inputStyle} placeholder="Auto-filled from search" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              {ai('city', 'City', 'City')}
              {ai('state', 'State / Province', 'State')}
              {ai('country', 'Country', 'Country')}
            </div>

            {form.full_address && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '0.5px solid var(--glass-border)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Full address:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{form.full_address}</span>
              </div>
            )}
          </div>

          {/* Floor & Structure */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Floor & Structure')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {ai('floor_size', 'Floor Size', 'e.g. 200ft x 100ft')}
              {ai('surface_coating', 'Surface Coating', 'e.g. Concrete')}
              {ai('max_height', 'Max Height', 'e.g. 40ft')}
              {ai('floor_weight_capacity', 'Floor Weight Capacity', 'e.g. 150 lbs/sqft')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {ai('slope_angle', 'Slope Angle', 'e.g. 2 degrees')}
              {ai('video_board_location', 'Video Board Location', 'e.g. Center hung')}
            </div>
            {customFieldRows('floor')}
            <button onClick={() => addCustomField('floor')} style={addFieldBtnStyle}>+ Add Field</button>
          </div>

          {/* Access & Logistics */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Access & Logistics')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {ai('tunnel_dims', 'Tunnel Dimensions', 'e.g. 14ft W x 16ft H')}
              {ai('tunnel_position', 'Tunnel Position', 'e.g. North end')}
              {ai('loading_docks', 'Loading Docks', 'e.g. 4 docks, north side')}
              {ai('pit_trailer_parking', 'Pit / Trailer Parking', 'e.g. Lot B, 20 spaces')}
            </div>
            {customFieldRows('access')}
            <button onClick={() => addCustomField('access')} style={addFieldBtnStyle}>+ Add Field</button>
          </div>

          {/* Rules & Restrictions */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Rules & Restrictions')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Union Status</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.union_status} onChange={e => set('union_status', e.target.value)}>
                  <option value="">Unknown</option>
                  <option value="Union">Union</option>
                  <option value="Non-Union">Non-Union</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
              {ai('permits', 'Permits Required', 'e.g. Fire, pyro, noise')}
              {ai('noise_restrictions', 'Noise Restrictions', 'e.g. No sound after 11pm')}
            </div>
            {customFieldRows('rules')}
            <button onClick={() => addCustomField('rules')} style={addFieldBtnStyle}>+ Add Field</button>
          </div>

          {/* Custom sections */}
          {form.custom_sections.map(section => (
            <div key={section.id} className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '0.5px solid var(--glass-border)' }}>
                <input
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', background: 'transparent', border: 'none', outline: 'none', flex: 1, padding: 0 }}
                  value={section.title}
                  placeholder="Section title"
                  onChange={e => updateCustomSectionTitle(section.id, e.target.value)}
                />
                <button
                  onClick={() => removeCustomSection(section.id)}
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >× Remove Section</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.fields.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Field name" value={f.label} onChange={e => updateCustomSectionField(section.id, i, 'label', e.target.value)} />
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Value" value={f.value} onChange={e => updateCustomSectionField(section.id, i, 'value', e.target.value)} />
                    <button
                      onClick={() => removeCustomSectionField(section.id, i)}
                      style={removeBtnStyle}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addCustomSectionField(section.id)} style={addFieldBtnStyle}>+ Add Field</button>
            </div>
          ))}

          <div>
            <button
              onClick={addCustomSection}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px dashed var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            >+ Add Section</button>
          </div>

          {/* Notes */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Notes')}
            <textarea style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              placeholder="Anything else worth noting about this venue..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div style={{ paddingBottom: 40 }} />

        </div>
        </div>
      </div>
    </div>
  )
}
