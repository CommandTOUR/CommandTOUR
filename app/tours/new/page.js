'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

const TOUR_COLORS = [
  { label: 'Gold', value: '#C9A84C' },
  { label: 'Mint', value: '#33FF99' },
  { label: 'Yellow', value: '#FFCC00' },
  { label: 'Red', value: '#FF3333' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Orange', value: '#FF8C00' },
  { label: 'Pink', value: '#FF69B4' },
]

const TOUR_TYPES = [
  { label: 'Hot Wheels Stunt Show', value: 'hwss' },
  { label: 'Hot Wheels Monster Trucks Live', value: 'hwmt' },
]

const TOUR_CATEGORIES = [
  { label: 'Domestic', value: 'domestic' },
  { label: 'International', value: 'international' },
  { label: 'Uncategorized', value: 'uncategorized' },
]

export default function NewTour() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customColor, setCustomColor] = useState(false)
  const [form, setForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    type: '',
    tour_type: '',
    tour_category: 'uncategorized',
    color: '#C9A84C',
    status: 'upcoming',
    director_name: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tour name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.from('tours').insert([form])
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/tours')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push('/tours')}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>New Tour</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Tour Name *</label>
            <input style={inputStyle} placeholder="e.g. Hot Wheels Stunt Show North America" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Tour Type + Show Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tour Type</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.tour_type}
                onChange={e => {
                  const val = e.target.value
                  set('tour_type', val)
                  // Auto-fill show type label
                  const match = TOUR_TYPES.find(t => t.value === val)
                  if (match) set('type', match.label)
                }}>
                <option value="">— Select tour type —</option>
                {TOUR_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Show Type</label>
              <input style={inputStyle} placeholder="e.g. Hot Wheels Stunt Show" value={form.type} onChange={e => set('type', e.target.value)} />
            </div>
          </div>

          {/* Year + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Year</label>
              <input style={inputStyle} type="number" value={form.year} onChange={e => set('year', parseInt(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Tour Category + Director */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tour Category</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.tour_category} onChange={e => set('tour_category', e.target.value)}>
                {TOUR_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tour Director</label>
              <input style={inputStyle} placeholder="e.g. Mark Albert" value={form.director_name} onChange={e => set('director_name', e.target.value)} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Tour Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {TOUR_COLORS.map(c => (
                <div key={c.value} onClick={() => { set('color', c.value); setCustomColor(false) }}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, cursor: 'pointer', border: form.color === c.value && !customColor ? '3px solid white' : '3px solid transparent', transition: 'border 0.15s' }}
                  title={c.label} />
              ))}
              <div style={{ position: 'relative' }}>
                <div onClick={() => setCustomColor(true)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: customColor ? form.color : 'rgba(255,255,255,0.1)', cursor: 'pointer', border: customColor ? '3px solid white' : '3px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(255,255,255,0.6)', transition: 'border 0.15s' }}
                  title="Custom color">+</div>
              </div>
              {customColor && (
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  style={{ width: 40, height: 32, borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
              )}
            </div>
            <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: form.color, width: '100%', transition: 'background 0.2s' }} />
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push('/tours')}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Tour'}</button>
          </div>

        </div>
      </div>
    </div>
  )
}