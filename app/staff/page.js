'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { IconSettings } from '@tabler/icons-react'

const thStyle = {
  padding: '10px 16px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

export default function StaffPage() {
  const router = useRouter()
  const [allStaff, setAllStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState(() => new Set())
  const [expandedInitKey, setExpandedInitKey] = useState(null)
  const [isLight, setIsLight] = useState(false)
  const [sortField, setSortField] = useState('last_name')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute('data-theme') === 'light')
    check()
    window.addEventListener('themeChanged', check)
    return () => window.removeEventListener('themeChanged', check)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [staffRes, deptsRes] = await Promise.all([
        supabase.from('staff')
          .select('id, first_name, last_name, suffix, display_name, email, phone, department, staff_department_id, attention_flag, attention_note')
          .order('last_name', { ascending: true }),
        supabase.from('staff_departments')
          .select('id, name, sort_order')
          .order('sort_order', { ascending: true }),
      ])
      setAllStaff(staffRes.data || [])
      setDepartments(deptsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const filteredStaff = allStaff.filter(s => {
    const full = `${s.first_name || ''} ${s.last_name || ''} ${s.email || ''} ${s.phone || ''}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const sections = departments.map(dept => ({
    ...dept,
    staff: filteredStaff.filter(s => s.staff_department_id === dept.id),
  })).filter(sec => sec.staff.length > 0)

  const uncategorized = filteredStaff.filter(s => !s.staff_department_id)
  if (uncategorized.length > 0) {
    sections.push({ id: 'uncategorized', name: 'Uncategorized', staff: uncategorized })
  }

  const sectionsKey = sections.map(s => s.id).join(',')
  if (sectionsKey && sectionsKey !== expandedInitKey) {
    setExpandedInitKey(sectionsKey)
    setExpandedSections(new Set(sections.map(s => s.id)))
  }

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSort = () => {
    if (sortField === 'last_name' && sortDir === 'asc') {
      setSortField('last_name'); setSortDir('desc')
    } else if (sortField === 'last_name' && sortDir === 'desc') {
      setSortField('first_name'); setSortDir('asc')
    } else if (sortField === 'first_name' && sortDir === 'asc') {
      setSortField('first_name'); setSortDir('desc')
    } else {
      setSortField('last_name'); setSortDir('asc')
    }
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
                {allStaff.length} {allStaff.length === 1 ? 'person' : 'people'}
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
                  onClick={() => router.push('/staff/settings')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <IconSettings size={16} stroke={1.75} />
                  Staffing Settings
                </button>
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

        <div style={{ padding: 24 }}>

        {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>}

        {!loading && allStaff.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No staff yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Add your first staff member to get started</div>
            <button className="btn-primary" onClick={() => router.push('/staff/new')}>+ Add Staff Member</button>
          </div>
        )}

        {!loading && filteredStaff.length === 0 && allStaff.length > 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No staff match &quot;{search}&quot;</div>
        )}

        {/* Table */}
        {!loading && sections.length > 0 && (
          <div style={{
            border: '1px solid var(--border-card)',
            borderRadius: 10,
            overflow: 'hidden',
            marginTop: 16,
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}>
              <thead>
                <tr style={{
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-card)',
                }}>
                  <th style={{ ...thStyle, width: 40 }} />
                  <th style={{ ...thStyle, cursor: 'pointer' }} onClick={toggleSort}>
                    NAME {sortField === 'last_name' ? 'LAST' : 'FIRST'} {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th style={thStyle}>DEPARTMENT</th>
                  <th style={thStyle}>PHONE</th>
                  <th style={thStyle}>EMAIL</th>
                </tr>
              </thead>

              <tbody>
                {sections.map(section => (
                  <Fragment key={section.id}>
                    <tr
                      onClick={() => toggleSection(section.id)}
                      style={{
                        background: 'var(--bg-card)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <td colSpan={5} style={{
                        padding: '8px 16px',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        borderTop: '2px solid var(--border-card)',
                        borderBottom: '1px solid var(--border-card)',
                      }}>
                        <span style={{ marginRight: 8 }}>
                          {expandedSections.has(section.id) ? '▾' : '▸'}
                        </span>
                        {section.name}
                        <span style={{
                          marginLeft: 8,
                          fontWeight: 400,
                          color: 'var(--text-muted)',
                        }}>
                          ({section.staff.length})
                        </span>
                      </td>
                    </tr>

                    {expandedSections.has(section.id) && [...section.staff].sort((a, b) => {
                      const aVal = (a[sortField] || '').toLowerCase()
                      const bVal = (b[sortField] || '').toLowerCase()
                      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                    }).map((person, i) => (
                      <tr
                        key={person.id}
                        onClick={() => router.push(`/staff/${person.id}`)}
                        style={{
                          background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-card)',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg)' : 'var(--bg-card)' }}
                      >
                        {/* Avatar */}
                        <td style={{ padding: '7px 8px 7px 16px', width: 40 }}>
                          <div style={{
                            width: 32, height: 32,
                            borderRadius: '50%',
                            background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                            color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {(person.first_name?.[0] || '') + (person.last_name?.[0] || '')}
                          </div>
                        </td>

                        {/* Name */}
                        <td style={{
                          padding: '7px 16px',
                          fontSize: 14, fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                        }}>
                          {[person.first_name, person.last_name, person.suffix].filter(Boolean).join(' ')}
                          {person.attention_flag && (
                            <span style={{ marginLeft: 6, color: '#d97706', fontSize: 10 }} title={person.attention_note || 'Needs attention'}>⚠</span>
                          )}
                        </td>

                        {/* Department */}
                        <td style={{ padding: '7px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {section.name === 'Uncategorized' ? '—' : section.name}
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '7px 16px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {person.phone || '—'}
                        </td>

                        {/* Email */}
                        <td
                          style={{ padding: '7px 16px', fontSize: 13, color: 'var(--text-secondary)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {person.email ? (
                            <a href={`mailto:${person.email}`} style={{ color: 'var(--color-mint)', textDecoration: 'none' }}>
                              {person.email}
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
