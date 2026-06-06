'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

export default function StaffProfile() {
  const router = useRouter()
  const { staffId } = useParams()
  const [person, setPerson] = useState(null)
  const [airlines, setAirlines] = useState([])
  const [events, setEvents] = useState([])
  const [showPast, setShowPast] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [personRes, airlinesRes, eventsRes] = await Promise.all([
        supabase.from('staff').select('*').eq('id', staffId).single(),
        supabase.from('staff_airlines').select('*').eq('staff_id', staffId).order('preferred', { ascending: false }),
        supabase.from('event_staff')
          .select('position, confirmed, events(id, city, country, load_in_date, event_type, tour_id, tours(name, color))')
          .eq('staff_id', staffId)
          .order('created_at', { ascending: false }),
      ])
      if (!personRes.error) setPerson(personRes.data)
      if (!airlinesRes.error) setAirlines(airlinesRes.data || [])
      if (!eventsRes.error) setEvents(eventsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [staffId])

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const eventTypeName = (t) => {
    if (t === 'hwss') return 'Hot Wheels Stunt Show'
    if (t === 'hwmt') return 'Hot Wheels Monster Trucks Live'
    return '—'
  }

  const sectionLabel = (title) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14, paddingBottom: 8, borderBottom: '0.5px solid var(--glass-border)' }}>
      {title}
    </div>
  )

  const field = (label, value) => value ? (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  ) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!person) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Staff member not found.</div>
    </div>
  )

  const fullName = [person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ')
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()

  const now = new Date()
  const upcomingEvents = events.filter(es => es.events && new Date(es.events.load_in_date + 'T00:00:00') >= now)
  const pastEvents = events.filter(es => es.events && new Date(es.events.load_in_date + 'T00:00:00') < now)

  const EventTile = ({ es }) => {
    const ev = es.events
    if (!ev) return null
    const tourColor = ev.tours?.color || 'var(--mint)'
    return (
      <div
        className="glass-card"
        onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
        style={{ padding: '14px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: tourColor }} />
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {ev.city}{ev.country && `, ${ev.country}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          {fmtShort(ev.load_in_date)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          {eventTypeName(ev.event_type)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {es.position}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: es.confirmed ? '#33FF99' : '#FFCC00', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: es.confirmed ? '#33FF99' : '#FFCC00' }}>
            {es.confirmed ? 'Confirmed' : 'Scheduled'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => router.push('/staff')} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              ← Staff
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{fullName}</div>
                  {person.attention_flag && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,204,0,0.1)', border: '0.5px solid rgba(255,204,0,0.35)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFCC00' }} />
                      <span style={{ fontSize: 11, color: '#FFCC00', fontWeight: 500 }}>{person.attention_note || 'Needs Attention'}</span>
                    </div>
                  )}
                </div>
                {person.email && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>{person.email}</div>}
              </div>
            </div>
          </div>
          <button onClick={() => router.push(`/staff/${staffId}/edit`)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            Edit Profile
          </button>
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
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Mailing Address</div>
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
                  <div style={{ height: 0.5, background: 'var(--glass-border)', marginBottom: 14 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Airlines</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {airlines.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {a.preferred && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />}
                        <div style={{ fontSize: 14, fontWeight: a.preferred ? 500 : 400 }}>{a.airline}</div>
                        {a.frequent_flyer_number && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{a.frequent_flyer_number}</div>}
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
              {sectionLabel(`Upcoming Events (${upcomingEvents.length})`)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                  {showPast ? '▾' : '▸'} Past Events ({pastEvents.length})
                </div>
              </div>
              {showPast && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {pastEvents.map((es, i) => <EventTile key={i} es={es} />)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}