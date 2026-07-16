'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import {
  IconAlertTriangle,
  IconAlertTriangleFilled,
  IconClock,
  IconPlane,
  IconCheck,
  IconUserQuestion,
} from '@tabler/icons-react'

const HOLD_STATUSES = ['1-hold', '2-hold', '3-hold']

const GLASS_CARD = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: '0.5px solid var(--glass-tile-border)',
  borderRadius: 14,
  boxShadow: 'var(--glass-tile-shadow)',
}

const ICON_MAP = {
  warning: IconAlertTriangle,
  clock: IconClock,
  plane: IconPlane,
  check: IconCheck,
  user: IconUserQuestion,
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const shortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

function formatClockDate(d) {
  return `${DAYS[d.getDay()].toUpperCase()}, ${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}, ${d.getFullYear()}`
}
function formatClockTime(d) {
  const h = d.getHours()
  const hour = h % 12 || 12
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${hour}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export default function Dashboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tours, setTours] = useState([])
  const [thisWeekEvents, setThisWeekEvents] = useState([])
  const [nextEventByTour, setNextEventByTour] = useState({})
  const [tourEventStats, setTourEventStats] = useState({})
  const [unconfirmedCount, setUnconfirmedCount] = useState(0)
  const [holdEvents, setHoldEvents] = useState([])
  const [now, setNow] = useState(null)

  // Live clock
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Data fetch (once on mount)
  useEffect(() => {
    async function fetchDashboard() {
      const supabase = getSupabase()
      const today = new Date()
      const todayStr = ymd(today)

      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const weekStart = ymd(monday)
      const weekEnd = ymd(sunday)

      const twoWeeksFromNow = new Date(today)
      twoWeeksFromNow.setDate(today.getDate() + 14)
      const twoWeeksStr = ymd(twoWeeksFromNow)

      const [
        toursRes,
        weekEventsRes,
        nextEventsRes,
        unconfirmedRes,
        holdEventsRes,
        allTourEventsRes,
      ] = await Promise.all([
        supabase
          .from('tours')
          .select('id, name, color, status, region, year, logo_url, tour_type, director_name, tour_category')
          .in('status', ['active', 'upcoming'])
          .order('name'),

        supabase
          .from('events')
          .select('id, tour_id, city, state, country, load_in_date, load_out_date, status, num_shows, venue_name')
          .gte('load_in_date', weekStart)
          .lte('load_in_date', weekEnd)
          .order('load_in_date'),

        supabase
          .from('events')
          .select('id, tour_id, city, state, country, load_in_date, status')
          .gt('load_in_date', weekEnd)
          .order('load_in_date'),

        supabase
          .from('staff_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('confirmed', false)
          .eq('status', 'pending')
          .not('staff_id', 'is', null),

        supabase
          .from('events')
          .select('id, tour_id, city, state, country, load_in_date, status')
          .in('status', HOLD_STATUSES)
          .gte('load_in_date', todayStr)
          .lte('load_in_date', twoWeeksStr)
          .order('load_in_date'),

        supabase
          .from('events')
          .select('id, tour_id, load_in_date, status')
          .order('load_in_date'),
      ])

      setTours(toursRes.data || [])
      setThisWeekEvents(weekEventsRes.data || [])

      const nextMap = {}
      for (const ev of (nextEventsRes.data || [])) {
        if (!nextMap[ev.tour_id]) nextMap[ev.tour_id] = ev
      }
      setNextEventByTour(nextMap)

      setUnconfirmedCount(unconfirmedRes.count || 0)
      setHoldEvents(holdEventsRes.data || [])

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

    fetchDashboard()
  }, [])

  const tourById = {}
  tours.forEach(t => { tourById[t.id] = t })

  const domesticCount = tours.filter(t => t.status === 'active' && t.tour_category === 'domestic').length
  const intlCount = tours.filter(t => t.status === 'active' && t.tour_category === 'international').length

  const activeCount = tours.filter(t => t.status === 'active').length

  const STATS = [
    { label: 'Active Tours', value: activeCount, sub: `${domesticCount} domestic · ${intlCount} intl`, color: 'var(--text-primary)' },
    { label: 'Unconfirmed Staff', value: unconfirmedCount, sub: 'awaiting confirmation', color: unconfirmedCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
    { label: 'Holds Expiring', value: holdEvents.length, sub: 'within 14 days', color: holdEvents.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
    { label: '—', value: '—', sub: 'Coming soon', color: 'var(--text-muted)' },
    { label: '—', value: '—', sub: 'Coming soon', color: 'var(--text-muted)' },
    { label: '—', value: '—', sub: 'Coming soon', color: 'var(--text-muted)' },
    { label: '—', value: '—', sub: 'Coming soon', color: 'var(--text-muted)' },
  ]

  const alerts = []
  if (unconfirmedCount > 0) {
    alerts.push({
      icon: 'warning', color: 'var(--color-warning)', bg: 'var(--status-1hold-bg)',
      title: `${unconfirmedCount} unconfirmed staff`,
      body: 'Awaiting confirmation on upcoming events',
      action: 'View staffing', href: '/staff',
    })
  }
  holdEvents.slice(0, 3).forEach(ev => {
    const tour = tourById[ev.tour_id]
    alerts.push({
      icon: 'clock', color: 'var(--color-warning)', bg: 'var(--status-1hold-bg)',
      title: 'Hold expiring',
      body: `${tour?.name ?? '—'} — ${formatLocation(ev.city, ev.state, ev.country, 'compact')}`,
      action: 'Review', href: `/tours/${ev.tour_id}`,
    })
  })
  const activeTours = tours.filter(t => t.status === 'active')

  const showSeeAll = thisWeekEvents.length > 6
  const shownWeekEvents = showSeeAll ? thisWeekEvents.slice(0, 5) : thisWeekEvents

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</div>
        {now && (
          <div>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 450 }}>{formatClockDate(now)} · </span>
            <span style={{ color: 'var(--color-info)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatClockTime(now)}</span>
          </div>
        )}
      </div>

      {/* Row 1: stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
        {STATS.map((stat, i) => (
          <div key={`${stat.label}-${i}`} style={{
            ...GLASS_CARD,
            padding: '11px 13px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 3 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2: this week events */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
        This Week
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, flexShrink: 0 }}>
        {thisWeekEvents.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            ...GLASS_CARD, padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 450, color: 'var(--text-muted)',
          }}>
            No events this week
          </div>
        )}

        {shownWeekEvents.map(ev => {
          const tour = tourById[ev.tour_id]
          return (
            <div
              key={ev.id}
              onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
              style={{
                ...GLASS_CARD, padding: '10px 12px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatLocation(ev.city, ev.state, ev.country, 'compact')}
              </div>
              <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 1 }}>
                {ev.load_out_date && ev.load_out_date !== ev.load_in_date
                  ? `${shortDate(ev.load_in_date)} – ${shortDate(ev.load_out_date)}`
                  : shortDate(ev.load_in_date)}
              </div>
              {ev.venue_name && (
                <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {ev.venue_name}
                </div>
              )}
              {ev.num_shows != null && (
                <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-muted)', marginTop: 1 }}>
                  {ev.num_shows} {ev.num_shows === 1 ? 'show' : 'shows'}
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: tour?.color || 'var(--text-secondary)' }}>
                {tour?.name ?? '—'}
              </div>
            </div>
          )
        })}

        {showSeeAll && (
          <div
            onClick={() => router.push('/calendar')}
            style={{
              ...GLASS_CARD, padding: '10px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 450, color: 'var(--color-info)', cursor: 'pointer', textAlign: 'center',
            }}
          >
            See all →
          </div>
        )}
      </div>

      {/* Row 3: main two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 10, flex: 1, minHeight: 0 }}>

        {/* Left: active tours list */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
            Active Tours
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {loading && <div style={{ padding: '14px', fontSize: 12, fontWeight: 450, color: 'var(--text-muted)' }}>Loading…</div>}
            {!loading && !activeTours.length && (
              <div style={{ padding: '14px', fontSize: 12, fontWeight: 450, color: 'var(--text-muted)' }}>No active or upcoming tours.</div>
            )}
            {activeTours.map(tour => {
              const stats = tourEventStats[tour.id] || { total: 0, done: 0, left: 0 }
              const nextEvent = nextEventByTour[tour.id]

              return (
                <div
                  key={tour.id}
                  onClick={() => router.push(`/tours/${tour.id}`)}
                  style={{
                    ...GLASS_CARD,
                    display: 'grid',
                    gridTemplateColumns: '40px 4px 1fr 180px',
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
                    <div style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-muted)', marginTop: 2 }}>
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
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflowY: 'auto' }}>

          {/* Needs attention */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>
              <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
                <IconAlertTriangleFilled size={16} color="#FFD60A" />
                <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
              </div>
              Needs Attention
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.length === 0 && (
                <div style={{ ...GLASS_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '20px 14px' }}>
                  <IconCheck size={20} color="var(--color-success)" />
                  <div style={{ fontSize: 11, fontWeight: 450, color: 'var(--text-muted)' }}>All clear</div>
                </div>
              )}
              {alerts.map((alert, i) => {
                const Icon = ICON_MAP[alert.icon]
                return (
                  <div
                    key={i}
                    onClick={() => alert.href && router.push(alert.href)}
                    style={{
                      ...GLASS_CARD,
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 12px',
                      cursor: alert.href ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                      background: alert.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={13} color={alert.color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 450, color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: 1 }}>{alert.body}</div>
                      {alert.action && (
                        <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 3, cursor: 'pointer' }}>
                          {alert.action}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Budget placeholder */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6 }}>
              Budget Overview
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTours.slice(0, 3).map(tour => (
                <div key={tour.id} style={{ ...GLASS_CARD, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 450, color: 'var(--text-secondary)' }}>{tour.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>$—</span>
                  </div>
                  <div style={{ height: 2, background: 'var(--border-default)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '0%', background: tour.color || 'var(--accent)' }} />
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 450, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 4 }}>
                Finance module coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
