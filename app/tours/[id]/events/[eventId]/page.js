'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import TopNav from '../../../../../components/TopNav'
import { getSupabase } from '../../../../../lib/supabase'
import StaffingTab from '../../../../../components/StaffingTab'
import TravelHotelTab from '../../../../../components/TravelHotelTab'
import ScheduleTab from '../../../../../components/ScheduleTab'
import TasksTab from '../../../../../components/TasksTab'
import NotesTab from '../../../../../components/NotesTab'
import FilesTab from '../../../../../components/FilesTab'

const STATUS_TEXT_COLORS = {
  confirmed: '#16a34a',
  tentative: '#6b21a8',
  '1-hold': '#854d0e',
  '2-hold': '#9a3412',
  '3-hold': '#991b1b',
  cancelled: '#6b7280',
  want: '#6b7280',
  'date-hold': '#6b7280',
}

function ShowTile({ show, index, fmtShort, fmtTime, onToggleComplete, onDelete, onSaveNotes }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(show.notes || '')

  return (
    <div className="glass-card" style={{ width: 240, padding: '14px 16px', transition: 'all 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={() => onToggleComplete(show)} style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: show.completed ? 'none' : '1.5px solid #e8e2d9', background: show.completed ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {show.completed && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          <div style={{ fontSize: 14, fontWeight: 500, color: show.completed ? '#6b6b6b' : '#1a1a1a', textDecoration: show.completed ? 'line-through' : 'none' }}>
            Show #{index + 1}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>
            {fmtShort(show.show_date)}{fmtTime(show.show_time) ? ` · ${fmtTime(show.show_time)}` : ''}
          </div>
        </div>
        <svg onClick={() => setOpen(o => !o)} width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ cursor: 'pointer', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#6b6b6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div onClick={() => onDelete(show.id)} style={{ cursor: 'pointer', color: '#6b6b6b', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = '#6b6b6b'}
        >×</div>
      </div>
      <div style={{ maxHeight: open ? 100 : 0, opacity: open ? 1 : 0, overflow: 'hidden', marginTop: open ? 12 : 0, transition: 'max-height 0.25s ease, opacity 0.2s ease, margin-top 0.25s ease' }}>
        <textarea
          placeholder="Notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => onSaveNotes(show.id, notes)}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 10px', borderRadius: 7, border: '1px solid #d4cfc8', background: '#ffffff', color: '#1a1a1a', caretColor: '#0a1628', outline: 'none', width: '100%', height: 70, resize: 'none' }}
        />
      </div>
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
  const [newShow, setNewShow] = useState({ show_date: '', show_time: '', notes: '' })
  const [saving, setSaving] = useState(false)

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

  const handleAddShow = async () => {
    if (!newShow.show_date) return
    setSaving(true)
    const supabase = getSupabase()
    const { data, error } = await supabase.from('show_list').insert([{
      event_id: eventId,
      show_date: newShow.show_date,
      show_time: newShow.show_time || null,
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
      setNewShow({ show_date: '', show_time: '', notes: '' })
      setAddingShow(false)
    }
    setSaving(false)
  }

  const handleSaveShowNotes = async (showId, notes) => {
    const supabase = getSupabase()
    await supabase.from('show_list').update({ notes }).eq('id', showId)
    setShows(prev => prev.map(s => s.id === showId ? { ...s, notes } : s))
  }

  const handleToggleComplete = async (show) => {
    const supabase = getSupabase()
    await supabase.from('show_list').update({ completed: !show.completed }).eq('id', show.id)
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

  const handleDeleteEvent = async () => {
    if (!confirm('Delete this event and all its shows? This cannot be undone.')) return
    const supabase = getSupabase()
    await supabase.from('events').delete().eq('id', eventId)
    router.push(`/tours/${id}`)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!event) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28, color: 'var(--text-muted)', fontSize: 14 }}>Event not found.</div>
    </div>
  )

  const color = tour?.color || '#C9A84C'
  const tabs = ['Overview', 'Shows', 'Staffing', 'Travel & Hotel', 'Schedule', 'Tasks', 'Notes', 'Files']

  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }) : '—'

  const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  }) : '—'

  const fmtTime = (t) => {
    if (!t) return null
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  const daysUntil = event.load_in_date
    ? Math.ceil((new Date(event.load_in_date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const completedShows = shows.filter(s => s.completed).length

  const inputStyle = {
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 7,
    border: '1px solid #d4cfc8',
    background: '#ffffff',
    color: '#1a1a1a',
    caretColor: '#0a1628',
    outline: 'none',
  }

  const statCard = (value, label, sub, valueColor, onClick) => (
    <div
      className="glass-card"
      onClick={onClick}
      style={{ padding: '18px 20px', flex: 1, cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = '#f0ece4' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = '#faf8f4' }}
    >
      <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: valueColor || '#1a1a1a' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 3 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Event header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => router.push(`/tours/${id}`)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ← {tour?.name || 'Tour'}
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff' }}>
                    {event.city}{event.country && `, ${event.country}`}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
                    color: event.status === 'confirmed' ? '#15803d' : '#854d0e',
                    background: event.status === 'confirmed' ? '#dcfce7' : '#fef9c3',
                    border: `1px solid ${event.status === 'confirmed' ? '#86efac' : '#fde68a'}`,
                  }}>
                    {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                  {event.venue_name && `${event.venue_name} · `}
                  {fmt(event.load_in_date)}
                  {shows.length > 0 && ` · ${shows.length} ${shows.length === 1 ? 'show' : 'shows'}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDeleteEvent} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid rgba(255,51,51,0.3)', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                Delete Event
              </button>
              <button
                onClick={() => router.push(`/tours/${id}/events/${eventId}/edit`)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Edit Event
              </button>
            </div>
          </div>

          <div style={{ height: 3, background: color, borderRadius: 2 }} />

          <div style={{ display: 'flex' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.toLowerCase()
              return (
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, fontWeight: active ? 500 : 400, padding: '12px 18px', border: 'none', background: 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab}
                  {tab === 'Shows' && shows.length > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>({shows.length})</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', width: '100%', padding: '28px 32px' }}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Stat tiles — venue tile clickable if linked */}
              <div style={{ display: 'flex', gap: 14 }}>
                {statCard(
                  daysUntil === null ? '—' : daysUntil <= 0 ? 'Now' : daysUntil,
                  daysUntil !== null && daysUntil <= 0 ? 'Event in progress' : 'Days to Load-In',
                  daysUntil !== null && daysUntil > 0 ? `Load-In ${fmtShort(event.load_in_date)}` : null,
                  daysUntil !== null && daysUntil <= 7 ? 'var(--red)' : daysUntil !== null && daysUntil <= 30 ? 'var(--yellow)' : 'var(--mint)'
                )}
                {statCard(shows.length, 'Shows', shows.length > 0 ? `${completedShows} complete` : 'None added yet', '#1a1a1a')}
                {statCard(
                  event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative',
                  'Booking Status', null,
                  STATUS_TEXT_COLORS[event.status] || STATUS_TEXT_COLORS.tentative
                )}
                {statCard(
                  event.venue_name || 'TBC',
                  'Venue',
                  venue ? [venue.city, venue.country].filter(Boolean).join(', ') : event.city || null,
                  '#1a1a1a',
                  venue ? () => router.push(`/venues/${venue.id}`) : null
                )}
              </div>

              {/* Two column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Show dates */}
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Show Dates</div>
                    <div
                      onClick={() => setActiveTab('shows')}
                      style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#e8faf2', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#e8faf2'}
                    >
                      {shows.length > 0 ? 'Manage →' : '+ Add Shows'}
                    </div>
                  </div>
                  {shows.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#6b6b6b' }}>No shows added yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {shows.map((show, i) => (
                        <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div onClick={() => handleToggleComplete(show)} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: show.completed ? '#16a34a' : 'transparent', border: show.completed ? 'none' : '1.5px solid #e8e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                            {show.completed && (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: show.completed ? '#6b6b6b' : '#1a1a1a', textDecoration: show.completed ? 'line-through' : 'none' }}>
                            Show #{i + 1} — {fmtShort(show.show_date)}{fmtTime(show.show_time) ? ` · ${fmtTime(show.show_time)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outstanding items */}
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: '#1a1a1a' }}>Outstanding Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {shows.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7V10" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="13" r="0.75" fill="#d97706"/></svg>
                        <div style={{ fontSize: 13, color: '#6b6b6b' }}>No show dates added</div>
                      </div>
                    )}
                    {!event.venue_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7V10" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="13" r="0.75" fill="#d97706"/></svg>
                        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Venue not confirmed</div>
                      </div>
                    )}
                    {shows.length > 0 && event.venue_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 13, color: '#6b6b6b' }}>All clear — nothing outstanding</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Venue information card */}
              {venue && (
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Venue Information</div>
                    <div
                      onClick={() => router.push(`/venues/${venue.id}`)}
                      style={{ fontSize: 12, color: 'var(--mint)', cursor: 'pointer' }}
                    >
                      Full Profile →
                    </div>
                  </div>

                  {/* Address + specs side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Address</div>
                      <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.6 }}>
                        {venue.address && <>{venue.address}<br /></>}
                        {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      {venue.floor_size && (
                        <div>
                          <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Floor Size</div>
                          <div style={{ fontSize: 14, color: '#1a1a1a' }}>{venue.floor_size}</div>
                        </div>
                      )}
                      {venue.max_height && (
                        <div>
                          <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Max Height</div>
                          <div style={{ fontSize: 14, color: '#1a1a1a' }}>{venue.max_height}</div>
                        </div>
                      )}
                      {venue.union_status && (
                        <div>
                          <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Union</div>
                          <div style={{ fontSize: 14, color: '#1a1a1a' }}>{venue.union_status}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contacts — always shown if they exist */}
                  {venueContacts.length > 0 && (
                    <>
                      <div style={{ height: 0.5, background: '#e8e2d9', marginBottom: 16 }} />
                      <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Contacts</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {venueContacts.map(contact => (
                          <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                              {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                                {contact.name}
                                {contact.title && <span style={{ fontSize: 12, color: '#6b6b6b', fontWeight: 400, marginLeft: 6 }}>{contact.title}</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                                {contact.phone && <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.phone}</a>}
                                {contact.email && <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: 'var(--mint)', textDecoration: 'none' }}>{contact.email}</a>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          )}

          {/* SHOWS */}
          {activeTab === 'shows' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, maxWidth: 600 }}>
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
                      <label style={{ fontSize: 12, color: '#6b6b6b', display: 'block', marginBottom: 5 }}>Show Date *</label>
                      <input type="date" style={{ ...inputStyle, width: '100%' }} value={newShow.show_date} onChange={e => setNewShow(p => ({ ...p, show_date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#6b6b6b', display: 'block', marginBottom: 5 }}>Show Time</label>
                      <input type="time" style={{ ...inputStyle, width: '100%' }} value={newShow.show_time} onChange={e => setNewShow(p => ({ ...p, show_time: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#6b6b6b', display: 'block', marginBottom: 5 }}>Notes</label>
                    <input type="text" style={{ ...inputStyle, width: '100%' }} placeholder="Optional notes..." value={newShow.notes} onChange={e => setNewShow(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setAddingShow(false); setNewShow({ show_date: '', show_time: '', notes: '' }) }}
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
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
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                  {shows.map((show, i) => (
                    <ShowTile
                      key={show.id}
                      show={show}
                      index={i}
                      fmtShort={fmtShort}
                      fmtTime={fmtTime}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDeleteShow}
                      onSaveNotes={handleSaveShowNotes}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'staffing' && (
            <StaffingTab eventId={eventId} event={event} />
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