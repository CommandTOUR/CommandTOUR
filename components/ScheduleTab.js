'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'
import { formatLocation } from '@/lib/locationFormat'
import { IconGripVertical, IconChevronDown, IconX, IconPlus, IconCopy, IconAlertTriangle } from '@tabler/icons-react'

const ROW_GRID = '28px 100px 100px 1.2fr 1.2fr 1.6fr 28px'

const DAY_TYPE_STYLES = {
  'Load In': { color: 'var(--status-1hold-text)', background: 'var(--status-1hold-bg)', border: 'var(--status-1hold-border)' },
  'Show Day': { color: 'var(--status-confirmed-text)', background: 'var(--status-confirmed-bg)', border: 'var(--status-confirmed-border)' },
  'Load Out': { color: 'var(--status-3hold-text)', background: 'var(--status-3hold-bg)', border: 'var(--status-3hold-border)' },
  'Day Off': { color: 'var(--status-datehold-text)', background: 'var(--status-datehold-bg)', border: 'var(--status-datehold-border)' },
}

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

const GLASS = {
  background: 'var(--glass-tile-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: 'var(--tile-border)', boxShadow: 'var(--glass-tile-shadow)', borderRadius: 'var(--tile-radius)',
  color: 'var(--text-primary)',
}

const secondaryBtnStyle = {
  fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '8px 14px', borderRadius: 8,
  border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
}

const primaryBtnStyle = {
  fontFamily: FONT, fontSize: 14, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
  border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer',
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

const headerLabelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 8px' }

const addRowBtnStyle = {
  ...secondaryBtnStyle, padding: '6px 12px', marginTop: 8, border: '0.5px dashed var(--color-info)', alignSelf: 'flex-start',
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
      style={{ display: 'grid', gridTemplateColumns: ROW_GRID, alignItems: 'center', borderBottom: '0.5px solid var(--border-default)' }}
    >
      <div style={{ cursor: 'grab', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center' }} title="Drag to reorder">
        <IconGripVertical size={16} />
      </div>
      <input className="sched-input" type="time" value={vals.time_start} onChange={e => setVals(p => ({ ...p, time_start: e.target.value }))} onBlur={() => handleBlur('time_start')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="time" value={vals.time_end} onChange={e => setVals(p => ({ ...p, time_end: e.target.value }))} onBlur={() => handleBlur('time_end')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.what} onChange={e => setVals(p => ({ ...p, what: e.target.value }))} onBlur={() => handleBlur('what')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.who} onChange={e => setVals(p => ({ ...p, who: e.target.value }))} onBlur={() => handleBlur('who')} onKeyDown={handleKeyDown} />
      <input className="sched-input" type="text" placeholder="—" value={vals.notes} onChange={e => setVals(p => ({ ...p, notes: e.target.value }))} onBlur={() => handleBlur('notes')} onKeyDown={handleKeyDown} />
      <div
        className="schedule-row-delete"
        onClick={() => onDelete(item.id)}
        style={{ cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        title="Delete row"
        aria-label="Delete row"
      ><IconX size={16} /></div>
    </div>
  )
}

function DayCard({ dateStr, dayTypes, toggleable, expanded, onToggleExpand, onToggleDayType, items, onAddRow, onUpdateRow, onDeleteRow, onDragStart, onDragOver, onDrop }) {
  const date = new Date(dateStr + 'T00:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div style={{ ...GLASS, marginBottom: 12, borderLeft: '4px solid var(--color-info)', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <div onClick={onToggleExpand} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
        <IconChevronDown size={16} color="var(--text-secondary)" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{dayName}</div>
        <div style={{ fontSize: 15, fontWeight: 450, color: 'var(--text-secondary)' }}>{dateLabel}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {dayTypes.map(dayType => {
            const pill = DAY_TYPE_STYLES[dayType] || DAY_TYPE_STYLES['Show Day']
            const clickable = toggleable && (dayType === 'Show Day' || dayType === 'Day Off')
            return (
              <span
                key={dayType}
                onClick={clickable ? (e) => { e.stopPropagation(); onToggleDayType() } : undefined}
                title={clickable ? 'Click to toggle Show Day / Day Off' : undefined}
                style={{ fontSize: 13, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: pill.color, background: pill.background, border: `0.5px solid ${pill.border}`, cursor: clickable ? 'pointer' : 'default' }}
              >
                {dayType}
              </span>
            )
          })}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 720 }}>
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
          <button onClick={onAddRow} style={addRowBtnStyle}><IconPlus size={14} /> Add Row</button>
        </div>
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
  const [saveError, setSaveError] = useState(null)
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
    const { error } = await supabase.from('event_schedule_days').upsert({ event_id: eventId, day_date: dateStr, day_type: next }, { onConflict: 'event_id,day_date' })
    if (error) {
      console.error('Failed to save day type:', error)
      setSaveError('Failed to save. Please try again.')
      setDayOverrides(prev => ({ ...prev, [dateStr]: current }))
    }
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
    const oldValue = items.find(i => i.id === id)?.[field]
    setItems(current => current.map(i => i.id === id ? { ...i, [field]: value } : i))
    const supabase = getSupabase()
    const { error } = await supabase.from('schedule_items').update({ [field]: value || null }).eq('id', id)
    if (error) {
      console.error('Failed to update row:', error)
      setSaveError('Failed to save. Please try again.')
      setItems(current => current.map(i => i.id === id ? { ...i, [field]: oldValue ?? null } : i))
    }
  }

  const handleDeleteRow = async (id) => {
    const deleted = items.find(i => i.id === id)
    setItems(current => current.filter(i => i.id !== id))
    const supabase = getSupabase()
    const { error } = await supabase.from('schedule_items').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete row:', error)
      setSaveError('Failed to delete. Please try again.')
      if (deleted) setItems(current => [...current, deleted].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    }
  }

  const handleDragStart = (dayDate, index) => { dragState.current = { dayDate, index } }

  const handleDrop = async (dayDate, dropIndex) => {
    const { dayDate: fromDay, index: fromIndex } = dragState.current
    if (fromDay !== dayDate || fromIndex === dropIndex) return
    const prevItems = [...items]
    const dayItems = items.filter(i => i.day_date === dayDate).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const [moved] = dayItems.splice(fromIndex, 1)
    dayItems.splice(dropIndex, 0, moved)
    const reordered = dayItems.map((it, idx) => ({ ...it, sort_order: idx }))
    setItems(current => [...current.filter(i => i.day_date !== dayDate), ...reordered])
    const supabase = getSupabase()
    const results = await Promise.all(reordered.map(it => supabase.from('schedule_items').update({ sort_order: it.sort_order }).eq('id', it.id)))
    const failed = results.find(r => r.error)
    if (failed) {
      console.error('Failed to reorder:', failed.error)
      setSaveError('Failed to reorder. Please try again.')
      setItems(prevItems)
    }
  }

  const openCopyModal = async () => {
    const supabase = getSupabase()
    const { data } = await supabase.from('events').select('id, city, state, country, load_in_date').eq('tour_id', tourId).neq('id', eventId).order('load_in_date', { ascending: true })
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
    if (newRows.length > 0) {
      const { error } = await supabase.from('schedule_items').insert(newRows)
      if (error) {
        console.error('Failed to copy schedule items:', error)
        setSaveError('Failed to copy schedule. Please try again.')
        setCopying(false)
        return
      }
    }

    const dayRows = Object.entries(dayOverrides).map(([dateStr, dayType]) => ({
      event_id: copyTarget,
      day_date: target?.load_in_date ? addDays(target.load_in_date, daysBetween(event.load_in_date, dateStr)) : dateStr,
      day_type: dayType,
    }))
    if (dayRows.length > 0) {
      const { error } = await supabase.from('event_schedule_days').upsert(dayRows, { onConflict: 'event_id,day_date' })
      if (error) {
        console.error('Failed to copy day overrides:', error)
        setSaveError('Failed to copy schedule. Please try again.')
        setCopying(false)
        return
      }
    }

    setCopying(false)
    setCopyDone(true)
  }

  if (loading) return <div style={{ fontSize: 16, color: 'var(--text-secondary)', fontFamily: FONT }}>Loading schedule...</div>

  return (
    <div style={{ width: '100%', fontFamily: FONT }}>
      {saveError && (
        <p role="alert" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
          <IconAlertTriangle size={16} /> {saveError}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Schedule</div>
        <button onClick={openCopyModal} style={secondaryBtnStyle}>
          <IconCopy size={16} /> Copy Schedule to Another Event
        </button>
      </div>

      {days.length === 0 && (
        <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Set a load-in date on this event to build a schedule.</div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: FONT }} onClick={() => setShowCopyModal(false)}>
          <div style={{ ...GLASS, padding: 24, width: 380, maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Copy Schedule to Another Event</div>
            {copyDone ? (
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--status-confirmed-text)' }}>Schedule copied successfully.</div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', display: 'block', marginBottom: 6 }}>Target Event</label>
                  <select
                    style={{ fontFamily: FONT, fontSize: 15, padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', cursor: 'pointer' }}
                    value={copyTarget}
                    onChange={e => setCopyTarget(e.target.value)}
                  >
                    <option value="">Select an event...</option>
                    {otherEvents.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {formatLocation(ev.city, ev.state, ev.country, 'compact')}{ev.load_in_date ? ` — ${new Date(ev.load_in_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {items.length === 0 && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>This event has no schedule items yet.</div>
                )}
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCopyModal(false)}
                style={secondaryBtnStyle}
              >
                {copyDone ? 'Close' : 'Cancel'}
              </button>
              {!copyDone && (
                <button style={{ ...primaryBtnStyle, opacity: (!copyTarget || items.length === 0 || copying) ? 0.5 : 1, cursor: (!copyTarget || items.length === 0 || copying) ? 'default' : 'pointer' }} onClick={handleCopy} disabled={!copyTarget || items.length === 0 || copying}>
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
