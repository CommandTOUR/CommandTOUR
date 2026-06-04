'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../../components/TopNav'
import { getSupabase } from '../../../../../lib/supabase'

export default function NewEvent() {
  const router = useRouter()
  const { id } = useParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    city: '',
    country: '',
    venue_name: '',
    status: 'tentative',
    load_in_date: '',
    load_out_date: '',
    notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    if (!form.city.trim()) { setError('City is required'); return }
    if (!form.load_in_date) { setError('Load-in date is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.from('events').insert([{
      ...form,
      tour_id: id,
    }])
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/tours/${id}`)
    }
  }

  const inputStyle = {
    fontFamily: 'Rubik, sans-serif',
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
            onClick={() => router.push(`/tours/${id}`)}
            style={{
              fontFamily: 'Rubik, sans-serif',
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
          <div style={{ fontSize: 26, fontWeight: 600 }}>Add Event</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* City + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>City *</label>
              <input
                style={inputStyle}
                placeholder="e.g. Manchester"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input
                style={inputStyle}
                placeholder="e.g. United Kingdom"
                value={form.country}
                onChange={e => set('country', e.target.value)}
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label style={labelStyle}>Venue Name</label>
            <input
              style={inputStyle}
              placeholder="e.g. Co-op Live"
              value={form.venue_name}
              onChange={e => set('venue_name', e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="tentative">Tentative</option>
              <option value="1-hold">1-Hold</option>
              <option value="2-hold">2-Hold</option>
              <option value="3-hold">3-Hold</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Load-In Date *</label>
              <input
                style={inputStyle}
                type="date"
                value={form.load_in_date}
                onChange={e => set('load_in_date', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Load-Out Date</label>
              <input
                style={inputStyle}
                type="date"
                value={form.load_out_date}
                onChange={e => set('load_out_date', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              placeholder="Any notes about this event..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}`)}
              style={{
                fontFamily: 'Rubik, sans-serif',
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
              {saving ? 'Saving...' : 'Add Event'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}