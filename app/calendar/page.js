'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

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
      title={`${event.city} · ${event.tour_name}`}
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
        {event.city}{event.country ? `, ${event.country_short}` : ''}
      </span>
    </div>
  )
}

export default function Calendar() {
  const router = useRouter()
  const today = new Date()
  const [view, setView] = useState('month')
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay())
    return d
  })
  const [events, setEvents] = useState([])
  const [tours, setTours] = useState([])
  const [activeTours, setActiveTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [overflowDay, setOverflowDay] = useState(null)
  const [overflowEvents, setOverflowEvents] = useState([])
  const overflowRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const supabase = getSupabase()

    const { data: toursData, error: toursError } = await supabase
      .from('tours')
      .select('id, name, color, status')
      .order('year', { ascending: true })

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, city, country, load_in_date, load_out_date, tour_id')
      .order('load_in_date', { ascending: true })

    if (toursError) console.error('Tours error:', toursError)
    if (eventsError) console.error('Events error:', eventsError)

    const resolvedTours = toursData || []
    setTours(resolvedTours)
    setActiveTours(resolvedTours.map(t => t.id))

    const resolvedEvents = eventsData || []
    setEvents(resolvedEvents.map(e => {
      const tour = resolvedTours.find(t => t.id === e.tour_id)
      return {
        ...e,
        tour_name: tour?.name ?? '—',
        tour_color: tour?.color ?? '#33FF99',
        country_short: e.country?.length > 10
          ? e.country.split(' ').map(w => w[0]).join('').toUpperCase()
          : e.country,
      }
    }))

    setLoading(false)
  }

  const navigateEvent = (event) => {
    router.push(`/tours/${event.tour_id}/events/${event.id}`)
  }

  const getEventsForDate = (dateStr) => {
    return events.filter(e => {
      if (!activeTours.includes(e.tour_id)) return false
      if (!e.load_in_date) return false
      const end = e.load_out_date || e.load_in_date
      return dateStr >= e.load_in_date && dateStr <= end
    })
  }

  const getMonthGrid = () => {
    const { year, month } = current
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const date = new Date(year, month - 1, d)
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

  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })
  const goToday = () => {
    setCurrent({ year: today.getFullYear(), month: today.getMonth() })
    const d = new Date(today); d.setDate(today.getDate() - today.getDay()); setWeekStart(new Date(d))
  }

  const getWeekDays = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    return { date: d, dateStr: toYMD(d) }
  })

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n })

  const toggleTour = (id) => setActiveTours(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const todayStr = toYMD(today)
  const MAX_VISIBLE = 3
  const cells = view === 'month' ? getMonthGrid() : []
  const weekDays = view === 'week' ? getWeekDays() : []

  const weekLabel = (() => {
    const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6)
    return `${fmt(toYMD(weekStart))} – ${fmt(toYMD(end))}`
  })()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav />

      {/* Sticky controls */}
      <div style={{ marginTop: 62, flexShrink: 0, padding: '20px 28px 14px', borderBottom: '0.5px solid var(--glass-border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Calendar</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden' }}>
              {['month', 'week'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '6px 16px',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: view === v ? 'rgba(51,255,153,0.12)' : 'transparent',
                  color: view === v ? 'var(--mint)' : 'var(--text-muted)',
                  fontWeight: view === v ? 500 : 400,
                }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {/* Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={view === 'month' ? prevMonth : prevWeek}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, padding: '4px 10px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >‹</button>
              <div style={{ fontSize: 16, fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
                {view === 'month' ? `${MONTHS[current.month]} ${current.year}` : weekLabel}
              </div>
              <button
                onClick={view === 'month' ? nextMonth : nextWeek}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, padding: '4px 10px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >›</button>
            </div>
            <button
              onClick={goToday}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '6px 14px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Today</button>
          </div>
        </div>

        {/* Tour filters */}
        {tours.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Tours:</span>
            {tours.map(t => {
              const on = activeTours.includes(t.id)
              return (
                <div key={t.id} onClick={() => toggleTour(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                  border: `0.5px solid ${on ? t.color + '88' : 'var(--glass-border)'}`,
                  background: on ? `${t.color}18` : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? t.color : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 12, color: on ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: on ? 500 : 400 }}>{t.name}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scrollable calendar area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '0.5px solid var(--glass-border)' }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>
              ))}
            </div>

            {/* MONTH VIEW */}
            {view === 'month' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '120px' }}>
                {cells.map((cell, i) => {
                  const dayEvents = getEventsForDate(cell.dateStr)
                  const isToday = cell.dateStr === todayStr
                  const visible = dayEvents.slice(0, MAX_VISIBLE)
                  const overflow = dayEvents.length - MAX_VISIBLE
                  return (
                    <div key={i} style={{
                      borderRight: (i + 1) % 7 === 0 ? 'none' : '0.5px solid var(--glass-border)',
                      borderBottom: i < 35 ? '0.5px solid var(--glass-border)' : 'none',
                      padding: '6px 5px', position: 'relative',
                      background: isToday ? 'rgba(51,255,153,0.04)' : 'transparent',
                    }}>
                      <div style={{
                        fontSize: 12, fontWeight: isToday ? 700 : 400,
                        color: isToday ? 'var(--mint)' : cell.inMonth ? 'var(--text-secondary)' : 'var(--text-muted)',
                        marginBottom: 4, textAlign: 'right', paddingRight: 2,
                        opacity: cell.inMonth ? 1 : 0.5,
                      }}>
                        {cell.date.getDate()}
                      </div>
                      {visible.map(ev => <EventBar key={ev.id} event={ev} faded={!cell.inMonth} onClick={navigateEvent} />)}
                      {overflow > 0 && (
                        <div onClick={() => { setOverflowDay(cell.dateStr); setOverflowEvents(dayEvents) }}
                          style={{ fontSize: 10, color: 'var(--mint)', cursor: 'pointer', padding: '2px 7px' }}>
                          +{overflow} more
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* WEEK VIEW */}
            {view === 'week' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '200px' }}>
                {weekDays.map((cell, i) => {
                  const dayEvents = getEventsForDate(cell.dateStr)
                  const isToday = cell.dateStr === todayStr
                  const visible = dayEvents.slice(0, 6)
                  const overflow = dayEvents.length - 6
                  return (
                    <div key={i} style={{
                      borderRight: i < 6 ? '0.5px solid var(--glass-border)' : 'none',
                      padding: '8px 6px',
                      background: isToday ? 'rgba(51,255,153,0.04)' : 'transparent',
                    }}>
                      <div style={{ marginBottom: 6, textAlign: 'right', paddingRight: 2 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAYS[cell.date.getDay()]}</div>
                        <div style={{ fontSize: 20, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--mint)' : 'var(--text-secondary)' }}>{cell.date.getDate()}</div>
                      </div>
                      {visible.map(ev => <EventBar key={ev.id} event={ev} faded={false} onClick={navigateEvent} />)}
                      {overflow > 0 && (
                        <div onClick={() => { setOverflowDay(cell.dateStr); setOverflowEvents(dayEvents) }}
                          style={{ fontSize: 10, color: 'var(--mint)', cursor: 'pointer', padding: '2px 7px' }}>
                          +{overflow} more
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overflow popup */}
      {overflowDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setOverflowDay(null)}>
          <div ref={overflowRef}
            style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 24, width: 320, maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>{fmt(overflowDay)}</div>
            {overflowEvents.map(ev => (
              <div key={ev.id} onClick={() => navigateEvent(ev)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: `${ev.tour_color}18`, border: `0.5px solid ${ev.tour_color}44` }}
                onMouseEnter={e => e.currentTarget.style.background = `${ev.tour_color}30`}
                onMouseLeave={e => e.currentTarget.style.background = `${ev.tour_color}18`}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.tour_color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {ev.city}{ev.country ? `, ${ev.country_short}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ev.tour_name}</div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setOverflowDay(null)}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '8px', borderRadius: 7, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer', marginTop: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  )
}