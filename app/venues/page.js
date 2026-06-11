'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const REGION_ORDER = ['North America', 'Europe', 'Latin America', 'Asia-Pacific', 'Middle East', 'Africa']

// Map legacy region names to current ones
const REGION_ALIAS = {
  'South America': 'Latin America',
}

function normalizeRegion(region) {
  if (!region) return null
  return REGION_ALIAS[region] || region
}

function ChevronIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Venues() {
  const router = useRouter()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({ 'North America': true })
  const [showAllVenues, setShowAllVenues] = useState({})

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

  // Group venues by normalized region
  const grouped = {}
  filtered.forEach(v => {
    const region = normalizeRegion(v.region) || 'Other'
    if (!grouped[region]) grouped[region] = []
    grouped[region].push(v)
  })

  // Build ordered section list
  const sections = []
  REGION_ORDER.forEach(r => {
    if (grouped[r]) sections.push({ region: r, venues: grouped[r] })
  })
  // Append any unknown regions not in the order list
  Object.keys(grouped).forEach(r => {
    if (!REGION_ORDER.includes(r)) sections.push({ region: r, venues: grouped[r] })
  })

  const allExpanded = sections.length > 0 && sections.every(s => expanded[s.region] && (s.venues.length <= 4 || showAllVenues[s.region]))

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded({ 'North America': true })
      setShowAllVenues({})
    } else {
      const allExp = {}
      const allShow = {}
      sections.forEach(s => { allExp[s.region] = true; allShow[s.region] = true })
      setExpanded(allExp)
      setShowAllVenues(allShow)
    }
  }

  const toggleSection = (region) => {
    setExpanded(prev => ({ ...prev, [region]: !prev[region] }))
  }

  const toggleShowAll = (region) => {
    setShowAllVenues(prev => ({ ...prev, [region]: !prev[region] }))
  }

  // When searching, auto-expand all sections that have results
  useEffect(() => {
    if (search.trim()) {
      const newExpanded = {}
      const newShowAll = {}
      sections.forEach(s => { newExpanded[s.region] = true; newShowAll[s.region] = true })
      setExpanded(newExpanded)
      setShowAllVenues(newShowAll)
    }
  }, [search])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 62 }}>

        {/* Sticky page header */}
        <div style={{ position: 'sticky', top: 62, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Venues</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Search venues by name, city, or country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: 14, padding: '9px 16px',
                borderRadius: 8, border: '0.5px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                outline: 'none', width: '100%', maxWidth: 340,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sections.length > 0 && (
              <button
                onClick={toggleAll}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            <button className="btn-primary" onClick={() => router.push('/venues/new')}>
              + Add Venue
            </button>
          </div>
        </div>

        <div style={{ padding: 28 }}>

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

        {/* Regional sections */}
        {!loading && sections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sections.map(({ region, venues: sectionVenues }) => {
              const showAll = !!showAllVenues[region]
              const visibleVenues = showAll ? sectionVenues : sectionVenues.slice(0, 4)
              const hasMore = sectionVenues.length > 4
              return (
                <div key={region}>
                  {/* Section header */}
                  <div
                    onClick={() => toggleSection(region)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: expanded[region] ? 12 : 0, userSelect: 'none' }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>
                      <ChevronIcon open={!!expanded[region]} />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {region}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {sectionVenues.length} {sectionVenues.length === 1 ? 'venue' : 'venues'}
                    </span>
                    <div style={{ flex: 1, height: '0.5px', background: 'var(--glass-border)', marginLeft: 4 }} />
                  </div>

                  {/* Venue tiles */}
                  {expanded[region] && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: hasMore ? 8 : 8 }}>
                        {visibleVenues.map(venue => (
                          <div
                            key={venue.id}
                            className="glass-card"
                            onClick={() => router.push(`/venues/${venue.id}`)}
                            style={{ padding: '14px 18px', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
                          >
                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{venue.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                              {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={() => toggleShowAll(region)}
                          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 8 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          {showAll ? 'Collapse' : `Expand (${sectionVenues.length - 4} more)`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </div>

      </div>
    </div>
  )
}
