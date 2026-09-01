'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '../../../../lib/supabase'
import { IconChevronDown, IconChevronRight, IconLayoutDashboard } from '@tabler/icons-react'
import { useNav } from '../../../../context/NavContext'
import { buildNavEntry } from '../../../../lib/navigate'

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

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

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'staffing', label: 'Staffing' },
  { key: 'settings', label: 'Settings' },
]

function StaffingSection({ departments, quantities, onQuantityChange, loading }) {
  const [expandedDepts, setExpandedDepts] = useState(new Set())

  const toggleExpand = (deptId) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  const stepperBtnStyle = (disabled) => ({
    width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border-default)',
    background: 'var(--surface-raised)', color: 'var(--text-primary)',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  })

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading staffing...</div>

  const totalRoles = departments.reduce((sum, d) => sum + d.positions.filter(p => (quantities[p.id] || 0) > 0).length, 0)
  const totalPositions = departments.reduce((sum, d) => sum + d.positions.reduce((s, p) => s + (quantities[p.id] || 0), 0), 0)

  return (
    <div>
      {totalPositions > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: 'color-mix(in srgb, var(--color-info) 8%, transparent)', border: '0.5px solid color-mix(in srgb, var(--color-info) 20%, transparent)', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--color-info) 70%, var(--text-secondary))' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>{totalRoles}</span> {totalRoles === 1 ? 'Role' : 'Roles'}
          </div>
          <div style={{ width: 1, height: 14, background: 'color-mix(in srgb, var(--color-info) 25%, transparent)' }} />
          <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--color-info) 70%, var(--text-secondary))' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-info)' }}>{totalPositions}</span> Total {totalPositions === 1 ? 'Position' : 'Positions'}
          </div>
        </div>
      )}
      {departments.map(dept => {
        const expanded = expandedDepts.has(dept.id)
        const staffedCount = dept.positions.filter(p => (quantities[p.id] || 0) > 0).length
        const totalSlots = dept.positions.reduce((sum, p) => sum + (quantities[p.id] || 0), 0)
        return (
          <div key={dept.id} style={{ ...GLASS, marginBottom: 12, overflow: 'hidden' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {staffedCount > 0 && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: staffedCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {staffedCount} {staffedCount === 1 ? 'Role' : 'Roles'}
                </span>
                {totalSlots > 0 && (
                  <>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {totalSlots} {totalSlots === 1 ? 'Position' : 'Positions'}
                    </span>
                  </>
                )}
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: '0.5px solid var(--border-default)' }}>
                {dept.positions.map(pos => {
                  const qty = quantities[pos.id] || 0
                  return (
                    <div key={pos.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{pos.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => onQuantityChange(pos.id, Math.max(0, qty - 1))} disabled={qty === 0} style={stepperBtnStyle(qty === 0)}>−</button>
                        <input
                          type="number"
                          value={qty}
                          onChange={e => {
                            const raw = e.target.value
                            const n = raw === '' ? 0 : parseInt(raw, 10)
                            if (!isNaN(n)) onQuantityChange(pos.id, Math.max(0, Math.min(99, n)))
                          }}
                          style={{
                            width: 40, height: 28, textAlign: 'center', fontSize: 16, fontWeight: 700,
                            borderRadius: 6, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)',
                            color: qty > 0 ? 'var(--accent)' : 'var(--text-muted)', outline: 'none',
                          }}
                        />
                        <button onClick={() => onQuantityChange(pos.id, Math.min(99, qty + 1))} disabled={qty >= 99} style={stepperBtnStyle(qty >= 99)}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function EditTour() {
  const router = useRouter()
  const { id } = useParams()
  const { setNav, clearNav, pushNav } = useNav()
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

  const [activeTab, setActiveTab] = useState('general')
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingTabSwitch, setPendingTabSwitch] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [departments, setDepartments] = useState([])
  const [existingPositions, setExistingPositions] = useState([])
  const [quantities, setQuantities] = useState({})

  const set = (key, val) => { setForm(prev => ({ ...prev, [key]: val })); setIsDirty(true) }

  const handleQuantityChange = (positionId, value) => {
    setQuantities(prev => ({ ...prev, [positionId]: value }))
    setIsDirty(true)
  }

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = getSupabase()
      const [tourRes, deptsRes, existingRes] = await Promise.all([
        supabase.from('tours').select('*').eq('id', id).single(),
        supabase.from('departments').select('*, positions(*)').order('sort_order', { ascending: true }),
        supabase.from('tour_positions').select('*').eq('tour_id', id),
      ])

      if (!tourRes.error && tourRes.data) {
        const data = tourRes.data
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
    fetchAll()
  }, [id])

  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    if (loading) return
    setNav({
      backLabel: form.name || 'Tour',
      backHref: `/tours/${id}`,
      title: 'Edit Tour',
      activeTab: 'edit',
      onTabChange: () => {},
      items: [
        { label: 'Edit Tour', tab: 'edit', icon: IconLayoutDashboard },
      ],
    })
    pushNav(buildNavEntry(`/tours/${id}/edit`, 'Edit Tour', 'edit'))
    return () => clearNav()
  }, [loading])

  const handleSaveStaffing = async () => {
    const supabase = getSupabase()
    for (const dept of departments) {
      for (const pos of dept.positions) {
        const qty = quantities[pos.id] || 0
        const existing = existingPositions.find(tp => tp.position_id === pos.id)
        if (qty > 0 && !existing) {
          await supabase.from('tour_positions').insert({ tour_id: id, position_id: pos.id, quantity_needed: qty })
        } else if (qty > 0 && existing) {
          await supabase.from('tour_positions').update({ quantity_needed: qty }).eq('id', existing.id)
        } else if (qty === 0 && existing) {
          await supabase.from('tour_positions').delete().eq('id', existing.id)
        }
      }
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Tour name is required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()
    const { error: tourError } = await supabase.from('tours').update(form).eq('id', id)
    if (tourError) { setError(tourError.message); setSaving(false); return }
    await handleSaveStaffing()
    setSaving(false)
    setIsDirty(false)
    router.push(`/tours/${id}`)
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

  const handleTabSwitch = (tab) => {
    if (isDirty) { setPendingTabSwitch(tab); setShowUnsavedModal(true) }
    else setActiveTab(tab)
  }

  const handleCancel = () => {
    if (isDirty) { setPendingTabSwitch(null); setShowUnsavedModal(true) }
    else router.push(`/tours/${id}`)
  }

  const handleDeleteTour = async () => {
    setDeleting(true)
    const supabase = getSupabase()

    // Get all event IDs for this tour
    const { data: tourEvents } = await supabase
      .from('events')
      .select('id')
      .eq('tour_id', id)

    // Get all tour_position IDs for this tour
    const { data: tourPositions } = await supabase
      .from('tour_positions')
      .select('id')
      .eq('tour_id', id)

    const eventIds = (tourEvents || []).map(e => e.id)
    const tpIds = (tourPositions || []).map(tp => tp.id)

    // Delete staff_assignments via event_id and tour_position_id
    if (eventIds.length > 0) {
      await supabase.from('staff_assignments').delete().in('event_id', eventIds)
    }
    if (tpIds.length > 0) {
      await supabase.from('staff_assignments').delete().in('tour_position_id', tpIds)
    }

    // Delete everything else
    await supabase.from('events').delete().eq('tour_id', id)
    await supabase.from('tour_positions').delete().eq('tour_id', id)
    await supabase.from('tours').delete().eq('id', id)

    setDeleting(false)
    router.push('/tours')
  }

  const inputStyle = {
    fontSize: 14,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid var(--border-default)',
    background: 'var(--surface-raised)',
    color: 'var(--text-primary)',
    caretColor: 'var(--accent)',
    outline: 'none',
    width: '100%',
  }

  const labelStyle = {
    fontSize: 12,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  }

  if (loading) return (
    <div style={{ padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Tour</div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => handleTabSwitch(tab.key)}
                style={{
                  fontSize: 14, fontWeight: active ? 600 : 400, padding: '7px 14px', borderRadius: 6, border: 'none',
                  background: active ? 'rgba(26,86,219,0.08)' : 'transparent',
                  color: active ? 'var(--color-info)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleCancel}
            style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 8%, transparent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--color-info)', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 0' }}>

        {activeTab === 'general' && (
          <div style={{ ...GLASS, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

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
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, cursor: 'pointer', border: form.color === c.value && !customColor ? '3px solid var(--text-primary)' : '3px solid transparent', boxSizing: 'border-box', transition: 'border 0.15s' }}
                    title={c.label} />
                ))}
                <div onClick={() => setCustomColor(true)}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: customColor ? form.color : 'var(--surface-raised)', cursor: 'pointer', border: customColor ? '3px solid var(--text-primary)' : '3px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-secondary)', transition: 'border 0.15s', boxSizing: 'border-box' }}
                  title="Custom color">+</div>
                {customColor && (
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                    style={{ width: 40, height: 32, borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
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
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No logo uploaded</div>
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
                  style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: uploadingLogo ? 'default' : 'pointer', opacity: uploadingLogo ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!uploadingLogo) e.currentTarget.style.background = 'var(--surface-raised)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
                {form.logo_url && (
                  <span
                    onClick={handleRemoveLogo}
                    style={{ fontSize: 12, color: 'var(--color-danger)', cursor: 'pointer' }}
                  >Remove</span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Any notes about this tour..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}

            <div style={{ borderTop: '0.5px solid var(--border-default)', marginTop: 8, paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Delete this tour</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Permanently deletes the tour, all events, and all staffing data.</div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#FF453A', color: '#FFD60A', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 24 }}
              >
                Delete Tour
              </button>
            </div>

          </div>
        )}

        {activeTab === 'staffing' && (
          <div>
            <StaffingSection
              departments={departments}
              quantities={quantities}
              onQuantityChange={handleQuantityChange}
              loading={loading}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Tour settings coming soon.</div>
          </div>
        )}

      </div>

      {showUnsavedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...GLASS, padding: 24, width: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Unsaved Changes</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>You have unsaved changes. Leave without saving?</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowUnsavedModal(false)}
                style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >Keep Editing</button>
              <button
                onClick={() => {
                  if (pendingTabSwitch) {
                    setActiveTab(pendingTabSwitch)
                    setIsDirty(false)
                    setShowUnsavedModal(false)
                  } else {
                    router.push(`/tours/${id}`)
                  }
                }}
                style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
              >Leave Without Saving</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}>
          <div style={{ ...GLASS, padding: 28, width: 420, display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Delete Tour</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{form.name}</strong> and all of its events and staffing data. This cannot be undone.
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Type <strong>DELETE</strong> to confirm:</div>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                style={{ width: '100%', fontSize: 14, padding: '9px 12px', borderRadius: 8, border: `0.5px solid ${deleteConfirmText === 'DELETE' ? 'var(--color-danger)' : 'var(--border-default)'}`, background: 'var(--surface-raised)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTour}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', background: deleteConfirmText === 'DELETE' ? '#FF453A' : 'var(--surface-raised)', color: deleteConfirmText === 'DELETE' ? '#FFD60A' : 'var(--text-muted)', fontWeight: 700, cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'default', transition: 'all 0.15s' }}
              >
                {deleting ? 'Deleting...' : 'Delete Tour'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
