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

  useEffect(() => {
    const fetchEvent = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      if (!error && data) {
        setForm({
          city: data.city || '',
          country: data.country || '',
          venue_name: data.venue_name || '',
          status: data.status || 'tentative',
          load_in_date: data.load_in_date || '',
          load_out_date: data.load_out_date || '',
          notes: data.notes || '',
        })
        if (data.load_out_date) setExtendedLoadOut(true)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [eventId])

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
      status: form.status,
      load_in_date: form.load_in_date,
      notes: form.notes,
      load_out_date: extendedLoadOut && form.load_out_date ? form.load_out_date : null,
    }
    const { error } = await supabase.from('events').update(payload).eq('id', eventId)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/tours/${id}/events/${eventId}`)
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
            onClick={() => router.push(`/tours/${id}/events/${eventId}`)}
            style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Edit Event</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

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

          {/* Venue */}
          <div>
            <label style={labelStyle}>Venue Name</label>
            <input style={inputStyle} placeholder="e.g. Co-op Live" value={form.venue_name} onChange={e => set('venue_name', e.target.value)} />
          </div>

          {/* Status */}
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

          {/* Load-In Date */}
          <div>
            <label style={labelStyle}>Load-In Date *</label>
            <input style={inputStyle} type="date" value={form.load_in_date} onChange={e => set('load_in_date', e.target.value)} />
          </div>

          {/* Extended Load-Out toggle */}
          <div>
            <div
              onClick={() => setExtendedLoadOut(!extendedLoadOut)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: extendedLoadOut ? 'var(--mint)' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 2,
                  left: extendedLoadOut ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: extendedLoadOut ? '#0a1628' : 'rgba(255,255,255,0.4)',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 13, color: extendedLoadOut ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                Extended Load-Out
              </span>
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
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              placeholder="Any notes about this event..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}/events/${eventId}`)}
              style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
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