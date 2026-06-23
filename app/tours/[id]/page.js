'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import TourCalendar from '../../../components/TourCalendar'
import TourStaffingGrid from '../../../components/TourStaffingGrid'
import { createPDF } from '../../../lib/generatePDF'

// Determine the date that decides whether an event is "past": latest show date,
// falling back to sunday_date, then saturday_date, then load_in_date.
function getEventPastDate(event, shows) {
  if (shows && shows.length > 0) return shows[shows.length - 1].show_date
  if (event.sunday_date) return event.sunday_date
  if (event.saturday_date) return event.saturday_date
  return event.load_in_date
}

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'date-hold']

const STATUS_STYLES = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.15)',   border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#BF5AF2', background: 'rgba(191,90,242,0.15)',   border: 'rgba(191,90,242,0.30)' },
  '1-hold':    { color: '#FFD60A', background: 'rgba(255,214,10,0.15)',   border: 'rgba(255,214,10,0.30)' },
  '2-hold':    { color: '#FF9500', background: 'rgba(255,149,0,0.15)',    border: 'rgba(255,149,0,0.30)' },
  '3-hold':    { color: '#FF3B30', background: 'rgba(255,59,48,0.15)',    border: 'rgba(255,59,48,0.30)' },
  'date-hold': { color: '#8E8E93', background: 'rgba(142,142,147,0.15)',  border: 'rgba(142,142,147,0.30)' },
}

const fmtStatus = (s) => {
  if (!s) return ''
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

const COLS = [
  { key: 'loadIn',    label: 'Load-In Date', width: '1fr',   align: 'left' },
  { key: 'city',      label: 'City',         width: '1.5fr', align: 'left' },
  { key: 'venue',     label: 'Venue',        width: '1.5fr', align: 'left' },
  { key: 'shows',     label: '# Shows',      width: '0.6fr', align: 'center' },
  { key: 'firstShow', label: 'First Show',   width: '1fr',   align: 'center' },
  { key: 'lastShow',  label: 'Last Show',    width: '1fr',   align: 'center' },
  { key: 'status',    label: 'Status',       width: '1.2fr', align: 'center' },
  { key: 'alert',     label: '',             width: '40px',  align: 'center' },
]

const GRID_TEMPLATE = COLS.map(c => c.width).join(' ')

function getAlerts(event, showData) {
  const alerts = []
  if (!event.venue_name) alerts.push('Venue not set')
  if (!showData || showData.length === 0) alerts.push('No show dates added')
  return alerts
}

function AlertIcon({ alerts }) {
  const [visible, setVisible] = useState(false)
  if (!alerts.length) return null
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <svg width="15" height="15" viewBox="0 0 18 18" fill="none" style={{ cursor: 'pointer' }}>
        <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFD60A" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 7V10" stroke="#FFD60A" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="13" r="0.75" fill="#FFD60A"/>
      </svg>
      {visible && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: '#0d1f3a', border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '10px 14px', zIndex: 100,
          minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 11, color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Needs Attention
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: i < alerts.length - 1 ? 5 : 0, whiteSpace: 'nowrap' }}>
              · {a}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusDropdown({ eventId, currentStatus, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)
  const s = STATUS_STYLES[currentStatus] || STATUS_STYLES.tentative

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = async (status) => {
    setSaving(true)
    const supabase = getSupabase()
    await supabase.from('events').update({ status }).eq('id', eventId)
    onUpdate(eventId, status)
    setOpen(false)
    setSaving(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }}
      onClick={e => e.stopPropagation()}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
          color: s.color, background: s.background, border: `1px solid ${s.border}`,
          whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
          opacity: saving ? 0.5 : 1,
        }}
      >
        {currentStatus ? fmtStatus(currentStatus) : 'Tentative'} ▾
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 6, background: '#0d1f3a',
          border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 8, zIndex: 100, overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 140,
        }}>
          {STATUS_OPTIONS.map(opt => {
            const os = STATUS_STYLES[opt] || STATUS_STYLES.tentative
            return (
              <div key={opt} onClick={() => handleSelect(opt)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: os.color,
                  background: currentStatus === opt ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = currentStatus === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
              >
                {fmtStatus(opt)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.tentative
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
      color: s.color, background: s.background, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status ? fmtStatus(status) : 'Tentative'}
    </span>
  )
}

function LoadInPicker({ eventId, currentDate, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentDate || '')
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

  const handleSave = async () => {
    if (!value) return
    const supabase = getSupabase()
    await supabase.from('events').update({ load_in_date: value }).eq('id', eventId)
    onUpdate(eventId, value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={e => e.stopPropagation()}
      >
        <input type="date" value={value} onChange={e => setValue(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.10)', color: '#f1f5f9', outline: 'none' }}
        />
        <div onClick={handleSave} style={{ fontSize: 11, color: 'var(--mint)', cursor: 'pointer' }}>✓</div>
        <div onClick={() => setEditing(false)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</div>
      </div>
    )
  }

  return (
    <div onClick={e => { e.stopPropagation(); setEditing(true) }}
      style={{ fontSize: 13, fontWeight: 400, color: currentDate ? '#f1f5f9' : '#64748b', opacity: currentDate ? 1 : 0.3, cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.20)', textUnderlineOffset: 3 }}
    >
      {fmt(currentDate)}
    </div>
  )
}

function EventRow({ event, eventShows, tourId, router, onStatusUpdate, onLoadInUpdate, fmt, rowIndex = 0 }) {
  const shows = eventShows[event.id] || []
  const firstShow = shows.length > 0 ? shows[0].show_date : (event.saturday_date || null)
  const lastShow = shows.length > 0 ? shows[shows.length - 1].show_date : (event.sunday_date || null)
  const numShows = shows.length > 0 ? shows.length : '—'
  const alerts = getAlerts(event, shows)
  const baseBg = rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'

  return (
    <div
      onClick={() => router.push(`/tours/${tourId}/events/${event.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        gap: '0 24px', padding: '0 32px', height: 52,
        cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        transition: 'background 0.15s', alignItems: 'center',
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <LoadInPicker eventId={event.id} currentDate={event.load_in_date} onUpdate={onLoadInUpdate} />
      <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.city}{event.country && `, ${event.country}`}
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.venue_name || 'TBC'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: numShows === '—' ? '#64748b' : '#f1f5f9', opacity: numShows === '—' ? 0.3 : 1 }}>
        {numShows}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: firstShow ? '#f1f5f9' : '#64748b', opacity: firstShow ? 1 : 0.3 }}>
        {fmt(firstShow)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: lastShow ? '#f1f5f9' : '#64748b', opacity: lastShow ? 1 : 0.3 }}>
        {fmt(lastShow)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <StatusDropdown eventId={event.id} currentStatus={event.status} onUpdate={onStatusUpdate} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <AlertIcon alerts={alerts} />
      </div>
    </div>
  )
}

export default function TourPage() {
  const router = useRouter()
  const { id } = useParams()
  const [tour, setTour] = useState(null)
  const [events, setEvents] = useState([])
  const [eventShows, setEventShows] = useState({})
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('schedule')
  const [pastExpanded, setPastExpanded] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [tourRes, eventsRes] = await Promise.all([
        supabase.from('tours').select('*').eq('id', id).single(),
        supabase.from('events').select('*').eq('tour_id', id).order('load_in_date', { ascending: true }),
      ])
      if (!tourRes.error) setTour(tourRes.data)
      if (!eventsRes.error) {
        setEvents(eventsRes.data)
        const showMap = {}
        await Promise.all(eventsRes.data.map(async (ev) => {
          const { data } = await supabase
            .from('show_list').select('show_date').eq('event_id', ev.id).order('show_date', { ascending: true })
          showMap[ev.id] = data || []
        }))
        setEventShows(showMap)

        const venueIds = [...new Set(eventsRes.data.map(e => e.venue_id).filter(Boolean))]
        if (venueIds.length > 0) {
          const { data: venuesData } = await supabase.from('venues').select('id, name, city, state, country').in('id', venueIds)
          setVenues(venuesData || [])
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleStatusUpdate = (eventId, newStatus) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
  }

  const handleLoadInUpdate = (eventId, newDate) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, load_in_date: newDate } : e))
  }

  const handleExportSchedule = () => {
    const columns = ['Load-In', 'City', 'Venue',
      '# Shows', 'First Show', 'Last Show', 'Status']
    const rows = events.map(e => {
      const shows = eventShows[e.id] || []
      return [
        e.load_in_date || '—',
        `${e.city || ''}${e.country ? ', ' + e.country : ''}`,
        e.venue_name || '—',
        shows.length || '—',
        shows[0]?.show_date || '—',
        shows[shows.length - 1]?.show_date || '—',
        e.status || '—',
      ]
    })
    const doc = createPDF({
      title: `${tour.name} — Schedule`,
      subtitle: `${tour.region || ''} · ${tour.year || ''}`,
      tourColor: tour.color,
      columns,
      rows,
    })
    doc.save(`${tour.name}-Schedule.pdf`)
  }

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

  // Split events into upcoming and past, using the latest known date for each event
  // (show dates > weekend dates > load-in date) to decide if it's already happened
  const upcomingEvents = events.filter(e => {
    const pastDate = getEventPastDate(e, eventShows[e.id])
    return !pastDate || pastDate >= today
  })
  const pastEvents = events.filter(e => {
    const pastDate = getEventPastDate(e, eventShows[e.id])
    return pastDate && pastDate < today
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!tour) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Tour not found.</div>
    </div>
  )

  const color = tour.color || '#C9A84C'
  const tabs = ['Schedule', 'Staffing', 'Travel', 'Calendar', 'Venues', 'Files']

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Tour header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '24px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => router.push('/tours')}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ← Tours
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{tour.name}</div>
                  <span className={`badge badge-${tour.status || 'upcoming'}`}>
                    {tour.status ? tour.status.charAt(0).toUpperCase() + tour.status.slice(1) : 'Upcoming'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginLeft: 24 }}>
                  {[tour.type, tour.region, tour.year].filter(Boolean).join(' · ')}
                  {tour.director_name && ` · ${tour.director_name}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.push(`/tours/${id}/edit`)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Edit Tour
              </button>
              <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>
                + Add Event
              </button>
            </div>
          </div>

          <div style={{ height: 3, background: color, borderRadius: 2 }} />

          <div style={{ display: 'flex' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.toLowerCase()
              return (
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: active ? 500 : 400, padding: '14px 18px', border: 'none', background: 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: activeTab === 'staffing' ? 'hidden' : 'auto' }}>
          {activeTab === 'schedule' && (
            <div style={{ padding: '20px 32px 32px' }}>
              {/* Section title on the navy shell */}
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
                  Events <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>({upcomingEvents.length} upcoming{pastEvents.length > 0 ? `, ${pastEvents.length} past` : ''})</span>
                </div>
                {events.length > 0 && (
                  <button
                    onClick={handleExportSchedule}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, border: `0.5px solid ${color}`, background: 'transparent', color: color, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >Export PDF</button>
                )}
              </div>

              {/* Empty state */}
              {events.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>No events yet</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Add your first event to this tour</div>
                  <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>+ Add Event</button>
                </div>
              )}

              {/* Rounded table card */}
              {events.length > 0 && (
                <div style={{ border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: '0 24px', padding: '12px 32px', background: '#0d1f3a', borderBottom: '0.5px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                    {COLS.map(col => (
                      <div key={col.key} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: col.align }}>
                        {col.label}
                      </div>
                    ))}
                  </div>

                  {/* Upcoming event rows */}
                  {upcomingEvents.map((event, idx) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      eventShows={eventShows}
                      tourId={id}
                      router={router}
                      onStatusUpdate={handleStatusUpdate}
                      onLoadInUpdate={handleLoadInUpdate}
                      fmt={fmt}
                      rowIndex={idx}
                    />
                  ))}

                  {/* Past events — collapsible */}
                  {pastEvents.length > 0 && (
                    <div>
                      {/* Past events toggle */}
                      <div
                        onClick={() => setPastExpanded(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: '#64748b', userSelect: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: pastExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, color: '#64748b' }}>
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          Past Events <span style={{ fontSize: 12, marginLeft: 4 }}>({pastEvents.length})</span>
                        </span>
                      </div>

                      {/* Past event rows */}
                      {pastExpanded && pastEvents.map((event, idx) => (
                        <div key={event.id} style={{ opacity: 0.6 }}>
                          <EventRow
                            event={event}
                            eventShows={eventShows}
                            tourId={id}
                            router={router}
                            onStatusUpdate={handleStatusUpdate}
                            onLoadInUpdate={handleLoadInUpdate}
                            fmt={fmt}
                            rowIndex={idx}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <TourCalendar tourId={id} tourColor={color} />
          )}

          {activeTab === 'travel' && (
            <div style={{ padding: '28px 32px' }}>
              {events.length === 0 ? (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>No events on this tour yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="glass-card"
                      onClick={() => router.push(`/tours/${id}/events/${event.id}?tab=travel`)}
                      style={{ padding: '16px 18px', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>
                        {event.city}{event.state && `, ${event.state}`}
                      </div>
                      <div style={{ fontSize: 13, color: event.venue_name ? '#94a3b8' : '#64748b', marginBottom: 10 }}>
                        {event.venue_name || 'Venue TBC'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Load-In {fmt(event.load_in_date)}</div>
                        <StatusBadge status={event.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'venues' && (
            <div style={{ padding: '28px 32px' }}>
              {venues.length === 0 ? (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>No venues linked to this tour yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {venues.map(venue => (
                    <div
                      key={venue.id}
                      className="glass-card"
                      onClick={() => router.push(`/venues/${venue.id}`)}
                      style={{ padding: '14px 18px', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, color: '#f1f5f9' }}>{venue.name}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>
                        {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>Tour Files</div>
                <button
                  disabled
                  title="Coming soon"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                >
                  + Upload File
                </button>
              </div>
              <div className="glass-card" style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                  <path d="M6 12a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V12Z" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#f1f5f9' }}>No files uploaded yet</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>File uploads coming in a future update</div>
              </div>
            </div>
          )}

          {activeTab === 'staffing' && (
            <TourStaffingGrid tourId={id} />
          )}

          {activeTab !== 'schedule' && activeTab !== 'calendar' && activeTab !== 'travel' && activeTab !== 'venues' && activeTab !== 'files' && activeTab !== 'staffing' && (
            <div style={{ padding: '28px 32px', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}