'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IconRoute } from '@tabler/icons-react'
import { getSupabase } from '@/lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { useNav } from '../../context/NavContext'
import { buildNavEntry } from '../../lib/navigate'
import NewTourModal from '../../components/NewTourModal'

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

const STATUS_LABELS = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }

const TOUR_TYPE_LABELS = {
  'hwmt': 'Hot Wheels Monster Trucks Live',
  'hwss': 'Hot Wheels Stunt Show',
  'hwmtl': 'Hot Wheels Monster Trucks Live',
}
const getTourTypeLabel = (type) => TOUR_TYPE_LABELS[type?.toLowerCase()] || type || ''

function statusPillStyle(status) {
  if (status === 'active') return { background: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)' }
  if (status === 'completed') return { background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '0.5px solid var(--border-default)' }
  if (status === 'cancelled') return { background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: 'var(--color-danger)', border: '0.5px solid color-mix(in srgb, var(--color-danger) 35%, transparent)' }
  return { background: 'var(--status-1hold-bg)', color: 'var(--status-1hold-text)', border: '0.5px solid var(--status-1hold-border)' }
}

export default function Tours() {
  const router = useRouter()
  const { pushNav } = useNav()

  const [loading, setLoading] = useState(true)
  const [tours, setTours] = useState([])
  const [newTourOpen, setNewTourOpen] = useState(false)
  const [nextEventsByTour, setNextEventsByTour] = useState({})
  const [tourEventStats, setTourEventStats] = useState({})
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('all')
  const [activeYear, setActiveYear] = useState(new Date().getFullYear())
  const [showHWMTL, setShowHWMTL] = useState(true)
  const [showHWSS, setShowHWSS] = useState(true)

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
          .select('id, name, color, status, region, logo_url, tour_type, tour_category, sort_order')
          .order('sort_order', { ascending: true, nullsFirst: false }),

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

      // Upcoming events per tour (date order), so "Next" can be scoped to a year
      const nextMap = {}
      for (const ev of (nextEventsRes.data || [])) {
        if (!nextMap[ev.tour_id]) nextMap[ev.tour_id] = []
        nextMap[ev.tour_id].push(ev)
      }
      setNextEventsByTour(nextMap)

      // Progress per tour per year (year comes from the event date); 'all' = every year.
      // Done = load-in before today, left = the rest (same definitions as before, now per year).
      const stats = {}
      const bump = (tourId, key, isDone) => {
        if (!stats[tourId]) stats[tourId] = {}
        if (!stats[tourId][key]) stats[tourId][key] = { total: 0, done: 0, left: 0 }
        stats[tourId][key].total += 1
        if (isDone) stats[tourId][key].done += 1
        stats[tourId][key].left = stats[tourId][key].total - stats[tourId][key].done
      }
      for (const ev of (allTourEventsRes.data || [])) {
        if (!ev.load_in_date) continue
        const isDone = ev.load_in_date < todayStr
        bump(ev.tour_id, ev.load_in_date.slice(0, 4), isDone)
        bump(ev.tour_id, 'all', isDone)
      }
      setTourEventStats(stats)

      setLoading(false)
    }

    fetchTours()
  }, [])

  const EMPTY_STATS = { total: 0, done: 0, left: 0 }
  const statsFor = (tourId, year) => tourEventStats[tourId]?.[String(year)] || EMPTY_STATS

  // Years come from event dates, not from tours.year
  const availableYears = [...new Set(
    Object.values(tourEventStats).flatMap(byYear => Object.keys(byYear).filter(k => k !== 'all'))
  )].map(Number).sort((a, b) => b - a)

  // A tour shows for a year when it has events in that year
  const yearFilteredTours = activeYear === 'all' ? tours : tours.filter(t => statsFor(t.id, activeYear).total > 0)

  const filtered = yearFilteredTours.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.region || '').toLowerCase().includes(search.toLowerCase())
    const matchSection = activeSection === 'all'
      || (activeSection === 'domestic' &&
        (t.region || '').toLowerCase().includes('north america'))
      || (activeSection === 'international' &&
        !(t.region || '').toLowerCase().includes('north america') && t.region)
      || (activeSection === 'uncategorized' &&
        !t.region)
    const isHwmtl = (t.tour_type || '').toLowerCase().startsWith('hwmt')
    const isHwss = (t.tour_type || '').toLowerCase() === 'hwss'
    const matchType = (isHwmtl && showHWMTL) || (isHwss && showHWSS) || (!isHwmtl && !isHwss)
    return matchSearch && matchSection && matchType
  })

  const domesticCount = yearFilteredTours.filter(t => (t.region || '').toLowerCase().includes('north america')).length
  const internationalCount = yearFilteredTours.filter(t => !(t.region || '').toLowerCase().includes('north america') && t.region).length
  const uncategorizedCount = yearFilteredTours.filter(t => !t.region).length
  const hwmtlCount = yearFilteredTours.filter(t => (t.tour_type || '').toLowerCase().startsWith('hwmt')).length
  const hwssCount = yearFilteredTours.filter(t => (t.tour_type || '').toLowerCase() === 'hwss').length
  const SECTION_COUNTS = { all: yearFilteredTours.length, domestic: domesticCount, international: internationalCount, uncategorized: uncategorizedCount }

  const renderTourTile = (tour, year = activeYear) => {
    const stats = statsFor(tour.id, year)
    const nextEvent = (nextEventsByTour[tour.id] || []).find(e => year === 'all' || e.load_in_date.startsWith(String(year)))
    const pct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0

    return (
      <div
        key={`${tour.id}-${year}`}
        onClick={() => {
          pushNav(buildNavEntry(`/tours/${tour.id}`, tour.name, 'tour'))
          router.push(`/tours/${tour.id}`)
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-tile-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-tile-bg)'}
        style={{
          ...GLASS_CARD,
          display: 'grid',
          gridTemplateColumns: '44px 1fr 180px 76px',
          alignItems: 'center',
          gap: 0,
          padding: '14px 16px',
          cursor: 'pointer',
        }}
      >
        <IconRoute size={44} stroke={1.5} color={tour.color || 'var(--color-info)'} style={{ flexShrink: 0 }} />

        <div style={{ minWidth: 0, marginLeft: 16, paddingLeft: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>
            {getTourTypeLabel(tour.tour_type)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tour.name}
          </div>
          <div style={{ fontSize: 15, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tour.region || '—'}
          </div>
          <div style={{ height: 6, borderRadius: 2, background: 'var(--border-default)', marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: tour.color || 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 450, color: 'var(--text-muted)', marginTop: 3 }}>
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
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color || 'var(--text-primary)' }}>{item.val}</div>
              <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', textAlign: 'center' }}>{item.lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ ...statusPillStyle(tour.status), fontSize: 13, fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize', display: 'inline-block' }}>
            {STATUS_LABELS[tour.status] || tour.status}
          </span>
        </div>
      </div>
    )
  }

  const yearKey = String(activeYear)
  const totalEvents = Object.values(tourEventStats).reduce((sum, byYear) => sum + (byYear[yearKey]?.total || 0), 0)
  const doneEvents = Object.values(tourEventStats).reduce((sum, byYear) => sum + (byYear[yearKey]?.done || 0), 0)
  const leftEvents = Object.values(tourEventStats).reduce((sum, byYear) => sum + (byYear[yearKey]?.left || 0), 0)

  const QUICK_STATS = [
    { label: 'Total Tours', value: yearFilteredTours.length, valueColor: 'var(--text-primary)' },
    { label: 'Active Tours', value: yearFilteredTours.filter(t => t.status === 'active').length, valueColor: 'var(--accent)' },
    { label: 'Upcoming', value: yearFilteredTours.filter(t => t.status === 'upcoming').length, valueColor: 'var(--color-info)' },
    { label: 'Total Events', value: totalEvents, valueColor: 'var(--text-primary)' },
    { label: 'Events Done', value: doneEvents, valueColor: 'var(--accent)' },
    { label: 'Remaining', value: leftEvents, valueColor: 'var(--text-primary)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Tours</div>
        <button
          onClick={() => setNewTourOpen(true)}
          style={{
            fontSize: 15, fontWeight: 600, padding: '7px 16px', borderRadius: 6,
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
          fontSize: 14,
          borderRadius: 8,
          border: '0.5px solid var(--border-default)',
          background: 'var(--surface-input)',
          color: 'var(--text-primary)',
          outline: 'none',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      />

      {/* Row 2: section tabs + year filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'domestic', 'international', 'uncategorized'].map(s => {
            const active = activeSection === s
            const label = s === 'all' ? `All Tours (${SECTION_COUNTS.all})` : `${s} (${SECTION_COUNTS[s]})`
            return (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                style={active ? {
                  fontSize: 15, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
                  border: 'none', background: 'var(--color-info)', color: '#ffffff',
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                } : {
                  fontSize: 15, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                  border: '0.5px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                }}
              >
                {label}
              </button>
            )
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => setShowHWMTL(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: showHWMTL ? 'rgba(26,86,219,0.15)' : 'transparent',
                border: showHWMTL ? '1.5px solid var(--color-info)' : '1.5px solid var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {showHWMTL && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>HWMTL <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({hwmtlCount})</span></span>
            </div>
            <div
              onClick={() => setShowHWSS(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: showHWSS ? 'rgba(26,86,219,0.15)' : 'transparent',
                border: showHWSS ? '1.5px solid var(--color-info)' : '1.5px solid var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {showHWSS && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>HWSS <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({hwssCount})</span></span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={activeYear}
            onChange={e => setActiveYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            style={{
              fontSize: 15, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
              border: '1.5px solid #0a1628', background: '#FFD60A', color: '#0a1628',
              cursor: 'pointer', fontFamily: 'inherit',
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%230a1628' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              paddingRight: 28,
            }}
          >
            <option value="all">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setActiveYear('all')}
            style={{
              fontSize: 15, fontWeight: 700, padding: '5px 14px', borderRadius: 6,
              border: '1.5px solid #0a1628', background: '#FFD60A', color: '#0a1628',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >View All</button>
        </div>
      </div>

      {/* Row 3: main two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Left: tours list */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {loading && <div style={{ padding: '14px', fontSize: 14, fontWeight: 450, color: 'var(--text-muted)' }}>Loading…</div>}
            {!loading && !filtered.length && (
              <div style={{ padding: '14px', fontSize: 14, fontWeight: 450, color: 'var(--text-muted)' }}>No tours found.</div>
            )}
            {activeYear === 'all' ? (
              <>
                {availableYears.slice().sort((a, b) => a - b).map(year => {
                  // A tour appears under each year it has events, with that year's progress
                  const yearTours = filtered.filter(t => statsFor(t.id, year).total > 0)
                  if (yearTours.length === 0) return null
                  return (
                    <div key={year} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-info)', marginBottom: 10 }}>{year}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {yearTours.map(tour => renderTourTile(tour, year))}
                      </div>
                    </div>
                  )
                })}
                {filtered.some(t => statsFor(t.id, 'all').total === 0) && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-info)', marginBottom: 10 }}>No events yet</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filtered.filter(t => statsFor(t.id, 'all').total === 0).map(tour => renderTourTile(tour, 'all'))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              filtered.map(tour => renderTourTile(tour, activeYear))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflowY: 'auto' }}>

          {/* Quick stats */}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
              Quick Stats
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {QUICK_STATS.map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: stat.valueColor, marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {newTourOpen && <NewTourModal onClose={() => setNewTourOpen(false)} />}
    </div>
  )
}
