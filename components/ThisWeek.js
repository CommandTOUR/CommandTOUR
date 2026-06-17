'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

// Neon status pills for dark glass backgrounds
const STATUS_PILL = {
  confirmed:   { color: '#33FF99',  background: 'rgba(51,255,153,0.15)',  border: 'rgba(51,255,153,0.30)' },
  tentative:   { color: '#FFD60A',  background: 'rgba(255,214,10,0.15)',  border: 'rgba(255,214,10,0.30)' },
  '1-hold':    { color: '#FFD60A',  background: 'rgba(255,214,10,0.10)',  border: 'rgba(255,214,10,0.25)' },
  '2-hold':    { color: '#FFD60A',  background: 'rgba(255,214,10,0.10)',  border: 'rgba(255,214,10,0.25)' },
  '3-hold':    { color: '#FFD60A',  background: 'rgba(255,214,10,0.10)',  border: 'rgba(255,214,10,0.25)' },
  cancelled:   { color: '#f87171',  background: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.30)' },
  active:      { color: '#33FF99',  background: 'rgba(51,255,153,0.15)',  border: 'rgba(51,255,153,0.30)' },
  upcoming:    { color: '#63b3ed',  background: 'rgba(99,179,237,0.15)',  border: 'rgba(99,179,237,0.30)' },
  want:        { color: '#64748b',  background: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)' },
  'date-hold': { color: '#64748b',  background: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)' },
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

      let startStr, endStr
      if (showAll) {
        startStr = ymd(today)
        endStr = ymd(new Date(today.getFullYear(), today.getMonth() + 3, 1))
      } else {
        const day = today.getDay()
        const mon = new Date(today)
        mon.setDate(today.getDate() - ((day + 6) % 7))
        const sun = new Date(mon)
        sun.setDate(mon.getDate() + 6)
        startStr = ymd(mon)
        endStr = ymd(sun)
      }

      // Fetch events from 120 days before the window start through 14 days after the end.
      // This catches long-running events and events that loaded in just after the week ends
      // but whose shows fall within it.
      const earlyBoundDate = new Date(startStr + 'T00:00:00')
      earlyBoundDate.setDate(earlyBoundDate.getDate() - 120)
      const earlyBound = ymd(earlyBoundDate)

      const lateBoundDate = new Date(endStr + 'T00:00:00')
      lateBoundDate.setDate(lateBoundDate.getDate() + 14)
      const lateBound = ymd(lateBoundDate)

      const { data, error } = await supabase
        .from('events')
        .select('id, city, state, country, venue_name, load_in_date, load_out_date, status, tour_id, tours(name, color)')
        .or(`load_in_date.gte.${earlyBound},load_in_date.is.null`)
        .lte('load_in_date', lateBound)
        .order('load_in_date', { ascending: true })

      if (error || !data) { setLoading(false); return }

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

        // Effective span = min/max across every known date on the event
        const allDates = [ev.load_in_date, ev.load_out_date, firstShow, lastShow].filter(Boolean).sort()
        if (allDates.length === 0) continue
        const effectiveStart = allDates[0]
        const effectiveEnd = allDates[allDates.length - 1]

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
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
          This Week
        </div>
        <div style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer', fontWeight: 500 }} onClick={() => router.push('/calendar')}>
          Calendar →
        </div>
      </div>

      {loading && (
        <div style={{ color: '#64748b', fontSize: 14, padding: '10px 0' }}>Loading...</div>
      )}

      {!loading && !events.length && (
        <div className="glass-card" style={{ padding: '16px', color: '#64748b', fontSize: 14 }}>
          No events this week.
        </div>
      )}

      {events.map(ev => {
        const pill = STATUS_PILL[ev.status] || STATUS_PILL.tentative
        const cityCountry = [ev.city, ev.country].filter(Boolean).join(' · ')
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
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.tourColor, flexShrink: 0, marginTop: 4 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{cityCountry || ev.city}</div>
              <div style={{ fontSize: 13, color: ev.tourColor, fontWeight: 500, marginTop: 3 }}>{ev.tourName}</div>
              {ev.venue_name && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{ev.venue_name}</div>}
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Load-In {fmtLoadIn(ev.load_in_date)}</div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: pill.color, background: pill.background, border: `1px solid ${pill.border}` }}>
                {fmtStatus(ev.status)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
