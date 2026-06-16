'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { getEventCompletionDate } from '../lib/eventDates'

export default function TourTiles({ glassMorphism = false }) {
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
    const glass = glassMorphism

    // Full tour-color perimeter border — thicker at the top for emphasis
    const borderStyle = {
      borderTop: `3px solid ${tileColor}`,
      borderLeft: `1px solid ${tileColor}`,
      borderRight: `1px solid ${tileColor}`,
      borderBottom: `1px solid ${tileColor}`,
    }

    const glassShadow = '0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)'
    const glassShadowHover = '0 6px 28px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.12)'
    const solidShadow = '0 1px 4px rgba(0,0,0,0.06)'
    const solidShadowHover = '0 2px 8px rgba(0,0,0,0.1)'

    const surfaceStyle = glass
      ? { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: glassShadow }
      : { background: '#faf8f4', boxShadow: solidShadow }

    // Text / element colors per surface
    const nameColor = glass ? '#ffffff' : '#1a1a1a'
    const subColor = glass ? '#94a3b8' : '#6b6b6b'
    const labelColor = glass ? '#94a3b8' : '#6b6b6b'
    const totalColor = glass ? '#ffffff' : '#1a1a1a'
    const doneColor = glass ? '#33FF99' : '#15803d'
    const leftColor = glass ? '#ffffff' : '#1a1a1a'
    const dividerColor = glass ? 'rgba(255,255,255,0.15)' : '#e8e2d9'
    const progressLabelColor = glass ? '#94a3b8' : '#6b6b6b'
    const progressPctColor = glass ? '#ffffff' : '#1a1a1a'
    const trackColor = glass ? 'rgba(255,255,255,0.15)' : '#e8e2d9'
    const directorColor = glass ? '#e2e8f0' : '#6b6b6b'

    return (
      <div
        key={tour.id}
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{ padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: 12, transition: 'background 0.15s, box-shadow 0.15s', ...borderStyle, ...surfaceStyle }}
        onMouseEnter={e => { e.currentTarget.style.background = glass ? 'rgba(255,255,255,0.12)' : '#f0ece4'; e.currentTarget.style.boxShadow = glass ? glassShadowHover : solidShadowHover }}
        onMouseLeave={e => { e.currentTarget.style.background = glass ? 'rgba(255,255,255,0.08)' : '#faf8f4'; e.currentTarget.style.boxShadow = glass ? glassShadow : solidShadow }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: nameColor }}>{tour.name}</div>
            <div style={{ fontSize: 13, color: subColor, marginTop: 3 }}>
              {tour.region ? `${tour.region} · ` : ''}{tour.year}
            </div>
          </div>
          {glass ? (
            <span style={{ marginLeft: 8, flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20, textTransform: 'capitalize', background: 'rgba(51,255,153,0.15)', color: '#33FF99', border: '1px solid rgba(51,255,153,0.3)' }}>Active</span>
          ) : (
            <span className="badge badge-active" style={{ marginLeft: 8, flexShrink: 0 }}>Active</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
          {[
            { val: tour.total, lbl: 'Total', color: totalColor },
            { val: tour.completed, lbl: 'Done', color: doneColor },
            { val: remaining, lbl: 'Left', color: leftColor },
          ].map(item => (
            <div key={item.lbl}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 10, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: dividerColor, marginBottom: 16 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: progressLabelColor }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: progressPctColor }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: trackColor, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: tileColor, borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: glass ? 'rgba(255,255,255,0.12)' : `${tileColor}22`, border: glass ? 'none' : `1px solid ${tileColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: glass ? '#ffffff' : tileColor, flexShrink: 0 }}>
              {tour.directorInitials}
            </div>
            <span style={{ fontSize: 13, color: directorColor }}>{tour.director_name || '—'}</span>
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
