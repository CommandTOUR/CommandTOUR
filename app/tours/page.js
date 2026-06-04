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
      const { data, error } = await supabase
        .from('tours')
        .select('*')
      if (!error) {
        const sorted = [...data].sort((a, b) => {
          const sa = STATUS_ORDER[a.status] ?? 1
          const sb = STATUS_ORDER[b.status] ?? 1
          if (sa !== sb) return sa - sb
          return (a.year || 9999) - (b.year || 9999)
        })
        setTours(sorted)
      }
      setLoading(false)
    }
    fetchTours()
  }, [])

  const activeTours = tours.filter(t => t.status === 'active' || t.status === 'upcoming')
  const archivedTours = tours.filter(t => t.status === 'completed' || t.status === 'cancelled')

  const renderCard = (tour) => {
    const color = tour.color || '#C9A84C'
    return (
      <div
        key={tour.id}
        className="glass-card"
        onClick={() => router.push(`/tours/${tour.id}`)}
        style={{ padding: '20px 22px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{tour.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {tour.region}{tour.year && ` · ${tour.year}`}
            </div>
          </div>
          <span className={`badge badge-${tour.status || 'upcoming'}`}>
            {tour.status ? tour.status.charAt(0).toUpperCase() + tour.status.slice(1) : 'Upcoming'}
          </span>
        </div>
        <div style={{ height: 0.5, background: 'var(--glass-border)', margin: '12px 0' }} />
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {tour.type || 'Tour'}{tour.director_name ? ` · ${tour.director_name}` : ''}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        {/* Header */}
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
            {activeTours.map(renderCard)}
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
                {archivedTours.map(renderCard)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}