'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '../../../lib/supabase'
import TourCalendar from '../../../components/TourCalendar'
import StaffingGrid from '../../../components/StaffingGrid'
import { formatLocation, shortCountry } from '@/lib/locationFormat'
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconClock,
  IconCheck,
  IconUserQuestion,
} from '@tabler/icons-react'

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

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const shortDate = dateStr => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getDate()}`
}
const dateRange = (e) => {
  const start = shortDate(e.load_in_date)
  const end = e.load_out_date ? shortDate(e.load_out_date) : 'N/A'
  return `${start} – ${end}`
}
const HOLD_STATUSES = ['1-hold', '2-hold', '3-hold']

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

const STATUS_OPTIONS = ['tentative', '1-hold', '2-hold', '3-hold', 'confirmed', 'date-hold']

const STATUS_STYLES = {
  confirmed:   { color: 'var(--status-confirmed-text)', background: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  '1-hold':    { color: 'var(--status-1hold-text)',     background: 'var(--status-1hold-bg)',     border: 'var(--status-1hold-border)' },
  '2-hold':    { color: 'var(--status-2hold-text)',     background: 'var(--status-2hold-bg)',     border: 'var(--status-2hold-border)' },
  '3-hold':    { color: 'var(--status-3hold-text)',     background: 'var(--status-3hold-bg)',     border: 'var(--status-3hold-border)' },
  tentative:   { color: 'var(--status-tentative-text)', background: 'var(--status-tentative-bg)', border: 'var(--status-tentative-border)' },
  'date-hold': { color: 'var(--status-datehold-text)',  background: 'var(--status-datehold-bg)',  border: 'var(--status-datehold-border)' },
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

const TOUR_STATUS_COLORS = {
  active: 'var(--color-success)',
  upcoming: 'var(--color-warning)',
  completed: 'var(--text-secondary)',
  cancelled: 'var(--color-danger)',
}

const COLS = [
  { key: 'loadIn',    label: 'Load-In Date', width: '1fr',   align: 'left' },
  { key: 'city',      label: 'City',         width: '1.5fr', align: 'left' },
  { key: 'venue',     label: 'Venue',        width: '1.5fr', align: 'left' },
  { key: 'shows',     label: '# Shows',      width: '0.6fr', align: 'center' },
  { key: 'firstShow', label: 'First Show',   width: '1fr',   align: 'center' },
  { key: 'lastShow',  label: 'Last Show',    width: '1fr',   align: 'center' },
  { key: 'budget',    label: 'Budget',       width: '0.8fr', align: 'center' },
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
    <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <IconAlertTriangleFilled size={16} color="#FFD60A" />
      <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
      {visible && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: 'var(--surface-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
          border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', zIndex: 100,
          minWidth: 180, boxShadow: 'var(--glass-tile-shadow)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Needs Attention
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-primary)', marginBottom: i < alerts.length - 1 ? 5 : 0, whiteSpace: 'nowrap' }}>
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
          marginTop: 6, background: 'var(--surface-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
          border: '1px solid var(--border-default)',
          borderRadius: 8, zIndex: 100, overflow: 'hidden',
          boxShadow: 'var(--glass-tile-shadow)', minWidth: 140,
        }}>
          {STATUS_OPTIONS.map(opt => {
            const os = STATUS_STYLES[opt] || STATUS_STYLES.tentative
            return (
              <div key={opt} onClick={() => handleSelect(opt)}
                style={{
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: os.color,
                  background: currentStatus === opt ? 'var(--surface-raised)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
                onMouseLeave={e => e.currentTarget.style.background = currentStatus === opt ? 'var(--surface-raised)' : 'transparent'}
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
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--surface-input)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <div onClick={handleSave} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>✓</div>
        <div onClick={() => setEditing(false)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</div>
      </div>
    )
  }

  return (
    <div onClick={e => { e.stopPropagation(); setEditing(true) }}
      style={{ fontSize: 13, fontWeight: 450, color: currentDate ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: currentDate ? 1 : 0.3, cursor: 'pointer', textDecoration: 'underline dotted var(--border-strong)', textUnderlineOffset: 3 }}
    >
      {fmt(currentDate)}
    </div>
  )
}

function EventRow({ event, eventShows, tourId, router, onStatusUpdate, onLoadInUpdate, fmt, index = 0, tourColor }) {
  const shows = eventShows[event.id] || []
  const firstShow = shows.length > 0 ? shows[0].show_date : (event.saturday_date || null)
  const lastShow = shows.length > 0 ? shows[shows.length - 1].show_date : (event.sunday_date || null)
  const numShows = shows.length > 0 ? shows.length : '—'
  const alerts = getAlerts(event, shows)
  const isEven = index % 2 === 0
  const stripeBg = (isEven && tourColor) ? `${tourColor}0d` : 'transparent'

  return (
    <div
      onClick={() => router.push(`/tours/${tourId}/events/${event.id}`)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        gap: '0 24px', padding: '0 20px', height: 40,
        cursor: 'pointer', borderBottom: '0.5px solid var(--border-default)',
        transition: 'background 0.15s', alignItems: 'center',
        background: stripeBg,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
      onMouseLeave={e => e.currentTarget.style.background = stripeBg}
    >
      <LoadInPicker eventId={event.id} currentDate={event.load_in_date} onUpdate={onLoadInUpdate} />
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {formatLocation(event.city, event.state, event.country, 'compact')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.venue_name || 'TBC'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 450, color: numShows === '—' ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: numShows === '—' ? 0.3 : 1 }}>
        {numShows}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 450, color: firstShow ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: firstShow ? 1 : 0.3 }}>
        {fmt(firstShow)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 450, color: lastShow ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: lastShow ? 1 : 0.3 }}>
        {fmt(lastShow)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 450, color: 'var(--text-muted)' }}>
        $—
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
  const [activeTab, setActiveTab] = useState('overview')
  const [pastExpanded, setPastExpanded] = useState(false)
  const [calView, setCalView] = useState('month')
  const [calDate, setCalDate] = useState(new Date())
  const [unconfirmedStaffCount, setUnconfirmedStaffCount] = useState(0)
  const [thisWeekEvents, setThisWeekEvents] = useState([])
  const [eventTravelMap, setEventTravelMap] = useState({})

  const todayDate = new Date()
  const todayStr = ymd(todayDate)
  const dow = todayDate.getDay()
  const mon = new Date(todayDate)
  mon.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const weekStart = ymd(mon); const weekEnd = ymd(sun)
  const twoWeeksOut = new Date(todayDate); twoWeeksOut.setDate(todayDate.getDate() + 14)
  const twoWeeksStr = ymd(twoWeeksOut)

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
        setThisWeekEvents((eventsRes.data || []).filter(e => e.load_in_date >= weekStart && e.load_in_date <= weekEnd))

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

        const eventIds = (eventsRes.data || []).map(e => e.id)
        if (eventIds.length > 0) {
          const { count } = await supabase
            .from('staff_assignments')
            .select('id', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .eq('confirmed', false)
            .eq('status', 'pending')
            .not('staff_id', 'is', null)
          setUnconfirmedStaffCount(count || 0)

          const { data: travelRows } = await supabase
            .from('staff_assignments')
            .select('event_id, travel_in_date, travel_out_date')
            .in('event_id', eventIds)
            .not('travel_in_date', 'is', null)

          const travelMap = {}
          for (const row of (travelRows || [])) {
            if (!travelMap[row.event_id]) travelMap[row.event_id] = { arrival: null, departure: null }
            if (row.travel_in_date) {
              if (!travelMap[row.event_id].arrival || row.travel_in_date < travelMap[row.event_id].arrival)
                travelMap[row.event_id].arrival = row.travel_in_date
            }
            if (row.travel_out_date) {
              if (!travelMap[row.event_id].departure || row.travel_out_date > travelMap[row.event_id].departure)
                travelMap[row.event_id].departure = row.travel_out_date
            }
          }
          setEventTravelMap(travelMap)
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
    return !pastDate || pastDate >= todayStr
  })
  const pastEvents = events.filter(e => {
    const pastDate = getEventPastDate(e, eventShows[e.id])
    return pastDate && pastDate < todayStr
  })

  const confirmedCount = events.filter(e => e.status === 'confirmed').length
  const holdsCount = events.filter(e => HOLD_STATUSES.includes(e.status)).length
  const expiringHolds = events.filter(e => HOLD_STATUSES.includes(e.status) && e.load_in_date >= todayStr && e.load_in_date <= twoWeeksStr)
  const upcomingBeyondWeek = upcomingEvents.filter(e => e.load_in_date > weekEnd)
  const UPCOMING_LIMIT = 6
  const visibleUpcoming = upcomingBeyondWeek.slice(0, UPCOMING_LIMIT)
  const remainingUpcomingCount = upcomingBeyondWeek.length - UPCOMING_LIMIT

  const eventAlerts = upcomingEvents.flatMap(ev => {
    const alerts = getAlerts(ev, eventShows[ev.id])
    return alerts.map(msg => ({
      event: ev,
      message: msg,
    }))
  })

  const attentionItems = [
    ...eventAlerts.map(item => ({ kind: 'alert', ...item })),
    ...expiringHolds.map(ev => ({ kind: 'hold', event: ev })),
    ...(unconfirmedStaffCount > 0 ? [{ kind: 'staff' }] : []),
  ]
  const ATTENTION_LIMIT = 5
  const visibleItems = attentionItems.slice(0, ATTENTION_LIMIT)
  const remainingCount = attentionItems.length - ATTENTION_LIMIT

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 450 }}>
      Loading...
    </div>
  )

  if (!tour) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 450 }}>
      Tour not found.
    </div>
  )

  const color = tour.color || '#C9A84C'
  const headerTextColor = getContrastTextColor(color)
  const tabs = ['Overview', 'Schedule', 'Staffing', 'Travel', 'Calendar', 'Venues', 'Files']
  const tourStatusColor = TOUR_STATUS_COLORS[tour.status] || TOUR_STATUS_COLORS.upcoming

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Tour header */}
      <div style={{ ...GLASS, padding: '16px 20px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>

        {/* Left: identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tour.logo_url ? (
            <img src={tour.logo_url} alt={tour.name} style={{ height: 48, width: 'auto', objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: 8,
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              color: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>
              {initials(tour.name)}
            </div>
          )}
          <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: color }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{tour.name}</div>
              <span className="status-pill" style={{
                color: tourStatusColor,
                background: `color-mix(in srgb, ${tourStatusColor} 12%, transparent)`,
                borderColor: `color-mix(in srgb, ${tourStatusColor} 35%, transparent)`,
              }}>
                {tour.status ? tour.status.charAt(0).toUpperCase() + tour.status.slice(1) : 'Upcoming'}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)' }}>
              {[tour.region, tour.director_name, tour.year].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Right: stats + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{events.length}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginLeft: 3 }}>TOTAL</span>
              </span>
              <span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{pastEvents.length}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginLeft: 3 }}>DONE</span>
              </span>
              <span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{upcomingEvents.length}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginLeft: 3 }}>LEFT</span>
              </span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 6, background: 'var(--border-default)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${events.length > 0 ? (pastEvents.length / events.length) * 100 : 0}%`, background: color, borderRadius: 6 }} />
            </div>
          </div>
          {upcomingEvents.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
              <div
                onClick={() => router.push(`/tours/${id}/events/${upcomingEvents[0].id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Next Event</div>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                >
                  {upcomingEvents[0].city} · {fmt(upcomingEvents[0].load_in_date)}
                </div>
              </div>
            </>
          )}
          <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', gap: 7 }}>
            <button
              onClick={() => router.push(`/tours/${id}/edit`)}
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'var(--surface-card)', color: 'var(--color-info)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-card)'}
            >
              Edit Tour
            </button>
            <button
              onClick={() => router.push(`/tours/${id}/events/new`)}
              style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--color-info)', color: 'var(--btn-primary-text)', cursor: 'pointer' }}
            >
              + Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 8, flexShrink: 0 }}>
        {tabs.map(tab => {
          const active = activeTab === tab.toLowerCase()
          return (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
              style={{
                fontSize: 14, fontWeight: active ? 600 : 400, padding: '7px 14px', borderRadius: 6, border: 'none',
                background: active ? 'rgba(26,86,219,0.08)' : 'transparent',
                color: active ? 'var(--color-info)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'background 0.1s, color 0.1s',
              }}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: (activeTab === 'staffing' || activeTab === 'schedule' || activeTab === 'overview') ? 'hidden' : 'auto' }}>

        {activeTab === 'overview' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 0 0 0' }}>

            {/* Stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
              {[
                { label: 'Total Events', value: events.length, sub: null, color: 'var(--text-primary)' },
                { label: 'Confirmed', value: confirmedCount, sub: null, color: 'var(--color-success)' },
                { label: 'Holds', value: holdsCount, sub: null, color: holdsCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
                { label: 'Remaining', value: upcomingEvents.length, sub: null, color: 'var(--color-info)' },
                { label: 'Done', value: pastEvents.length, sub: null, color: 'var(--color-success)' },
                { label: 'Unconfirmed Staff', value: unconfirmedStaffCount, sub: null, color: unconfirmedStaffCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
                { label: 'Budget', value: '$—', sub: 'coming soon', color: 'var(--text-muted)' },
              ].map((stat, i) => (
                <div key={`${stat.label}-${i}`} style={{ ...GLASS, padding: '11px 13px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 3 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: stat.color }}>{stat.value}</div>
                  {stat.sub && (
                    <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.sub}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Main columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 10, flex: 1, minHeight: 0, marginTop: 10 }}>

              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                  This Week
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {thisWeekEvents.length === 0 && (
                    <div style={{ ...GLASS, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 450, color: 'var(--text-muted)' }}>
                      No events this week
                    </div>
                  )}
                  {thisWeekEvents.map(ev => {
                    const travel = eventTravelMap[ev.id]
                    return (
                      <div key={ev.id} style={{ ...GLASS, padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px 1px 100px', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.venue_name || 'TBC'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {dateRange(ev)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Arrival</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{travel?.arrival ? shortDate(travel.arrival) : '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Load-In</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{shortDate(ev.load_in_date)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}># Shows</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{ev.num_shows || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Departure</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{travel?.departure ? shortDate(travel.departure) : '—'}</div>
                        </div>
                        <div style={{ width: 1, height: 40, background: 'var(--border-default)', alignSelf: 'center' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Budget</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>$—</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                  Upcoming Events
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  {upcomingBeyondWeek.length === 0 && (
                    <div style={{ padding: 14, fontSize: 12, fontWeight: 450, color: 'var(--text-muted)' }}>No upcoming events beyond this week.</div>
                  )}
                  {visibleUpcoming.map(ev => {
                    const s = STATUS_STYLES[ev.status] || STATUS_STYLES.tentative
                    return (
                      <div
                        key={ev.id}
                        onClick={() => router.push(`/tours/${id}/events/${ev.id}`)}
                        style={{ ...GLASS, padding: '12px 20px', display: 'grid', gridTemplateColumns: '80px 1fr 140px 100px 140px 100px', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)' }}>{dateRange(ev)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.venue_name || 'TBC'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Load-In</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{shortDate(ev.load_in_date)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}># Shows</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{ev.num_shows || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>Budget</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>$—</div>
                        </div>
                        <span className="status-pill" style={{ color: s.color, background: s.background, borderColor: s.border, justifySelf: 'flex-end' }}>
                          {fmtStatus(ev.status)}
                        </span>
                      </div>
                    )
                  })}
                  {remainingUpcomingCount > 0 && (
                    <div
                      onClick={() => setActiveTab('schedule')}
                      style={{ fontSize: 13, color: 'var(--color-info)', fontWeight: 600, cursor: 'pointer', textAlign: 'center', padding: '8px 12px' }}
                    >
                      Show all {upcomingBeyondWeek.length} events →
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0, position: 'sticky', top: 10, alignSelf: 'flex-start' }}>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                    <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
                      <IconAlertTriangleFilled size={16} color="#FFD60A" />
                      <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
                    </div>
                    Needs Attention
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {attentionItems.length === 0 && (
                      <div style={{ ...GLASS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
                        <IconCheck size={20} color="var(--color-success)" />
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>All clear</div>
                      </div>
                    )}
                    {visibleItems.map((item, i) => {
                      if (item.kind === 'alert') {
                        return (
                          <div
                            key={`${item.event.id}-${i}`}
                            onClick={() => router.push(`/tours/${id}/events/${item.event.id}`)}
                            style={{ ...GLASS, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                          >
                            <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: 'var(--status-1hold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ position: 'relative', display: 'inline-flex', width: 14, height: 14, flexShrink: 0 }}>
                                <IconAlertTriangleFilled size={14} color="#FFD60A" />
                                <IconAlertTriangle size={14} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
                              </div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {formatLocation(item.event.city, item.event.state, item.event.country, 'compact')}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: 1 }}>
                                {item.message}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      if (item.kind === 'hold') {
                        const ev = item.event
                        return (
                          <div
                            key={ev.id}
                            onClick={() => router.push(`/tours/${id}/events/${ev.id}`)}
                            style={{ ...GLASS, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                          >
                            <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: 'var(--status-1hold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconClock size={13} color="var(--color-warning)" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Hold expiring</div>
                              <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: 1 }}>
                                {formatLocation(ev.city, ev.state, ev.country, 'compact')} · {shortDate(ev.load_in_date)}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div
                          key="staff"
                          onClick={() => setActiveTab('staffing')}
                          style={{ ...GLASS, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: 'var(--status-1hold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconUserQuestion size={13} color="var(--color-warning)" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{unconfirmedStaffCount} unconfirmed staff</div>
                            <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: 1 }}>Pending on upcoming events</div>
                            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 3 }}>View staffing</div>
                          </div>
                        </div>
                      )
                    })}
                    {remainingCount > 0 && (
                      <div
                        onClick={() => router.push(`/tours/${id}/schedule`)}
                        style={{
                          padding: '8px 12px',
                          fontSize: 13,
                          color: 'var(--color-info)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          borderTop: '0.5px solid var(--border-default)',
                          textAlign: 'center'
                        }}
                      >
                        See {remainingCount} more →
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
                    Budget Overview
                  </div>
                  <div style={{ ...GLASS, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Tour Budget</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>$—</span>
                    </div>
                    <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '10px 0' }} />
                    {['Total Budget', 'Spent to Date', 'Remaining'].map(lbl => (
                      <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', padding: '4px 0' }}>
                        <span>{lbl}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>$—</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...GLASS, padding: '16px 20px', marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Flagged Items</div>
                    <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', padding: 16 }}>No flags at this time</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 450, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8 }}>
                    Finance module coming soon
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '8px 0 0 0' }}>
            {/* Empty state */}
            {events.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No events yet</div>
                <div style={{ fontSize: 14, fontWeight: 450, color: 'var(--text-muted)' }}>Add your first event to this tour</div>
                <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>+ Add Event</button>
              </div>
            )}

            {/* Table card — flex: 1 fills remaining height, overflow: hidden is the clip shell */}
            {events.length > 0 && (
              <div style={{ flex: 1, overflow: 'hidden', ...GLASS }}>
                {/* Inner scroll surface — sticky header works because this is the scroll container */}
                <div style={{ height: '100%', overflow: 'auto' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: '0 24px', padding: '12px 20px', background: color, position: 'sticky', top: 0, zIndex: 10 }}>
                    {COLS.map(col => (
                      <div key={col.key} style={{ fontSize: 11, fontWeight: 800, color: headerTextColor, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: col.align }}>
                        {col.label}
                      </div>
                    ))}
                  </div>

                  {/* Upcoming event rows */}
                  {upcomingEvents.map((event, i) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      eventShows={eventShows}
                      tourId={id}
                      router={router}
                      onStatusUpdate={handleStatusUpdate}
                      onLoadInUpdate={handleLoadInUpdate}
                      fmt={fmt}
                      index={i}
                      tourColor={color}
                    />
                  ))}

                  {/* Past events — collapsible */}
                  {pastEvents.length > 0 && (
                    <div>
                      <div
                        onClick={() => setPastExpanded(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', cursor: 'pointer', borderTop: '1px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--color-info)', userSelect: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-card)'}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: pastExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, color: 'var(--color-info)' }}>
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--color-info)' }}>
                          Past Events <span style={{ fontSize: 12, marginLeft: 4 }}>({pastEvents.length})</span>
                        </span>
                      </div>

                      {pastExpanded && pastEvents.map((event, i) => (
                        <div key={event.id} style={{ opacity: 0.6 }}>
                          <EventRow
                            event={event}
                            eventShows={eventShows}
                            tourId={id}
                            router={router}
                            onStatusUpdate={handleStatusUpdate}
                            onLoadInUpdate={handleLoadInUpdate}
                            fmt={fmt}
                            index={i}
                            tourColor={color}
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
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {/* Month/Week toggle */}
              <div style={{ display: 'flex', borderRadius: 8,
                border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                <button
                  onClick={() => setCalView('month')}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600,
                    background: calView === 'month' ? 'var(--color-info)' : 'transparent',
                    color: calView === 'month' ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}>Month</button>
                <button
                  onClick={() => setCalView('week')}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 600,
                    background: calView === 'week' ? 'var(--color-info)' : 'transparent',
                    color: calView === 'week' ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}>Week</button>
              </div>

              {/* Prev button */}
              <button
                onClick={() => {
                  const d = new Date(calDate)
                  if (calView === 'month') d.setMonth(d.getMonth() - 1)
                  else d.setDate(d.getDate() - 7)
                  setCalDate(new Date(d))
                }}
                style={{ background: 'transparent', border: '1px solid var(--border-default)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: 14 }}>‹</button>

              {/* Date label */}
              <span style={{ fontSize: 13, fontWeight: 600,
                color: 'var(--text-primary)', minWidth: 90, textAlign: 'center' }}>
                {calDate.toLocaleDateString('en-US',
                  calView === 'month'
                    ? { month: 'long', year: 'numeric' }
                    : { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>

              {/* Next button */}
              <button
                onClick={() => {
                  const d = new Date(calDate)
                  if (calView === 'month') d.setMonth(d.getMonth() + 1)
                  else d.setDate(d.getDate() + 7)
                  setCalDate(new Date(d))
                }}
                style={{ background: 'transparent', border: '1px solid var(--border-default)',
                  borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: 14 }}>›</button>

              {/* Today button */}
              <button
                onClick={() => setCalDate(new Date())}
                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  background: 'transparent', border: '1px solid var(--color-info)',
                  borderRadius: 6, color: 'var(--color-info)', cursor: 'pointer' }}>Today</button>
            </div>

            <TourCalendar
              tourId={id}
              tourColor={color}
              view={calView}
              currentDate={calDate}
            />
          </div>
        )}

        {activeTab === 'travel' && (
          <div style={{ padding: '16px 0' }}>
            {(() => {
              const todayYMD = new Date().toISOString().slice(0, 10)
              const fmtMD = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
              const upcomingEvents = events.filter(ev => (ev.load_out_date || ev.load_in_date) >= todayYMD)
              if (upcomingEvents.length === 0) return (
                <div style={{ fontSize: 14, fontWeight: 450, color: 'var(--text-secondary)' }}>No upcoming events on this tour.</div>
              )
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {upcomingEvents.map(event => {
                    const shows = eventShows[event.id] || []
                    const lastShowDate = shows.length > 0 ? shows[shows.length - 1].show_date : null
                    const endDate = [event.load_out_date, lastShowDate].filter(Boolean).sort().pop() || null
                    const startFmt = fmtMD(event.load_in_date)
                    const endFmt = endDate && endDate !== event.load_in_date ? fmtMD(endDate) : null
                    const dateRange = startFmt ? (endFmt ? `${startFmt} – ${endFmt}` : startFmt) : 'N/A'
                    const missingTravel = !eventTravelMap[event.id]?.arrival
                    return (
                      <div
                        key={event.id}
                        onClick={() => router.push(`/tours/${id}/events/${event.id}?tab=travel`)}
                        style={{ ...GLASS, padding: '12px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-tile-bg)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatLocation(event.city, event.state, event.country, 'compact')}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            {missingTravel && (
                              <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
                                <IconAlertTriangleFilled size={16} color="#FFD60A" />
                                <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
                              </div>
                            )}
                            <StatusBadge status={event.status} />
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.venue_name || 'Venue TBC'}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{dateRange}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {activeTab === 'venues' && (
          <div style={{ padding: '28px 32px' }}>
            {venues.length === 0 ? (
              <div style={{ fontSize: 14, fontWeight: 450, color: 'var(--text-secondary)' }}>No venues linked to this tour yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {venues.map(venue => (
                  <div
                    key={venue.id}
                    onClick={() => router.push(`/venues/${venue.id}`)}
                    style={{ ...GLASS, padding: '14px 18px', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-tile-bg)' }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3, color: 'var(--text-primary)' }}>{venue.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)' }}>
                      {formatLocation(venue.city, venue.state, venue.country, 'compact')}
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
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Tour Files</div>
              <button
                disabled
                title="Coming soon"
                style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
              >
                + Upload File
              </button>
            </div>
            <div className="glass-card" style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <path d="M6 12a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V12Z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>No files uploaded yet</div>
              <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)' }}>File uploads coming in a future update</div>
            </div>
          </div>
        )}

        {activeTab === 'staffing' && (
          <StaffingGrid tourId={id} />
        )}

        {activeTab !== 'overview' && activeTab !== 'schedule' && activeTab !== 'calendar' && activeTab !== 'travel' && activeTab !== 'venues' && activeTab !== 'files' && activeTab !== 'staffing' && (
          <div style={{ padding: '28px 32px', fontSize: 14, fontWeight: 450, color: 'var(--text-muted)' }}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon.
          </div>
        )}
      </div>
    </div>
  )
}
