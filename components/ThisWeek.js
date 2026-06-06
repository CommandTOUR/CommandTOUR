'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

const TYPE_STYLES = {
  show:    { background: 'rgba(51,255,153,0.1)',   color: '#33FF99' },
  loadin:  { background: 'rgba(255,204,0,0.1)',    color: '#FFCC00' },
  loadout: { background: 'rgba(255,204,0,0.1)',    color: '#FFCC00' },
  travel:  { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' },
}

function getEventType(event, today) {
  const loadIn  = new Date(event.load_in_date)
  const loadOut = new Date(event.load_out_date)
  if (today >= loadIn && today <= loadOut) {
    if (today.toDateString() === loadIn.toDateString())  return { type: 'loadin',  label: 'Load-In' }
    if (today.toDateString() === loadOut.toDateString()) return { type: 'loadout', label: 'Load-Out' }
    return { type: 'show', label: 'Show' }
  }
  return { type: 'travel', label: 'Travel' }
}

function formatDateRange(loadIn, loadOut) {
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(loadIn).toLocaleDateString('en-US', opts)
  const e = new Date(loadOut).toLocaleDateString('en-US', opts)
  return `${s} – ${e}`
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
        start = today.toISOString()
        end = new Date(today.getFullYear(), today.getMonth() + 3, 1).toISOString()
      } else {
        const day = today.getDay()
        const mon = new Date(today)
        mon.setDate(today.getDate() - ((day + 6) % 7))
        const sun = new Date(mon)
        sun.setDate(mon.getDate() + 6)

        // Use plain YYYY-MM-DD strings to avoid timezone issues
        const pad = (n) => String(n).padStart(2, '0')
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
        start = fmt(mon)
        end = fmt(sun)
      }

      const { data, error } = await supabase
        .from('events')
        .select('id, city, load_in_date, load_out_date, tour_id, tours(name, color)')
        .gte('load_out_date', start)   // event ends on or after Monday
        .lte('load_in_date', end)      // event starts on or before Sunday
        .order('load_in_date', { ascending: true })

      if (error || !data) { setLoading(false); return }

      const enriched = await Promise.all(data.map(async (ev) => {
        const { count } = await supabase
          .from('show_list')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)

        const typeInfo = getEventType(ev, today)

        return {
          ...ev,
          tourName:  ev.tours?.name  ?? '—',
          tourColor: ev.tours?.color ?? '#33FF99',
          showCount: count ?? 0,
          ...typeInfo,
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
        <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          This Week
        </div>
        <div style={{ fontSize: 14, color: 'var(--mint)', cursor: 'pointer' }} onClick={() => router.push('/calendar')}>
          Calendar →
        </div>
      </div>

      {loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '10px 0' }}>Loading...</div>
      )}

      {!loading && !events.length && (
        <div className="glass-card" style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 14 }}>
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
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.tourColor, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{ev.city}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>{ev.tourName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{formatDateRange(ev.load_in_date, ev.load_out_date)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
              {ev.showCount === 1 ? '1 show' : `${ev.showCount} shows`}
            </div>
          </div>
          <div style={{
            fontSize: 12, fontWeight: 500, padding: '4px 11px', borderRadius: 20, flexShrink: 0,
            ...(TYPE_STYLES[ev.type] ?? TYPE_STYLES.travel),
          }}>
            {ev.label}
          </div>
        </div>
      ))}
    </div>
  )
}