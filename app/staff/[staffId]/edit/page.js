'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../components/TopNav'
import { getSupabase } from '../../../../lib/supabase'

export default function EditStaff() {
  const router = useRouter()
  const { staffId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [airlines, setAirlines] = useState([])
  const [deletedAirlineIds, setDeletedAirlineIds] = useState([])
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', suffix: '', display_name: '',
    cell_phone: '', email: '', dob: '',
    address: '', city: '', state: '', zip: '', country: '',
    home_airport: '', passport_nationality: '', passport_number: '', passport_expiry: '',
    allergies: '', notes: '', attention_flag: false, attention_note: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [personRes, airlinesRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('staff_airlines').select('*').eq('staff_id', staffId).order('preferred', { ascending: false }),
      ])
      if (!personRes.error && personRes.data) {
        const d = personRes.data
        setForm({
          first_name: d.first_name || '',
          middle_name: d.middle_name || '',
          last_name: d.last_name || '',
          suffix: d.suffix || '',
          display_name: d.display_name || '',
          cell_phone: d.phone || '',
          email: d.email || '',
          dob: d.dob || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          zip: d.zip || '',
          country: d.country || '',
          home_airport: d.home_airport || '',
          passport_nationality: d.passport_nationality || '',
          passport_number: d.passport_number || '',
          passport_expiry: d.passport_expiry || '',
          allergies: d.allergies || '',
          notes: d.notes || '',
          attention_flag: d.attention_flag || false,
          attention_note: d.attention_note || '',
        })
      }
      if (!airlinesRes.error) setAirlines(airlinesRes.data?.map(a => ({ ...a, isNew: false })) || [])
      setLoading(false)
    }
    fetchData()
  }, [staffId])

  const addAirline = () => setAirlines(prev => [...prev, { airline: '', frequent_flyer_number: '', preferred: false, isNew: true }])
  const setAirlineField = (i, key, val) => setAirlines(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  const removeAirline = (i) => {
    const a = airlines[i]
    if (a.id) setDeletedAirlineIds(prev => [...prev, a.id])
    setAirlines(prev => prev.filter((_, idx) => idx !== i))
  }
  const togglePreferred = (i) => setAirlines(prev => prev.map((a, idx) => ({ ...a, preferred: idx === i ? !a.preferred : a.preferred })))

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First and last name are required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()

    await supabase.from('staff').update({
      first_name: form.first_name,
      middle_name: form.middle_name || null,
      last_name: form.last_name,
      suffix: form.suffix || null,
      display_name: form.display_name || null,
      phone: form.cell_phone || null,
      email: form.email || null,
      dob: form.dob || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      country: form.country || null,
      home_airport: form.home_airport || null,
      passport_nationality: form.passport_nationality || null,
      passport_number: form.passport_number || null,
      passport_expiry: form.passport_expiry || null,
      allergies: form.allergies || null,
      notes: form.notes || null,
      attention_flag: form.attention_flag,
      attention_note: form.attention_note || null,
    }).eq('id', staffId)

    // Delete removed airlines
    if (deletedAirlineIds.length > 0) {
      await supabase.from('staff_airlines').delete().in('id', deletedAirlineIds)
    }

    // Update existing + insert new airlines
    for (const a of airlines) {
      if (!a.airline.trim()) continue
      if (a.isNew) {
        await supabase.from('staff_airlines').insert([{ staff_id: staffId, airline: a.airline, frequent_flyer_number: a.frequent_flyer_number || null, preferred: a.preferred }])
      } else {
        await supabase.from('staff_airlines').update({ airline: a.airline, frequent_flyer_number: a.frequent_flyer_number || null, preferred: a.preferred }).eq('id', a.id)
      }
    }

    router.push(`/staff/${staffId}`)
  }

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14,
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#f1f5f9', caretColor: '#33FF99', outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 12, color: '#94a3b8',
    letterSpacing: '0.05em', marginBottom: 6, display: 'block',
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
      {title}
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: '28px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push(`/staff/${staffId}`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ← Back
          </button>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Edit Profile</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Name')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.4fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} placeholder="First" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Middle Name</label>
                <input style={inputStyle} placeholder="Middle" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} placeholder="Last" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Suffix</label>
                <input style={inputStyle} placeholder="Jr." value={form.suffix} onChange={e => set('suffix', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Display Name</label>
                <input style={inputStyle} placeholder="Optional — shown instead of full name in Staffing Grid" value={form.display_name} onChange={e => set('display_name', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Contact')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Cell Phone</label>
                <input style={inputStyle} placeholder="e.g. +1 555 000 0000" value={form.cell_phone} onChange={e => set('cell_phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle} type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.8fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Mailing Address</label>
                <input style={inputStyle} placeholder="Street address" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>ZIP</label>
                <input style={inputStyle} placeholder="ZIP" value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={inputStyle} placeholder="Country" value={form.country} onChange={e => set('country', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Travel */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Travel')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <label style={labelStyle}>Home Airport</label>
                <input style={inputStyle} placeholder="e.g. LAX" value={form.home_airport} onChange={e => set('home_airport', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Passport Nationality</label>
                <input style={inputStyle} placeholder="e.g. USA" value={form.passport_nationality} onChange={e => set('passport_nationality', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Passport Number</label>
                <input style={inputStyle} placeholder="Passport #" value={form.passport_number} onChange={e => set('passport_number', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Passport Expiry</label>
                <input style={inputStyle} type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} />
              </div>
            </div>

            {/* Airlines */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Airlines & Frequent Flyer Numbers</label>
                <button onClick={addAirline} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#33FF99', cursor: 'pointer' }}>
                  + Add Airline
                </button>
              </div>
              {airlines.length === 0 && (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No airlines added yet.</div>
              )}
              {airlines.map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <input style={inputStyle} placeholder="Airline (e.g. Delta)" value={a.airline} onChange={e => setAirlineField(i, 'airline', e.target.value)} />
                  <input style={inputStyle} placeholder="FF Number" value={a.frequent_flyer_number || ''} onChange={e => setAirlineField(i, 'frequent_flyer_number', e.target.value)} />
                  <div onClick={() => togglePreferred(i)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', padding: '0 8px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.preferred ? '#33FF99' : 'transparent', border: a.preferred ? 'none' : '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: a.preferred ? '#33FF99' : '#94a3b8', whiteSpace: 'nowrap' }}>Preferred</span>
                  </div>
                  <div onClick={() => removeAirline(i)} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  >×</div>
                </div>
              ))}
            </div>
          </div>

          {/* Attention Flag */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Attention Flag')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div onClick={() => set('attention_flag', !form.attention_flag)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: form.attention_flag ? '#d97706' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: form.attention_flag ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: form.attention_flag ? '#ffffff' : '#ffffff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: 13, color: form.attention_flag ? '#d97706' : '#94a3b8' }}>Flag this person for attention</span>
              </div>
              {form.attention_flag && (
                <div>
                  <label style={labelStyle}>Attention Note</label>
                  <input style={inputStyle} placeholder="e.g. New hire, first event of the year..." value={form.attention_note} onChange={e => set('attention_note', e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Other */}
          <div className="glass-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionLabel('Other')}
            <div>
              <label style={labelStyle}>Food Allergies</label>
              <input style={inputStyle} placeholder="e.g. Peanuts, Gluten" value={form.allergies} onChange={e => set('allergies', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Any notes about this staff member..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button
              onClick={() => router.push(`/staff/${staffId}`)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f1f5f9', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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