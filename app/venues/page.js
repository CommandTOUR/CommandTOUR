'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconMapPin } from '@tabler/icons-react'
import { getSupabase } from '../../lib/supabase'
import { useNav } from '../../context/NavContext'
import { buildNavEntry } from '../../lib/navigate'
import { useAppColors } from '../../hooks/useAppColors'

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

export default function Venues() {
  const router = useRouter()
  const { pushNav } = useNav()
  const { getRegionColor } = useAppColors()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeRegion, setActiveRegion] = useState(null)

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

  const filteredVenues = venues.filter(v =>
    [v.name, v.city, v.state, v.venue_type].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  const regions = [...new Set(venues.map(v => v.region).filter(Boolean))].sort()

  const displayedVenues = activeRegion === null
    ? filteredVenues
    : filteredVenues.filter(v => v.region === activeRegion)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Venues</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            placeholder="Search venues..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--surface-card)',
              border: '0.5px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: 16,
              borderRadius: 8,
              padding: '10px 16px',
              width: 260,
              outline: 'none',
            }}
          />
          <button
            onClick={() => router.push('/venues/new')}
            style={{ background: 'transparent', border: '0.5px solid var(--color-info)', color: 'var(--color-info)', borderRadius: 8, padding: '9px 16px', fontSize: 15, fontWeight: 400, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,86,219,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            + Add Venue
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 4px 8px' }}>
        <button
          onClick={() => setActiveRegion(null)}
          style={{
            fontSize: 15, padding: '5px 14px', borderRadius: 20, border: '0.5px solid',
            borderColor: activeRegion === null ? 'var(--color-info)' : 'var(--border-default)',
            background: activeRegion === null ? 'rgba(26,86,219,0.10)' : 'transparent',
            color: activeRegion === null ? 'var(--color-info)' : 'var(--text-secondary)',
            fontWeight: activeRegion === null ? 600 : 400,
            cursor: 'pointer'
          }}
        >All</button>

        {regions.map(region => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            style={activeRegion === region ? {
              fontSize: 15, padding: '5px 14px', borderRadius: 20,
              border: `0.5px solid ${getRegionColor(region).color}`,
              background: getRegionColor(region).bg,
              color: getRegionColor(region).color,
              fontWeight: 700, cursor: 'pointer', opacity: 1
            } : {
              fontSize: 15, padding: '5px 14px', borderRadius: 20,
              border: `0.5px solid ${getRegionColor(region).color}`,
              background: 'transparent',
              color: getRegionColor(region).color,
              fontWeight: 400, cursor: 'pointer', opacity: 1
            }}
          >{region}</button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 0' }}>
        <div style={{ padding: '0 4px' }}>

          {loading && <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>Loading...</div>}

          {!loading && displayedVenues.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>No venues found.</div>
            </div>
          )}

          {!loading && displayedVenues.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {displayedVenues.map(venue => {
                const location = [venue.city, venue.state].filter(Boolean).join(', ')
                const rc = getRegionColor(venue.region)
                return (
                  <div
                    key={venue.id}
                    onClick={() => {
                      pushNav(buildNavEntry(`/venues/${venue.id}`, venue.name, 'venue'))
                      router.push(`/venues/${venue.id}`)
                    }}
                    style={{ ...GLASS, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-tile-bg)' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: rc.bg,
                      border: `1.5px solid ${rc.border}`,
                      color: rc.icon,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <IconMapPin size={18} stroke={1.5} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {venue.name}
                      </div>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {location || '—'}
                      </div>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                        {venue.country || '—'}
                      </div>
                      {venue.region ? (
                        <div style={{ fontSize: 15, color: getRegionColor(venue.region).color, fontWeight: 400 }}>
                          {venue.region}
                        </div>
                      ) : (
                        <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>—</div>
                      )}
                    </div>
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
