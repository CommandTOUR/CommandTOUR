'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { IconPrinter, IconFileText, IconCamera } from '@tabler/icons-react'

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

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 2,
}

const valueStyle = {
  fontSize: 14,
  color: 'var(--text-primary)',
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value || '—'}</div>
    </div>
  )
}

function UploadSlot({ label, url, icon: Icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={label} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-card)', display: 'block' }} />
        </a>
      ) : (
        <div style={{ width: 80, height: 100, borderRadius: 4, border: '1px dashed var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} stroke={1.5} color="var(--text-muted)" />
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</div>
      {!url && <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Upload in Edit Profile</div>}
    </div>
  )
}

export default function StaffProfile() {
  const router = useRouter()
  const { staffId } = useParams()
  const [person, setPerson] = useState(null)
  const [staffAirports, setStaffAirports] = useState([])
  const [events, setEvents] = useState([])
  const [showPast, setShowPast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState({})
  const [stickyVisible, setStickyVisible] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [personRes, airlinesRes, staffAirportsRes, eventsRes] = await Promise.all([
        supabase.from('staff')
          .select('*')
          .eq('id', staffId)
          .single(),
        supabase.from('staff_airlines')
          .select('*')
          .eq('staff_id', staffId)
          .order('preferred', { ascending: false }),
        supabase.from('staff_airports')
          .select('*')
          .eq('staff_id', staffId)
          .order('sort_order', { ascending: true }),
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
      ])
      if (personRes.error) console.error('Staff fetch error:', personRes.error)
      if (!personRes.error && personRes.data) {
        const person = { ...personRes.data, staff_airlines: airlinesRes.data || [] }
        if (person.staff_department_id) {
          const { data: dept } = await supabase.from('staff_departments').select('name').eq('id', person.staff_department_id).single()
          person.staff_departments = dept ? { name: dept.name } : null
        }
        setPerson(person)
      }
      if (!staffAirportsRes.error) setStaffAirports(staffAirportsRes.data || [])
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

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false
    const expiry = new Date(dateStr + 'T12:00:00')
    const sixMonthsOut = new Date()
    sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)
    return expiry <= sixMonthsOut
  }

  const formatPassportDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()
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

  const addressLines = (person.mailing_address || '').split('\n').map(l => l.trim()).filter(Boolean)

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
    const tourColor = ev.tours?.color || 'var(--color-mint)'
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
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--color-mint)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-mint-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ← Staff
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-mint-bg)', border: '0.5px solid var(--color-mint-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--color-mint)', flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div ref={nameRef} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</div>
                  {person.attention_flag && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--color-yellow-bg)', border: '1px solid var(--color-yellow-border)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-yellow)' }} />
                      <span style={{ fontSize: 11, color: 'var(--color-yellow)', fontWeight: 500 }}>{person.attention_note || 'Needs Attention'}</span>
                    </div>
                  )}
                </div>
                {person.display_name && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>{person.display_name}</div>}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/staff/${staffId}/edit`)}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--color-mint)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-mint-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Edit Profile
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Basic Info / Travel / Passport */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>

            {/* Card 1 — Basic Info */}
            <div className="glass-card" style={{ padding: 24 }}>
              {sectionLabel('Basic Info')}
              <Field label="Display Name" value={person.display_name} />
              <Field label="Name" value={[person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ')} />
              <Field label="Department" value={person.staff_departments?.name} />
              <Field label="Cell Phone" value={person.phone} />
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>Email</div>
                {person.email ? (
                  <a href={`mailto:${person.email}`} style={{ fontSize: 14, color: 'var(--color-mint)', textDecoration: 'none' }}>{person.email}</a>
                ) : (
                  <div style={valueStyle}>—</div>
                )}
              </div>
              <Field label="Date of Birth" value={fmt(person.dob)} />
              <div style={{ marginBottom: 0 }}>
                <div style={labelStyle}>Mailing Address</div>
                <div style={{ ...valueStyle, lineHeight: 1.6 }}>
                  {addressLines.length > 0 ? addressLines.map((line, i) => <div key={i}>{line}</div>) : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Card 2 — Travel */}
              <div className="glass-card" style={{ padding: 24 }}>
                {sectionLabel('Travel')}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Home Airport(s)</div>
                  {staffAirports.length > 0 ? (
                    <div style={{ display: 'table', width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                      {[...staffAirports].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)).map(airport => (
                        <div key={airport.id} style={{ display: 'table-row' }}>
                          <div style={{ display: 'table-cell', width: 20, paddingRight: 4, paddingBottom: 8, verticalAlign: 'middle' }}>
                            <span style={{ color: airport.is_primary ? 'var(--color-yellow)' : 'transparent', fontSize: 13 }}>★</span>
                          </div>
                          <div style={{ display: 'table-cell', paddingRight: 16, paddingBottom: 8, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', width: 50 }}>
                            {airport.iata_code}
                          </div>
                          <div style={{ display: 'table-cell', paddingRight: 16, paddingBottom: 8, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {[airport.city, airport.state].filter(Boolean).join(', ')}
                          </div>
                          <div style={{ display: 'table-cell', paddingBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            {airport.airport_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : person.home_airport ? (
                    <div style={valueStyle}>
                      {person.home_airport}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>(legacy — update in Edit Profile)</span>
                    </div>
                  ) : <div style={valueStyle}>—</div>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}>Airlines</div>
                  {person.staff_airlines?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                      {[...person.staff_airlines].sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0)).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ color: a.preferred ? 'var(--color-yellow)' : 'transparent', fontSize: 13, width: 16, flexShrink: 0 }}>★</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.airline}</span>
                          {a.frequent_flyer_number && <span style={{ fontSize: 14, color: 'var(--text-primary)', marginLeft: 8 }}>#{a.frequent_flyer_number}</span>}
                        </div>
                      ))}
                    </div>
                  ) : <div style={valueStyle}>—</div>}
                </div>
                <Field label="TSA PreCheck" value={person.tsa_precheck} />
                <Field label="Global Entry" value={person.global_entry} />
                <div style={{ marginBottom: 0 }}>
                  <div style={labelStyle}>Known Traveler #</div>
                  <div style={valueStyle}>{person.known_traveler_number || '—'}</div>
                </div>
              </div>

              {/* Card 3 — Passport */}
              <div className="glass-card" style={{ padding: 24 }}>
                {sectionLabel('Passport')}
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: '0 0 60%' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={labelStyle}>Passport Number</div>
                      <div style={valueStyle}>{person.passport_number || '—'}</div>
                    </div>
                    <Field label="Nationality" value={person.passport_nationality} />
                    <Field label="Surname" value={person.passport_surname} />
                    <Field label="Given Names" value={person.passport_given_names} />
                    <Field label="Date of Birth" value={formatPassportDate(person.dob)} />
                    <Field label="Place of Birth" value={person.place_of_birth} />
                    <Field label="Date of Issue" value={formatPassportDate(person.date_of_issue)} />
                    <div style={{ marginBottom: 0 }}>
                      <div style={labelStyle}>Date of Expiration</div>
                      <div style={{ fontSize: 14, color: isExpiringSoon(person.passport_expiry) ? 'var(--color-red)' : 'var(--text-primary)' }}>{formatPassportDate(person.passport_expiry)}</div>
                    </div>
                  </div>
                  <div style={{ flex: '0 0 40%', display: 'flex', gap: 12 }}>
                    <UploadSlot label="Passport Page" url={person.passport_image_url} icon={IconFileText} />
                    <UploadSlot label="Headshot" url={person.passport_headshot_url} icon={IconCamera} />
                  </div>
                </div>
              </div>

            </div>
          </div>

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

      </div>
    </div>
  )
}
