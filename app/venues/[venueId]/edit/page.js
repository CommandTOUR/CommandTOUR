'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'

export default function EditVenue() {
  const router = useRouter()
  const { venueId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    floor_size: '',
    surface_coating: '',
    max_height: '',
    floor_weight_capacity: '',
    loading_docks: '',
    tunnel_dims: '',
    tunnel_position: '',
    slope_angle: '',
    video_board_location: '',
    pit_trailer_parking: '',
    union_status: '',
    noise_restrictions: '',
    permits: '',
    notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchVenue = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single()
      if (!error && data) {
        setForm({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
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
        })
      }
      setLoading(false)
    }
    fetchVenue()
  }, [venueId])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Venue name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.from('venues').update(form).eq('id', venueId)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/venues/${venueId}`)
    }
  }

  const inputStyle = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  }

  const labelStyle = {
    fontSize: 12,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  }

  const sectionLabel = (title) => (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.09em',
      paddingBottom: 10, borderBottom: '0.5px solid var(--glass-border)',
      marginBottom: 4,
    }}>
      {title}
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
      <div style={{ marginTop: 62, padding: '28px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/venues/${venueId}`)}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Edit Venue</div>
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
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>State / Province</label>
                <input style={inputStyle} placeholder="State (if applicable)" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={inputStyle} placeholder="Country" value={form.country} onChange={e => set('country', e.target.value)} />
              </div>
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
              <div>
                <label style={labelStyle}>Floor Size</label>
                <input style={inputStyle} placeholder="e.g. 200ft x 100ft" value={form.floor_size} onChange={e => set('floor_size', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Surface Coating</label>
                <input style={inputStyle} placeholder="e.g. Concrete" value={form.surface_coating} onChange={e => set('surface_coating', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Max Height</label>
                <input style={inputStyle} placeholder="e.g. 40ft" value={form.max_height} onChange={e => set('max_height', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Floor Weight Capacity</label>
                <input style={inputStyle} placeholder="e.g. 150 lbs/sqft" value={form.floor_weight_capacity} onChange={e => set('floor_weight_capacity', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Slope Angle</label>
                <input style={inputStyle} placeholder="e.g. 2 degrees" value={form.slope_angle} onChange={e => set('slope_angle', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Video Board Location</label>
                <input style={inputStyle} placeholder="e.g. Center hung" value={form.video_board_location} onChange={e => set('video_board_location', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Access & Logistics */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Access & Logistics')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tunnel Dimensions</label>
                <input style={inputStyle} placeholder="e.g. 14ft W x 16ft H" value={form.tunnel_dims} onChange={e => set('tunnel_dims', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Tunnel Position</label>
                <input style={inputStyle} placeholder="e.g. North end" value={form.tunnel_position} onChange={e => set('tunnel_position', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Loading Docks</label>
                <input style={inputStyle} placeholder="e.g. 4 docks, north side" value={form.loading_docks} onChange={e => set('loading_docks', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Pit / Trailer Parking</label>
                <input style={inputStyle} placeholder="e.g. Lot B, 20 spaces" value={form.pit_trailer_parking} onChange={e => set('pit_trailer_parking', e.target.value)} />
              </div>
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
              <div>
                <label style={labelStyle}>Permits Required</label>
                <input style={inputStyle} placeholder="e.g. Fire, pyro, noise" value={form.permits} onChange={e => set('permits', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Noise Restrictions</label>
                <input style={inputStyle} placeholder="e.g. No sound after 11pm" value={form.noise_restrictions} onChange={e => set('noise_restrictions', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Notes')}
            <textarea
              style={{ ...inputStyle, height: 100, resize: 'vertical' }}
              placeholder="Anything else worth noting about this venue..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button
              onClick={() => router.push(`/venues/${venueId}`)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
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