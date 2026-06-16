'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

// Toned pastel status pills (these cards are light #faf8f4 on the navy shell)
const STATUS_PILL = {
  confirmed:   { color: '#15803d', background: '#dcfce7', border: '#86efac' },
  tentative:   { color: '#6b21a8', background: '#f3e8ff', border: '#d8b4fe' },
  '1-hold':    { color: '#854d0e', background: '#fef9c3', border: '#fde68a' },
  '2-hold':    { color: '#9a3412', background: '#ffedd5', border: '#fdba74' },
  '3-hold':    { color: '#991b1b', background: '#fee2e2', border: '#fca5a5' },
  cancelled:   { color: '#6b7280', background: '#f3f4f6', border: '#d1d5db' },
  want:        { color: '#6b7280', background: '#f3f4f6', border: '#d1d5db' },
  'date-hold': { color: '#6b7280', background: '#f3f4f6', border: '#d1d5db' },
}

const fmtStatus = (s) => s ? s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-') : 'Tentative'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function fmtLoadIn(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ThisWeek({ showAll = false }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchWeekEvents() {
      const supabase = getSupabase()
      const today = new Date()

      // Local-date window as YYYY-MM-DD strings so all comparisons are plain
      // lexicographic string compares — no UTC conversion / off-by-one.
      let startStr, endStr
      if (showAll) {
        startStr = ymd(today)
        endStr = ymd(new Date(today.getFullYear(), today.getMonth() + 3, 1))
      } else {
        const day = today.getDay()                       // 0=Sun … 6=Sat
        const mon = new Date(today)
        mon.setDate(today.getDate() - ((day + 6) % 7))   // back to Monday
        const sun = new Date(mon)
        sun.setDate(mon.getDate() + 6)                   // forward to Sunday
        startStr = ymd(mon)
        endStr = ymd(sun)
      }

      // Bound history so we don't scan the whole table, while still catching
      // long-running events that span into this week.
      const earlyBoundDate = new Date(startStr + 'T00:00:00')
      earlyBoundDate.setDate(earlyBoundDate.getDate() - 90)
      const earlyBound = ymd(earlyBoundDate)

      const { data, error } = await supabase
        .from('events')
        .select('id, city, state, country, venue_name, load_in_date, load_out_date, status, tour_id, tours(name, color)')
        .gte('load_in_date', earlyBound)
        .lte('load_in_date', endStr)
        .order('load_in_date', { ascending: true })

      if (error || !data) { setLoading(false); return }

      // Pull every show date for the candidate events in one query, then derive
      // first/last show + total count per event.
      const ids = data.map(e => e.id)
      const showsByEvent = {}
      if (ids.length) {
        const { data: showRows } = await supabase
          .from('show_list')
          .select('event_id, show_date')
          .in('event_id', ids)
        for (const r of (showRows || [])) {
          if (!r.show_date) continue
          ;(showsByEvent[r.event_id] ||= []).push(r.show_date)
        }
      }

      const matched = []
      for (const ev of data) {
        const showDates = (showsByEvent[ev.id] || []).slice().sort()
        const firstShow = showDates[0] || null
        const lastShow = showDates[showDates.length - 1] || null

        // Effective span = min/max across every known date on the event.
        const allDates = [ev.load_in_date, ev.load_out_date, firstShow, lastShow].filter(Boolean).sort()
        if (allDates.length === 0) continue
        const effectiveStart = allDates[0]
        const effectiveEnd = allDates[allDates.length - 1]

        // Include when the event's span overlaps the window. This covers all of:
        // load-in this week, first/last show this week, and "in progress" events
        // whose span fully encloses the week.
        const overlaps = effectiveStart <= endStr && effectiveEnd >= startStr
        if (!overlaps) continue

        matched.push({
          ...ev,
          tourName: ev.tours?.name ?? '—',
          tourColor: ev.tours?.color ?? '#33FF99',
          showCount: showDates.length,
        })
      }

      setEvents(matched)
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

      {events.map(ev => {
        const pill = STATUS_PILL[ev.status] || STATUS_PILL.tentative
        const cityCountry = [ev.city, ev.country].filter(Boolean).join(', ')
        return (
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{cityCountry || ev.city}</div>
              <div style={{ fontSize: 13, color: ev.tourColor, fontWeight: 500, marginTop: 3 }}>{ev.tourName}</div>
              {ev.venue_name && <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>{ev.venue_name}</div>}
              <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 2 }}>Load-In {fmtLoadIn(ev.load_in_date)}</div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: pill.color, background: pill.background, border: `1px solid ${pill.border}` }}>
                {fmtStatus(ev.status)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
