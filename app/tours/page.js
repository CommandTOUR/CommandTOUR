'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

export default function Tours() {
  const router = useRouter()
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTours = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setTours(data)
      setLoading(false)
    }
    fetchTours()
  }, [])

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
          <button className="btn-primary" onClick={() => router.push('/tours/new')}>
            + New Tour
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading tours...</div>
        )}

        {/* Empty state */}
        {!loading && tours.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 0', gap: 16,
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.05)"/>
              <path d="M16 32L20 20L28 26L32 16" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="24" cy="24" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
              <path d="M14 24H34M24 14V34" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No tours yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
              Create your first tour to get started
            </div>
            <button className="btn-primary" onClick={() => router.push('/tours/new')}>
              + New Tour
            </button>
          </div>
        )}

        {/* Tour grid */}
        {!loading && tours.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {tours.map(tour => {
              const color = tour.color || '#C9A84C'
              return (
                <div
                  key={tour.id}
                  className="glass-card"
                  onClick={() => router.push(`/tours/${tour.id}`)}
                  style={{
                    padding: '20px 22px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
                >
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: color, borderRadius: '14px 14px 0 0',
                  }} />
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
                    {tour.type || 'Tour'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}