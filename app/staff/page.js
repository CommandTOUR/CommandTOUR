'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStaff = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('last_name', { ascending: true })
      if (!error) setStaff(data || [])
      setLoading(false)
    }
    fetchStaff()
  }, [])

  const filtered = staff.filter(s => {
    const full = `${s.first_name} ${s.last_name} ${s.email} ${s.home_airport}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const initials = (s) => `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>Staff</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {staff.length} {staff.length === 1 ? 'person' : 'people'}
            </div>
          </div>
          <button className="btn-primary" onClick={() => router.push('/staff/new')}>
            + Add Staff
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, email, or airport..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            fontFamily: 'Rubik, sans-serif', fontSize: 14,
            padding: '10px 16px', borderRadius: 8,
            border: '0.5px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)', outline: 'none',
            width: '100%', maxWidth: 420, marginBottom: 24,
          }}
        />

        {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>}

        {!loading && staff.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No staff yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Add your first staff member to get started</div>
            <button className="btn-primary" onClick={() => router.push('/staff/new')}>+ Add Staff</button>
          </div>
        )}

        {!loading && filtered.length === 0 && staff.length > 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No staff match "{search}"</div>
        )}

        {/* Staff grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(s => (
              <div
                key={s.id}
                className="glass-card"
                onClick={() => router.push(`/staff/${s.id}`)}
                style={{ padding: '18px 20px', cursor: 'pointer', transition: 'background 0.15s', position: 'relative' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, color: 'var(--mint)',
                  }}>
                    {initials(s)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.first_name} {s.last_name}{s.suffix && ` ${s.suffix}`}
                      </div>
                      {s.attention_flag && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFCC00', flexShrink: 0 }} title={s.attention_note || 'Needs attention'} />
                      )}
                    </div>
                    {s.email && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>}
                    {s.home_airport && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Home: {s.home_airport}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}