'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TopNav from '../../../components/TopNav'
import { getSupabase } from '../../../lib/supabase'

const STATUS_STYLES = {
  confirmed: { color: '#33FF99', background: 'rgba(51,255,153,0.1)', border: 'rgba(51,255,153,0.35)' },
  tentative: { color: '#FF69B4', background: 'rgba(255,105,180,0.1)', border: 'rgba(255,105,180,0.35)' },
  '1-hold': { color: '#FFCC00', background: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.35)' },
  '2-hold': { color: '#FF8C00', background: 'rgba(255,140,0,0.1)', border: 'rgba(255,140,0,0.35)' },
  '3-hold': { color: '#FF3333', background: 'rgba(255,51,51,0.1)', border: 'rgba(255,51,51,0.35)' },
  cancelled: { color: '#888', background: 'rgba(136,136,136,0.1)', border: 'rgba(136,136,136,0.35)' },
}

const COLS = [
  { key: 'showDates', label: 'Show Dates', width: '175px', align: 'left' },
  { key: 'city', label: 'City', width: '250px', align: 'left' },
  { key: 'venue', label: 'Venue', width: '250px', align: 'left' },
  { key: 'shows', label: 'Shows', width: '100px', align: 'center' },
  { key: 'status', label: 'Status', width: '150px', align: 'center' },
  { key: 'loadIn', label: 'Load-In', width: '125px', align: 'center' },
  { key: 'loadOut', label: 'Load-Out', width: '125px', align: 'center' },
  { key: 'alert', label: '', width: '50px', align: 'center' },
]

const GRID_TEMPLATE = COLS.map(c => c.width).join(' ')

export default function TourPage() {
  const router = useRouter()
  const { id } = useParams()
  const [tour, setTour] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [tourRes, eventsRes] = await Promise.all([
        supabase.from('tours').select('*').eq('id', id).single(),
        supabase.from('events').select('*').eq('tour_id', id).order('load_in_date', { ascending: true }),
      ])
      if (!tourRes.error) setTour(tourRes.data)
      if (!eventsRes.error) setEvents(eventsRes.data)
      setLoading(false)
    }
    fetchData()
  }, [id])

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
  const tabs = ['Events', 'Staffing', 'Travel', 'Schedule', 'Venues', 'Files', 'Notes']
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Tour header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => router.push('/tours')} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
              <button onClick={() => router.push(`/tours/${id}/edit`)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, fontWeight: active ? 500 : 400, padding: '14px 18px', border: 'none', background: 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s' }}>
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'events' && (
            <>
              {/* Sticky header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)' }}>
                <div style={{ padding: '14px 24px 6px', fontSize: 15, fontWeight: 600 }}>
                  Events <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({events.length})</span>
                </div>
                {events.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: '0 16px', padding: '6px 24px 10px' }}>
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
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.05)"/>
                    <rect x="10" y="13" width="20" height="17" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                    <path d="M15 10V15M25 10V15M10 19H30" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add your first event to this tour</div>
                  <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>+ Add Event</button>
                </div>
              )}

              {/* Event rows */}
              {events.length > 0 && (
                <div>
                  {events.map((event, i) => {
                    const s = STATUS_STYLES[event.status] || STATUS_STYLES.tentative
                    return (
                      <div
                        key={event.id}
                        onClick={() => router.push(`/tours/${id}/events/${event.id}`)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: GRID_TEMPLATE,
                          gap: '0 16px',
                          padding: '13px 24px',
                          cursor: 'pointer',
                          borderBottom: '0.5px solid var(--glass-border)',
                          transition: 'background 0.15s',
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Show Dates */}
                        <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>TBC</div>

                        {/* City */}
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.city}{event.country && `, ${event.country}`}
                        </div>

                        {/* Venue */}
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.venue_name || 'TBC'}
                        </div>

                        {/* # Shows */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>{event.num_shows || '—'}</div>
                        </div>

                        {/* Status */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: s.color, background: s.background, border: `0.5px solid ${s.border}`, whiteSpace: 'nowrap' }}>
                            {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative'}
                          </div>
                        </div>

                        {/* Load-In */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{fmt(event.load_in_date)}</div>
                        </div>

                        {/* Load-Out */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{fmt(event.load_out_date)}</div>
                        </div>

                        {/* Alert */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {event.status !== 'confirmed' && (
                            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                              <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFCC00" strokeWidth="1.5" strokeLinejoin="round"/>
                              <path d="M9 7V10" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round"/>
                              <circle cx="9" cy="13" r="0.75" fill="#FFCC00"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeTab !== 'events' && (
            <div style={{ padding: '28px', fontSize: 14, color: 'var(--text-muted)' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}