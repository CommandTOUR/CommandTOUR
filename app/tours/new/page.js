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

export default function NewTour() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customColor, setCustomColor] = useState(false)
  const [form, setForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    region: '',
    type: '',
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
      <div style={{ marginTop: 62, padding: 28, maxWidth: 600 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push('/tours')}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              padding: '7px 14px',
              borderRadius: 7,
              border: '0.5px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>New Tour</div>
        </div>

        {/* Form */}
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Tour Name *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Hot Wheels Stunt Show North America"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Tour Type */}
          <div>
            <label style={labelStyle}>Show Type</label>
            <input
              style={inputStyle}
              placeholder="e.g. Hot Wheels Stunt Show"
              value={form.type}
              onChange={e => set('type', e.target.value)}
            />
          </div>

          {/* Year + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Year</label>
              <input
                style={inputStyle}
                type="number"
                value={form.year}
                onChange={e => set('year', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Region + Director */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Region</label>
              <input
                style={inputStyle}
                placeholder="e.g. North America"
                value={form.region}
                onChange={e => set('region', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Tour Director</label>
              <input
                style={inputStyle}
                placeholder="e.g. Mark Albert"
                value={form.director_name}
                onChange={e => set('director_name', e.target.value)}
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Tour Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {TOUR_COLORS.map(c => (
                <div
                  key={c.value}
                  onClick={() => { set('color', c.value); setCustomColor(false) }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c.value,
                    cursor: 'pointer',
                    border: form.color === c.value && !customColor ? '3px solid white' : '3px solid transparent',
                    transition: 'border 0.15s',
                  }}
                  title={c.label}
                />
              ))}

              {/* Custom color swatch */}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setCustomColor(true)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: customColor ? form.color : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    border: customColor ? '3px solid white' : '3px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: 'rgba(255,255,255,0.6)',
                    transition: 'border 0.15s',
                  }}
                  title="Custom color"
                >
                  +
                </div>
              </div>

              {/* Color input when custom selected */}
              {customColor && (
                <input
                  type="color"
                  value={form.color}
                  onChange={e => set('color', e.target.value)}
                  style={{
                    width: 40, height: 32, borderRadius: 8,
                    border: '0.5px solid var(--glass-border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                />
              )}
            </div>

            {/* Color preview bar */}
            <div style={{
              marginTop: 12, height: 4, borderRadius: 2,
              background: form.color, width: '100%',
              transition: 'background 0.2s',
            }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push('/tours')}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                padding: '9px 20px',
                borderRadius: 8,
                border: '0.5px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Create Tour'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}