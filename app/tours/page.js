'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const STATUS_ORDER = { active: 0, upcoming: 1, completed: 2, cancelled: 3 }

export default function Tours() {
  const router = useRouter()
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    const fetchTours = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('tours').select('*')

      if (!error) {
        const enriched = await Promise.all(data.map(async (tour) => {
          const { data: events } = await supabase
            .from('events')
            .select('id, city, load_in_date, num_shows')
            .eq('tour_id', tour.id)
            .order('load_in_date', { ascending: true })

          const totalEvents = events?.length ?? 0

          const eventCompletions = await Promise.all((events || []).map(async (e) => {
            const { count } = await supabase
              .from('show_list')
              .select('id', { count: 'exact', head: true })
              .eq('event_id', e.id)
              .eq('completed', true)
            return { ...e, completedShows: count ?? 0 }
          }))

          const completedEvents = eventCompletions.filter(e => e.num_shows > 0 && e.completedShows >= e.num_shows).length
          const nextEvent = eventCompletions.find(e => !(e.num_shows > 0 && e.completedShows >= e.num_shows))
          const nameParts = (tour.director_name || '').trim().split(' ')
          const initials = nameParts.length >= 2
            ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
            : (nameParts[0]?.[0] ?? '?')

          const nextLabel = nextEvent
            ? `${nextEvent.city} · ${new Date(nextEvent.load_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'No upcoming events'

          return {
            ...tour,
            total: totalEvents,
            completed: completedEvents,
            directorInitials: initials.toUpperCase(),
            nextEvent: nextLabel,
          }
        }))

        enriched.sort((a, b) => {
          const sa = STATUS_ORDER[a.status] ?? 1
          const sb = STATUS_ORDER[b.status] ?? 1
          if (sa !== sb) return sa - sb
          return (a.year || 9999) - (b.year || 9999)
        })

        setTours(enriched)
      }
      setLoading(false)
    }
    fetchTours()
  }, [])

  const activeTours = tours.filter(t => t.status === 'active' || t.status === 'upcoming')
  const archivedTours = tours.filter(t => t.status === 'completed' || t.status === 'cancelled')

  const renderTile = (tour) => {
    const pct = tour.total > 0 ? Math.round((tour.completed / tour.total) * 100) : 0
    const remaining = tour.total - tour.completed
    const tileColor = tour.color || 'var(--mint)'
    const statusLabel = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }[tour.status] || tour.status

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
          <span className={`badge badge-${tour.status}`} style={{ marginLeft: 8, flexShrink: 0 }}>{statusLabel}</span>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>Tours</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {tours.length} {tours.length === 1 ? 'tour' : 'tours'}
            </div>
          </div>
          <button className="btn-primary" onClick={() => router.push('/tours/new')}>+ New Tour</button>
        </div>

        {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading tours...</div>}

        {!loading && tours.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No tours yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Create your first tour to get started</div>
            <button className="btn-primary" onClick={() => router.push('/tours/new')}>+ New Tour</button>
          </div>
        )}

        {/* Active + Upcoming */}
        {!loading && activeTours.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
            {activeTours.map(renderTile)}
          </div>
        )}

        {/* Archived — collapsible */}
        {!loading && archivedTours.length > 0 && (
          <div>
            <div
              onClick={() => setShowArchived(!showArchived)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: showArchived ? 16 : 0 }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {showArchived ? '▾' : '▸'} Completed & Cancelled ({archivedTours.length})
              </span>
            </div>
            {showArchived && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {archivedTours.map(renderTile)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}