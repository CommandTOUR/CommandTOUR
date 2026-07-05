'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'
import TourCalendar from '../../../components/TourCalendar'
import TourStaffingGrid from '../../../components/TourStaffingGrid'
import { formatLocation, shortCountry } from '@/lib/locationFormat'

// Determine the date that decides whether an event is "past": latest show date,
// falling back to sunday_date, then saturday_date, then load_in_date.
function getEventPastDate(event, shows) {
  if (shows && shows.length > 0) return shows[shows.length - 1].show_date
  if (event.sunday_date) return event.sunday_date
  if (event.saturday_date) return event.saturday_date
  return event.load_in_date
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0, 2), 16)
  const g = parseInt(full.substring(2, 4), 16)
  const b = parseInt(full.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// WCAG-weighted luminance to decide whether white or near-black text reads better
// on a given hex background color. Threshold 0.55 tuned for the tinted header surface.
function getContrastTextColor(hexColor) {
  const hex = hexColor.replace('#', '')
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
  const r = parseInt(fullHex.substring(0, 2), 16)
  const g = parseInt(fullHex.substring(2, 4), 16)
  const b = parseInt(fullHex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1A2422' : '#FFFFFF'
}

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'date-hold']

const STATUS_STYLES = {
  confirmed:   { color: 'var(--status-confirmed)',  background: 'var(--status-confirmed-bg)',  border: 'var(--status-confirmed-border)' },
  '1-hold':    { color: 'var(--status-1hold)',      background: 'var(--status-1hold-bg)',      border: 'var(--status-1hold-border)' },
  '2-hold':    { color: 'var(--status-2hold)',      background: 'var(--status-2hold-bg)',      border: 'var(--status-2hold-border)' },
  '3-hold':    { color: 'var(--status-3hold)',      background: 'var(--status-3hold-bg)',      border: 'var(--status-3hold-border)' },
  tentative:   { color: 'var(--status-tentative)',  background: 'var(--status-tentative-bg)',  border: 'var(--status-tentative-border)' },
  'date-hold': { color: 'var(--status-dateHold)',   background: 'var(--status-dateHold-bg)',   border: 'var(--status-dateHold-border)' },
}

const fmtStatus = (s) => {
  if (!s) return ''
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

// Locked light-mode status colors (Style Guide Section 19)
const STATUS_COLORS = {
  'confirmed': { color: '#0F8F5C', bg: '#DCF3E7', border: '#86D9B2' },
  '1-hold':    { color: '#8A6D00', bg: '#FCF2C9', border: '#F0D060' },
  '2-hold':    { color: '#B5560A', bg: '#FCE2C2', border: '#F0A85C' },
  '3-hold':    { color: '#C2294A', bg: '#FBDEE5', border: '#F0A8B8' },
  'tentative': { color: '#8B6FE8', bg: '#EAE3FB', border: '#C5B5F0' },
  'date-hold': { color: '#717977', bg: '#EEEEEF', border: '#D5D5D8' },
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
        <path d="M9 2L16.5 15H1.5L9 2Z" stroke="var(--color-alert)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 7V10" stroke="var(--color-alert)" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="13" r="0.75" fill="var(--color-alert)"/>
      </svg>
      {visible && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: 'var(--bg-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
          border: '1px solid var(--border-card)', borderRadius: 8, padding: '10px 14px', zIndex: 100,
          minWidth: 180, boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-alert)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Needs Attention
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: i < alerts.length - 1 ? 5 : 0, whiteSpace: 'nowrap' }}>
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
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
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
          marginTop: 6, background: 'var(--bg-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
          border: '1px solid var(--border-card)',
          borderRadius: 8, zIndex: 100, overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)', minWidth: 140,
        }}>
          {STATUS_OPTIONS.map(opt => {
            const os = STATUS_STYLES[opt] || STATUS_STYLES.tentative
            return (
              <div key={opt} onClick={() => handleSelect(opt)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: os.color,
                  background: currentStatus === opt ? 'var(--bg-card-hover)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = currentStatus === opt ? 'var(--bg-card-hover)' : 'transparent'}
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
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
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
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.10)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <div onClick={handleSave} style={{ fontSize: 11, color: 'var(--color-mint)', cursor: 'pointer' }}>✓</div>
        <div onClick={() => setEditing(false)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</div>
      </div>
    )
  }

  return (
    <div onClick={e => { e.stopPropagation(); setEditing(true) }}
      style={{ fontSize: 13, fontWeight: 400, color: currentDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: currentDate ? 1 : 0.3, cursor: 'pointer', textDecoration: 'underline dotted rgba(255,255,255,0.20)', textUnderlineOffset: 3 }}
    >
      {fmt(currentDate)}
    </div>
  )
}

function EventRow({ event, eventShows, tourId, router, onStatusUpdate, onLoadInUpdate, fmt }) {
  const shows = eventShows[event.id] || []
  const firstShow = shows.length > 0 ? shows[0].show_date : (event.saturday_date || null)
  const lastShow = shows.length > 0 ? shows[shows.length - 1].show_date : (event.sunday_date || null)
  const numShows = shows.length > 0 ? shows.length : '—'
  const alerts = getAlerts(event, shows)

  return (
    <div
      onClick={() => router.push(`/tours/${tourId}/events/${event.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        gap: '0 24px', padding: '0 32px', height: 52,
        cursor: 'pointer', borderBottom: '0.5px solid var(--border-card)',
        transition: 'background 0.15s', alignItems: 'center',
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <LoadInPicker eventId={event.id} currentDate={event.load_in_date} onUpdate={onLoadInUpdate} />
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {formatLocation(event.city, event.state, event.country, 'compact')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--table-row-text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.venue_name || 'TBC'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: numShows === '—' ? 'var(--table-row-text-dark)' : 'var(--text-primary)', opacity: numShows === '—' ? 0.3 : 1 }}>
        {numShows}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: firstShow ? 'var(--text-primary)' : 'var(--table-row-text-dark)', opacity: firstShow ? 1 : 0.3 }}>
        {fmt(firstShow)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: lastShow ? 'var(--text-primary)' : 'var(--table-row-text-dark)', opacity: lastShow ? 1 : 0.3 }}>
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
      <div style={{ marginTop: 88, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!tour) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Tour not found.</div>
    </div>
  )

  const color = tour.color || '#C9A84C'
  const headerTextColor = getContrastTextColor(color)
  const tabs = ['Schedule', 'Staffing', 'Travel', 'Calendar', 'Venues', 'Files']

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 88, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Tour header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '24px 32px 0', flexShrink: 0 }}>
          {/* Back button */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => router.push('/tours')}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--color-mint)', background: 'transparent', color: 'var(--color-mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-mint-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ← Tours
            </button>
          </div>

          {/* ROW 1: name + badge (left) / stats + progress + next event + actions (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {tour.logo_url ? (
                <img src={tour.logo_url} alt={tour.name} style={{ height: 'auto', maxHeight: 56, width: 'auto', maxWidth: 120, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{tour.name}</div>
                  <span className={`badge badge-${tour.status || 'upcoming'}`}>
                    {tour.status ? tour.status.charAt(0).toUpperCase() + tour.status.slice(1) : 'Upcoming'}
                  </span>
                </div>
                {/* ROW 2: subtitle */}
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  {[tour.type, tour.region, tour.year].filter(Boolean).join(' · ')}
                  {tour.director_name && ` · ${tour.director_name}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Stats inline */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{events.length}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 3 }}>TOTAL</span>
                </span>
                <span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-mint)' }}>{pastEvents.length}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 3 }}>DONE</span>
                </span>
                <span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{upcomingEvents.length}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 3 }}>LEFT</span>
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ width: 90, marginLeft: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {events.length > 0 ? Math.round((pastEvents.length / events.length) * 100) : 0}%
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border-card)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${events.length > 0 ? (pastEvents.length / events.length) * 100 : 0}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
              {/* Next event — conditional, includes its leading divider */}
              {upcomingEvents.length > 0 && (
                <>
                  <div style={{ width: 1, height: 24, background: 'var(--border-card)' }} />
                  <div
                    onClick={() => router.push(`/tours/${id}/events/${upcomingEvents[0].id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Next Event</div>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-mint)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                      {upcomingEvents[0].city} · {fmt(upcomingEvents[0].load_in_date)}
                    </div>
                  </div>
                </>
              )}
              {/* Divider before action buttons */}
              <div style={{ width: 1, height: 24, background: 'var(--border-card)' }} />
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  onClick={() => router.push(`/tours/${id}/edit`)}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  Edit Tour
                </button>
                <button
                  onClick={() => router.push(`/tours/${id}/events/new`)}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--color-mint)', color: 'var(--bg)', cursor: 'pointer' }}
                >
                  + Add Event
                </button>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ paddingBottom: 14 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
              {tabs.map(tab => {
                const active = activeTab === tab.toLowerCase()
                return (
                  <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: active ? 700 : 500, padding: '8px 18px', borderRadius: 7, border: 'none', background: active ? 'var(--bg-card-hover)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: active ? '0 1px 3px rgba(26,36,34,0.08)' : 'none', transition: 'all 0.15s' }}>
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: (activeTab === 'staffing' || activeTab === 'schedule') ? 'hidden' : 'auto' }}>
          {activeTab === 'schedule' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 32px 20px' }}>
              {/* Empty state */}
              {events.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No events yet</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add your first event to this tour</div>
                  <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>+ Add Event</button>
                </div>
              )}

              {/* Table card — flex: 1 fills remaining height, overflow: hidden is the clip shell */}
              {events.length > 0 && (
                <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)', border: '1px solid var(--border-card)', borderRadius: 10, boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)' }}>
                  {/* Inner scroll surface — sticky header works because this is the scroll container */}
                  <div style={{ height: '100%', overflow: 'auto' }}>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: '0 24px', padding: '12px 32px', background: color, position: 'sticky', top: 0, zIndex: 10 }}>
                      {COLS.map(col => (
                        <div key={col.key} style={{ fontSize: 10.5, fontWeight: 800, color: headerTextColor, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: col.align }}>
                          {col.label}
                        </div>
                      ))}
                    </div>

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
                        <div
                          onClick={() => setPastExpanded(p => !p)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', cursor: 'pointer', borderTop: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-muted)', userSelect: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: pastExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, color: 'var(--text-muted)' }}>
                            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Past Events <span style={{ fontSize: 12, marginLeft: 4 }}>({pastEvents.length})</span>
                          </span>
                        </div>

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
                  </div>
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
                        {formatLocation(event.city, event.state, event.country, 'compact')}
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
                        {formatLocation(venue.city, venue.state, venue.country, 'full')}
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