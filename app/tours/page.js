'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'
import { getEventCompletionDate } from '../../lib/eventDates'

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
            .select('id, city, load_in_date, num_shows, saturday_date, sunday_date')
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

  const sections = CATEGORY_SECTIONS
    .map(s => ({ ...s, tours: tours.filter(t => getTourCategory(t) === s.key) }))
    .filter(s => s.tours.length > 0)

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
      <div style={{ marginTop: 62 }}>

        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>Tours</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>
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
              <div style={{ fontSize: 20, fontWeight: 600 }}>No tours yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Create your first tour to get started</div>
              <button className="btn-primary" onClick={() => router.push('/tours/new')}>+ New Tour</button>
            </div>
          )}

          {/* Category sections */}
          {!loading && sections.map(({ key, label, tours: sectionTours }) => (
            <div key={key} style={{ marginBottom: 32 }}>
              <div
                onClick={() => toggleSection(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: expanded[key] ? 16 : 0, userSelect: 'none' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  <ChevronIcon open={!!expanded[key]} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {sectionTours.length} {sectionTours.length === 1 ? 'tour' : 'tours'}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--glass-border)', marginLeft: 4 }} />
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