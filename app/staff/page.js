'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const DEPARTMENTS = [
  { key: 'executives', label: 'Executives' },
  { key: 'operations', label: 'Operations' },
  { key: 'lighting_audio_video', label: 'Lighting, Audio & Video' },
  { key: 'hosts', label: 'Hosts' },
  { key: 'fmx', label: 'FMX' },
  { key: 'stuntmanshow_productions', label: 'Stuntmanshow Productions' },
  { key: 'robot_operators', label: 'Robot Operators' },
  { key: 'monster_truck_drivers_crew', label: 'Monster Truck Drivers & Crew' },
  { key: 'uncategorized', label: 'Uncategorized' },
]

function getDepartment(s) {
  return s.department || 'uncategorized'
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, color: 'var(--text-muted)' }}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(Object.fromEntries(DEPARTMENTS.map(d => [d.key, false])))
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)

    const handleThemeChange = () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      setTheme(current)
    }
    window.addEventListener('themeChanged', handleThemeChange)
    return () => window.removeEventListener('themeChanged', handleThemeChange)
  }, [])

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

  const sections = DEPARTMENTS
    .map(dep => ({ ...dep, members: filtered.filter(s => getDepartment(s) === dep.key) }))
    .filter(sec => sec.members.length > 0)

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88 }}>

        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 88, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Staff</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>
                {staff.length} {staff.length === 1 ? 'person' : 'people'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14,
                  padding: '10px 16px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f1f5f9', outline: 'none', caretColor: '#33FF99',
                  width: 420, flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <button
                  onClick={() => router.push('/staffing-grid')}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', padding: '10px 20px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e6c009'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFD60A'}
                >
                  All Tours Staffing Grid
                </button>
                <button className="btn-primary" onClick={() => router.push('/staff/new')}>
                  + Add Staff Member
                </button>
              </div>
            </div>
          </div>
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
              <span style={{ color: 'var(--text-muted)' }}>
                <ChevronIcon open={!!expanded[key]} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label} ({members.length})
              </span>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.1)', marginLeft: 4 }} />
            </div>

            {expanded[key] && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {members.map(s => (
                  <div
                    key={s.id}
                    className="glass-card staff-tile"
                    onClick={() => router.push(`/staff/${s.id}`)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background 0.15s, box-shadow 0.15s',
                      position: 'relative',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      backdropFilter: 'blur(8px) saturate(1.3)',
                      WebkitBackdropFilter: 'blur(8px) saturate(1.3)',
                      border: '2.5px solid transparent',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(51,255,153,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#33FF99',
                      }}>
                        {initials(s)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.first_name} {s.last_name}{s.suffix && ` ${s.suffix}`}
                          </div>
                          {s.attention_flag && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} title={s.attention_note || 'Needs attention'} />
                          )}
                        </div>
                        {s.email && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>}
                        {s.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{s.phone}</div>}
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
