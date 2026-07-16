'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toYMD(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

function EventBar({ event, faded, onClick }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event) }}
      title={event.city}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '2px 7px', borderRadius: 4, marginBottom: 2,
        background: `${event.tour_color}22`,
        border: `0.5px solid ${event.tour_color}55`,
        cursor: 'pointer', opacity: faded ? 0.4 : 1,
        transition: 'opacity 0.15s, background 0.15s',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${event.tour_color}44`}
      onMouseLeave={e => e.currentTarget.style.background = `${event.tour_color}22`}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: event.tour_color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {formatLocation(event.city, event.state, event.country, 'compact')}
      </span>
    </div>
  )
}

export default function TourCalendar({ tourId, tourColor, view, currentDate }) {
  const router = useRouter()
  const today = new Date()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [overflowDay, setOverflowDay] = useState(null)
  const [overflowEvents, setOverflowEvents] = useState([])

  useEffect(() => { fetchData() }, [tourId])

  const fetchData = async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('events')
      .select('id, city, state, country, load_in_date, load_out_date, tour_id')
      .eq('tour_id', tourId)
      .order('load_in_date', { ascending: true })

    if (error) { console.error('TourCalendar error:', error); setLoading(false); return }

    setEvents((data || []).map(e => ({
      ...e,
      tour_color: tourColor || '#33FF99',
    })))
    setLoading(false)
  }

  const navigateEvent = (event) => router.push(`/tours/${event.tour_id}/events/${event.id}`)

  const getEventsForDate = (dateStr) => events.filter(e => {
    if (!e.load_in_date) return false
    const end = e.load_out_date || e.load_in_date
    return dateStr >= e.load_in_date && dateStr <= end
  })

  const getMonthGrid = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i)
      cells.push({ date, dateStr: toYMD(date), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      cells.push({ date, dateStr: toYMD(date), inMonth: true })
    }
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d)
      cells.push({ date, dateStr: toYMD(date), inMonth: false })
    }
    return cells
  }

  const getWeekDays = () => {
    const weekStart = new Date(currentDate)
    weekStart.setDate(currentDate.getDate() - currentDate.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
      return { date: d, dateStr: toYMD(d) }
    })
  }

  const todayStr = toYMD(today)
  const MAX_VISIBLE = 3
  const cells = view === 'month' ? getMonthGrid() : []
  const weekDays = view === 'week' ? getWeekDays() : []

  if (loading) return <div style={{ padding: 28, fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  const cellBorder = '0.5px solid var(--border-default)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Calendar grid */}
      <div className="glass-card" style={{ overflow: 'hidden', margin: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface-raised)', borderBottom: cellBorder }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>
          ))}
        </div>

        {view === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '110px' }}>
            {cells.map((cell, i) => {
              const dayEvents = getEventsForDate(cell.dateStr)
              const isToday = cell.dateStr === todayStr
              const visible = dayEvents.slice(0, MAX_VISIBLE)
              const overflow = dayEvents.length - MAX_VISIBLE
              return (
                <div key={i} style={{
                  borderRight: (i + 1) % 7 === 0 ? 'none' : cellBorder,
                  borderBottom: i < 35 ? cellBorder : 'none',
                  padding: '6px 5px',
                  background: isToday ? 'rgba(51,255,153,0.1)' : cell.inMonth ? 'var(--surface-card)' : 'var(--surface-default)',
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--color-mint)' : cell.inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                    marginBottom: 4, textAlign: 'right', paddingRight: 2,
                    opacity: cell.inMonth ? 1 : 0.5,
                  }}>
                    {cell.date.getDate()}
                  </div>
                  {visible.map(ev => <EventBar key={ev.id} event={ev} faded={!cell.inMonth} onClick={navigateEvent} />)}
                  {overflow > 0 && (
                    <div onClick={() => { setOverflowDay(cell.dateStr); setOverflowEvents(dayEvents) }}
                      style={{ fontSize: 10, color: 'var(--color-mint)', cursor: 'pointer', padding: '2px 7px' }}>
                      +{overflow} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {view === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '180px' }}>
            {weekDays.map((cell, i) => {
              const dayEvents = getEventsForDate(cell.dateStr)
              const isToday = cell.dateStr === todayStr
              const visible = dayEvents.slice(0, 5)
              const overflow = dayEvents.length - 5
              return (
                <div key={i} style={{
                  borderRight: i < 6 ? cellBorder : 'none',
                  padding: '8px 6px',
                  background: isToday ? 'rgba(51,255,153,0.1)' : 'var(--surface-card)',
                }}>
                  <div style={{ marginBottom: 6, textAlign: 'right', paddingRight: 2 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAYS[cell.date.getDay()]}</div>
                    <div style={{ fontSize: 20, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--color-mint)' : 'var(--text-primary)' }}>{cell.date.getDate()}</div>
                  </div>
                  {visible.map(ev => <EventBar key={ev.id} event={ev} faded={false} onClick={navigateEvent} />)}
                  {overflow > 0 && (
                    <div onClick={() => { setOverflowDay(cell.dateStr); setOverflowEvents(dayEvents) }}
                      style={{ fontSize: 10, color: 'var(--color-mint)', cursor: 'pointer', padding: '2px 7px' }}>
                      +{overflow} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Overflow popup */}
      {overflowDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOverflowDay(null)}>
          <div style={{ background: 'var(--surface-card)', backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 24, width: 320, maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>{fmt(overflowDay)}</div>
            {overflowEvents.map(ev => (
              <div key={ev.id} onClick={() => navigateEvent(ev)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: `${ev.tour_color}18`, border: `0.5px solid ${ev.tour_color}44` }}
                onMouseEnter={e => e.currentTarget.style.background = `${ev.tour_color}30`}
                onMouseLeave={e => e.currentTarget.style.background = `${ev.tour_color}18`}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.tour_color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {formatLocation(ev.city, ev.state, ev.country, 'compact')}
                </div>
              </div>
            ))}
            <button
              onClick={() => setOverflowDay(null)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', marginTop: 8 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  )
}