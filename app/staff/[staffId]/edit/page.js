'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'
import { IconFileText, IconCamera } from '@tabler/icons-react'
import airportData from '@/lib/airports.json'

const AIRPORT_MAP = Object.fromEntries(airportData.map(a => [a.iata.toUpperCase(), a]))

const FIELDS = [
  { key: 'display_name', label: 'Display Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name(s)' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'suffix', label: 'Suffix' },
  { key: 'staff_department_id', label: 'Department', display: (v, ctx) => ctx.staffDepts.find(d => d.id === v)?.name || '' },
  { key: 'phone', label: 'Cell Phone' },
  { key: 'email', label: 'Email' },
  { key: 'dob', label: 'Date of Birth', display: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '' },
  { key: 'mailing_address', label: 'Mailing Address' },
  { key: 'home_airport', label: 'Home Airport' },
  { key: 'tsa_precheck', label: 'TSA PreCheck' },
  { key: 'global_entry', label: 'Global Entry' },
  { key: 'known_traveler_number', label: 'Known Traveler #' },
  { key: 'passport_surname', label: 'Surname' },
  { key: 'passport_given_names', label: 'Given Names' },
  { key: 'passport_nationality', label: 'Nationality' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'date_of_issue', label: 'Date of Issue', display: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '' },
  { key: 'passport_expiry', label: 'Date of Expiration', display: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '' },
  { key: 'passport_number', label: 'Passport Number' },
]

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 6,
  display: 'block',
}

const inputStyle = {
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  fontSize: 14,
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border-input)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  caretColor: 'var(--color-mint)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
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
      {url ? (
        <img src={url} alt={label} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-card)' }} />
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{ width: 80, height: 100, borderRadius: 4, border: '1px dashed var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer' }}
        >
          <Icon size={22} stroke={1.5} color="var(--text-muted)" />
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--color-mint)', cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}
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
  const [original, setOriginal] = useState(null)
  const [form, setForm] = useState({})
  const [staffDepts, setStaffDepts] = useState([])
  const [airlines, setAirlines] = useState([])
  const [deletedAirlineIds, setDeletedAirlineIds] = useState([])
  const [localAirports, setLocalAirports] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [changes, setChanges] = useState([])
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

  const hasAirlineChanges = () => {
    if (deletedAirlineIds.length > 0) return true
    return airlines.some(a => {
      if (a.isNew) return Boolean(a.airline.trim())
      const o = (original.staff_airlines || []).find(x => x.id === a.id)
      if (!o) return true
      return o.airline !== a.airline || (o.frequent_flyer_number || '') !== (a.frequent_flyer_number || '') || Boolean(o.preferred) !== Boolean(a.preferred)
    })
  }

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

  const computeChanges = () => {
    const ctx = { staffDepts }
    const result = []
    for (const f of FIELDS) {
      const origRaw = original[f.key] ?? ''
      const newRaw = form[f.key] ?? ''
      if (String(origRaw) !== String(newRaw)) {
        const display = f.display || ((v) => v)
        result.push({
          field: f.key,
          label: f.label,
          originalValue: display(origRaw, ctx),
          newValue: display(newRaw, ctx),
          accepted: null,
        })
      }
    }
    const origAirportCodes = (original.staff_airports || []).map(a => a.iata_code).join(', ')
    const newAirportCodes = localAirports.filter(a => a.iata_code.trim()).map(a => a.iata_code.trim().toUpperCase()).join(', ')
    if (origAirportCodes !== newAirportCodes) {
      result.push({
        field: 'home_airports',
        label: 'Home Airport(s)',
        originalValue: origAirportCodes,
        newValue: newAirportCodes,
        accepted: null,
      })
    }
    return result
  }

  const handleSaveClick = () => {
    const c = computeChanges()
    const airlinesChanged = hasAirlineChanges()
    if (c.length === 0 && !airlinesChanged) {
      showToast('No changes made')
      return
    }
    if (c.length === 0) {
      doSave([])
      return
    }
    setChanges(c)
    setShowConfirmModal(true)
  }

  const acceptChange = (field) => setChanges(prev => prev.map(c => c.field === field ? { ...c, accepted: true } : c))
  const rejectChange = (field) => {
    setChanges(prev => prev.map(c => c.field === field ? { ...c, accepted: false } : c))
    setForm(prev => ({ ...prev, [field]: original[field] ?? '' }))
  }

  const doSave = async (changesToApply) => {
    setSaving(true)
    setError('')
    const updateObj = {}
    let airportsAccepted = true
    for (const c of changesToApply) {
      if (c.field === 'home_airports') {
        airportsAccepted = c.accepted === true
        continue
      }
      if (c.accepted === true) updateObj[c.field] = form[c.field] || null
    }
    const supabase = getSupabase()
    if (Object.keys(updateObj).length > 0) {
      const { error: updateError } = await supabase.from('staff').update(updateObj).eq('id', staffId)
      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    }
    await saveAirlines()
    if (airportsAccepted) await saveAirports()
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

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid var(--bg-card)' }}>
      {title}
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88, padding: 28, color: 'var(--text-muted)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
    </div>
  )

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ') || '—'
  const initials = `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase()
  const allDecided = changes.every(c => c.accepted !== null)
  const acceptedCount = changes.filter(c => c.accepted === true).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <TopNav />
      <div style={{ marginTop: 88, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-mint-bg)', border: '0.5px solid var(--color-mint-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--color-mint)', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>Editing Profile</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--color-red-border)', background: 'transparent', color: 'var(--color-red)', cursor: 'pointer' }}
            >
              Delete Staff Member
            </button>
            <button
              onClick={() => router.push(`/staff/${staffId}`)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={saving}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--color-mint)', color: 'var(--bg-shell)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>

          {/* Card 1 — Basic Info */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sectionLabel('Basic Info')}
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
            <FormField label="Mailing Address">
              <textarea style={{ ...inputStyle, height: 72, resize: 'vertical', fontFamily: 'Plus Jakarta Sans, sans-serif' }} rows={3} value={form.mailing_address} onChange={e => set('mailing_address', e.target.value)} />
            </FormField>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Card 2 — Travel */}
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sectionLabel('Travel')}
              <div>
                <div style={labelStyle}>Home Airport(s)</div>
                {localAirports.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>No airports added yet.</div>}
                {localAirports.map((airport, i) => (
                  <div key={airport.id || `new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => togglePrimary(i)}
                      title="Set as primary"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: airport.is_primary ? 'var(--color-yellow)' : 'var(--text-muted)', padding: '4px', flexShrink: 0, width: 28 }}
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
                      style={{ color: 'var(--color-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px' }}
                    >×</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAirport}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer' }}
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
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer' }}
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
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: a.preferred ? 'var(--color-yellow)' : 'var(--text-muted)', padding: '4px', flexShrink: 0, width: 28 }}
                    >★</button>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Airline" value={a.airline} onChange={e => setAirlineField(i, 'airline', e.target.value)} />
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="FF Number" value={a.frequent_flyer_number || ''} onChange={e => setAirlineField(i, 'frequent_flyer_number', e.target.value)} />
                    <button
                      type="button"
                      onClick={() => removeAirline(i)}
                      style={{ color: 'var(--color-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px' }}
                    >×</button>
                  </div>
                ))}
              </div>

              <FormField label="TSA PreCheck">
                <input style={inputStyle} value={form.tsa_precheck} onChange={e => set('tsa_precheck', e.target.value)} />
              </FormField>
              <FormField label="Global Entry">
                <input style={inputStyle} value={form.global_entry} onChange={e => set('global_entry', e.target.value)} />
              </FormField>
              <FormField label="Known Traveler #">
                <input style={inputStyle} value={form.known_traveler_number} onChange={e => set('known_traveler_number', e.target.value)} />
              </FormField>
            </div>

            {/* Card 3 — Passport */}
            <div className="glass-card" style={{ padding: 24 }}>
              {sectionLabel('Passport')}
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  <FormField label="Date of Birth">
                    <input type="date" style={inputStyle} value={form.dob} onChange={e => set('dob', e.target.value)} />
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Displayed as DD MONTH YYYY</div>
                  </FormField>
                  <FormField label="Place of Birth">
                    <input style={inputStyle} value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} />
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
                <div style={{ flex: '0 0 40%', display: 'flex', gap: 12 }}>
                  <EditUploadSlot label="Passport Page" url={form.passport_image_url} uploading={uploadingPassport} onFile={(f) => handleUpload('passport', f)} icon={IconFileText} />
                  <EditUploadSlot label="Headshot" url={form.passport_headshot_url} uploading={uploadingHeadshot} onFile={(f) => handleUpload('headshot', f)} icon={IconCamera} />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Change Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-shell)', border: '1px solid var(--border-card)', borderRadius: 12, padding: 28, maxWidth: 520, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Review Changes</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Accept or reject each change before saving.</div>

            {changes.map(change => (
              <div key={change.field} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-card)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{change.label}</div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--color-red)', textDecoration: 'line-through' }}>{change.originalValue || '—'}</span>
                    {' → '}
                    <span style={{ color: 'var(--color-mint)' }}>{change.newValue || '—'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => acceptChange(change.field)}
                    style={{ width: 28, height: 28, background: change.accepted === true ? 'var(--color-mint)' : 'transparent', border: '1px solid var(--border-card)', borderRadius: 6, cursor: 'pointer', color: change.accepted === true ? '#000' : 'var(--text-muted)', fontSize: 14 }}
                  >✓</button>
                  <button
                    onClick={() => rejectChange(change.field)}
                    style={{ width: 28, height: 28, background: change.accepted === false ? 'var(--color-red)' : 'transparent', border: '1px solid var(--border-card)', borderRadius: 6, cursor: 'pointer', color: change.accepted === false ? '#fff' : 'var(--text-muted)', fontSize: 14 }}
                  >✕</button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--border-card)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => doSave(changes)}
                disabled={!allDecided || saving}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 8, border: 'none', background: allDecided ? 'var(--color-mint)' : 'var(--bg-card-hover)', color: allDecided ? 'var(--bg-shell)' : 'var(--text-muted)', cursor: allDecided && !saving ? 'pointer' : 'default' }}
              >{saving ? 'Saving...' : `Save ${acceptedCount} Change${acceptedCount === 1 ? '' : 's'}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: 28, maxWidth: 400, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Delete Staff Member</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{fullName}</strong>? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--border-card)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--color-red)', color: '#fff', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
              >{deleting ? 'Deleting...' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '0.5px solid var(--border-card)', borderRadius: 8, padding: '10px 20px', fontSize: 14, color: 'var(--text-primary)', zIndex: 2000, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
