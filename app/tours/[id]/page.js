'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import TourCalendar from '../../../components/TourCalendar'

// Determine the date that decides whether an event is "past": latest show date,
// falling back to sunday_date, then saturday_date, then load_in_date.
function getEventPastDate(event, shows) {
  if (shows && shows.length > 0) return shows[shows.length - 1].show_date
  if (event.sunday_date) return event.sunday_date
  if (event.saturday_date) return event.saturday_date
  return event.load_in_date
}

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'cancelled', 'want', 'date-hold']

const STATUS_STYLES = {
  confirmed:   { color: '#33FF99', background: 'rgba(51,255,153,0.1)',  border: 'rgba(51,255,153,0.35)' },
  tentative:   { color: '#FF69B4', background: 'rgba(255,105,180,0.1)', border: 'rgba(255,105,180,0.35)' },
  '1-hold':    { color: '#FFCC00', background: 'rgba(255,204,0,0.1)',   border: 'rgba(255,204,0,0.35)' },
  '2-hold':    { color: '#FF8C00', background: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.35)' },
  '3-hold':    { color: '#FF3333', background: 'rgba(255,51,51,0.1)',   border: 'rgba(255,51,51,0.35)' },
  cancelled:   { color: '#888',    background: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.35)' },
  want:        { color: '#aaa',    background: 'rgba(170,170,170,0.1)', border: 'rgba(170,170,170,0.35)' },
  'date-hold': { color: '#aaa',    background: 'rgba(170,170,170,0.1)', border: 'rgba(170,170,170,0.35)' },
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
        <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFCC00" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 7V10" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="13" r="0.75" fill="#FFCC00"/>
      </svg>
      {visible && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: '#0d1f3a', border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '10px 14px', zIndex: 100,
          minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 11, color: '#FFCC00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
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
          fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
          color: s.color, background: s.background, border: `0.5px solid ${s.border}`,
          whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
          opacity: saving ? 0.5 : 1,
        }}
      >
        {currentStatus ? currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1) : 'Tentative'} ▾
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
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </div>
            )
          })}
        </div>
      )}
    </div>
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
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <div onClick={handleSave} style={{ fontSize: 11, color: 'var(--mint)', cursor: 'pointer' }}>✓</div>
        <div onClick={() => setEditing(false)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</div>
      </div>
    )
  }

  return (
    <div onClick={e => { e.stopPropagation(); setEditing(true) }}
      style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.2)', textUnderlineOffset: 3 }}
    >
      {fmt(currentDate)}
    </div>
  )
}

function EventRow({ event, eventShows, tourId, router, onStatusUpdate, onLoadInUpdate, fmt }) {
  const shows = eventShows[event.id] || []
  const firstShow = shows.length > 0 ? shows[0].show_date : (event.saturday_date || null)
  const lastShow = shows.length > 0 ? shows[shows.length - 1].show_date : (event.sunday_date || null)
  const numShows = shows.length > 0 ? shows.length : (event.num_shows > 0 ? event.num_shows : '—')
  const alerts = getAlerts(event, shows)

  return (
    <div
      onClick={() => router.push(`/tours/${tourId}/events/${event.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        gap: '0 24px', padding: '16px 32px',
        cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)',
        transition: 'background 0.15s', alignItems: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <LoadInPicker eventId={event.id} currentDate={event.load_in_date} onUpdate={onLoadInUpdate} />
      <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.city}{event.country && `, ${event.country}`}
      </div>
      <div style={{ fontSize: 14, color: event.venue_name ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.venue_name || 'TBC'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
        {numShows}
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: firstShow ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
        {fmt(firstShow)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: lastShow ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
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
  const tabs = ['Schedule', 'Staffing', 'Travel', 'Calendar', 'Venues', 'Files', 'Notes']

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Tour header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '24px 32px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => router.push('/tours')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
              <button onClick={() => router.push(`/tours/${id}/edit`)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: active ? 500 : 400, padding: '14px 18px', border: 'none', background: 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'schedule' && (
            <>
              {/* Sticky column headers */}
              <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)' }}>
                <div style={{ padding: '16px 32px 8px', fontSize: 15, fontWeight: 600 }}>
                  Events <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({upcomingEvents.length} upcoming{pastEvents.length > 0 ? `, ${pastEvents.length} past` : ''})</span>
                </div>
                {events.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: '0 24px', padding: '6px 32px 12px' }}>
                    {COLS.map(col => (
                      <div key={col.key} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: col.align }}>
                        {col.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty state */}
              {events.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add your first event to this tour</div>
                  <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>+ Add Event</button>
                </div>
              )}

              {/* Upcoming event rows */}
              {upcomingEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  eventShows={eventShows}
                  tourId={id}
                  router={router}
                  onStatusUpdate={handleStatusUpdate}
                  onLoadInUpdate={handleLoadInUpdate}
                  fmt={fmt}
                />
              ))}

              {/* Past events — collapsible */}
              {pastEvents.length > 0 && (
                <div>
                  {/* Past events toggle */}
                  <div
                    onClick={() => setPastExpanded(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', userSelect: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: pastExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Past Events <span style={{ fontSize: 12, marginLeft: 4 }}>({pastEvents.length})</span>
                    </span>
                  </div>

                  {/* Past event rows */}
                  {pastExpanded && pastEvents.map((event) => (
                    <div key={event.id} style={{ opacity: 0.6 }}>
                      <EventRow
                        event={event}
                        eventShows={eventShows}
                        tourId={id}
                        router={router}
                        onStatusUpdate={handleStatusUpdate}
                        onLoadInUpdate={handleLoadInUpdate}
                        fmt={fmt}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'calendar' && (
            <TourCalendar tourId={id} tourColor={color} />
          )}

          {activeTab !== 'schedule' && activeTab !== 'calendar' && (
            <div style={{ padding: '28px 32px', fontSize: 14, color: 'var(--text-muted)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}