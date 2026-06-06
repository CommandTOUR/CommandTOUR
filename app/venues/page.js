'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

export default function Venues() {
  const router = useRouter()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchVenues = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true })
      if (!error) setVenues(data)
      setLoading(false)
    }
    fetchVenues()
  }, [])

  const filtered = venues.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase()) ||
    v.country?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>Venues</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
            </div>
          </div>
          <button className="btn-primary" onClick={() => router.push('/venues/new')}>
            + Add Venue
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search venues by name, city, or country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            padding: '10px 16px',
            borderRadius: 8,
            border: '0.5px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            outline: 'none',
            width: '100%',
            maxWidth: 420,
            marginBottom: 24,
          }}
        />

        {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading venues...</div>}

        {/* Empty state */}
        {!loading && venues.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>No venues yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Add your first venue to build your database</div>
            <button className="btn-primary" onClick={() => router.push('/venues/new')}>+ Add Venue</button>
          </div>
        )}

        {/* No search results */}
        {!loading && venues.length > 0 && filtered.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No venues match "{search}"</div>
        )}

        {/* Venue grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(venue => (
              <div
                key={venue.id}
                className="glass-card"
                onClick={() => router.push(`/venues/${venue.id}`)}
                style={{ padding: '20px 22px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
              >
                {/* Name + location */}
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{venue.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                </div>

                <div style={{ height: 0.5, background: 'var(--glass-border)', marginBottom: 14 }} />

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: 20 }}>
                  {venue.floor_size && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Floor</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{venue.floor_size}</div>
                    </div>
                  )}
                  {venue.max_height && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Max Height</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{venue.max_height}</div>
                    </div>
                  )}
                  {venue.union_status && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Union</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{venue.union_status}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}