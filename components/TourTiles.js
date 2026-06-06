'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

export default function TourTiles() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { fetchTours() }, [])

  const fetchTours = async () => {
    const supabase = getSupabase()
    const { data: toursData, error } = await supabase
      .from('tours')
      .select('id, name, region, year, color, status, director_name')
      .eq('status', 'active')
      .order('year', { ascending: true })

    if (error || !toursData) { setLoading(false); return }

    const now = new Date()

    const enriched = await Promise.all(toursData.map(async (tour) => {
      const { data: events } = await supabase
        .from('events')
        .select('id, city, load_in_date, status')
        .eq('tour_id', tour.id)
        .order('load_in_date', { ascending: true })

      const totalEvents = events?.length ?? 0
      const completedEvents = events?.filter(e => new Date(e.load_in_date) < now).length ?? 0
      const nextEvent = events?.find(e => new Date(e.load_in_date) >= now)

      const nameParts = (tour.director_name || '').trim().split(' ')
      const initials = nameParts.length >= 2
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
        : (nameParts[0]?.[0] ?? '?')

      const nextLabel = nextEvent
        ? `${nextEvent.city} · ${new Date(nextEvent.load_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'No upcoming events'

      // Get shows for the next upcoming event
      let upcomingShows = []
      let activeEventId = null
      if (nextEvent) {
        activeEventId = nextEvent.id
        const { data: shows } = await supabase
          .from('show_list')
          .select('id, show_date, show_time, completed')
          .eq('event_id', nextEvent.id)
          .order('show_date', { ascending: true }).order('show_time', { ascending: true })
        upcomingShows = shows || []
      }

      return {
        ...tour,
        total: totalEvents,
        completed: completedEvents,
        directorInitials: initials.toUpperCase(),
        nextEvent: nextLabel,
        activeEventId,
        upcomingShows,
      }
    }))

    setTours(enriched)
    setLoading(false)
  }

  const handleToggleShow = async (e, tourId, showId, currentCompleted) => {
    e.preventDefault()
    e.stopPropagation()
    const supabase = getSupabase()
    await supabase.from('show_list').update({ completed: !currentCompleted }).eq('id', showId)
    setTours(prev => prev.map(t => {
      if (t.id !== tourId) return t
      return {
        ...t,
        upcomingShows: t.upcomingShows.map(s =>
          s.id === showId ? { ...s, completed: !s.completed } : s
        )
      }
    }))
  }

  const fmtShort = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const fmtTime = (t) => {
    if (!t) return null
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  if (loading) return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Active Tours</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!tours.length) return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Active Tours</div>
      <div className="glass-card" style={{ padding: '20px 22px', color: 'var(--text-muted)', fontSize: 14 }}>
        No active tours. <span style={{ color: 'var(--mint)', cursor: 'pointer' }} onClick={() => router.push('/tours/new')}>Create one →</span>
      </div>
    </div>
  )

  const renderTile = (tour) => {
    const pct = tour.total > 0 ? Math.round((tour.completed / tour.total) * 100) : 0
    const remaining = tour.total - tour.completed
    const tileColor = tour.color || 'var(--mint)'

    return (
      <div
        key={tour.id}
        className="glass-card"
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{ padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tileColor, borderRadius: '14px 14px 0 0' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{tour.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {tour.region ? `${tour.region} · ` : ''}{tour.year}
            </div>
          </div>
          <span className="badge badge-active" style={{ marginLeft: 8, flexShrink: 0 }}>Active</span>
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
          {[
            { val: tour.total, lbl: 'Total' },
            { val: tour.completed, lbl: 'Done', color: 'var(--mint)' },
            { val: remaining, lbl: 'Left' },
          ].map(item => (
            <div key={item.lbl}>
              <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 0.5, background: 'var(--glass-border)', marginBottom: 16 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: tileColor, borderRadius: 2 }} />
        </div>

        {/* Shows list with clickable checkboxes */}
        {tour.upcomingShows.length > 0 && (
          <>
            <div style={{ height: 0.5, background: 'var(--glass-border)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} onClick={e => { e.preventDefault(); e.stopPropagation() }}></div>
              {tour.upcomingShows.map((show, i) => (
                <div
                  key={show.id}
                  onClick={(e) => handleToggleShow(e, tour.id, show.id, show.completed)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: show.completed ? 'var(--mint)' : 'transparent',
                    border: show.completed ? 'none' : '1.5px solid var(--glass-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {show.completed && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: show.completed ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: show.completed ? 'line-through' : 'none' }}>
                    Show #{i + 1} — {fmtShort(show.show_date)}{fmtTime(show.show_time) ? ` · ${fmtTime(show.show_time)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${tileColor}22`, border: `0.5px solid ${tileColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: tileColor, flexShrink: 0 }}>
              {tour.directorInitials}
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{tour.director_name || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--text-muted)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
            {tour.nextEvent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Tours</div>
        <div style={{ fontSize: 14, color: 'var(--mint)', cursor: 'pointer' }} onClick={() => router.push('/tours')}>All Tours →</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {tours.map(renderTile)}
      </div>
    </div>
  )
}