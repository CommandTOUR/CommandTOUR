'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { IconPrinter } from '@tabler/icons-react'

function EventListHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card-hover)', padding: '8px 16px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid var(--border-card)' }}>
      <div style={{ flex: '0 0 220px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Location</div>
      <div style={{ flex: '0 0 130px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Date</div>
      <div style={{ flex: '0 0 200px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Tour</div>
      <div style={{ flex: '0 0 160px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Position</div>
      <div style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Status</div>
    </div>
  )
}

export default function StaffProfile() {
  const router = useRouter()
  const { staffId } = useParams()
  const [person, setPerson] = useState(null)
  const [airlines, setAirlines] = useState([])
  const [events, setEvents] = useState([])
  const [staffDepts, setStaffDepts] = useState([])
  const [showPast, setShowPast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showMap, setShowMap] = useState({})
  const [stickyVisible, setStickyVisible] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [personRes, airlinesRes, eventsRes, staffDeptsRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('staff_airlines').select('*').eq('staff_id', staffId).order('preferred', { ascending: false }),
        supabase.from('staff_assignments')
          .select(`
            id,
            status,
            confirmed,
            slot_index,
            event_id,
            tour_position_id,
            events:event_id(id, city, state, country, load_in_date, load_out_date, event_type, tour_id, tours(name, color)),
            tour_positions:tour_position_id(position_id, positions:position_id(title))
          `)
          .eq('staff_id', staffId)
          .not('event_id', 'is', null),
        supabase.from('staff_departments').select('id, name').order('sort_order', { ascending: true }),
      ])
      if (!personRes.error) setPerson(personRes.data)
      if (!airlinesRes.error) setAirlines(airlinesRes.data || [])
      if (!staffDeptsRes.error) setStaffDepts(staffDeptsRes.data || [])
      if (!eventsRes.error) {
        const eventsData = (eventsRes.data || []).sort((a, b) => new Date(a.events?.load_in_date || a.load_in_date) - new Date(b.events?.load_in_date || b.load_in_date))
        setEvents(eventsData)
        const eventIds = eventsData.map(es => es.events?.id).filter(Boolean)
        if (eventIds.length) {
          const { data: showRows } = await supabase.from('show_list').select('event_id, show_date').in('event_id', eventIds)
          const map = {}
          for (const row of showRows || []) {
            if (!map[row.event_id] || row.show_date > map[row.event_id]) map[row.event_id] = row.show_date
          }
          setShowMap(map)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [staffId])

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'

  const fmtDateRange = (start, end) => {
    if (!start) return '—'
    const s = new Date(start + 'T00:00:00')
    const fmtD = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!end || end === start) return fmtD(s)
    const e = new Date(end + 'T00:00:00')
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()} – ${e.getDate()}`
    }
    return `${fmtD(s)} – ${fmtD(e)}`
  }

  const handleRemove = async () => {
    setRemoving(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('staff').delete().eq('id', staffId)
    if (!error) {
      setToast(`${fullName} has been removed`)
      setTimeout(() => router.push('/staff'), 1500)
    } else {
      setRemoving(false)
      setShowRemoveModal(false)
    }
  }

  const handleDepartmentChange = async (newDeptId) => {
    const supabase = getSupabase()
    const value = newDeptId || null
    const { error } = await supabase.from('staff').update({ staff_department_id: value }).eq('id', staffId)
    if (!error) setPerson(prev => ({ ...prev, staff_department_id: value }))
  }

  useEffect(() => {
    if (!nameRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-62px 0px 0px 0px' }
    )
    observer.observe(nameRef.current)
    return () => observer.disconnect()
  }, [person])

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid var(--bg-card)' }}>
      {title}
    </div>
  )

  const field = (label, value) => value ? (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  ) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!person) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Staff member not found.</div>
    </div>
  )

  const fullName = [person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ')
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()

  const now = new Date()
  const upcomingEvents = events.filter(es => es.events && new Date(es.events.load_in_date + 'T00:00:00') >= now)
  const pastEvents = events.filter(es => es.events && new Date(es.events.load_in_date + 'T00:00:00') < now)

  const STAFF_STATUS = {
    confirmed: { color: '#33FF99', label: 'Confirmed' },
    pending: { color: '#FFD60A', label: 'Pending' },
    needs_attention: { color: '#e05252', label: 'Needs Attention' },
  }
  function normalizeStaffStatus(s) {
    if (s === 'scheduled') return 'pending'
    if (s === 'attention') return 'needs_attention'
    return s
  }

  const EventTile = ({ es }) => {
    const ev = es.events
    if (!ev) return null
    const tourColor = ev.tours?.color || 'var(--mint)'
    const st = STAFF_STATUS[normalizeStaffStatus(es.status)] || (es.confirmed ? STAFF_STATUS.confirmed : STAFF_STATUS.pending)
    return (
      <div
        onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border-card)', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flex: '0 0 220px', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatLocation(ev.city, ev.state, ev.country, 'full')}
        </div>
        <div style={{ flex: '0 0 130px', color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>
          {fmtDateRange(ev.load_in_date, ev.load_out_date || showMap[ev.id] || null)}
        </div>
        <div style={{ flex: '0 0 200px', color: tourColor, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.tours?.name || '—'}
        </div>
        <div style={{ flex: '0 0 160px', color: 'var(--text-secondary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {es.tour_positions?.positions?.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: st.color }}>{st.label}</span>
        </div>
      </div>
    )
  }

  const handlePrint = () => window.print()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <TopNav />

      {/* Sticky name header — appears when the main name scrolls out of view */}
      {stickyVisible && (
        <div style={{ position: 'sticky', top: 88, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--border-card)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</div>
          {person.email && (
            <a href={`mailto:${person.email}`} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{person.email}</a>
          )}
          {person.phone && (
            <a href={`tel:${person.phone}`} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{person.phone}</a>
          )}
        </div>
      )}

      <div style={{ marginTop: 88, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/staff')}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ← Staff
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div ref={nameRef} style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{fullName}</div>
                  {person.attention_flag && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: '#fef9c3', border: '1px solid #fde68a' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
                      <span style={{ fontSize: 11, color: '#854d0e', fontWeight: 500 }}>{person.attention_note || 'Needs Attention'}</span>
                    </div>
                  )}
                </div>
                {person.email && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 3 }}>{person.email}</div>}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/staff/${staffId}/edit`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Edit Profile
          </button>
        </div>

        {/* Department dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, flexShrink: 0 }}>Department</span>
          <select
            value={person.staff_department_id || ''}
            onChange={e => handleDepartmentChange(e.target.value)}
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-card)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 13,
              padding: '8px 12px',
              width: 240,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Select department...</option>
            {staffDepts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Contact + Travel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              {sectionLabel('Contact')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {field('Cell Phone', person.phone)}
                {field('Email', person.email)}
                {field('Date of Birth', fmt(person.dob))}
                {(person.address || person.city) && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Mailing Address</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {person.address && <div>{person.address}</div>}
                      <div>{[person.city, person.state, person.zip, person.country].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px 24px' }}>
              {sectionLabel('Travel')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: airlines.length > 0 ? 16 : 0 }}>
                {field('Home Airport', person.home_airport)}
                {field('Passport Nationality', person.passport_nationality)}
                {field('Passport Number', person.passport_number)}
                {field('Passport Expiry', fmt(person.passport_expiry))}
              </div>
              {airlines.length > 0 && (
                <>
                  <div style={{ height: 0.5, background: 'var(--bg-card)', marginBottom: 14 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Airlines</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {airlines.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.preferred && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />}
                        <div style={{ fontSize: 14, fontWeight: a.preferred ? 500 : 400, color: 'var(--text-primary)' }}>{a.airline}</div>
                        {a.frequent_flyer_number && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>#{a.frequent_flyer_number}</div>}
                        {a.preferred && <div style={{ fontSize: 11, color: 'var(--mint)', marginLeft: 'auto' }}>Preferred</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Allergies + Notes */}
          {(person.allergies || person.notes) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {person.allergies && (
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                  {sectionLabel('Food Allergies')}
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.allergies}</div>
                </div>
              )}
              {person.notes && (
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                  {sectionLabel('Notes')}
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{person.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid var(--bg-card)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                  Upcoming Events ({upcomingEvents.length})
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handlePrint}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  >
                    <IconPrinter size={16} stroke={1.5} color="var(--text-secondary)" />
                  </button>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 8, overflow: 'hidden' }}>
                <EventListHeader />
                {upcomingEvents.map((es, i) => <EventTile key={i} es={es} />)}
              </div>
            </div>
          )}

          {/* Past Events — collapsible */}
          {pastEvents.length > 0 && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div
                onClick={() => setShowPast(!showPast)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: showPast ? 16 : 0 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                  {showPast ? '▾' : '▸'} Past Events ({pastEvents.length})
                </div>
              </div>
              {showPast && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 8, overflow: 'hidden' }}>
                  <EventListHeader />
                  {pastEvents.map((es, i) => <EventTile key={i} es={es} />)}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Remove Staff Member */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '0.5px solid var(--bg-card)' }}>
          <button
            onClick={() => setShowRemoveModal(true)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.30)', background: 'transparent', color: '#f87171', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Remove Staff Member
          </button>
        </div>

      </div>

      {/* Confirmation modal */}
      {showRemoveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: 28, maxWidth: 400, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Remove Staff Member</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently remove <strong style={{ color: 'var(--text-primary)' }}>{fullName}</strong> from CommandTOUR. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRemoveModal(false)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--border-card)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleRemove}
                disabled={removing}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', opacity: removing ? 0.6 : 1 }}
              >{removing ? 'Removing...' : 'Remove'}</button>
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