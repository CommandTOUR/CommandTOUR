'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getSupabase } from '../../../../../lib/supabase'
import StaffingTab from '../../../../../components/StaffingTab'
import TravelHotelTab from '../../../../../components/TravelHotelTab'
import ScheduleTab from '../../../../../components/ScheduleTab'
import TasksTab from '../../../../../components/TasksTab'
import NotesTab from '../../../../../components/NotesTab'
import FilesTab from '../../../../../components/FilesTab'
import { formatLocation, shortCountry } from '@/lib/locationFormat'
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconCheck,
} from '@tabler/icons-react'

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

const STATUS_PILL = {
  confirmed:   { color: 'var(--status-confirmed-text)', background: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  tentative:   { color: 'var(--status-tentative-text)', background: 'var(--status-tentative-bg)', border: 'var(--status-tentative-border)' },
  '1-hold':    { color: 'var(--status-1hold-text)',     background: 'var(--status-1hold-bg)',     border: 'var(--status-1hold-border)' },
  '2-hold':    { color: 'var(--status-2hold-text)',     background: 'var(--status-2hold-bg)',     border: 'var(--status-2hold-border)' },
  '3-hold':    { color: 'var(--status-3hold-text)',     background: 'var(--status-3hold-bg)',     border: 'var(--status-3hold-border)' },
  'date-hold': { color: 'var(--status-datehold-text)',  background: 'var(--status-datehold-bg)',  border: 'var(--status-datehold-border)' },
}

const fmtStatus = (s) => {
  if (!s) return ''
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

const timeSelectStyle = {
  background: 'var(--surface-card)',
  border: '0.5px solid var(--border-strong)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '4px 8px',
  cursor: 'pointer'
}

const ampmActiveStyle = {
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
  border: '1px solid var(--accent-border)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer'
}

const ampmInactiveStyle = {
  background: 'var(--surface-card)',
  color: 'var(--text-muted)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer'
}

function ShowRow({ show, index, fmtLong, fmtTime, onToggleComplete, onDelete, onSave, isLast }) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState(show.show_date || '')
  const [editHour, setEditHour] = useState(() => {
    if (!show.show_time) return '7'
    const fmt = fmtTime(show.show_time)
    if (!fmt) return '7'
    const [h] = fmt.split(':')
    const hour = parseInt(h) % 12 || 12
    return String(hour)
  })
  const [editMinute, setEditMinute] = useState(() => {
    if (!show.show_time) return '30'
    const fmt = fmtTime(show.show_time)
    if (!fmt) return '30'
    return fmt.split(':')[1]?.split(' ')[0] || '30'
  })
  const [editAmPm, setEditAmPm] = useState(() => {
    if (!show.show_time) return 'PM'
    const fmt = fmtTime(show.show_time)
    return fmt?.includes('AM') ? 'AM' : 'PM'
  })
  const [saving, setSaving] = useState(false)

  const initTimeFromShow = () => {
    const fmt = fmtTime(show.show_time)
    setEditHour(!fmt ? '7' : String(parseInt(fmt.split(':')[0]) % 12 || 12))
    setEditMinute(!fmt ? '30' : fmt.split(':')[1]?.split(' ')[0] || '30')
    setEditAmPm(!fmt ? 'PM' : fmt.includes('AM') ? 'AM' : 'PM')
  }

  const handleSave = async () => {
    if (!editDate) return
    setSaving(true)
    const finalTime = `${editHour}:${editMinute} ${editAmPm}`
    await onSave(show.id, editDate, finalTime)
    setEditing(false)
    setSaving(false)
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', transition: 'background 0.12s', marginBottom: 8 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div onClick={() => onToggleComplete(show)} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: show.completed ? 'none' : '1.5px solid var(--border-stronger)', background: show.completed ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        {show.completed && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="var(--surface-card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--accent)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }} />
          <select value={editHour} onChange={e => setEditHour(e.target.value)} style={timeSelectStyle}>
            {['1','2','3','4','5','6','7','8','9','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={editMinute} onChange={e => setEditMinute(e.target.value)} style={timeSelectStyle}>
            {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => setEditAmPm('AM')} style={editAmPm === 'AM' ? ampmActiveStyle : ampmInactiveStyle}>AM</button>
          <button onClick={() => setEditAmPm('PM')} style={editAmPm === 'PM' ? ampmActiveStyle : ampmInactiveStyle}>PM</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 12, padding: '4px 12px' }}>{saving ? '...' : 'Save'}</button>
          <button onClick={() => { setEditing(false); setEditDate(show.show_date || ''); initTimeFromShow() }}
            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Show {index + 1}</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: show.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: show.completed ? 'line-through' : 'none' }}>
            {fmtLong(show.show_date)}
            {fmtTime(show.show_time)
              ? <> · {fmtTime(show.show_time)}</>
              : <span
                  onClick={() => { setEditing(true); setEditDate(show.show_date || '') }}
                  style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 6, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >· Set time</span>
            }
          </div>
        </div>
      )}

      {!editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <div onClick={() => { setEditing(true); setEditDate(show.show_date || ''); initTimeFromShow() }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13.879 3.121a3 3 0 1 1 4.243 4.243l-9 9a2 2 0 0 1-.847.514l-4 1a1 1 0 0 1-1.23-1.23l1-4a2 2 0 0 1 .514-.847l9-9z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div onClick={() => onDelete(show.id)} style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>×</div>
        </div>
      )}
    </div>
  )
}

export default function EventPage() {
  const router = useRouter()
  const { id, eventId } = useParams()
  const searchParams = useSearchParams()
  const [event, setEvent] = useState(null)
  const [tour, setTour] = useState(null)
  const [shows, setShows] = useState([])
  const [venue, setVenue] = useState(null)
  const [venueContacts, setVenueContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    if (tab === 'travel') return 'travel & hotel'
    return tab || 'overview'
  })
  const [addingShow, setAddingShow] = useState(false)
  const [newShow, setNewShow] = useState({ show_date: '', notes: '' })
  const [newHour, setNewHour] = useState('7')
  const [newMinute, setNewMinute] = useState('30')
  const [newAmPm, setNewAmPm] = useState('PM')
  const [saving, setSaving] = useState(false)
  const [incompleteTasks, setIncompleteTasks] = useState(null)
  const [todayScheduleItems, setTodayScheduleItems] = useState([])
  const [travelToday, setTravelToday] = useState(0)
  const [travelDates, setTravelDates] = useState({ earliestArrival: null, latestDeparture: null })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [eventRes, tourRes, showsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('tours').select('*').eq('id', id).single(),
        supabase.from('show_list').select('*').eq('event_id', eventId).order('show_date', { ascending: true }).order('show_time', { ascending: true }),
      ])
      if (!eventRes.error) {
        setEvent(eventRes.data)
        if (eventRes.data.venue_id) {
          const [venueRes, contactsRes] = await Promise.all([
            supabase.from('venues').select('*').eq('id', eventRes.data.venue_id).single(),
            supabase.from('venue_contacts').select('*').eq('venue_id', eventRes.data.venue_id).order('created_at', { ascending: true }),
          ])
          if (!venueRes.error) setVenue(venueRes.data)
          if (!contactsRes.error) setVenueContacts(contactsRes.data)
        }
      }
      if (!tourRes.error) setTour(tourRes.data)
      if (!showsRes.error) setShows(showsRes.data)
      setLoading(false)
    }
    fetchData()
  }, [id, eventId])

  useEffect(() => {
    if (activeTab !== 'overview') return
    const supabase = getSupabase()
    supabase
      .from('event_tasks')
      .select('id, task_name')
      .eq('event_id', eventId)
      .eq('completed', false)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setIncompleteTasks(data || []))
  }, [activeTab, eventId])

  useEffect(() => {
    if (activeTab !== 'overview') return
    const supabase = getSupabase()
    const pad = n => String(n).padStart(2, '0')
    const d = new Date()
    const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    Promise.all([
      supabase.from('event_travel_arrivals').select('travel_date').eq('event_id', eventId),
      supabase.from('event_travel_departures').select('travel_date').eq('event_id', eventId),
    ]).then(([arrRes, depRes]) => {
      const arrivals = arrRes.data || []
      const departures = depRes.data || []
      const travelingToday = new Set([
        ...arrivals.filter(r => r.travel_date === today).map((_, i) => `a${i}`),
        ...departures.filter(r => r.travel_date === today).map((_, i) => `d${i}`),
      ]).size
      setTravelToday(travelingToday)
      const allArrivalDates = arrivals.map(r => r.travel_date).filter(Boolean).sort()
      const allDepDates = departures.map(r => r.travel_date).filter(Boolean).sort()
      setTravelDates({
        earliestArrival: allArrivalDates[0] || null,
        latestDeparture: allDepDates[allDepDates.length - 1] || null,
      })
    })
  }, [activeTab, eventId])

  useEffect(() => {
    if (activeTab !== 'overview') return
    const supabase = getSupabase()
    const today = new Date()
    const pad = n => String(n).padStart(2, '0')
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`
    const targetDate = (event?.load_in_date && event.load_in_date <= todayStr && event?.load_out_date && event.load_out_date >= todayStr)
      ? todayStr
      : event?.load_in_date || null
    if (!targetDate) return
    supabase
      .from('schedule_items')
      .select('id, day_date, time_start, time_end, what, sort_order')
      .eq('event_id', eventId)
      .eq('day_date', targetDate)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setTodayScheduleItems(data || []))
  }, [activeTab, eventId, event])

  useEffect(() => {
    const fetchShows = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('show_list').select('*').eq('event_id', eventId).order('show_date', { ascending: true }).order('show_time', { ascending: true })
      if (data) setShows(data)
    }
    const handleFocus = () => fetchShows()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [eventId])

  const handleAddShow = async () => {
    if (!newShow.show_date) return
    setSaving(true)
    const supabase = getSupabase()
    const { data, error } = await supabase.from('show_list').insert([{
      event_id: eventId,
      show_date: newShow.show_date,
      show_time: `${newHour}:${newMinute} ${newAmPm}`,
      notes: newShow.notes || null,
      completed: false,
    }]).select().single()
    if (!error) {
      const updated = [...shows, data].sort((a, b) => new Date(`${a.show_date}T${a.show_time || '00:00'}`) - new Date(`${b.show_date}T${b.show_time || '00:00'}`))
      setShows(updated)
      const lastShowDate = updated[updated.length - 1].show_date
      await supabase.from('events').update({
        num_shows: updated.length,
        load_out_date: event.load_out_date || lastShowDate,
      }).eq('id', eventId)
      const showNumber = updated.length
      const showTimeStr = (() => {
        const h = parseInt(newHour)
        const m = newMinute
        const isPM = newAmPm === 'PM'
        let hour24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h)
        return `${String(hour24).padStart(2,'0')}:${m}:00`
      })()
      await supabase.from('schedule_items').insert([{
        event_id: eventId,
        day_date: newShow.show_date,
        day_type: 'Show Day',
        what: `Show ${showNumber}`,
        who: null,
        notes: null,
        time_start: showTimeStr,
        time_end: null,
        sort_order: 99,
      }])
      setNewShow({ show_date: '', notes: '' })
      setNewHour('7')
      setNewMinute('30')
      setNewAmPm('PM')
      setAddingShow(false)
    }
    setSaving(false)
  }

  const handleSaveShowNotes = async (showId, notes) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('show_list').update({ notes }).eq('id', showId)
    if (error) { console.error('Failed to save show notes:', error); return }
    setShows(prev => prev.map(s => s.id === showId ? { ...s, notes } : s))
  }

  const handleToggleComplete = async (show) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('show_list').update({ completed: !show.completed }).eq('id', show.id)
    if (error) { console.error('Failed to toggle complete:', error); return }
    setShows(prev => prev.map(s => s.id === show.id ? { ...s, completed: !s.completed } : s))
  }

  const handleDeleteShow = async (showId) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('show_list').delete().eq('id', showId)
    if (!error) {
      const updated = shows.filter(s => s.id !== showId)
      setShows(updated)
      const lastShowDate = updated.length > 0 ? updated[updated.length - 1].show_date : null
      await supabase.from('events').update({
        num_shows: updated.length,
        load_out_date: lastShowDate,
      }).eq('id', eventId)
    }
  }

  const handleSaveShow = async (showId, date, time) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('show_list')
      .update({ show_date: date, show_time: time || null })
      .eq('id', showId)
      .select()
      .single()
    if (!error) setShows(prev => prev.map(s => s.id === showId ? { ...s, ...data } : s))
  }

  const handleDeleteEvent = async () => {
    if (!confirm('Delete this event and all its shows? This cannot be undone.')) return
    const supabase = getSupabase()
    await supabase.from('events').delete().eq('id', eventId)
    router.push(`/tours/${id}`)
  }

  if (loading) return (
    <div style={{ padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
  )

  if (!event) return (
    <div style={{ padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Event not found.</div>
  )

  const color = tour?.color || 'var(--accent)'
  const tabs = ['Overview', 'Shows', 'Staffing', 'Travel & Hotel', 'Schedule', 'Tasks', 'Notes', 'Files']

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }) : '—'

  const fmtLong = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }) : '—'

  const fmtShortDay = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  }) : '—'

  const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  }) : '—'

  const fmtTime = (t) => {
    if (!t) return null
    if (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) return t.trim()
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return t
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const daysUntil = event.load_in_date
    ? Math.ceil((new Date(event.load_in_date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const completedShows = shows.filter(s => s.completed).length

  const pad = n => String(n).padStart(2, '0')
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` })()
  const glanceDate = (event?.load_in_date && event.load_in_date <= todayStr && event?.load_out_date && event.load_out_date >= todayStr)
    ? todayStr
    : event?.load_in_date || null
  const glanceDateLabel = glanceDate ? new Date(glanceDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : null

  const fmtScheduleTime = (t) => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h)) return t
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
  }

  const nowMinutes = (() => { const d = new Date(); return d.getHours()*60 + d.getMinutes() })()
  const toMinutes = (t) => { if (!t) return null; const [h,m] = t.split(':').map(Number); return h*60+m }

  const inputStyle = {
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 7,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    caretColor: 'var(--accent)',
    outline: 'none',
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* Event header */}
        <div style={{ ...GLASS, padding: '16px 20px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>

          {/* Left: identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tour?.logo_url ? (
              <img src={tour.logo_url} alt={tour.name} style={{ height: 48, width: 'auto', objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 8,
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>
                {initials(tour?.name)}
              </div>
            )}
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: color }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatLocation(event.city, event.state, event.country, 'full')}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  color: (STATUS_PILL[event.status] || STATUS_PILL.tentative).color,
                  background: (STATUS_PILL[event.status] || STATUS_PILL.tentative).background,
                  border: `1px solid ${(STATUS_PILL[event.status] || STATUS_PILL.tentative).border}`,
                }}>
                  {event.status ? fmtStatus(event.status) : 'Tentative'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {event.venue_name && `${event.venue_name} · `}
                {fmt(event.load_in_date)}
                {shows.length > 0 && ` · ${shows.length} ${shows.length === 1 ? 'show' : 'shows'}`}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDeleteEvent} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>
                Delete Event
              </button>
              <button
                onClick={() => router.push(`/tours/${id}/events/${eventId}/edit`)}
                style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Edit Event
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 8, flexShrink: 0 }}>
          <button
            onClick={() => router.push(`/tours/${id}`)}
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: 8, whiteSpace: 'nowrap' }}
          >
            ← {tour?.name || 'Tour'}
          </button>
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
                {tab === 'Shows' && shows.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>({shows.length})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, width: '100%', padding: '12px 0' }}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 0 0 0' }}>

              {/* Stat strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                {[
                  {
                    label: 'Days to Load-In',
                    value: daysUntil === null ? '—' : daysUntil <= 0 ? 'Now' : daysUntil,
                    sub: null,
                    color: daysUntil !== null && daysUntil <= 7 ? 'var(--color-danger)' : daysUntil !== null && daysUntil <= 30 ? 'var(--color-warning)' : 'var(--accent)',
                  },
                  {
                    label: 'Staff Travel',
                    value: (() => {
                      const pad = n => String(n).padStart(2, '0')
                      const d = new Date()
                      const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
                      const eventActive = event?.load_in_date <= today && event?.load_out_date >= today
                      const eventDone = event?.load_out_date && event.load_out_date < today
                      if (eventDone) return '✓'
                      if (travelToday > 0) return travelToday
                      if (!eventActive && travelDates.earliestArrival) return fmtShort(travelDates.earliestArrival)
                      if (eventActive && travelDates.latestDeparture) return fmtShort(travelDates.latestDeparture)
                      return '—'
                    })(),
                    sub: (() => {
                      const pad = n => String(n).padStart(2, '0')
                      const d = new Date()
                      const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
                      const eventActive = event?.load_in_date <= today && event?.load_out_date >= today
                      const eventDone = event?.load_out_date && event.load_out_date < today
                      if (eventDone) return 'complete'
                      if (travelToday > 0) return 'traveling today'
                      if (!eventActive && travelDates.earliestArrival) return 'first arrival'
                      if (eventActive && travelDates.latestDeparture) return 'last departure'
                      return 'no travel data'
                    })(),
                    color: travelToday > 0 ? 'var(--color-info)' : 'var(--text-primary)',
                    onClick: () => setActiveTab('travel & hotel'),
                  },
                  {
                    label: 'Booking Status',
                    value: event.status ? fmtStatus(event.status) : 'Tentative',
                    sub: null,
                    color: (STATUS_PILL[event.status] || STATUS_PILL.tentative).color,
                  },
                  {
                    label: 'Venue',
                    value: event.venue_name || 'TBC',
                    sub: venue ? formatLocation(venue.city, venue.state, venue.country, 'full') : null,
                    color: 'var(--text-primary)',
                    onClick: venue ? () => router.push(`/venues/${venue.id}`) : null,
                    small: true,
                  },
                  {
                    label: 'Tasks',
                    value: incompleteTasks === null ? '—' : incompleteTasks.length === 0 ? '✓' : incompleteTasks.length,
                    sub: incompleteTasks?.length > 0 ? 'incomplete' : null,
                    color: incompleteTasks?.length === 0 ? 'var(--color-success)' : incompleteTasks?.length > 0 ? 'var(--color-warning)' : 'var(--text-muted)',
                    onClick: () => setActiveTab('tasks'),
                  },
                  {
                    label: 'Budget',
                    value: '$—',
                    sub: 'coming soon',
                    color: 'var(--text-muted)',
                  },
                ].map((stat, i) => (
                  <div key={`${stat.label}-${i}`}
                    onClick={stat.onClick}
                    style={{ ...GLASS, padding: '11px 13px', cursor: stat.onClick ? 'pointer' : 'default' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 3 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: stat.small ? 16 : 24, fontWeight: 700, lineHeight: stat.small ? 1.3 : 1, color: stat.color }}>{stat.value}</div>
                    {stat.sub && (
                      <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.sub}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Main columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr 1fr', gap: 10, flex: 1, minHeight: 0, marginTop: 10 }}>

                {/* Left column — Show Times */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                    Show Times
                  </div>
                  <div style={{ ...GLASS, padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      {fmtShort(event.load_in_date)} – {fmtShort(event.load_out_date)}
                    </div>
                    {shows.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No shows added yet</div>
                    ) : (
                      shows.map((show, i) => (
                        <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i === shows.length - 1 ? 'none' : '0.5px solid var(--border-default)' }}>
                          {show.completed ? (
                            <div onClick={() => handleToggleComplete(show)} style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--accent)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="var(--surface-card)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          ) : (
                            <div onClick={() => handleToggleComplete(show)} style={{ width: 17, height: 17, borderRadius: '50%', border: '1.5px solid var(--border-stronger)', background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>Show {i + 1}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: show.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: show.completed ? 'line-through' : 'none' }}>
                              {fmtShortDay(show.show_date)}{fmtTime(show.show_time) ? ` · ${fmtTime(show.show_time)}` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Middle column — Day at a Glance */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                    Day at a Glance
                  </div>
                  <div style={{ ...GLASS, padding: '16px 18px' }}>
                    {glanceDateLabel && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                        {glanceDateLabel}
                      </div>
                    )}
                    {todayScheduleItems.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {shows.length > 0 ? (
                          shows.map((show, i) => {
                            const showDate = show.show_date
                            const isGlanceDay = showDate === glanceDate
                            if (!isGlanceDay) return null
                            return (
                              <div key={show.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--border-default)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 52, flexShrink: 0, paddingTop: 1 }}>
                                  {fmtTime(show.show_time) || '—'}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                                  Show {i + 1}
                                </div>
                              </div>
                            )
                          }).filter(Boolean)
                        ) : null}
                        {(shows.filter(s => s.show_date === glanceDate).length === 0) && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {daysUntil !== null && daysUntil > 0
                              ? `${daysUntil} day${daysUntil === 1 ? '' : 's'} until load-in`
                              : 'No schedule items for this day.'}
                          </div>
                        )}
                      </div>
                    ) : (
                      todayScheduleItems.map((item, i) => {
                        const startMin = toMinutes(item.time_start)
                        const endMin = toMinutes(item.time_end)
                        const isNow = glanceDate === todayStr && startMin !== null && startMin <= nowMinutes && (endMin === null || endMin > nowMinutes)
                        const isLast = i === todayScheduleItems.length - 1
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: isNow ? '7px 18px' : '7px 0',
                              margin: isNow ? '0 -18px' : 0,
                              background: isNow ? 'color-mix(in srgb, var(--color-info) 6%, transparent)' : 'transparent',
                              borderBottom: isLast ? 'none' : '0.5px solid var(--border-default)',
                            }}
                          >
                            <div style={{ fontSize: 11, width: 52, flexShrink: 0, paddingTop: 1, color: isNow ? 'var(--color-info)' : 'var(--text-muted)', fontWeight: isNow ? 600 : 400 }}>
                              {fmtScheduleTime(item.time_start) || '—'}
                            </div>
                            <div style={{ fontSize: 13, color: isNow ? 'var(--color-info)' : 'var(--text-primary)', fontWeight: isNow ? 600 : 400 }}>
                              {item.what || '—'}
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div
                      onClick={() => setActiveTab('schedule')}
                      style={{ fontSize: 12, color: 'var(--color-info)', cursor: 'pointer', marginTop: 10, display: 'block' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >View all days →</div>
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 }}>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
                      <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
                        <IconAlertTriangleFilled size={16} color="#FFD60A" />
                        <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
                      </div>
                      Needs Attention
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {incompleteTasks === null && (
                        <div style={{ ...GLASS, padding: '20px 22px', fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
                      )}
                      {incompleteTasks !== null && incompleteTasks.length === 0 && (
                        <div style={{ ...GLASS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
                          <IconCheck size={20} color="var(--color-success)" />
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>All clear</div>
                        </div>
                      )}
                      {incompleteTasks !== null && incompleteTasks.length > 0 && (
                        <div style={{ ...GLASS, padding: '20px 22px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>{incompleteTasks.length} Items</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {incompleteTasks.slice(0, 3).map(task => (
                              <div key={task.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>· {task.task_name}</div>
                            ))}
                            {incompleteTasks.length > 3 && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>+ {incompleteTasks.length - 3} more</div>
                            )}
                          </div>
                          <div
                            onClick={() => setActiveTab('tasks')}
                            style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', marginTop: 10 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                          >View All Tasks →</div>
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Event Budget</span>
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

          {/* SHOWS */}
          {activeTab === 'shows' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  Show Dates
                  {shows.length > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                      ({completedShows}/{shows.length} complete)
                    </span>
                  )}
                </div>
                {!addingShow && (
                  <button className="btn-primary" onClick={() => setAddingShow(true)}>+ Add Show</button>
                )}
              </div>

              {addingShow && (
                <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 16, maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Show Date *</label>
                      <input type="date" style={{ ...inputStyle, width: '100%' }} value={newShow.show_date} min={event.load_in_date || ''} onChange={e => setNewShow(p => ({ ...p, show_date: e.target.value }))} />
                      {newShow.show_date && event.load_in_date && newShow.show_date < event.load_in_date && (
                        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>Show date cannot be before load-in date</div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Show Time</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <select value={newHour} onChange={e => setNewHour(e.target.value)} style={timeSelectStyle}>
                          {['1','2','3','4','5','6','7','8','9','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <select value={newMinute} onChange={e => setNewMinute(e.target.value)} style={timeSelectStyle}>
                          {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button onClick={() => setNewAmPm('AM')} style={newAmPm === 'AM' ? ampmActiveStyle : ampmInactiveStyle}>AM</button>
                        <button onClick={() => setNewAmPm('PM')} style={newAmPm === 'PM' ? ampmActiveStyle : ampmInactiveStyle}>PM</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Notes</label>
                    <input type="text" style={{ ...inputStyle, width: '100%' }} placeholder="Optional notes..." value={newShow.notes} onChange={e => setNewShow(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setAddingShow(false); setNewShow({ show_date: '', notes: '' }); setNewHour('7'); setNewMinute('30'); setNewAmPm('PM') }}
                      style={{ fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Cancel</button>
                    <button className="btn-primary" onClick={handleAddShow} disabled={saving}>{saving ? 'Saving...' : 'Save Show'}</button>
                  </div>
                </div>
              )}

              {shows.length === 0 && !addingShow && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No shows added yet</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Add individual show dates to track performances</div>
                  <button className="btn-primary" onClick={() => setAddingShow(true)}>+ Add Show</button>
                </div>
              )}

              {shows.length > 0 && (
                <div style={{ maxWidth: 600 }}>
                  {shows.map((show, i) => (
                    <ShowRow
                      key={show.id}
                      show={show}
                      index={i}
                      fmtLong={fmtLong}
                      fmtTime={fmtTime}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteShow}
                      onSave={handleSaveShow}
                      isLast={i === shows.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'staffing' && (
            <StaffingTab eventId={eventId} event={event} tourColor={color} />
          )}

          {activeTab === 'travel & hotel' && (
            <TravelHotelTab eventId={eventId} event={event} />
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab eventId={eventId} event={event} tourId={id} hasShows={shows.length > 0} />
          )}

          {activeTab === 'tasks' && (
            <TasksTab eventId={eventId} event={event} />
          )}

          {activeTab === 'notes' && (
            <NotesTab eventId={eventId} />
          )}

          {activeTab === 'files' && (
            <FilesTab />
          )}
        </div>
      </div>
    </div>
  )
}