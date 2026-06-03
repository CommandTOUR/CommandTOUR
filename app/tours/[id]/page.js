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

const COL = {
  showDates: '140px',
  city: '220px',
  shows: '80px',
  status: '110px',
  loadIn: '90px',
  loadOut: '90px',
  alert: '28px',
}

function ColDivider() {
  return <div style={{ width: 0.5, height: 40, background: 'var(--glass-border)', flexShrink: 0 }} />
}

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

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `${COL.showDates} 1px ${COL.city} 1px ${COL.shows} 1px ${COL.status} 1px ${COL.loadIn} 1px ${COL.loadOut} ${COL.alert}`,
    alignItems: 'center',
    gap: '0 16px',
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      <div style={{ marginTop: 62, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Tour header */}
        <div style={{ borderBottom: '0.5px solid var(--glass-border)', padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => router.push('/tours')}
                style={{
                  fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '6px 12px',
                  borderRadius: 7, border: '0.5px solid var(--glass-border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                }}
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
                style={{
                  fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px',
                  borderRadius: 7, border: '0.5px solid var(--glass-border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                Edit Tour
              </button>
              <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>
                + Add Event
              </button>
            </div>
          </div>

          <div style={{ height: 3, background: color, borderRadius: 2 }} />

          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.toLowerCase()
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  style={{
                    fontFamily: 'Rubik, sans-serif', fontSize: 14,
                    fontWeight: active ? 500 : 400, padding: '14px 18px',
                    border: 'none', background: 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

              {/* Sticky header block */}
              <div style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg)',
                zIndex: 10,
                borderBottom: '0.5px solid var(--glass-border)',
              }}>
                <div style={{ padding: '16px 28px 10px' }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    Events <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({events.length})</span>
                  </div>
                </div>

                {events.length > 0 && (
                  <div style={{ ...gridStyle, padding: '0 28px 10px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Show Dates</div>
                    <div />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>City / Venue</div>
                    <div />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Shows</div>
                    <div />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Status</div>
                    <div />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Load-In</div>
                    <div />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Load-Out</div>
                    <div />
                  </div>
                )}
              </div>

              {/* Empty state */}
              {events.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '60px 0', gap: 14,
                }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.05)"/>
                    <rect x="10" y="13" width="20" height="17" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                    <path d="M15 10V15M25 10V15M10 19H30" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No events yet</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add your first event to this tour</div>
                  <button className="btn-primary" onClick={() => router.push(`/tours/${id}/events/new`)}>
                    + Add Event
                  </button>
                </div>
              )}

              {/* Event rows */}
              {events.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 28px 28px' }}>
                  {events.map(event => {
                    const statusStyle = STATUS_STYLES[event.status] || STATUS_STYLES.tentative
                    return (
                      <div
                        key={event.id}
                        className="glass-card"
                        onClick={() => router.push(`/tours/${id}/events/${event.id}`)}
                        style={{
                          ...gridStyle,
                          padding: '14px 20px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
                      >
                        {/* Show Dates */}
                        <div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>TBC</div>
                        </div>

                        <ColDivider />

                        {/* City + Venue */}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.city}{event.country && `, ${event.country}`}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.venue_name || 'Venue TBC'}
                          </div>
                        </div>

                        <ColDivider />

                        {/* # Shows */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{event.num_shows || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>shows</div>
                        </div>

                        <ColDivider />

                        {/* Status */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{
                            fontSize: 12, fontWeight: 500,
                            padding: '4px 12px', borderRadius: 20,
                            color: statusStyle.color,
                            background: statusStyle.background,
                            border: `0.5px solid ${statusStyle.border}`,
                          }}>
                            {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Tentative'}
                          </div>
                        </div>

                        <ColDivider />

                        {/* Load-In */}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>
                            {event.load_in_date ? new Date(event.load_in_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Load-In</div>
                        </div>

                        <ColDivider />

                        {/* Load-Out */}
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>
                            {event.load_out_date ? new Date(event.load_out_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Load-Out</div>
                        </div>

                        {/* Needs attention */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {event.status !== 'confirmed' && (
                            <div title="Needs attention">
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M9 2L16.5 15H1.5L9 2Z" stroke="#FFCC00" strokeWidth="1.5" strokeLinejoin="round"/>
                                <path d="M9 7V10" stroke="#FFCC00" strokeWidth="1.5" strokeLinecap="round"/>
                                <circle cx="9" cy="13" r="0.75" fill="#FFCC00"/>
                              </svg>
                            </div>
                          )}
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}

            </div>
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