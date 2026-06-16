'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

const ROW_GRID = '28px 100px 100px 1.2fr 1.2fr 1.6fr 28px'

const DAY_TYPE_STYLES = {
  'Load In': { color: '#854d0e', background: '#fef9c3', border: '#fde68a' },
  'Show Day': { color: '#15803d', background: '#dcfce7', border: '#bbf7d0' },
  'Load Out': { color: '#dc2626', background: '#fee2e2', border: '#fecaca' },
  'Day Off': { color: '#6b6b6b', background: '#f0ece4', border: '#e8e2d9' },
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)

const headerLabelStyle = { fontSize: 10.5, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px' }

const addRowBtnStyle = {
  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, marginTop: 8,
  border: '0.5px dashed #d4cfc8', background: 'transparent', color: '#6b6b6b',
  cursor: 'pointer', alignSelf: 'flex-start',
}

function ScheduleRow({ item, onUpdate, onDelete, onDragStart, onDragOver, onDrop }) {
  const [vals, setVals] = useState({
    time_start: item.time_start || '',
    time_end: item.time_end || '',
    what: item.what || '',
    who: item.who || '',
    notes: item.notes || '',
  })

  const handleBlur = (field) => {
    if (vals[field] !== (item[field] || '')) onUpdate(item.id, field, vals[field])
  }
  const handleKeyDown = (e) => { if (e.key === 'Enter') e.target.blur() }

  return (
    <div
      className="schedule-row"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ display: 'grid', gridTemplateColumns: ROW_GRID, alignItems: 'center', borderBottom: '0.5px solid #e8e2d9' }}
    >
      <div style={{ cursor: 'grab', color: '#6b6b6b', display: 'flex', justifyContent: 'center' }} title="Drag to reorder">
        <svg width="10" height="14" viewBox="0 0 10 16" fill="none">
          <circle cx="2" cy="2" r="1.4" fill="currentColor"/><circle cx="8" cy="2" r="1.4" fill="currentColor"/>
          <circle cx="2" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/>
          <circle cx="2" cy="14" r="1.4" fill="currentColor"/><circle cx="8" cy="14" r="1.4" fill="currentColor"/>
        </svg>
      </div>
      <input className="sched-input" type="time" value={vals.time_start} onChange={e => setVals(p => ({ ...p, time_start: e.target.value }))} onBlur={() => handleBlur('time_start')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="time" value={vals.time_end} onChange={e => setVals(p => ({ ...p, time_end: e.target.value }))} onBlur={() => handleBlur('time_end')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.what} onChange={e => setVals(p => ({ ...p, what: e.target.value }))} onBlur={() => handleBlur('what')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.who} onChange={e => setVals(p => ({ ...p, who: e.target.value }))} onBlur={() => handleBlur('who')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.notes} onChange={e => setVals(p => ({ ...p, notes: e.target.value }))} onBlur={() => handleBlur('notes')} onKeyDown={handleKeyDown} />
      <div
        className="schedule-row-delete"
        onClick={() => onDelete(item.id)}
        style={{ cursor: 'pointer', color: '#6b6b6b', textAlign: 'center', fontSize: 16, lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
        onMouseLeave={e => e.currentTarget.style.color = '#6b6b6b'}
      >×</div>
    </div>
  )
}

function DayCard({ dateStr, dayTypes, toggleable, expanded, onToggleExpand, onToggleDayType, items, onAddRow, onUpdateRow, onDeleteRow, onDragStart, onDragOver, onDrop }) {
  const date = new Date(dateStr + 'T00:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="glass-card" style={{ marginBottom: 12, borderLeft: '4px solid #C9A84C', overflow: 'hidden', width: '100%' }}>
      <div onClick={onToggleExpand} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#6b6b6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{dayName}</div>
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>{dateLabel}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {dayTypes.map(dayType => {
            const pill = DAY_TYPE_STYLES[dayType] || DAY_TYPE_STYLES['Show Day']
            const clickable = toggleable && (dayType === 'Show Day' || dayType === 'Day Off')
            return (
              <span
                key={dayType}
                onClick={clickable ? (e) => { e.stopPropagation(); onToggleDayType() } : undefined}
                title={clickable ? 'Click to toggle Show Day / Day Off' : undefined}
                style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, color: pill.color, background: pill.background, border: `0.5px solid ${pill.border}`, cursor: clickable ? 'pointer' : 'default' }}
              >
                {dayType}
              </span>
            )
          })}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: ROW_GRID, padding: '0 0 8px' }}>
            <div />
            <div style={headerLabelStyle}>Time Start</div>
            <div style={headerLabelStyle}>Time End</div>
            <div style={headerLabelStyle}>What</div>
            <div style={headerLabelStyle}>Who</div>
            <div style={headerLabelStyle}>Notes</div>
            <div />
          </div>
          {items.map((item, i) => (
            <ScheduleRow
              key={item.id}
              item={item}
              onUpdate={onUpdateRow}
              onDelete={onDeleteRow}
              onDragStart={() => onDragStart(dateStr, i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(dateStr, i)}
            />
          ))}
          <button onClick={onAddRow} style={addRowBtnStyle}>+ Add Row</button>
        </div>
      )}
    </div>
  )
}

export default function ScheduleTab({ eventId, event, tourId, hasShows }) {
  const [items, setItems] = useState([])
  const [dayOverrides, setDayOverrides] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [otherEvents, setOtherEvents] = useState([])
  const [copyTarget, setCopyTarget] = useState('')
  const [copying, setCopying] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const dragState = useRef({ dayDate: null, index: null })

  const days = []
  if (event.load_in_date) {
    const end = event.load_out_date || event.load_in_date
    let cursor = event.load_in_date
    days.push(cursor)
    while (cursor < end) {
      cursor = addDays(cursor, 1)
      days.push(cursor)
    }
  }

  const [expanded, setExpanded] = useState(() => {
    const today = todayStr()
    const init = {}
    days.forEach(d => { if (d === today) init[d] = true })
    return init
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const [itemsRes, daysRes] = await Promise.all([
        supabase.from('schedule_items').select('*').eq('event_id', eventId).order('day_date', { ascending: true }).order('sort_order', { ascending: true }),
        supabase.from('event_schedule_days').select('*').eq('event_id', eventId),
      ])
      setItems(itemsRes.data || [])
      const overrides = {}
      ;(daysRes.data || []).forEach(d => { overrides[d.day_date] = d.day_type })
      setDayOverrides(overrides)
      setLoading(false)
    }
    fetchData()
  }, [eventId])

  const getDayTypes = (dateStr, idx) => {
    const types = []
    const isFirst = idx === 0
    const isLast = idx === days.length - 1
    if (isFirst) types.push('Load In')
    if (isLast) {
      if (hasShows) types.push('Show Day')
      types.push('Load Out')
    } else if (!isFirst) {
      types.push(dayOverrides[dateStr] || 'Show Day')
    }
    return types
  }

  const toggleExpand = (dateStr) => setExpanded(prev => ({ ...prev, [dateStr]: !prev[dateStr] }))

  const toggleDayType = async (dateStr) => {
    const current = dayOverrides[dateStr] || 'Show Day'
    const next = current === 'Show Day' ? 'Day Off' : 'Show Day'
    setDayOverrides(prev => ({ ...prev, [dateStr]: next }))
    const supabase = getSupabase()
    await supabase.from('event_schedule_days').upsert({ event_id: eventId, day_date: dateStr, day_type: next }, { onConflict: 'event_id,day_date' })
  }

  const handleAddRow = async (dateStr) => {
    const dayItems = items.filter(i => i.day_date === dateStr)
    const sortOrder = dayItems.length > 0 ? Math.max(...dayItems.map(i => i.sort_order || 0)) + 1 : 0
    const supabase = getSupabase()
    const { data, error } = await supabase.from('schedule_items').insert([{
      event_id: eventId,
      day_date: dateStr,
      day_type: getDayTypes(dateStr, days.indexOf(dateStr))[0],
      time_start: null,
      time_end: null,
      what: null,
      who: null,
      notes: null,
      sort_order: sortOrder,
    }]).select().single()
    if (!error) setItems(prev => [...prev, data])
  }

  const handleUpdateRow = async (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    const supabase = getSupabase()
    await supabase.from('schedule_items').update({ [field]: value || null }).eq('id', id)
  }

  const handleDeleteRow = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    const supabase = getSupabase()
    await supabase.from('schedule_items').delete().eq('id', id)
  }

  const handleDragStart = (dayDate, index) => { dragState.current = { dayDate, index } }

  const handleDrop = async (dayDate, dropIndex) => {
    const { dayDate: fromDay, index: fromIndex } = dragState.current
    if (fromDay !== dayDate || fromIndex === dropIndex) return
    const dayItems = items.filter(i => i.day_date === dayDate).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const [moved] = dayItems.splice(fromIndex, 1)
    dayItems.splice(dropIndex, 0, moved)
    const reordered = dayItems.map((it, idx) => ({ ...it, sort_order: idx }))
    setItems(prev => [...prev.filter(i => i.day_date !== dayDate), ...reordered])
    const supabase = getSupabase()
    await Promise.all(reordered.map(it => supabase.from('schedule_items').update({ sort_order: it.sort_order }).eq('id', it.id)))
  }

  const openCopyModal = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('events').select('id, city, country, load_in_date').eq('tour_id', tourId).neq('id', eventId).order('load_in_date', { ascending: true })
    setOtherEvents(data || [])
    setCopyTarget('')
    setCopyDone(false)
    setShowCopyModal(true)
  }

  const handleCopy = async () => {
    if (!copyTarget) return
    setCopying(true)
    const supabase = getSupabase()
    const target = otherEvents.find(e => e.id === copyTarget)
    const newRows = items.map(item => ({
      event_id: copyTarget,
      day_date: target?.load_in_date ? addDays(target.load_in_date, daysBetween(event.load_in_date, item.day_date)) : item.day_date,
      day_type: item.day_type,
      time_start: item.time_start,
      time_end: item.time_end,
      what: item.what,
      who: item.who,
      notes: item.notes,
      sort_order: item.sort_order,
    }))
    if (newRows.length > 0) await supabase.from('schedule_items').insert(newRows)

    const dayRows = Object.entries(dayOverrides).map(([dateStr, dayType]) => ({
      event_id: copyTarget,
      day_date: target?.load_in_date ? addDays(target.load_in_date, daysBetween(event.load_in_date, dateStr)) : dateStr,
      day_type: dayType,
    }))
    if (dayRows.length > 0) await supabase.from('event_schedule_days').upsert(dayRows, { onConflict: 'event_id,day_date' })

    setCopying(false)
    setCopyDone(true)
  }

  if (loading) return <div style={{ fontSize: 14, color: '#6b6b6b' }}>Loading schedule...</div>

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Schedule</div>
        <button
          onClick={openCopyModal}
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Copy Schedule to Another Event
        </button>
      </div>

      {days.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b6b6b' }}>Set a load-in date on this event to build a schedule.</div>
      )}

      {days.map((dateStr, idx) => {
        const dayTypes = getDayTypes(dateStr, idx)
        const toggleable = days.length > 1 && idx !== 0 && idx !== days.length - 1
        return (
          <DayCard
            key={dateStr}
            dateStr={dateStr}
            dayTypes={dayTypes}
            toggleable={toggleable}
            expanded={!!expanded[dateStr]}
            onToggleExpand={() => toggleExpand(dateStr)}
            onToggleDayType={() => toggleDayType(dateStr)}
            items={items.filter(i => i.day_date === dateStr).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))}
            onAddRow={() => handleAddRow(dateStr)}
            onUpdateRow={handleUpdateRow}
            onDeleteRow={handleDeleteRow}
            onDragStart={handleDragStart}
            onDragOver={() => {}}
            onDrop={handleDrop}
          />
        )
      })}

      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCopyModal(false)}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 24, width: 380, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Copy Schedule to Another Event</div>
            {copyDone ? (
              <div style={{ fontSize: 13, color: 'var(--mint)' }}>Schedule copied successfully.</div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Target Event</label>
                  <select
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#ffffff', outline: 'none', width: '100%', cursor: 'pointer' }}
                    value={copyTarget}
                    onChange={e => setCopyTarget(e.target.value)}
                  >
                    <option value="">Select an event...</option>
                    {otherEvents.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.city}{ev.country ? `, ${ev.country}` : ''}{ev.load_in_date ? ` — ${new Date(ev.load_in_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {items.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>This event has no schedule items yet.</div>
                )}
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCopyModal(false)}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '0.5px solid var(--mint)', background: 'transparent', color: 'var(--mint)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {copyDone ? 'Close' : 'Cancel'}
              </button>
              {!copyDone && (
                <button className="btn-primary" onClick={handleCopy} disabled={!copyTarget || items.length === 0 || copying}>
                  {copying ? 'Copying...' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
