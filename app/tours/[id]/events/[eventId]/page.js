'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../../../components/TopNav'
import { getSupabase } from '../../../../../lib/supabase'
import StaffingTab from '../../../../../components/StaffingTab'
import TravelHotelTab from '../../../../../components/TravelHotelTab'

export default function EventPage() {
  const router = useRouter()
  const { id, eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [tour, setTour] = useState(null)
  const [shows, setShows] = useState([])
  const [venue, setVenue] = useState(null)
  const [venueContacts, setVenueContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [addingShow, setAddingShow] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
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

  const handleSaveEdit = async (showId) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('show_list').update({
      show_date: editForm.show_date,
      show_time: editForm.show_time || null,
      notes: editForm.notes || null,
    }).eq('id', showId)
    if (!error) {
      setShows(prev => prev.map(s => s.id === showId ? { ...s, ...editForm } : s)
        .sort((a, b) => new Date(`${a.show_date}T${a.show_time || '00:00'}`) - new Date(`${b.show_date}T${b.show_time || '00:00'}`)))
        setEditingId(null)
    }
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
    fontFamily: 'Rubik, sans-serif',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 7,
    border: '0.5px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const statCard = (value, label, sub, valueColor, onClick) => (
    <div
      className="glass-card"
      onClick={onClick}
      style={{ padding: '18px 20px', flex: 1, cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--glass-hover)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = 'var(--glass-bg)' }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: valueColor || 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
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
              <button onClick={() => router.push(`/tours/${id}`)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ← {tour?.name || 'Tour'}
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>
                    {event.city}{event.country && `, ${event.country}`}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
                    color: event.status === 'confirmed' ? '#33FF99' : '#FFCC00',
                    background: event.status === 'confirmed' ? 'rgba(51,255,153,0.1)' : 'rgba(255,204,0,0.1)',
                    border: `0.5px solid ${event.status === 'confirmed' ? 'rgba(51,255,153,0.35)' : 'rgba(255,204,0,0.35)'}`,
                  }}>
                    {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  {event.venue_name && `${event.venue_name} · `}
                  {fmt(event.load_in_date)}
                  {shows.length > 0 && ` · ${shows.length} ${shows.length === 1 ? 'show' : 'shows'}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDeleteEvent} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid rgba(255,51,51,0.3)', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                Delete Event
              </button>
              <button onClick={() => router.push(`/tours/${id}/events/${eventId}/edit`)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Edit Event
              </button>
            </div>
          </div>

          <div style={{ height: 3, background: color, borderRadius: 2 }} />

          <div style={{ display: 'flex' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.toLowerCase()
              return (
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, fontWeight: active ? 500 : 400, padding: '12px 18px', border: 'none', background: 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>

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
                {statCard(shows.length, 'Shows', shows.length > 0 ? `${completedShows} complete` : 'None added yet', shows.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)')}
                {statCard(
                  event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative',
                  'Booking Status', null,
                  event.status === 'confirmed' ? 'var(--mint)' : event.status === 'cancelled' ? 'var(--red)' : 'var(--yellow)'
                )}
                {statCard(
                  event.venue_name || 'TBC',
                  'Venue',
                  venue ? [venue.city, venue.country].filter(Boolean).join(', ') : event.city || null,
                  event.venue_name ? 'var(--text-primary)' : 'var(--text-muted)',
                  venue ? () => router.push(`/venues/${venue.id}`) : null
                )}
              </div>

              {/* Two column layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Show dates */}
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Show Dates</div>
                    <div onClick={() => setActiveTab('shows')} style={{ fontSize: 12, color: 'var(--mint)', cursor: 'pointer' }}>
                      {shows.length > 0 ? 'Manage →' : '+ Add Shows'}
                    </div>
                  </div>
                  {shows.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No shows added yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {shows.map((show, i) => (
                        <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div onClick={() => handleToggleComplete(show)} style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: show.completed ? 'var(--mint)' : 'transparent', border: show.completed ? 'none' : '1.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                            {show.completed && (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: show.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: show.completed ? 'line-through' : 'none' }}>
                            Show #{i + 1} — {fmtShort(show.show_date)}{fmtTime(show.show_time) ? ` · ${fmtTime(show.show_time)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outstanding items */}
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Outstanding Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {shows.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFCC00" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7V10" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="13" r="0.75" fill="#FFCC00"/></svg>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No show dates added</div>
                      </div>
                    )}
                    {!event.venue_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFCC00" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7V10" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="13" r="0.75" fill="#FFCC00"/></svg>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Venue not confirmed</div>
                      </div>
                    )}
                    {shows.length > 0 && event.venue_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>All clear — nothing outstanding</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Venue information card */}
              {venue && (
                <div className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Venue Information</div>
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Address</div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {venue.address && <>{venue.address}<br /></>}
                        {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      {venue.floor_size && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Floor Size</div>
                          <div style={{ fontSize: 14 }}>{venue.floor_size}</div>
                        </div>
                      )}
                      {venue.max_height && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Max Height</div>
                          <div style={{ fontSize: 14 }}>{venue.max_height}</div>
                        </div>
                      )}
                      {venue.union_status && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Union</div>
                          <div style={{ fontSize: 14 }}>{venue.union_status}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contacts — always shown if they exist */}
                  {venueContacts.length > 0 && (
                    <>
                      <div style={{ height: 0.5, background: 'var(--glass-border)', marginBottom: 16 }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Contacts</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {venueContacts.map(contact => (
                          <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                              {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>
                                {contact.name}
                                {contact.title && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{contact.title}</span>}
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
            <div style={{ maxWidth: 600 }}>
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
                <div className="glass-card" style={{ padding: '18px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Show Date *</label>
                      <input type="date" style={{ ...inputStyle, width: '100%' }} value={newShow.show_date} onChange={e => setNewShow(p => ({ ...p, show_date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Show Time</label>
                      <input type="time" style={{ ...inputStyle, width: '100%' }} value={newShow.show_time} onChange={e => setNewShow(p => ({ ...p, show_time: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                    <input type="text" style={{ ...inputStyle, width: '100%' }} placeholder="Optional notes..." value={newShow.notes} onChange={e => setNewShow(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setAddingShow(false); setNewShow({ show_date: '', show_time: '', notes: '' }) }} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {shows.map((show, i) => (
                    <div key={show.id}>
                      {editingId === show.id ? (
                        <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Show Date</label>
                              <input type="date" style={{ ...inputStyle, width: '100%' }} value={editForm.show_date || ''} onChange={e => setEditForm(p => ({ ...p, show_date: e.target.value }))} />
                            </div>
                            <div>
                              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Show Time</label>
                              <input type="time" style={{ ...inputStyle, width: '100%' }} value={editForm.show_time || ''} onChange={e => setEditForm(p => ({ ...p, show_time: e.target.value }))} />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                            <input type="text" style={{ ...inputStyle, width: '100%' }} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingId(null)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                            <button className="btn-primary" onClick={() => handleSaveEdit(show.id)}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div onClick={() => handleToggleComplete(show)} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: show.completed ? 'none' : '1.5px solid var(--glass-border)', background: show.completed ? 'var(--mint)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                            {show.completed && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28, flexShrink: 0 }}>#{i + 1}</div>
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setEditingId(show.id); setEditForm({ show_date: show.show_date, show_time: show.show_time || '', notes: show.notes || '' }) }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: show.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: show.completed ? 'line-through' : 'none' }}>
                              {fmt(show.show_date)}
                              {fmtTime(show.show_time) && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>{fmtTime(show.show_time)}</span>}
                            </div>
                            {show.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{show.notes}</div>}
                          </div>
                          <div onClick={() => handleDeleteShow(show.id)} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >×</div>
                        </div>
                      )}
                    </div>
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

          {activeTab !== 'overview' && activeTab !== 'shows' && activeTab !== 'staffing' && activeTab !== 'travel & hotel' && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}