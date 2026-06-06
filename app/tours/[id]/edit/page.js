'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'

const COLORS = [
  { label: 'Gold',  value: '#C9A84C' },
  { label: 'Mint',  value: '#33FF99' },
  { label: 'Red',   value: '#FF3333' },
  { label: 'Blue',  value: '#4C9BE8' },
  { label: 'Purple',value: '#A855F7' },
  { label: 'Orange',value: '#FF8C00' },
  { label: 'Pink',  value: '#FF69B4' },
  { label: 'White', value: '#FFFFFF' },
]

export default function EditTour() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    type: '',
    region: '',
    year: new Date().getFullYear(),
    status: 'upcoming',
    color: '#C9A84C',
    director_name: '',
    notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchTour = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .eq('id', id)
        .single()
      if (!error && data) {
        setForm({
          name: data.name || '',
          type: data.type || '',
          region: data.region || '',
          year: data.year || new Date().getFullYear(),
          status: data.status || 'upcoming',
          color: data.color || '#C9A84C',
          director_name: data.director_name || '',
          notes: data.notes || '',
        })
      }
      setLoading(false)
    }
    fetchTour()
  }, [id])

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tour name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase
      .from('tours')
      .update(form)
      .eq('id', id)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/tours/${id}`)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, maxWidth: 600 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/tours/${id}`)}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Edit Tour</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Tour Name *</label>
            <input style={inputStyle} placeholder="e.g. HWSS International" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Type + Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tour Type</label>
              <input style={inputStyle} placeholder="e.g. Hot Wheels Stunt Show" value={form.type} onChange={e => set('type', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <input style={inputStyle} placeholder="e.g. Europe" value={form.region} onChange={e => set('region', e.target.value)} />
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

          {/* Director */}
          <div>
            <label style={labelStyle}>Tour Director</label>
            <input style={inputStyle} placeholder="e.g. Anna Nyman" value={form.director_name} onChange={e => set('director_name', e.target.value)} />
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Tour Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div
                  key={c.value}
                  onClick={() => set('color', c.value)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c.value, cursor: 'pointer',
                    border: form.color === c.value ? '3px solid white' : '3px solid transparent',
                    boxSizing: 'border-box',
                    transition: 'border 0.15s',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              placeholder="Any notes about this tour..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}`)}
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