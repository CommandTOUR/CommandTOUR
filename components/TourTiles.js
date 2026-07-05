'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { getEventCompletionDate } from '../lib/eventDates'
import { formatLocation } from '@/lib/locationFormat'

export default function TourTiles() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { fetchTours() }, [])

  const fetchTours = async () => {
    const supabase = getSupabase()
    const { data: toursData, error } = await supabase
      .from('tours')
      .select('id, name, region, year, color, status, director_name, logo_url')
      .eq('status', 'active')
      .order('year', { ascending: true })

    if (error || !toursData) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]

    const enriched = await Promise.all(toursData.map(async (tour) => {
      const { data: events } = await supabase
        .from('events')
        .select('id, city, state, country, load_in_date, load_out_date, status, num_shows, saturday_date, sunday_date')
        .eq('tour_id', tour.id)
        .order('load_in_date', { ascending: true })

      const totalEvents = events?.length ?? 0

      const eventCompletions = await Promise.all((events || []).map(async (e) => {
        const { data: shows } = await supabase
          .from('show_list')
          .select('show_date')
          .eq('event_id', e.id)
        const completionDate = getEventCompletionDate(e, shows)
        return { ...e, isPast: completionDate ? completionDate < today : false }
      }))

      const completedEvents = eventCompletions.filter(e => e.isPast).length
      const nextEvent = eventCompletions.find(e => !e.isPast)

      return {
        ...tour,
        total: totalEvents,
        completed: completedEvents,
        nextEvent: nextEvent || null,
      }
    }))

    setTours(enriched)
    setLoading(false)
  }

  if (loading) return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Active Tours</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!tours.length) return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>Active Tours</div>
      <div className="glass-card" style={{ padding: '20px 22px', color: 'var(--text-muted)', fontSize: 14 }}>
        No active tours. <span style={{ color: 'var(--color-mint)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/tours/new')}>Create one</span>
      </div>
    </div>
  )

  const renderTile = (tour) => {
    const pct = tour.total > 0 ? Math.round((tour.completed / tour.total) * 100) : 0
    const remaining = tour.total - tour.completed
    const tileColor = tour.color || '#33FF99'
    const hasDirector = tour.director_name && tour.director_name.trim() && tour.director_name.trim() !== 'N/A'

    return (
      <div
        key={tour.id}
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.3)',
          border: `2.5px solid ${tileColor}`,
          borderRadius: 10,
          boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)',
          transition: 'background 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
      >

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tour.name}</div>
            <div className="tile-sub1" style={{ fontSize: 13, marginTop: 3 }}>
              {tour.year}{hasDirector ? ` · ${tour.director_name}` : ''}
            </div>
            <div className="tile-sub2" style={{ fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tour.region}
            </div>
          </div>
          {tour.logo_url && (
            <img src={tour.logo_url} alt={tour.name} style={{ height: 52, width: 'auto', maxWidth: 70, objectFit: 'contain', flexShrink: 0 }} />
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, marginBottom: 14 }}>
          {[
            { val: tour.total, lbl: 'Total', color: 'var(--text-primary)' },
            { val: tour.completed, lbl: 'Done', color: 'var(--color-mint)' },
            { val: remaining, lbl: 'Left', color: 'var(--text-primary)' },
          ].map(item => (
            <div key={item.lbl}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border-card)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: tileColor, borderRadius: 2 }} />
        </div>

        {/* Status pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 6, textTransform: 'capitalize', background: 'var(--color-mint-bg)', color: 'var(--color-mint)', border: '1px solid var(--color-mint-border)' }}>Active</span>
        </div>

        {/* Next event mini-tile */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (tour.nextEvent) router.push(`/tours/${tour.id}/events/${tour.nextEvent.id}`)
          }}
          style={{ background: 'var(--bg-card-hover)', border: `1px solid ${tileColor}`, borderRadius: 7, padding: '7px 10px', textAlign: 'center', cursor: tour.nextEvent ? 'pointer' : 'default' }}
          onMouseEnter={e => { if (tour.nextEvent) e.currentTarget.style.background = 'var(--bg-card)' }}
          onMouseLeave={e => { if (tour.nextEvent) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
        >
          {tour.nextEvent ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B96A8', marginBottom: 2 }}>Next Event</div>
              <div className="tile-next-event-text" style={{ fontSize: 13, fontWeight: 600 }}>
                {formatLocation(tour.nextEvent.city, tour.nextEvent.state, tour.nextEvent.country, 'compact')} · {new Date(tour.nextEvent.load_in_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No upcoming events</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Tours</div>
        <div style={{ fontSize: 13, color: 'var(--color-mint)', cursor: 'pointer', fontWeight: 500 }} onClick={() => router.push('/tours')}>All Tours →</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {tours.map(renderTile)}
      </div>
    </div>
  )
}
