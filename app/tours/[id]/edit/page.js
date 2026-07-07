'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'

const COLORS = [
  { label: 'Gold',   value: '#C9A84C' },
  { label: 'Mint',   value: '#33FF99' },
  { label: 'Yellow', value: '#FFCC00' },
  { label: 'Red',    value: '#FF3333' },
  { label: 'Blue',   value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Orange', value: '#FF8C00' },
  { label: 'Pink',   value: '#FF69B4' },
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

function StaffingSection({ tourId, onSaved }) {
  const [departments, setDepartments] = useState([])
  const [existingPositions, setExistingPositions] = useState([])
  const [quantities, setQuantities] = useState({})
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState('idle')

  useEffect(() => {
    if (!tourId) return
    let cancelled = false
    const fetchData = async () => {
      const supabase = getSupabase()
      const [deptsRes, existingRes] = await Promise.all([
        supabase.from('departments').select('*, positions(*)').order('sort_order', { ascending: true }),
        supabase.from('tour_positions').select('*').eq('tour_id', tourId),
      ])
      if (cancelled) return
      const depts = (deptsRes.data || []).map(d => ({
        ...d,
        positions: [...(d.positions || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
      const existing = existingRes.data || []
      const initialQuantities = {}
      depts.forEach(d => d.positions.forEach(p => { initialQuantities[p.id] = 0 }))
      existing.forEach(tp => { initialQuantities[tp.position_id] = tp.quantity_needed })
      setDepartments(depts)
      setExistingPositions(existing)
      setQuantities(initialQuantities)
      setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [tourId])

  const toggleExpand = (deptId) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  const setQuantity = (positionId, value) => {
    setQuantities(prev => ({ ...prev, [positionId]: value }))
  }

  const handleSaveStaffing = async () => {
    setSaving(true)
    const supabase = getSupabase()
    for (const dept of departments) {
      for (const pos of dept.positions) {
        const qty = quantities[pos.id] || 0
        const existing = existingPositions.find(tp => tp.position_id === pos.id)
        if (qty > 0 && !existing) {
          await supabase.from('tour_positions').insert({ tour_id: tourId, position_id: pos.id, quantity_needed: qty })
        } else if (qty > 0 && existing) {
          await supabase.from('tour_positions').update({ quantity_needed: qty }).eq('id', existing.id)
        } else if (qty === 0 && existing) {
          await supabase.from('tour_positions').delete().eq('id', existing.id)
        }
      }
    }
    setSaving(false)
    setSaveState('success')
    setTimeout(() => {
      setSaveState('idle')
      onSaved?.()
    }, 700)
  }

  const stepperBtnStyle = (disabled) => ({
    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-card)',
    background: 'var(--bg-card-hover)', color: 'var(--text-primary)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  })

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading staffing...</div>

  return (
    <div>
      {departments.map(dept => {
        const expanded = expandedDepts.has(dept.id)
        const staffedCount = dept.positions.filter(p => (quantities[p.id] || 0) > 0).length
        return (
          <div key={dept.id} className="glass-card" style={{ marginBottom: 12, overflow: 'hidden' }}>
            <div
              onClick={() => toggleExpand(dept.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', color: 'var(--text-muted)' }}>
                  {expanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{dept.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {staffedCount > 0 && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-mint)' }} />}
                <span style={{ fontSize: 13, color: staffedCount > 0 ? 'var(--color-mint)' : 'var(--text-muted)' }}>
                  {staffedCount} {staffedCount === 1 ? 'position' : 'positions'}
                </span>
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: '1px solid var(--border-card)' }}>
                {dept.positions.map(pos => {
                  const qty = quantities[pos.id] || 0
                  return (
                    <div key={pos.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{pos.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setQuantity(pos.id, Math.max(0, qty - 1))} disabled={qty === 0} style={stepperBtnStyle(qty === 0)}>−</button>
                        <input
                          type="number"
                          value={qty}
                          onChange={e => {
                            const raw = e.target.value
                            const n = raw === '' ? 0 : parseInt(raw, 10)
                            if (!isNaN(n)) setQuantity(pos.id, Math.max(0, Math.min(99, n)))
                          }}
                          style={{
                            width: 40, height: 28, textAlign: 'center', fontSize: 16, fontWeight: 700,
                            borderRadius: 6, border: '1px solid var(--border-card)', background: 'var(--bg-card)',
                            color: qty > 0 ? 'var(--color-mint)' : 'var(--text-muted)', outline: 'none',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                          }}
                        />
                        <button onClick={() => setQuantity(pos.id, Math.min(99, qty + 1))} disabled={qty >= 99} style={stepperBtnStyle(qty >= 99)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-primary" onClick={handleSaveStaffing} disabled={saving}>
          {saveState === 'success' ? 'Saved!' : saving ? 'Saving...' : 'Save Staffing'}
        </button>
      </div>
    </div>
  )
}

export default function EditTour() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customColor, setCustomColor] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    tour_type: '',
    type: '',
    tour_category: 'uncategorized',
    year: new Date().getFullYear(),
    status: 'upcoming',
    color: '#C9A84C',
    director_name: '',
    notes: '',
    logo_url: null,
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchTour = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('tours').select('*').eq('id', id).single()
      if (!error && data) {
        setForm({
          name: data.name || '',
          tour_type: data.tour_type || '',
          type: data.type || '',
          tour_category: data.tour_category || 'uncategorized',
          year: data.year || new Date().getFullYear(),
          status: data.status || 'upcoming',
          color: data.color || '#C9A84C',
          director_name: data.director_name || '',
          notes: data.notes || '',
          logo_url: data.logo_url || null,
        })
        // Check if color is a custom one not in the presets
        const isPreset = COLORS.some(c => c.value === (data.color || '#C9A84C'))
        if (!isPreset) setCustomColor(true)
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
    const { error } = await supabase.from('tours').update(form).eq('id', id)
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push(`/tours/${id}`)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError('')
    const supabase = getSupabase()
    const filename = `${id}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('tour-logos').upload(filename, file, { upsert: true })
    if (uploadError) {
      setError(uploadError.message)
      setUploadingLogo(false)
      return
    }
    const { data: urlData } = supabase.storage.from('tour-logos').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl
    const { error: updateError } = await supabase.from('tours').update({ logo_url: publicUrl }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      setUploadingLogo(false)
      return
    }
    set('logo_url', publicUrl)
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleRemoveLogo = async () => {
    setError('')
    const supabase = getSupabase()
    const { error: updateError } = await supabase.from('tours').update({ logo_url: null }).eq('id', id)
    if (updateError) { setError(updateError.message); return }
    set('logo_url', null)
  }

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: 14,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#f1f5f9',
    caretColor: '#33FF99',
    outline: 'none',
    width: '100%',
  }

  const labelStyle = {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  }

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
            onClick={() => router.push(`/tours/${id}`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ← Back
          </button>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Edit Tour</div>
        </div>

        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Tour Name *</label>
            <input style={inputStyle} placeholder="e.g. HWSS International" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Tour Type dropdown + Show Type text */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tour Type</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.tour_type}
                onChange={e => {
                  const val = e.target.value
                  set('tour_type', val)
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
              <input style={inputStyle} placeholder="e.g. Anna Nyman" value={form.director_name} onChange={e => set('director_name', e.target.value)} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Tour Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {COLORS.map(c => (
                <div key={c.value} onClick={() => { set('color', c.value); setCustomColor(false) }}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, cursor: 'pointer', border: form.color === c.value && !customColor ? '3px solid #f1f5f9' : '3px solid transparent', boxSizing: 'border-box', transition: 'border 0.15s' }}
                  title={c.label} />
              ))}
              <div onClick={() => setCustomColor(true)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: customColor ? form.color : 'rgba(255,255,255,0.10)', cursor: 'pointer', border: customColor ? '3px solid #f1f5f9' : '3px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#94a3b8', transition: 'border 0.15s', boxSizing: 'border-box' }}
                title="Custom color">+</div>
              {customColor && (
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  style={{ width: 40, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
              )}
            </div>
            <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: form.color, width: '100%', transition: 'background 0.2s' }} />
          </div>

          {/* Tour Logo */}
          <div>
            <label style={labelStyle}>Tour Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {form.logo_url ? (
                <img src={form.logo_url} alt="Tour logo" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No logo uploaded</div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', cursor: uploadingLogo ? 'default' : 'pointer', opacity: uploadingLogo ? 0.6 : 1 }}
                onMouseEnter={e => { if (!uploadingLogo) e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              {form.logo_url && (
                <span
                  onClick={handleRemoveLogo}
                  style={{ fontSize: 12, color: 'var(--color-red)', cursor: 'pointer' }}
                >Remove</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Any notes about this tour..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => router.push(`/tours/${id}`)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>

        </div>

        {/* Tour Staffing */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Tour Staffing</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Set how many of each position this tour requires.</div>
          <StaffingSection tourId={id} onSaved={() => {}} />
        </div>

      </div>
    </div>
  )
}