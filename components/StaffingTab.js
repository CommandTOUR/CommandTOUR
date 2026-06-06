'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

const HWSS_POSITIONS = [
  'Tour Director', 'Event Manager', 'FOH Manager', 'Tour Coordinator',
  'Registrar', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3',
  'Tech Official 4', 'Tech Official 5', 'Paddock Coordinator',
  'LAV 1', 'LAV 2', 'Lighting', 'Male Host', 'Female Host', 'Host',
  'Host Trainer', 'Stunt Team 1', 'Stunt Team 2', 'Stunt Team 3', 'Stunt Team 4',
]

const HWMT_POSITIONS = [
  'Tour Director', 'Event Manager', 'FOH Manager', 'Registrar / GLT',
  'Lead Tech Official', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3',
  'Tech Official 4', 'Robot Operator', 'LAV 1', 'LAV 2', 'Lighting',
  'Host 1', 'Host 2', 'Host Trainer', 'FMX 1', 'FMX 2', 'FMX 3',
]

function getTemplate(eventType) {
  if (eventType === 'hwss') return HWSS_POSITIONS
  if (eventType === 'hwmt') return HWMT_POSITIONS
  return []
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: '#FFCC00', bg: 'rgba(255,204,0,0.1)', border: 'rgba(255,204,0,0.35)' },
  { value: 'confirmed', label: 'Confirmed', color: '#33FF99', bg: 'rgba(51,255,153,0.1)', border: 'rgba(51,255,153,0.35)' },
  { value: 'attention', label: 'Attention', color: '#FF3333', bg: 'rgba(255,51,51,0.1)', border: 'rgba(255,51,51,0.35)' },
]

function getStatusStyle(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

function StatusPill({ status, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = getStatusStyle(status || 'scheduled')
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, color: current.color, background: current.bg, border: `0.5px solid ${current.border}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      >
        {current.label} ▾
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', minWidth: 130, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', marginTop: 4 }}>
          {STATUS_OPTIONS.map(opt => (
            <div key={opt.value} onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = status === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent'}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: opt.color }}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesCell({ assignment, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(assignment.notes || '')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  const handleSave = async () => { setEditing(false); await onSave(assignment.id, value) }
  if (editing) {
    return (
      <input ref={inputRef}
        style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
        value={value} onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setValue(assignment.notes || '') } }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 13, cursor: 'text', color: value ? 'var(--text-secondary)' : 'transparent', minHeight: 20, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.15)'; if (!value) e.currentTarget.style.color = 'var(--text-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; if (!value) e.currentTarget.style.color = 'transparent' }}
    >
      {value || '+ add note'}
    </div>
  )
}

function DateCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  const handleSave = async () => { setEditing(false); await onSave(val) }
  if (editing) {
    return (
      <input ref={inputRef} type="date"
        style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', outline: 'none', width: '108px' }}
        value={val} onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 13, cursor: 'text', color: val ? 'var(--text-secondary)' : 'transparent', minHeight: 20, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.15)'; if (!val) e.currentTarget.style.color = 'var(--text-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; if (!val) e.currentTarget.style.color = 'transparent' }}
    >
      {fmt(val) || '+ date'}
    </div>
  )
}

// Inline staff search with availability dots
function InlineStaffSearch({ eventId, event, onSelect, onClear, onClose, hasAssignment }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [availability, setAvailability] = useState({}) // staffId -> 'free' | 'same_event' | 'conflict' | conflict event name
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const ref = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (search.trim().length < 3) { setResults([]); setAvailability({}); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabase()

      // Fetch matching staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .order('last_name', { ascending: true })
        .limit(10)

      if (!staffData || staffData.length === 0) { setResults([]); setAvailability({}); setLoading(false); return }

      setResults(staffData)

      // One query: get all event_staff for these staff IDs
      const staffIds = staffData.map(s => s.id)
      const { data: eventStaffData } = await supabase
        .from('event_staff')
        .select('staff_id, event_id, events(id, city, load_in_date, load_out_date)')
        .in('staff_id', staffIds)

      // Compute availability per staff member
      const avail = {}
      const loadIn = event?.load_in_date
      const loadOut = event?.load_out_date || loadIn

      staffIds.forEach(staffId => {
        const records = (eventStaffData || []).filter(r => r.staff_id === staffId)
        if (records.length === 0) { avail[staffId] = { status: 'free' }; return }

        // Check same event
        const sameEvent = records.find(r => r.event_id === eventId)
        if (sameEvent) { avail[staffId] = { status: 'same_event' }; return }

        // Check date overlap
        if (loadIn) {
          const conflict = records.find(r => {
            const otherStart = r.events?.load_in_date
            const otherEnd = r.events?.load_out_date || r.events?.load_in_date
            if (!otherStart) return false
            return loadIn <= otherEnd && loadOut >= otherStart
          })
          if (conflict) {
            avail[staffId] = { status: 'conflict', city: conflict.events?.city }
            return
          }
        }
        avail[staffId] = { status: 'free' }
      })

      setAvailability(avail)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const dotColor = (staffId) => {
    const a = availability[staffId]
    if (!a) return null
    if (a.status === 'free') return '#33FF99'
    if (a.status === 'same_event') return '#FFCC00'
    if (a.status === 'conflict') return '#FF3333'
    return null
  }

  const tooltip = (staffId) => {
    const a = availability[staffId]
    if (!a || a.status === 'free') return null
    if (a.status === 'same_event') return 'Already on this event'
    if (a.status === 'conflict') return `Booked — ${a.city || 'another event'}`
    return null
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, width: 280, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', marginTop: 4, overflow: 'hidden' }}>

      {/* Remove option if position is filled */}
      {hasAssignment && (
        <div onClick={onClear}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--glass-border)', background: 'rgba(255,51,51,0.05)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,51,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,51,51,0.05)'}
        >
          <span style={{ fontSize: 13, color: '#FF3333' }}>× Remove — open this position</span>
        </div>
      )}

      <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--glass-border)' }}>
        <input ref={inputRef}
          style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          placeholder="Type 3+ letters to search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        />
      </div>

      {loading && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}

      {!loading && search.trim().length >= 3 && results.length === 0 && (
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No staff found.</div>
      )}

      {results.map(s => {
        const color = dotColor(s.id)
        const tip = tooltip(s.id)
        return (
          <div key={s.id}
            onClick={() => onSelect(s, availability[s.id])}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={tip || ''}
          >
            {color && <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
            {!color && <div style={{ width: 7, height: 7, flexShrink: 0 }} />}
            <span style={{ fontSize: 13 }}>{s.first_name} {s.last_name}</span>
            {tip && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{tip}</span>}
          </div>
        )
      })}

      {/* Create new staff */}
      {search.trim().length >= 3 && (
        <div style={{ borderTop: results.length > 0 ? '0.5px solid var(--glass-border)' : 'none' }}>
          <div
            onClick={() => {
              const parts = search.trim().split(' ')
              onSelect({ _create: true, first_name: parts[0], last_name: parts.length > 1 ? parts.slice(1).join(' ') : '—' }, null)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(51,255,153,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 13, color: 'var(--mint)' }}>+ Create "{search.trim()}" as new staff member</span>
          </div>
        </div>
      )}
    </div>
  )
}

function AssignedCell({ assignment, staff, position, eventId, event, onAssign, onClear }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (!staff) {
    return (
      <div style={{ position: 'relative' }}>
        <span onClick={() => setOpen(true)} style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}>+ Assign</span>
        {open && (
          <InlineStaffSearch
            eventId={eventId} event={event}
            onSelect={(s, avail) => { setOpen(false); onAssign(s, avail, position) }}
            onClear={() => { setOpen(false) }}
            onClose={() => setOpen(false)}
            hasAssignment={false}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 13 }}>{staff.first_name} {staff.last_name}</span>
      {hovered && (
        <div onClick={() => setOpen(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.08)', cursor: 'pointer', flexShrink: 0 }}
          title="Reassign or remove"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M1 4h9M7 1l3 3-3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 10H4M7 7l-3 3 3 3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      {open && (
        <InlineStaffSearch
          eventId={eventId} event={event}
          onSelect={(s, avail) => { setOpen(false); onAssign(s, avail, position) }}
          onClear={() => { setOpen(false); onClear(position) }}
          onClose={() => setOpen(false)}
          hasAssignment={true}
        />
      )}
    </div>
  )
}

export default function StaffingTab({ eventId, event }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const [newPosition, setNewPosition] = useState('')
  const [addingPosition, setAddingPosition] = useState(false)
  const [hiddenTemplatePositions, setHiddenTemplatePositions] = useState([])

  const template = getTemplate(event?.event_type)

  useEffect(() => { fetchAssignments() }, [eventId])

  const fetchAssignments = async () => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('event_staff')
      .select('*, staff(id, first_name, last_name, attention_flag, attention_note)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    setAssignments(data || [])
    setLoading(false)
  }

  const templatePositions = template.length > 0 ? template : []
  const customPositions = assignments.filter(a => !templatePositions.includes(a.position)).map(a => a.position)
  const visibleTemplatePositions = templatePositions.filter(p => !hiddenTemplatePositions.includes(p))
  const allPositions = [...new Set([...visibleTemplatePositions, ...customPositions])]

  const getAssignment = (position) => assignments.find(a => a.position === position)

  const handleAssign = async (staffMember, avail, position) => {
    // If _create flag, insert new staff first
    if (staffMember._create) {
      const supabase = getSupabase()
      const { data, error } = await supabase.from('staff').insert([{ first_name: staffMember.first_name, last_name: staffMember.last_name }]).select().single()
      if (!error && data) await doAssign(data, position)
      return
    }

    // Check if override needed
    if (avail?.status === 'same_event' || avail?.status === 'conflict') {
      setConfirmOverride({ staffMember, position, avail })
      return
    }
    await doAssign(staffMember, position)
  }

  const doAssign = async (staffMember, position) => {
    const supabase = getSupabase()
    const existing = getAssignment(position)
    if (existing) {
      await supabase.from('event_staff').update({ staff_id: staffMember.id, status: 'scheduled', confirmed: false }).eq('id', existing.id)
    } else {
      await supabase.from('event_staff').insert([{ event_id: eventId, staff_id: staffMember.id, position, status: 'scheduled', confirmed: false }])
    }
    fetchAssignments()
    setConfirmOverride(null)
  }

  const handleClearPosition = async (position) => {
    const assignment = getAssignment(position)
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').delete().eq('id', assignment.id)
    fetchAssignments()
  }

  const handleRemovePosition = async (position) => {
    const assignment = getAssignment(position)
    if (assignment) {
      const supabase = getSupabase()
      await supabase.from('event_staff').delete().eq('id', assignment.id)
      await fetchAssignments()
    }
    if (templatePositions.includes(position)) {
      setHiddenTemplatePositions(prev => [...prev, position])
    }
  }

  const handleSetStatus = async (position, newStatus) => {
    const assignment = getAssignment(position)
    if (!assignment) return
    const supabase = getSupabase()
    const confirmed = newStatus === 'confirmed'
    await supabase.from('event_staff').update({ status: newStatus, confirmed }).eq('id', assignment.id)
    if (assignment.staff_id) {
      if (confirmed) {
        const existing = await supabase.from('event_travel_arrivals').select('id').eq('event_id', eventId).eq('staff_id', assignment.staff_id).maybeSingle()
        if (!existing.data) {
          await supabase.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
          await supabase.from('event_travel_departures').insert([{ event_id: eventId, staff_id: assignment.staff_id }])
        } else {
          await supabase.from('event_travel_arrivals').update({ flagged: false }).eq('event_id', eventId).eq('staff_id', assignment.staff_id)
          await supabase.from('event_travel_departures').update({ flagged: false }).eq('event_id', eventId).eq('staff_id', assignment.staff_id)
        }
      } else {
        await supabase.from('event_travel_arrivals').update({ flagged: true }).eq('event_id', eventId).eq('staff_id', assignment.staff_id)
        await supabase.from('event_travel_departures').update({ flagged: true }).eq('event_id', eventId).eq('staff_id', assignment.staff_id)
      }
    }
    fetchAssignments()
  }

  const handleSaveNotes = async (id, notes) => { const s = getSupabase(); await s.from('event_staff').update({ notes }).eq('id', id); fetchAssignments() }
  const handleSaveTravelIn = async (id, date) => { const s = getSupabase(); await s.from('event_staff').update({ travel_in_date: date || null }).eq('id', id); fetchAssignments() }
  const handleSaveTravelOut = async (id, date) => { const s = getSupabase(); await s.from('event_staff').update({ travel_out_date: date || null }).eq('id', id); fetchAssignments() }
  const handleSaveTravelType = async (id, travel_type) => { const s = getSupabase(); await s.from('event_staff').update({ travel_type }).eq('id', id); fetchAssignments() }
  const handleSaveRental = async (id, rental_car) => { const s = getSupabase(); await s.from('event_staff').update({ rental_car }).eq('id', id); fetchAssignments() }

  const handleAddPosition = async () => {
    if (!newPosition.trim()) return
    const supabase = getSupabase()
    await supabase.from('event_staff').insert([{ event_id: eventId, position: newPosition.trim(), confirmed: false, status: 'scheduled' }])
    setNewPosition(''); setAddingPosition(false); fetchAssignments()
  }

  const filledCount = assignments.filter(a => a.staff_id).length
  const totalCount = allPositions.length

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  if (!event?.event_type) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>No event type set</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Set the event type in Edit Event to load the staffing template</div>
    </div>
  )

  // flag | position | assigned | status | travel in | travel out | travel type | rental | notes | action
  const GRID = '28px 180px 160px 110px 100px 100px 110px 54px 1fr 44px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Staffing
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({filledCount}/{totalCount} filled)</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {event.event_type === 'hwss' ? 'Hot Wheels Stunt Show' : 'Hot Wheels Monster Trucks Live'}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setAddingPosition(true)} style={{ fontSize: 12, padding: '6px 14px' }}>+ Add Position</button>
      </div>

      {addingPosition && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <input
            style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '8px 12px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', flex: 1 }}
            placeholder="Position title..."
            value={newPosition}
            onChange={e => setNewPosition(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddPosition(); if (e.key === 'Escape') setAddingPosition(false) }}
            autoFocus
          />
          <button className="btn-primary" onClick={handleAddPosition} style={{ fontSize: 13 }}>Add</button>
          <button onClick={() => { setAddingPosition(false); setNewPosition('') }} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Scrollable table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 12, border: '0.5px solid var(--glass-border)' }}>

        {/* Sticky column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: GRID, gap: '0 12px',
          padding: '8px 16px',
          position: 'sticky', top: 0, zIndex: 10,
          background: '#0d1f3a',
          borderBottom: '0.5px solid var(--glass-border)',
        }}>
          <div />
          {['Position', 'Assigned', 'Status', 'Travel In', 'Travel Out', 'Travel Type', 'Rental', 'Notes', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Rental' ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {allPositions.map((position, i) => {
          const assignment = getAssignment(position)
          const staff = assignment?.staff
          const isOpen = !assignment?.staff_id
          const isLast = i === allPositions.length - 1

          return (
            <div key={position} style={{
              display: 'grid', gridTemplateColumns: GRID,
              gap: '0 12px', padding: '11px 16px',
              borderBottom: isLast ? 'none' : '0.5px solid var(--glass-border)',
              alignItems: 'center',
              background: 'var(--glass-bg)',
            }}>
              {/* Flag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isOpen && (
                  <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                    <path d="M1 1v11" stroke="#FFCC00" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M1 1.5h8L6.5 5l2.5 3.5H1" stroke="#FFCC00" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Position */}
              <div style={{ fontSize: 13, color: isOpen ? 'var(--text-muted)' : 'var(--text-primary)' }}>{position}</div>

              {/* Assigned — inline search */}
              <AssignedCell
                assignment={assignment}
                staff={staff}
                position={position}
                eventId={eventId}
                event={event}
                onAssign={handleAssign}
                onClear={handleClearPosition}
              />

              {/* Status pill */}
              <div>
                {assignment?.staff_id ? (
                  <StatusPill status={assignment.status || 'scheduled'} onChange={(s) => handleSetStatus(position, s)} />
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Travel In */}
              <div>{assignment ? <DateCell value={assignment.travel_in_date} onSave={(d) => handleSaveTravelIn(assignment.id, d)} /> : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}</div>

              {/* Travel Out */}
              <div>{assignment ? <DateCell value={assignment.travel_out_date} onSave={(d) => handleSaveTravelOut(assignment.id, d)} /> : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}</div>

              {/* Travel Type */}
              <div>
                {assignment ? (
                  <select value={assignment.travel_type || ''} onChange={e => handleSaveTravelType(assignment.id, e.target.value)}
                    style={{ fontFamily: 'Rubik, sans-serif', fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: assignment.travel_type ? 'var(--text-primary)' : 'var(--text-muted)', outline: 'none', cursor: 'pointer', width: '100%' }}
                  >
                    <option value="">—</option>
                    <option value="flying">Flying</option>
                    <option value="driving">Driving</option>
                    <option value="other">Other</option>
                  </select>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Rental */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {assignment ? (
                  <div onClick={() => handleSaveRental(assignment.id, !assignment.rental_car)}
                    style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', background: assignment.rental_car ? 'var(--mint)' : 'transparent', border: assignment.rental_car ? 'none' : '1.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  >
                    {assignment.rental_car && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#0a1628" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Notes */}
              <div>{assignment ? <NotesCell assignment={assignment} onSave={handleSaveNotes} /> : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}</div>

              {/* Remove */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div onClick={() => handleRemovePosition(position)}
                  style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, opacity: 0.4 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0.4' }}
                >×</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Override confirmation */}
      {confirmOverride && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>
              {confirmOverride.avail?.status === 'same_event' ? 'Already On This Event' : 'Double Booking Warning'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {confirmOverride.avail?.status === 'same_event'
                ? `${confirmOverride.staffMember.first_name} ${confirmOverride.staffMember.last_name} is already assigned to another position on this event. Assign them here as well?`
                : `${confirmOverride.staffMember.first_name} ${confirmOverride.staffMember.last_name} is already booked on another event${confirmOverride.avail?.city ? ` (${confirmOverride.avail.city})` : ''}. Assign anyway?`
              }
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmOverride(null)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => doAssign(confirmOverride.staffMember, confirmOverride.position)} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}>Assign Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}