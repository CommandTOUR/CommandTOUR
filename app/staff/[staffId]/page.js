'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '../../../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { IconPrinter, IconId, IconUserCircle, IconMail, IconPhone, IconUser } from '@tabler/icons-react'
import { useNav } from '../../../context/NavContext'

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

const OUTLINE_BTN = {
  background: 'transparent',
  border: '0.5px solid var(--color-info)',
  color: 'var(--color-info)',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 400,
  padding: '9px 16px',
  cursor: 'pointer',
}

const labelStyle = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--color-info)',
  marginBottom: 2,
}

const valueStyle = {
  fontSize: 13,
  color: 'var(--text-primary)',
}

const STAFF_STATUS = {
  confirmed: { color: 'var(--color-success)', label: 'Confirmed' },
  pending: { color: 'var(--color-warning)', label: 'Pending' },
  needs_attention: { color: 'var(--color-danger)', label: 'Needs Attention' },
}

function normalizeStaffStatus(s) {
  if (s === 'scheduled') return 'pending'
  if (s === 'attention') return 'needs_attention'
  return s
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value || '—'}</div>
    </div>
  )
}

function UploadSlot({ label, url, icon: Icon, onPreview }) {
  return (
    <div
      onClick={url ? () => onPreview(url) : undefined}
      style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0, cursor: url ? 'pointer' : 'default' }}
    >
      <Icon size={36} stroke={1.5} color={url ? 'var(--color-info)' : 'var(--text-muted)'} />
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: url ? 'var(--color-info)' : 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>{label}</div>
    </div>
  )
}

export default function StaffProfile() {
  const router = useRouter()
  const { staffId } = useParams()
  const { setNav, clearNav } = useNav()
  const [person, setPerson] = useState(null)
  const [staffAirports, setStaffAirports] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState({})
  const [previewUrl, setPreviewUrl] = useState(null)
  const [passportExpanded, setPassportExpanded] = useState(false)

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

  useEffect(() => {
    if (!person) return
    setNav({
      backLabel: 'Staff',
      backHref: '/staff',
      title: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      activeTab: 'overview',
      onTabChange: () => {},
      items: [
        { label: 'Profile', tab: 'overview', icon: IconUser },
      ],
    })
    return () => clearNav()
  }, [person])

  const fmt =(d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'

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

  const handlePrint = () => window.print()

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '4px 4px 0' }}>
        <button onClick={() => router.push('/staff')} style={OUTLINE_BTN}>← Staff</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    </div>
  )

  if (!person) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '4px 4px 0' }}>
        <button onClick={() => router.push('/staff')} style={OUTLINE_BTN}>← Staff</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Staff member not found.</div>
      </div>
    </div>
  )

  const fullName = [person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ')
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()

  const now = new Date()
  const upcomingEvents = events.filter(es => es.events && new Date(es.events.load_in_date + 'T00:00:00') >= now)

  const addressLines = (person.mailing_address || '').split('\n').map(l => l.trim()).filter(Boolean)

  const sortedAirports = [...staffAirports].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  const sortedAirlines = [...(person.staff_airlines || [])].sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0))

  const emergencyContact = (person.emergency_contact_name || person.emergency_contact_phone)
    ? `${person.emergency_contact_name || ''} · ${person.emergency_contact_phone || ''}`
    : null

  const nextEvent = upcomingEvents[0]?.events || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push(`/staff/${staffId}/edit`)} style={OUTLINE_BTN}>Edit Profile</button>
          <button
            onClick={handlePrint}
            style={{ ...OUTLINE_BTN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px' }}
          >
            <IconPrinter size={15} stroke={1.5} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Hero tile */}
          <div style={{ ...GLASS, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(26,86,219,0.10)', border: '1.5px solid var(--color-info)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{fullName}</div>
              <div style={{ fontSize: 14, color: 'var(--color-info)' }}>{person.staff_departments?.name || '—'}</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                {person.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <IconMail size={14} stroke={1.5} />
                    {person.email}
                  </div>
                )}
                {person.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <IconPhone size={14} stroke={1.5} />
                    {person.phone}
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...GLASS, borderRadius: 10, padding: '14px 20px', minWidth: 220, textAlign: 'left' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                NEXT EVENT
              </div>
              {nextEvent ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatLocation(nextEvent.city, nextEvent.state, nextEvent.country, 'compact')} · {nextEvent.tours?.name || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {fmtDateRange(nextEvent.load_in_date, nextEvent.load_out_date || showMap[nextEvent.id] || null)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>None scheduled</div>
              )}
            </div>
          </div>

          {/* 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

            {/* Column 1 — Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', paddingLeft: 2 }}>Basic Info</div>
              <div style={{ ...GLASS, padding: '18px 20px' }}>
                <Field label="Legal name" value={fullName} />
                <Field label="Date of birth" value={fmt(person.dob)} />
                <Field label="Cell phone" value={person.phone} />
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Email</div>
                  {person.email ? (
                    <a href={`mailto:${person.email}`} style={{ fontSize: 13, color: 'var(--color-info)', textDecoration: 'none' }}>{person.email}</a>
                  ) : (
                    <div style={valueStyle}>—</div>
                  )}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Mailing address</div>
                  <div style={{ ...valueStyle, lineHeight: 1.5 }}>
                    {addressLines.length > 0 ? addressLines.map((line, i) => <div key={i}>{line}</div>) : '—'}
                  </div>
                </div>
                <Field label="T-shirt size" value={person.tshirt_size} />
                <Field label="Emergency contact" value={emergencyContact} />
              </div>
            </div>

            {/* Column 2 — Travel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', paddingLeft: 2 }}>Travel</div>
              <div style={{ ...GLASS, padding: '18px 20px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Home airports</div>
                  {sortedAirports.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {sortedAirports.map(airport => (
                        <div key={airport.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: airport.is_primary ? '#FFD60A' : 'transparent', width: 14, flexShrink: 0 }}>★</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{airport.iata_code}</span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{[airport.city, airport.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div style={valueStyle}>—</div>}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Airlines</div>
                  {sortedAirlines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {sortedAirlines.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: a.preferred ? '#FFD60A' : 'transparent', width: 14, flexShrink: 0 }}>★</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.airline}</span>
                          {a.frequent_flyer_number && <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>#{a.frequent_flyer_number}</span>}
                        </div>
                      ))}
                    </div>
                  ) : <div style={valueStyle}>—</div>}
                </div>
                <Field label="TSA PreCheck" value={person.tsa_precheck} />
                <Field label="Global Entry" value={person.global_entry} />
                <Field label="Known Traveler #" value={person.known_traveler_number} />
                <Field label="Seat preference" value={person.seat_preference} />
              </div>
            </div>

            {/* Column 3 — Passport */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', paddingLeft: 2 }}>Passport</div>
              <div style={{ ...GLASS, padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <UploadSlot label="Passport page" url={person.passport_image_url} icon={IconId} onPreview={setPreviewUrl} />
                  <UploadSlot label="Headshot" url={person.passport_headshot_url} icon={IconUserCircle} onPreview={setPreviewUrl} />
                </div>
                <div style={{ marginBottom: 0 }}>
                  <div style={labelStyle}>Date of expiration</div>
                  <div style={{ fontSize: 13, color: isExpiringSoon(person.passport_expiry) ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                    {formatPassportDate(person.passport_expiry)}
                  </div>
                </div>
                <button
                  onClick={() => setPassportExpanded(true)}
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--color-info)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                  Show all passport info →
                </button>
              </div>
            </div>

          </div>

          {/* Upcoming events */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
              Upcoming Events ({upcomingEvents.length})
            </div>
            <div style={{ ...GLASS, padding: '18px 20px' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming events</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr 1.2fr 100px', gap: 8, padding: '0 12px 8px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dates</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tour</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Position</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Status</div>
                </div>
                {upcomingEvents.map((es, i) => {
                  const ev = es.events
                  if (!ev) return null
                  const st = STAFF_STATUS[normalizeStaffStatus(es.status)] || (es.confirmed ? STAFF_STATUS.confirmed : STAFF_STATUS.pending)
                  return (
                    <div
                      key={es.id}
                      onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr 1.2fr 100px', gap: 8,
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: i % 2 === 0 ? 'color-mix(in srgb, var(--surface-card) 50%, transparent)' : 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'color-mix(in srgb, var(--surface-card) 50%, transparent)' : 'transparent' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatLocation(ev.city, ev.state, ev.country, 'full')}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDateRange(ev.load_in_date, ev.load_out_date || showMap[ev.id] || null)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: ev.tours?.color || 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.tours?.name || '—'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {es.tour_positions?.positions?.title || '—'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>

          {/* Notes and flags */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
              Notes & Flags
            </div>
            <div style={{ ...GLASS, padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Internal notes</div>
                {person.notes ? (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{person.notes}</div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes yet.</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Attention flag</div>
                {person.attention_flag ? (
                  <div style={{ fontSize: 13, color: '#d97706' }}>⚠ {person.attention_note}</div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</div>
                )}
              </div>
            </div>
            </div>
          </div>

        </div>
      </div>

      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={previewUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', display: 'block' }} />
            <button
              onClick={() => setPreviewUrl(null)}
              style={{ position: 'absolute', top: -12, right: -12, width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 16, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>
        </div>
      )}

      {passportExpanded && (
        <div
          onClick={() => setPassportExpanded(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: '24px 28px', width: 440, maxWidth: '90vw', position: 'relative' }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Passport Details</div>
            <button
              onClick={() => setPassportExpanded(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
            >×</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={labelStyle}>Passport Number</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.passport_number || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Surname</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.passport_surname || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Given Names</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.passport_given_names || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Nationality</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.passport_nationality || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Place of Birth</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{person.place_of_birth || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Date of Birth</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formatPassportDate(person.dob)}</div>
              </div>
              <div>
                <div style={labelStyle}>Date of Issue</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{formatPassportDate(person.date_of_issue)}</div>
              </div>
              <div>
                <div style={labelStyle}>Date of Expiration</div>
                <div style={{ fontSize: 14, color: isExpiringSoon(person.passport_expiry) ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                  {formatPassportDate(person.passport_expiry)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
