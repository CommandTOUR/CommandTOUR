'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const SECTIONS = [
  { key: 'staff', label: 'Staff' },
  { key: 'contractor', label: 'Contractors' },
  { key: 'other', label: 'Other' },
]

function getEmployeeType(s) {
  if (s.employee_type === 'contractor') return 'contractor'
  if (s.employee_type === 'other') return 'other'
  return 'staff'
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, color: 'rgba(255,255,255,0.45)' }}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({ staff: true, contractor: true, other: true })

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

  const sections = SECTIONS
    .map(sec => ({ ...sec, members: filtered.filter(s => getEmployeeType(s) === sec.key) }))
    .filter(sec => sec.members.length > 0)

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>

        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>Staff</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                {staff.length} {staff.length === 1 ? 'person' : 'people'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => router.push('/staffing-grid')}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#0a1628', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#b8963e'}
                onMouseLeave={e => e.currentTarget.style.background = '#C9A84C'}
              >
                All Tours Staffing Grid
              </button>
              <button className="btn-primary" onClick={() => router.push('/staff/new')}>
                + Add Staff Member
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, email, or airport..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14,
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid #d4cfc8',
              background: '#ffffff',
              color: '#1a1a1a', outline: 'none', caretColor: '#0a1628',
              width: '100%', maxWidth: 420,
            }}
          />
        </div>

        <div style={{ padding: 28 }}>

        {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>}

        {!loading && staff.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No staff yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Add your first staff member to get started</div>
            <button className="btn-primary" onClick={() => router.push('/staff/new')}>+ Add Staff Member</button>
          </div>
        )}

        {!loading && filtered.length === 0 && staff.length > 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No staff match "{search}"</div>
        )}

        {/* Sections */}
        {!loading && sections.map(({ key, label, members }) => (
          <div key={key} style={{ marginBottom: 32 }}>
            <div
              onClick={() => toggleSection(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: expanded[key] ? 16 : 0, userSelect: 'none' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                <ChevronIcon open={!!expanded[key]} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                {members.length} {members.length === 1 ? 'person' : 'people'}
              </span>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.1)', marginLeft: 4 }} />
            </div>

            {expanded[key] && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {members.map(s => (
                  <div
                    key={s.id}
                    className="glass-card"
                    onClick={() => router.push(`/staff/${s.id}`)}
                    style={{ padding: '18px 20px', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s', position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0ece4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: '#0a1628', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#33FF99',
                      }}>
                        {initials(s)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.first_name} {s.last_name}{s.suffix && ` ${s.suffix}`}
                          </div>
                          {s.attention_flag && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} title={s.attention_note || 'Needs attention'} />
                          )}
                        </div>
                        {s.email && <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>}
                        {s.phone && <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 1 }}>{s.phone}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
