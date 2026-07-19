'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { formatLocation } from '@/lib/locationFormat'

const GLASS_CARD = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const shortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

const STATUS_LABELS = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }

function statusPillStyle(status) {
  if (status === 'active') return { background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)' }
  if (status === 'completed') return { background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '0.5px solid var(--border-default)' }
  if (status === 'cancelled') return { background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)', border: '0.5px solid color-mix(in srgb, var(--color-danger) 35%, transparent)' }
  return { background: 'var(--status-1hold-bg)', color: 'var(--status-1hold-text)', border: '0.5px solid var(--status-1hold-border)' }
}

export default function Tours() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tours, setTours] = useState([])
  const [nextEventByTour, setNextEventByTour] = useState({})
  const [tourEventStats, setTourEventStats] = useState({})
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('all')

  // Data fetch (once on mount)
  useEffect(() => {
    async function fetchTours() {
      const supabase = getSupabase()
      const today = new Date()
      const todayStr = ymd(today)

      const [
        toursRes,
        nextEventsRes,
        allTourEventsRes,
      ] = await Promise.all([
        supabase
          .from('tours')
          .select('id, name, color, status, region, year, logo_url, tour_type, director_name, tour_category')
          .order('name'),

        supabase
          .from('events')
          .select('id, tour_id, city, state, country, load_in_date, status')
          .gte('load_in_date', todayStr)
          .order('load_in_date'),

        supabase
          .from('events')
          .select('id, tour_id, load_in_date, status')
          .order('load_in_date'),
      ])

      setTours(toursRes.data || [])

      const nextMap = {}
      for (const ev of (nextEventsRes.data || [])) {
        if (!nextMap[ev.tour_id]) nextMap[ev.tour_id] = ev
      }
      setNextEventByTour(nextMap)

      const stats = {}
      for (const ev of (allTourEventsRes.data || [])) {
        if (!stats[ev.tour_id]) stats[ev.tour_id] = { total: 0, done: 0, left: 0 }
        stats[ev.tour_id].total += 1
        if (ev.load_in_date && ev.load_in_date < todayStr) stats[ev.tour_id].done += 1
      }
      for (const id in stats) stats[id].left = stats[id].total - stats[id].done
      setTourEventStats(stats)

      setLoading(false)
    }

    fetchTours()
  }, [])

  const filtered = tours.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.region || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.director_name || '').toLowerCase().includes(search.toLowerCase())
    const matchSection = activeSection === 'all'
      || (activeSection === 'domestic' &&
        (t.region || '').toLowerCase().includes('north america'))
      || (activeSection === 'international' &&
        !(t.region || '').toLowerCase().includes('north america') && t.region)
      || (activeSection === 'uncategorized' &&
        !t.region)
    return matchSearch && matchSection
  })

  const domesticCount = tours.filter(t => (t.region || '').toLowerCase().includes('north america')).length
  const internationalCount = tours.filter(t => !(t.region || '').toLowerCase().includes('north america') && t.region).length
  const uncategorizedCount = tours.filter(t => !t.region).length
  const SECTION_COUNTS = { all: tours.length, domestic: domesticCount, international: internationalCount, uncategorized: uncategorizedCount }

  const totalEvents = Object.values(tourEventStats).reduce((sum, s) => sum + s.total, 0)
  const doneEvents = Object.values(tourEventStats).reduce((sum, s) => sum + s.done, 0)
  const leftEvents = Object.values(tourEventStats).reduce((sum, s) => sum + s.left, 0)

  const QUICK_STATS = [
    { label: 'Total Tours', value: tours.length, valueColor: 'var(--text-primary)' },
    { label: 'Active Tours', value: tours.filter(t => t.status === 'active').length, valueColor: 'var(--accent)' },
    { label: 'Upcoming', value: tours.filter(t => t.status === 'upcoming').length, valueColor: 'var(--color-info)' },
    { label: 'Total Events', value: totalEvents, valueColor: 'var(--text-primary)' },
    { label: 'Events Done', value: doneEvents, valueColor: 'var(--accent)' },
    { label: 'Remaining', value: leftEvents, valueColor: 'var(--text-primary)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Tours</div>
        <button
          onClick={() => router.push('/tours/new')}
          style={{
            fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6,
            border: 'none', background: 'var(--color-info)', color: '#ffffff',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + New Tour
        </button>
      </div>

      {/* Row 1: search */}
      <input
        placeholder="Search tours..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 14px',
          fontSize: 12,
          borderRadius: 8,
          border: '0.5px solid var(--border-default)',
          background: 'var(--surface-input)',
          color: 'var(--text-primary)',
          outline: 'none',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      />

      {/* Row 2: section tabs */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {['all', 'domestic', 'international', 'uncategorized'].map(s => {
          const active = activeSection === s
          const label = s === 'all' ? `All Tours (${SECTION_COUNTS.all})` : `${s} (${SECTION_COUNTS[s]})`
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={active ? {
                fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
                border: 'none', background: 'var(--color-info)', color: '#ffffff',
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              } : {
                fontSize: 13, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Row 3: main two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Left: tours list */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
            Tours
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {loading && <div style={{ padding: '14px', fontSize: 12, fontWeight: 450, color: 'var(--text-muted)' }}>Loading…</div>}
            {!loading && !filtered.length && (
              <div style={{ padding: '14px', fontSize: 12, fontWeight: 450, color: 'var(--text-muted)' }}>No tours found.</div>
            )}
            {filtered.map(tour => {
              const stats = tourEventStats[tour.id] || { total: 0, done: 0, left: 0 }
              const nextEvent = nextEventByTour[tour.id]
              const pct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0

              return (
                <div
                  key={tour.id}
                  onClick={() => router.push(`/tours/${tour.id}`)}
                  style={{
                    ...GLASS_CARD,
                    display: 'grid',
                    gridTemplateColumns: '40px 4px 1fr 180px 76px',
                    alignItems: 'center',
                    gap: 0,
                    padding: '10px 14px',
                    cursor: 'pointer',
                  }}
                >
                  {tour.logo_url ? (
                    <img src={tour.logo_url} alt={tour.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: `color-mix(in srgb, ${tour.color || 'var(--accent)'} 10%, transparent)`,
                      color: tour.color || 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {initials(tour.name)}
                    </div>
                  )}

                  <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', marginLeft: 14, background: tour.color || 'var(--accent)' }} />

                  <div style={{ minWidth: 0, marginLeft: 16, paddingLeft: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tour.name}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[tour.region, tour.director_name || '—'].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ height: 6, borderRadius: 2, background: 'var(--border-default)', marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: tour.color || 'var(--accent)' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-muted)', marginTop: 3 }}>
                      {nextEvent
                        ? <>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 450 }}>Next: </span>
                            <span
                              style={{ color: 'var(--color-info)', fontWeight: 700, cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); router.push(`/tours/${tour.id}/events/${nextEvent.id}`) }}
                            >
                              {formatLocation(nextEvent.city, nextEvent.state, nextEvent.country, 'compact')} · {shortDate(nextEvent.load_in_date)}
                            </span>
                          </>
                        : '—'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', marginLeft: 16 }}>
                    {[
                      { val: stats.total, lbl: 'Total' },
                      { val: stats.done, lbl: 'Done', color: 'var(--color-success)' },
                      { val: stats.left, lbl: 'Left' },
                    ].map(item => (
                      <div key={item.lbl} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', textAlign: 'center' }}>{item.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginLeft: 16, textAlign: 'center' }}>
                    <span style={{ ...statusPillStyle(tour.status), fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize', display: 'inline-block' }}>
                      {STATUS_LABELS[tour.status] || tour.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflowY: 'auto' }}>

          {/* Quick stats */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
              Quick Stats
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {QUICK_STATS.map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: stat.valueColor, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
