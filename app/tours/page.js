'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { getEventCompletionDate } from '../../lib/eventDates'
import { formatLocation } from '@/lib/locationFormat'

const STATUS_ORDER = { active: 0, upcoming: 1, completed: 2, cancelled: 3 }

const CATEGORY_SECTIONS = [
  { key: 'domestic', label: 'Domestic' },
  { key: 'international', label: 'International' },
  { key: 'uncategorized', label: 'Uncategorized' },
]

function getTourCategory(tour) {
  if (tour.tour_category === 'domestic') return 'domestic'
  if (tour.tour_category === 'international') return 'international'
  return 'uncategorized'
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Tours() {
  const router = useRouter()
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({ domestic: true, international: true, uncategorized: true })

  useEffect(() => {
    const fetchTours = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('tours').select('*')

      if (!error) {
        const today = new Date().toISOString().split('T')[0]

        const enriched = await Promise.all(data.map(async (tour) => {
          const { data: events } = await supabase
            .from('events')
            .select('id, city, state, country, load_in_date, num_shows, saturday_date, sunday_date')
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

  const sections = CATEGORY_SECTIONS
    .map(s => ({ ...s, tours: tours.filter(t => getTourCategory(t) === s.key) }))
    .filter(s => s.tours.length > 0)

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const statusBadgeClass = (status) => {
    if (status === 'active') return 'badge badge-active'
    if (status === 'upcoming') return 'badge badge-upcoming'
    if (status === 'completed') return 'badge badge-completed'
    if (status === 'cancelled') return 'badge badge-cancelled'
    return 'badge badge-upcoming'
  }

  const renderTile = (tour) => {
    const pct = tour.total > 0 ? Math.round((tour.completed / tour.total) * 100) : 0
    const remaining = tour.total - tour.completed
    const tileColor = tour.color || '#33FF99'
    const statusLabel = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }[tour.status] || tour.status
    const hasDirector = tour.director_name && tour.director_name.trim() && tour.director_name.trim() !== 'N/A'

    return (
      <div
        key={tour.id}
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{
          padding: '14px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.3)',
          borderRadius: 12,
          border: `2.5px solid ${tileColor}`,
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
            <div style={{ fontSize: 13, color: '#B8C2CC', marginTop: 3 }}>
              {tour.year}{hasDirector ? ` · ${tour.director_name}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#8B96A8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <span className={statusBadgeClass(tour.status)}>{statusLabel}</span>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: '#B8C2CC' }}>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88 }}>

        <div style={{ position: 'sticky', top: 88, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Tours</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                {tours.length} {tours.length === 1 ? 'tour' : 'tours'}
              </div>
            </div>
            <button className="btn-primary" onClick={() => router.push('/tours/new')}>+ New Tour</button>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading tours...</div>}

          {!loading && tours.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>No tours yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Create your first tour to get started</div>
              <button className="btn-primary" onClick={() => router.push('/tours/new')}>+ New Tour</button>
            </div>
          )}

          {!loading && sections.map(({ key, label, tours: sectionTours }) => (
            <div key={key} style={{ marginBottom: 32 }}>
              <div
                onClick={() => toggleSection(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: expanded[key] ? 16 : 0, userSelect: 'none' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  <ChevronIcon open={!!expanded[key]} />
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {sectionTours.length} {sectionTours.length === 1 ? 'tour' : 'tours'}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--border-card)', marginLeft: 4 }} />
              </div>

              {expanded[key] && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {sectionTours.map(renderTile)}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
