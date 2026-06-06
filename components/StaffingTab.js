'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

const HWSS_POSITIONS = [
  'Tour Director', 'Event Manager', 'FOH Manager', 'Tour Coordinator',
  'Registrar', 'Tech Official 1', 'Tech Official 2', 'Tech Official 3',
  'Tech Official 4', 'Tech Official 5', 'Paddock Coordinator',
  'LAV 1', 'LAV 2', 'Lighting', 'Male Host', 'Female Host', 'Host',
  'Host Trainer', 'Stunt Team 1', 'Stunt Team 2', 'Stunt Team 3',
  'Stunt Team 4',
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

function StaffSearch({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true)
      const supabase = getSupabase()
      let query = supabase.from('staff').select('id, first_name, last_name, email').order('last_name', { ascending: true })
      if (search.trim()) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      const { data } = await query.limit(10)
      setResults(data || [])
      setLoading(false)
    }
    fetchStaff()
  }, [search])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 24, width: 420, maxHeight: 500, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Assign Staff</div>
        <input ref={inputRef}
          style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No staff found.</div>}
          {results.map(s => (
            <div key={s.id} onClick={() => onSelect(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(51,255,153,0.1)', border: '0.5px solid rgba(51,255,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--mint)', flexShrink: 0 }}>
                {s.first_name?.[0]}{s.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.first_name} {s.last_name}</div>
                {s.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function StatusMenu({ assignment, onUpdate, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  return (
    <div ref={ref} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', minWidth: 140, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', marginTop: 4 }}>
      {[{ label: 'Scheduled', value: false, color: '#FFCC00' }, { label: 'Confirmed', value: true, color: '#33FF99' }].map(opt => (
        <div key={opt.label} onClick={() => onUpdate(opt.value)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: assignment.confirmed === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = assignment.confirmed === opt.value ? 'rgba(255,255,255,0.06)' : 'transparent'}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: opt.color }}>{opt.label}</span>
        </div>
      ))}
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
        value={value}
        onChange={e => setValue(e.target.value)}
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
        value={val}
        onChange={e => setVal(e.target.value)}
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

export default function StaffingTab({ eventId, event }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningPosition, setAssigningPosition] = useState(null)
  const [statusMenuPosition, setStatusMenuPosition] = useState(null)
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

  const checkDoubleBooking = async (staffId) => {
    const supabase = getSupabase()
    const loadIn = event?.load_in_date
    if (!loadIn) return false
    const { data } = await supabase
      .from('event_staff')
      .select('event_id, events(load_in_date, load_out_date, city)')
      .eq('staff_id', staffId)
      .neq('event_id', eventId)
    if (!data || data.length === 0) return false
    const thisEnd = event?.load_out_date || loadIn
    const conflict = data.find(a => {
      const otherStart = a.events?.load_in_date
      const otherEnd = a.events?.load_out_date || a.events?.load_in_date
      if (!otherStart) return false
      return loadIn <= otherEnd && thisEnd >= otherStart
    })
    return conflict ? conflict.events : false
  }

  const handleAssign = async (staffMember) => {
    const position = assigningPosition
    setAssigningPosition(null)
    const existing = getAssignment(position)
    if (existing?.staff_id === staffMember.id) return
    const conflict = await checkDoubleBooking(staffMember.id)
    if (conflict) { setConfirmOverride({ staffMember, position, conflict }); return }
    await doAssign(staffMember, position)
  }

  const doAssign = async (staffMember, position) => {
    const supabase = getSupabase()
    const existing = getAssignment(position)
    if (existing) {
      await supabase.from('event_staff').update({ staff_id: staffMember.id, confirmed: false }).eq('id', existing.id)
    } else {
      await supabase.from('event_staff').insert([{ event_id: eventId, staff_id: staffMember.id, position, confirmed: false }])
    }
    fetchAssignments()
    setConfirmOverride(null)
  }

  const handleRemove = async (position) => {
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

  const handleSetConfirmed = async (position, confirmed) => {
    const assignment = getAssignment(position)
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ confirmed }).eq('id', assignment.id)

    // Auto-add to travel grids when confirmed, flag when unconfirmed
    if (assignment.staff_id) {
      if (confirmed) {
        const existing = await supabase
          .from('event_travel_arrivals')
          .select('id')
          .eq('event_id', eventId)
          .eq('staff_id', assignment.staff_id)
          .single()
        if (existing.error) {
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

    setStatusMenuPosition(null)
    fetchAssignments()
  }

  const handleSaveNotes = async (id, notes) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ notes }).eq('id', id)
    fetchAssignments()
  }

  const handleSaveTravelIn = async (id, date) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ travel_in_date: date || null }).eq('id', id)
    fetchAssignments()
  }

  const handleSaveTravelOut = async (id, date) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ travel_out_date: date || null }).eq('id', id)
    fetchAssignments()
  }

  const handleSaveTravelType = async (id, travel_type) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ travel_type }).eq('id', id)
    fetchAssignments()
  }

  const handleSaveRental = async (id, rental_car) => {
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ rental_car }).eq('id', id)
    fetchAssignments()
  }

  const handleAddPosition = async () => {
    if (!newPosition.trim()) return
    const supabase = getSupabase()
    await supabase.from('event_staff').insert([{ event_id: eventId, position: newPosition.trim(), confirmed: false }])
    setNewPosition('')
    setAddingPosition(false)
    fetchAssignments()
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

  // flag | position | assigned | travel in | travel out | travel type | rental | notes | action
  const GRID = '28px 180px 160px 100px 100px 110px 54px 1fr 44px'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Staffing
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({filledCount}/{totalCount} filled)</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {event.event_type === 'hwss' ? 'Hot Wheels Stunt Show' : 'Hot Wheels Monster Trucks Live'}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setAddingPosition(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
          + Add Position
        </button>
      </div>

      {addingPosition && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
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

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 12px', padding: '6px 16px 10px' }}>
        <div />
        {['Position', 'Assigned', 'Travel In', 'Travel Out', 'Travel Type', 'Rental', 'Notes', ''].map((h, i) => (
          <div key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Rental' ? 'center' : 'left' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="glass-card" style={{ overflow: 'visible' }}>
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

              {/* Assigned */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
                {staff ? (
                  <>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: assignment.confirmed ? '#33FF99' : '#FFCC00' }} />
                    <div style={{ position: 'relative' }}>
                      <span
                        onClick={() => setStatusMenuPosition(statusMenuPosition === position ? null : position)}
                        style={{ fontSize: 13, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--mint)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {staff.first_name} {staff.last_name}
                      </span>
                      {statusMenuPosition === position && (
                        <StatusMenu
                          assignment={assignment}
                          onUpdate={(confirmed) => handleSetConfirmed(position, confirmed)}
                          onClose={() => setStatusMenuPosition(null)}
                        />
                      )}
                    </div>
                    {staff.attention_flag && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFCC00', flexShrink: 0 }} title={staff.attention_note || 'Needs attention'} />
                    )}
                  </>
                ) : (
                  <span onClick={() => setAssigningPosition(position)} style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}>+ Assign</span>
                )}
              </div>

              {/* Travel In */}
              <div>
                {assignment
                  ? <DateCell value={assignment.travel_in_date} onSave={(d) => handleSaveTravelIn(assignment.id, d)} />
                  : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Travel Out */}
              <div>
                {assignment
                  ? <DateCell value={assignment.travel_out_date} onSave={(d) => handleSaveTravelOut(assignment.id, d)} />
                  : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Travel Type */}
              <div>
                {assignment ? (
                  <select
                    value={assignment.travel_type || ''}
                    onChange={e => handleSaveTravelType(assignment.id, e.target.value)}
                    style={{
                      fontFamily: 'Rubik, sans-serif', fontSize: 12,
                      padding: '3px 6px', borderRadius: 5,
                      border: '0.5px solid var(--glass-border)',
                      background: 'rgba(255,255,255,0.05)',
                      color: assignment.travel_type ? 'var(--text-primary)' : 'var(--text-muted)',
                      outline: 'none', cursor: 'pointer', width: '100%',
                    }}
                  >
                    <option value="">—</option>
                    <option value="flying">Flying</option>
                    <option value="driving">Driving</option>
                    <option value="other">Other</option>
                  </select>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Rental — centered checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {assignment ? (
                  <div
                    onClick={() => handleSaveRental(assignment.id, !assignment.rental_car)}
                    style={{
                      width: 16, height: 16, borderRadius: 4, cursor: 'pointer',
                      background: assignment.rental_car ? 'var(--mint)' : 'transparent',
                      border: assignment.rental_car ? 'none' : '1.5px solid var(--glass-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
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
              <div>
                {assignment
                  ? <NotesCell assignment={assignment} onSave={handleSaveNotes} />
                  : <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.3 }}>—</span>}
              </div>

              {/* Remove */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  onClick={() => handleRemove(position)}
                  style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, opacity: 0.4 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = '0.4' }}
                >×</div>
              </div>
            </div>
          )
        })}
      </div>

      {assigningPosition && <StaffSearch onSelect={handleAssign} onClose={() => setAssigningPosition(null)} />}

      {confirmOverride && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>Double Booking Warning</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {confirmOverride.staffMember.first_name} {confirmOverride.staffMember.last_name} is already assigned to another event during this window
              {confirmOverride.conflict.city && ` (${confirmOverride.conflict.city})`}. Assign them anyway?
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