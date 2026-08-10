'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '../../../../lib/supabase'
import { IconId, IconUserCircle } from '@tabler/icons-react'
import airportData from '@/lib/airports.json'

const AIRPORT_MAP = Object.fromEntries(airportData.map(a => [a.iata.toUpperCase(), a]))

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
  padding: '18px 20px',
}

const sectionLabelStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--color-info)',
  marginBottom: 6,
  paddingLeft: 2,
}

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-info)',
  marginBottom: 6,
  display: 'block',
}

const inputStyle = {
  fontSize: 14,
  padding: '10px 14px',
  borderRadius: 8,
  border: '0.5px solid var(--border-default)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  caretColor: 'var(--color-info)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const OUTLINE_BTN = {
  fontSize: 13,
  fontWeight: 400,
  padding: '9px 18px',
  borderRadius: 8,
  border: '0.5px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
}

function FormField({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

function EditUploadSlot({ label, url, uploading, onFile, icon: Icon }) {
  const inputRef = useRef(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
      <Icon size={36} stroke={1.5} color={url ? 'var(--color-info)' : 'var(--text-muted)'} />
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: url ? 'var(--color-info)' : 'var(--text-muted)', textAlign: 'center' }}>{label}</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--color-info)', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? 'Uploading...' : url ? 'Replace' : 'Upload'}
      </button>
    </div>
  )
}

export default function EditStaff() {
  const router = useRouter()
  const { staffId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [, setOriginal] = useState(null)
  const [form, setForm] = useState({})
  const [staffDepts, setStaffDepts] = useState([])
  const [airlines, setAirlines] = useState([])
  const [deletedAirlineIds, setDeletedAirlineIds] = useState([])
  const [localAirports, setLocalAirports] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [uploadingPassport, setUploadingPassport] = useState(false)
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [personRes, deptsRes, airlinesRes, airportsRes] = await Promise.all([
        supabase.from('staff')
          .select('*')
          .eq('id', staffId)
          .single(),
        supabase.from('staff_departments').select('id, name').order('sort_order', { ascending: true }),
        supabase.from('staff_airlines')
          .select('*')
          .eq('staff_id', staffId)
          .order('preferred', { ascending: false }),
        supabase.from('staff_airports')
          .select('*')
          .eq('staff_id', staffId)
          .order('sort_order', { ascending: true }),
      ])
      if (personRes.error) console.error('Staff fetch error:', personRes.error)
      if (!deptsRes.error) setStaffDepts(deptsRes.data || [])
      if (!personRes.error && personRes.data) {
        const d = { ...personRes.data, staff_airlines: airlinesRes.data || [], staff_airports: airportsRes.data || [] }
        setOriginal(d)
        setForm({
          display_name: d.display_name || '',
          staff_department_id: d.staff_department_id || '',
          first_name: d.first_name || '',
          middle_name: d.middle_name || '',
          last_name: d.last_name || '',
          suffix: d.suffix || '',
          phone: d.phone || '',
          email: d.email || '',
          dob: d.dob || '',
          mailing_address: d.mailing_address || '',
          home_airport: d.home_airport || '',
          tsa_precheck: d.tsa_precheck || '',
          global_entry: d.global_entry || '',
          known_traveler_number: d.known_traveler_number || '',
          passport_surname: d.passport_surname || '',
          passport_given_names: d.passport_given_names || '',
          passport_number: d.passport_number || '',
          passport_nationality: d.passport_nationality || '',
          place_of_birth: d.place_of_birth || '',
          date_of_issue: d.date_of_issue || '',
          passport_expiry: d.passport_expiry || '',
          passport_image_url: d.passport_image_url || '',
          passport_headshot_url: d.passport_headshot_url || '',
          tshirt_size: d.tshirt_size || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
          seat_preference: d.seat_preference || '',
        })
        setAirlines((d.staff_airlines || []).map(a => ({ ...a, isNew: false })))
        setLocalAirports((d.staff_airports || []).map(a => ({ ...a })))
      }
      setLoading(false)
    }
    fetchData()
  }, [staffId])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const addAirline = () => setAirlines(prev => [...prev, { airline: '', frequent_flyer_number: '', preferred: false, isNew: true }])
  const setAirlineField = (i, key, val) => setAirlines(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  const removeAirline = (i) => {
    const a = airlines[i]
    if (a.id) setDeletedAirlineIds(prev => [...prev, a.id])
    setAirlines(prev => prev.filter((_, idx) => idx !== i))
  }
  const togglePreferred = (i) => setAirlines(prev => {
    const updated = prev.map((a, idx) => ({ ...a, preferred: idx === i }))
    return [...updated.filter(a => a.preferred), ...updated.filter(a => !a.preferred)]
  })

  const updateAirport = (i, field, val) => setLocalAirports(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  const handleAirportCodeChange = (i, code) => {
    updateAirport(i, 'iata_code', code)
    if (code.length === 3 || code.length === 4) {
      const match = AIRPORT_MAP[code]
      if (match) {
        updateAirport(i, 'city', match.city)
        updateAirport(i, 'state', match.state || '')
        updateAirport(i, 'airport_name', match.name)
      }
    }
  }
  const togglePrimary = (i) => setLocalAirports(prev => {
    const updated = prev.map((a, idx) => ({ ...a, is_primary: idx === i }))
    return [...updated.filter(a => a.is_primary), ...updated.filter(a => !a.is_primary)]
  })
  const removeAirport = (i) => setLocalAirports(prev => prev.filter((_, idx) => idx !== i))
  const addAirport = () => setLocalAirports(prev => [...prev, {
    id: null,
    staff_id: staffId,
    iata_code: '',
    city: '',
    state: '',
    airport_name: '',
    is_primary: prev.length === 0,
    sort_order: prev.length,
  }])

  const saveAirlines = async () => {
    const supabase = getSupabase()
    if (deletedAirlineIds.length > 0) {
      await supabase.from('staff_airlines').delete().in('id', deletedAirlineIds)
    }
    for (const a of airlines) {
      if (!a.airline.trim()) continue
      if (a.isNew) {
        await supabase.from('staff_airlines').insert([{ staff_id: staffId, airline: a.airline, frequent_flyer_number: a.frequent_flyer_number || null, preferred: a.preferred }])
      } else {
        await supabase.from('staff_airlines').update({ airline: a.airline, frequent_flyer_number: a.frequent_flyer_number || null, preferred: a.preferred }).eq('id', a.id)
      }
    }
  }

  const saveAirports = async () => {
    const supabase = getSupabase()
    await supabase.from('staff_airports').delete().eq('staff_id', staffId)
    const toInsert = localAirports
      .filter(a => a.iata_code.trim())
      .map((a, i) => ({
        staff_id: staffId,
        iata_code: a.iata_code.trim().toUpperCase(),
        city: a.city || null,
        state: a.state || null,
        airport_name: a.airport_name || null,
        is_primary: a.is_primary || false,
        sort_order: i,
      }))
    if (toInsert.length > 0) {
      await supabase.from('staff_airports').insert(toInsert)
    }
  }

  const handleSaveClick = async () => {
    setSaving(true)
    const updateObj = {
      display_name: form.display_name || null,
      staff_department_id: form.staff_department_id || null,
      first_name: form.first_name || null,
      middle_name: form.middle_name || null,
      last_name: form.last_name || null,
      suffix: form.suffix || null,
      phone: form.phone || null,
      email: form.email || null,
      dob: form.dob || null,
      mailing_address: form.mailing_address || null,
      tsa_precheck: form.tsa_precheck || null,
      global_entry: form.global_entry || null,
      known_traveler_number: form.known_traveler_number || null,
      passport_surname: form.passport_surname || null,
      passport_given_names: form.passport_given_names || null,
      passport_number: form.passport_number || null,
      passport_nationality: form.passport_nationality || null,
      place_of_birth: form.place_of_birth || null,
      date_of_issue: form.date_of_issue || null,
      passport_expiry: form.passport_expiry || null,
      tshirt_size: form.tshirt_size || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      seat_preference: form.seat_preference || null,
    }
    const supabase = getSupabase()
    await supabase.from('staff').update(updateObj).eq('id', staffId)
    await saveAirlines()
    await saveAirports()
    showToast('Profile saved')
    setSaving(false)
    router.push(`/staff/${staffId}`)
  }

  const handleUpload = async (slot, file) => {
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    const column = slot === 'passport' ? 'passport_image_url' : 'passport_headshot_url'
    const setUploading = slot === 'passport' ? setUploadingPassport : setUploadingHeadshot
    setUploading(true)
    setError('')
    const supabase = getSupabase()
    const filename = `${staffId}-${slot}-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('staff-documents').upload(filename, file, { upsert: true })
    if (uploadError) { setError(uploadError.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('staff-documents').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl
    const { error: updateError } = await supabase.from('staff').update({ [column]: publicUrl }).eq('id', staffId)
    if (updateError) { setError(updateError.message); setUploading(false); return }
    set(column, publicUrl)
    setOriginal(prev => ({ ...prev, [column]: publicUrl }))
    setUploading(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = getSupabase()
    const { error: deleteError } = await supabase.from('staff').delete().eq('id', staffId)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      setDeleteConfirm(false)
      return
    }
    router.push('/staff')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '4px 4px 0' }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    </div>
  )

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ') || '—'
  const initials = `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(26,86,219,0.10)', border: '1.5px solid var(--color-info)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{fullName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Editing Profile</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{ ...OUTLINE_BTN, border: '0.5px solid var(--color-danger)', color: 'var(--color-danger)' }}
          >
            Delete Staff Member
          </button>
          <button
            onClick={() => router.push(`/staff/${staffId}`)}
            style={OUTLINE_BTN}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={saving}
            style={{ fontSize: 13, fontWeight: 400, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--color-info)', color: '#ffffff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>

        {error && <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Basic Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionLabelStyle}>Basic Info</div>
            <div style={{ ...GLASS, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 24px' }}>
              <FormField label="Display Name">
                <input style={inputStyle} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Optional — shown instead of full name" />
              </FormField>
              <FormField label="First Name">
                <input style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </FormField>
              <FormField label="Middle Name(s)">
                <input style={inputStyle} value={form.middle_name} onChange={e => set('middle_name', e.target.value)} />
              </FormField>
              <FormField label="Last Name">
                <input style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </FormField>
              <FormField label="Suffix">
                <input style={inputStyle} value={form.suffix} onChange={e => set('suffix', e.target.value)} placeholder="Jr., Sr., III, etc." />
              </FormField>
              <FormField label="Department">
                <select style={inputStyle} value={form.staff_department_id} onChange={e => set('staff_department_id', e.target.value)}>
                  <option value="">Select department...</option>
                  {staffDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FormField>
              <FormField label="Cell Phone">
                <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
              </FormField>
              <FormField label="Email">
                <input type="email" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} />
              </FormField>
              <FormField label="Date of Birth">
                <input type="date" style={inputStyle} value={form.dob} onChange={e => set('dob', e.target.value)} />
              </FormField>
              <FormField label="T-Shirt Size">
                <input style={inputStyle} value={form.tshirt_size} onChange={e => set('tshirt_size', e.target.value)} />
              </FormField>
              <FormField label="Emergency Contact Name">
                <input style={inputStyle} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
              </FormField>
              <FormField label="Emergency Contact Phone">
                <input style={inputStyle} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} />
              </FormField>
              <div style={{ gridColumn: 'span 2' }}>
                <FormField label="Mailing Address">
                  <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} rows={3} value={form.mailing_address} onChange={e => set('mailing_address', e.target.value)} />
                </FormField>
              </div>
            </div>
          </div>

          {/* Travel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionLabelStyle}>Travel</div>
            <div style={{ ...GLASS, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={labelStyle}>Home Airport(s)</div>
                  {localAirports.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>No airports added yet.</div>}
                  {localAirports.map((airport, i) => (
                    <div key={airport.id || `new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => togglePrimary(i)}
                        title="Set as primary"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: airport.is_primary ? '#FFD60A' : 'var(--text-muted)', padding: '4px', flexShrink: 0, width: 28 }}
                      >★</button>
                      <input
                        value={airport.iata_code}
                        onChange={e => handleAirportCodeChange(i, e.target.value.toUpperCase())}
                        placeholder="IATA"
                        maxLength={4}
                        style={{ ...inputStyle, width: 64, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}
                      />
                      <input
                        value={airport.city || ''}
                        onChange={e => updateAirport(i, 'city', e.target.value)}
                        placeholder="City"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        value={airport.state || ''}
                        onChange={e => updateAirport(i, 'state', e.target.value)}
                        placeholder="State"
                        style={{ ...inputStyle, width: 60 }}
                      />
                      <input
                        value={airport.airport_name || ''}
                        onChange={e => updateAirport(i, 'airport_name', e.target.value)}
                        placeholder="Airport name"
                        style={{ ...inputStyle, flex: 2 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeAirport(i)}
                        style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px' }}
                      >×</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAirport}
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }}
                  >
                    + Add Airport
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={labelStyle}>Preferred Airlines</div>
                    <button
                      type="button"
                      onClick={addAirline}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }}
                    >
                      + Add Airline
                    </button>
                  </div>
                  {airlines.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No airlines added yet.</div>}
                  {airlines.map((a, i) => (
                    <div key={a.id || `new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => togglePreferred(i)}
                        title="Set as preferred"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: a.preferred ? '#FFD60A' : 'var(--text-muted)', padding: '4px', flexShrink: 0, width: 28 }}
                      >★</button>
                      <input style={{ ...inputStyle, flex: 1 }} placeholder="Airline" value={a.airline} onChange={e => setAirlineField(i, 'airline', e.target.value)} />
                      <input style={{ ...inputStyle, flex: 1 }} placeholder="FF Number" value={a.frequent_flyer_number || ''} onChange={e => setAirlineField(i, 'frequent_flyer_number', e.target.value)} />
                      <button
                        type="button"
                        onClick={() => removeAirline(i)}
                        style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px' }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <FormField label="TSA PreCheck">
                  <input style={inputStyle} value={form.tsa_precheck} onChange={e => set('tsa_precheck', e.target.value)} />
                </FormField>
                <FormField label="Global Entry">
                  <input style={inputStyle} value={form.global_entry} onChange={e => set('global_entry', e.target.value)} />
                </FormField>
                <FormField label="Known Traveler #">
                  <input style={inputStyle} value={form.known_traveler_number} onChange={e => set('known_traveler_number', e.target.value)} />
                </FormField>
                <FormField label="Seat Preference">
                  <input style={inputStyle} value={form.seat_preference} onChange={e => set('seat_preference', e.target.value)} placeholder="Aisle, Window, etc." />
                </FormField>
              </div>
            </div>
          </div>

          {/* Passport */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionLabelStyle}>Passport</div>
            <div style={GLASS}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 32, justifyContent: 'flex-start', marginBottom: 20 }}>
                <EditUploadSlot label="Passport Page" url={form.passport_image_url} uploading={uploadingPassport} onFile={(f) => handleUpload('passport', f)} icon={IconId} />
                <EditUploadSlot label="Headshot" url={form.passport_headshot_url} uploading={uploadingHeadshot} onFile={(f) => handleUpload('headshot', f)} icon={IconUserCircle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px' }}>
                <FormField label="Passport Number">
                  <input style={inputStyle} value={form.passport_number} onChange={e => set('passport_number', e.target.value)} />
                </FormField>
                <FormField label="Nationality">
                  <input style={inputStyle} value={form.passport_nationality} onChange={e => set('passport_nationality', e.target.value)} />
                </FormField>
                <FormField label="Surname">
                  <input style={inputStyle} value={form.passport_surname} onChange={e => set('passport_surname', e.target.value)} />
                </FormField>
                <FormField label="Given Names">
                  <input style={inputStyle} value={form.passport_given_names} onChange={e => set('passport_given_names', e.target.value)} placeholder="As shown on passport" />
                </FormField>
                <FormField label="Place of Birth">
                  <input style={inputStyle} value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} />
                </FormField>
                <FormField label="Date of Birth">
                  <input type="date" style={inputStyle} value={form.dob} onChange={e => set('dob', e.target.value)} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Displayed as DD MONTH YYYY</div>
                </FormField>
                <FormField label="Date of Issue">
                  <input type="date" style={inputStyle} value={form.date_of_issue} onChange={e => set('date_of_issue', e.target.value)} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Displayed as DD MONTH YYYY</div>
                </FormField>
                <FormField label="Date of Expiration">
                  <input type="date" style={inputStyle} value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Displayed as DD MONTH YYYY</div>
                </FormField>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 28, maxWidth: 400, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Delete Staff Member</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{fullName}</strong>? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{ fontSize: 13, padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--color-danger)', color: '#fff', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
              >{deleting ? 'Deleting...' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '10px 20px', fontSize: 14, color: 'var(--text-primary)', zIndex: 2000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
