'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

export default function NewStaff() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [airlines, setAirlines] = useState([])
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '', suffix: '',
    cell_phone: '', email: '', dob: '',
    address: '', city: '', state: '', zip: '', country: '',
    home_airport: '', passport_nationality: '', passport_number: '', passport_expiry: '',
    allergies: '', notes: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const addAirline = () => setAirlines(prev => [...prev, { airline: '', frequent_flyer_number: '', preferred: false }])
  const setAirlineField = (i, key, val) => setAirlines(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  const removeAirline = (i) => setAirlines(prev => prev.filter((_, idx) => idx !== i))
  const togglePreferred = (i) => setAirlines(prev => prev.map((a, idx) => ({ ...a, preferred: idx === i ? !a.preferred : a.preferred })))

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First and last name are required'); return }
    setSaving(true)
    setError('')
    const supabase = getSupabase()

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert([{
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        suffix: form.suffix || null,
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
      }])
      .select()
      .single()

    if (staffError) { setError(staffError.message); setSaving(false); return }

    // Save airlines
    if (airlines.length > 0) {
      const airlineRows = airlines.filter(a => a.airline.trim()).map(a => ({
        staff_id: staffData.id,
        airline: a.airline,
        frequent_flyer_number: a.frequent_flyer_number || null,
        preferred: a.preferred,
      }))
      if (airlineRows.length > 0) {
        await supabase.from('staff_airlines').insert(airlineRows)
      }
    }

    router.push(`/staff/${staffData.id}`)
  }

  const inputStyle = {
    fontFamily: 'Rubik, sans-serif', fontSize: 14,
    padding: '10px 14px', borderRadius: 8,
    border: '0.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)', outline: 'none', width: '100%',
  }

  const labelStyle = {
    fontSize: 12, color: 'var(--text-muted)',
    letterSpacing: '0.05em', marginBottom: 6, display: 'block',
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', paddingBottom: 10, borderBottom: '0.5px solid var(--glass-border)', marginBottom: 4 }}>
      {title}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: '28px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button onClick={() => router.push('/staff')} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            ← Back
          </button>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Add Staff Member</div>
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
                <button onClick={addAirline} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}>
                  + Add Airline
                </button>
              </div>
              {airlines.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No airlines added yet.</div>
              )}
              {airlines.map((a, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <input style={inputStyle} placeholder="Airline (e.g. Delta)" value={a.airline} onChange={e => setAirlineField(i, 'airline', e.target.value)} />
                  <input style={inputStyle} placeholder="FF Number" value={a.frequent_flyer_number} onChange={e => setAirlineField(i, 'frequent_flyer_number', e.target.value)} />
                  <div
                    onClick={() => togglePreferred(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', padding: '0 8px' }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.preferred ? 'var(--mint)' : 'transparent', border: a.preferred ? 'none' : '1.5px solid var(--glass-border)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: a.preferred ? 'var(--mint)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>Preferred</span>
                  </div>
                  <div onClick={() => removeAirline(i)} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >×</div>
                </div>
              ))}
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

          {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button onClick={() => router.push('/staff')} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '9px 20px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Add Staff Member'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}