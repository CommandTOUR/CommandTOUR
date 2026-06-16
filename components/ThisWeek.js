'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

const PILL_STYLES = {
  loadin:  { background: '#fef9c3', color: '#854d0e' },
  loadout: { background: '#fef9c3', color: '#854d0e' },
  show:    { background: '#dcfce7', color: '#15803d' },
}

function getPills(event, today, todayShows) {
  const pills = []
  const todayStr = today.toDateString()

  if (event.load_in_date && new Date(event.load_in_date + 'T00:00:00').toDateString() === todayStr) {
    pills.push({ type: 'loadin', label: 'Load-In' })
  }

  if (todayShows > 0) {
    pills.push({ type: 'show', label: todayShows === 1 ? '1 Show' : `${todayShows} Shows` })
  }

  if (event.load_out_date && new Date(event.load_out_date + 'T00:00:00').toDateString() === todayStr) {
    pills.push({ type: 'loadout', label: 'Load-Out' })
  }

  return pills
}

function formatDateRange(loadIn, loadOut) {
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(loadIn + 'T00:00:00').toLocaleDateString('en-US', opts)
  const e = loadOut ? new Date(loadOut + 'T00:00:00').toLocaleDateString('en-US', opts) : null
  return e ? `${s} – ${e}` : s
}

export default function ThisWeek({ showAll = false }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchWeekEvents() {
      const supabase = getSupabase()
      const today = new Date()

      let start, end
      if (showAll) {
        const pad = (n) => String(n).padStart(2, '0')
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
        start = fmt(today)
        end = fmt(new Date(today.getFullYear(), today.getMonth() + 3, 1))
      } else {
        const day = today.getDay()
        const mon = new Date(today)
        mon.setDate(today.getDate() - ((day + 6) % 7))
        const sun = new Date(mon)
        sun.setDate(mon.getDate() + 6)
        const pad = (n) => String(n).padStart(2, '0')
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
        start = fmt(mon)
        end = fmt(sun)
      }

      const { data, error } = await supabase
        .from('events')
        .select('id, city, load_in_date, load_out_date, tour_id, tours(name, color)')
        .gte('load_out_date', start)
        .lte('load_in_date', end)
        .order('load_in_date', { ascending: true })

      if (error || !data) { setLoading(false); return }

      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

      const enriched = await Promise.all(data.map(async (ev) => {
        const { count: totalShows } = await supabase
          .from('show_list')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)

        const { count: todayShows } = await supabase
          .from('show_list')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)
          .eq('show_date', todayStr)

        const pills = getPills(ev, today, todayShows ?? 0)

        return {
          ...ev,
          tourName:  ev.tours?.name  ?? '—',
          tourColor: ev.tours?.color ?? '#33FF99',
          showCount: totalShows ?? 0,
          pills,
        }
      }))

      setEvents(enriched)
      setLoading(false)
    }

    fetchWeekEvents()
  }, [showAll])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
          This Week
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer', fontWeight: 500 }} onClick={() => router.push('/calendar')}>
          Calendar →
        </div>
      </div>

      {loading && (
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, padding: '10px 0' }}>Loading...</div>
      )}

      {!loading && !events.length && (
        <div className="glass-card" style={{ padding: '16px', color: '#6b6b6b', fontSize: 14 }}>
          No events this week.
        </div>
      )}

      {events.map(ev => (
        <div
          key={ev.id}
          className="glass-card"
          onClick={() => router.push(`/tours/${ev.tour_id}/events/${ev.id}`)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            transition: 'background 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0ece4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#faf8f4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.tourColor, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{ev.city}</div>
            <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 3 }}>{ev.tourName}</div>
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>{formatDateRange(ev.load_in_date, ev.load_out_date)}</div>
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>
              {ev.showCount === 1 ? '1 show' : `${ev.showCount} shows`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
            {ev.pills.map((pill, i) => (
              <div key={i} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                ...(PILL_STYLES[pill.type] ?? PILL_STYLES.show),
              }}>
                {pill.label}
              </div>
            ))}
            {ev.pills.length === 0 && (
              <div style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#f0ece4', color: '#6b6b6b' }}>
                In Progress
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
