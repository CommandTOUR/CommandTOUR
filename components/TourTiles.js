'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { getEventCompletionDate } from '../lib/eventDates'

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

    const today = new Date().toISOString().split('T')[0]

    const enriched = await Promise.all(toursData.map(async (tour) => {
      const { data: events } = await supabase
        .from('events')
        .select('id, city, load_in_date, load_out_date, status, num_shows, saturday_date, sunday_date')
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

      const nameParts = (tour.director_name || '').trim().split(' ')
      const initials = nameParts.length >= 2
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
        : (nameParts[0]?.[0] ?? '?')

      const nextLabel = nextEvent
        ? `${nextEvent.city} · ${new Date(nextEvent.load_in_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'No upcoming events'

      return {
        ...tour,
        total: totalEvents,
        completed: completedEvents,
        directorInitials: initials.toUpperCase(),
        nextEvent: nextLabel,
      }
    }))

    setTours(enriched)
    setLoading(false)
  }

  if (loading) return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>Active Tours</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  if (!tours.length) return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>Active Tours</div>
      <div className="glass-card" style={{ padding: '20px 22px', color: '#6b6b6b', fontSize: 14 }}>
        No active tours. <span style={{ color: '#0a1628', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/tours/new')}>Create one</span>
      </div>
    </div>
  )

  const renderTile = (tour) => {
    const pct = tour.total > 0 ? Math.round((tour.completed / tour.total) * 100) : 0
    const remaining = tour.total - tour.completed
    const tileColor = tour.color || '#33FF99'

    return (
      <div
        key={tour.id}
        className="glass-card"
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{ padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'background 0.15s, box-shadow 0.15s', borderTop: 'none', borderLeft: '1px solid #e8e2d9', borderRight: '1px solid #e8e2d9', borderBottom: '1px solid #e8e2d9' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f0ece4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: tileColor }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: '#1a1a1a' }}>{tour.name}</div>
            <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 3 }}>
              {tour.region ? `${tour.region} · ` : ''}{tour.year}
            </div>
          </div>
          <span className="badge badge-active" style={{ marginLeft: 8, flexShrink: 0 }}>Active</span>
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
          {[
            { val: tour.total, lbl: 'Total', color: '#1a1a1a' },
            { val: tour.completed, lbl: 'Done', color: '#15803d' },
            { val: remaining, lbl: 'Left', color: '#1a1a1a' },
          ].map(item => (
            <div key={item.lbl}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 11, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#e8e2d9', marginBottom: 16 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: '#6b6b6b' }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: '#e8e2d9', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: tileColor, borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${tileColor}22`, border: `1px solid ${tileColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: tileColor, flexShrink: 0 }}>
              {tour.directorInitials}
            </div>
            <span style={{ fontSize: 13, color: '#6b6b6b' }}>{tour.director_name || '—'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Active Tours</div>
        <div style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer', fontWeight: 500 }} onClick={() => router.push('/tours')}>All Tours →</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {tours.map(renderTile)}
      </div>
    </div>
  )
}
