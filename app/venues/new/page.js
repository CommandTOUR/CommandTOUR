'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

// Fields that get autocomplete from previously used venue values
const AUTOCOMPLETE_FIELDS = [
  'city', 'state', 'country', 'floor_size', 'surface_coating',
  'max_height', 'floor_weight_capacity', 'slope_angle', 'video_board_location',
  'tunnel_dims', 'tunnel_position', 'loading_docks', 'pit_trailer_parking',
  'permits', 'noise_restrictions',
]

function AutoInput({ fieldKey, label, placeholder, value, onChange, suggestions, inputStyle, labelStyle }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const filtered = (suggestions[fieldKey] || []).filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  )

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
      />
      {show && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {filtered.map(s => (
            <div key={s} onMouseDown={() => { onChange(s); setShow(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid var(--glass-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewVenue() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState({})
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', country: '',
    floor_size: '', surface_coating: '', max_height: '', floor_weight_capacity: '',
    loading_docks: '', tunnel_dims: '', tunnel_position: '', slope_angle: '',
    video_board_location: '', pit_trailer_parking: '', union_status: '',
    noise_restrictions: '', permits: '', notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

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

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Venue name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.from('venues').insert([form])
    if (error) { setError(error.message); setSaving(false) }
    else router.push('/venues')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowY: 'auto' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.push('/venues')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Add Venue</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Basic Info */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Basic Info')}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Venue Name *</label>
                <input style={inputStyle} placeholder="e.g. MEO Arena" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              {ai('city', 'City', 'City')}
              {ai('state', 'State / Province', 'State (if applicable)')}
              {ai('country', 'Country', 'Country')}
            </div>
            <div>
              <label style={labelStyle}>Street Address</label>
              <input style={inputStyle} placeholder="Street address" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
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
          </div>

          {/* Notes */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Notes')}
            <textarea style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              placeholder="Anything else worth noting about this venue..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button onClick={() => router.push('/venues')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add Venue'}</button>
          </div>

        </div>
      </div>
    </div>
  )
}