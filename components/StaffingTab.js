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
      let query = supabase.from('staff').select('id, first_name, last_name, phone, email').order('last_name', { ascending: true })
      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }
      const { data } = await query.limit(10)
      setResults(data || [])
      setLoading(false)
    }
    fetchStaff()
  }, [search])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={{ background: '#0d1f3a', border: '0.5px solid var(--glass-border)', borderRadius: 12, padding: 24, width: 420, maxHeight: 500, display: 'flex', flexDirection: 'column', gap: 16 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>Assign Staff</div>
        <input
          ref={inputRef}
          style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No staff found.</div>}
          {results.map(s => (
            <div key={s.id}
              onClick={() => onSelect(s)}
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
        <button onClick={onClose} style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function StaffingTab({ eventId, event }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningPosition, setAssigningPosition] = useState(null)
  const [confirmOverride, setConfirmOverride] = useState(null)
  const [newPosition, setNewPosition] = useState('')
  const [addingPosition, setAddingPosition] = useState(false)

  const template = getTemplate(event?.event_type)

  useEffect(() => {
    fetchAssignments()
  }, [eventId])

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

  // Build position list — template positions first, then any custom ones added
  const templatePositions = template.length > 0 ? template : []
  const customPositions = assignments.filter(a => !templatePositions.includes(a.position)).map(a => a.position)
  const allPositions = [...new Set([...templatePositions, ...customPositions])]

  const getAssignment = (position) => assignments.find(a => a.position === position)

  const checkDoubleBooking = async (staffId, position) => {
    const supabase = getSupabase()
    const loadIn = event?.load_in_date
    const lastShow = event?.load_out_date

    if (!loadIn) return false

    // Get all other event assignments for this staff member
    const { data } = await supabase
      .from('event_staff')
      .select('event_id, events(load_in_date, load_out_date, city)')
      .eq('staff_id', staffId)
      .neq('event_id', eventId)

    if (!data || data.length === 0) return false

    // Check for date overlap
    const conflict = data.find(a => {
      const otherStart = a.events?.load_in_date
      const otherEnd = a.events?.load_out_date || a.events?.load_in_date
      const thisEnd = lastShow || loadIn
      if (!otherStart) return false
      return loadIn <= otherEnd && thisEnd >= otherStart
    })

    return conflict ? conflict.events : false
  }

  const handleAssign = async (staffMember) => {
    const position = assigningPosition
    setAssigningPosition(null)

    // Check if same person already assigned to same position
    const existing = getAssignment(position)
    if (existing?.staff_id === staffMember.id) return

    // Check double booking
    const conflict = await checkDoubleBooking(staffMember.id, position)
    if (conflict) {
      setConfirmOverride({ staffMember, position, conflict })
      return
    }

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
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').delete().eq('id', assignment.id)
    fetchAssignments()
  }

  const handleToggleConfirmed = async (position) => {
    const assignment = getAssignment(position)
    if (!assignment) return
    const supabase = getSupabase()
    await supabase.from('event_staff').update({ confirmed: !assignment.confirmed }).eq('id', assignment.id)
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

  const handleDeletePosition = async (position) => {
    const assignment = getAssignment(position)
    if (assignment) {
      const supabase = getSupabase()
      await supabase.from('event_staff').delete().eq('id', assignment.id)
    }
    // For template positions with no assignment, just remove from view by adding a "hidden" marker
    // We don't need to do anything since template positions without assignments are generated from the template array
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Staffing
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              ({filledCount}/{totalCount} filled)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {event.event_type === 'hwss' ? 'Hot Wheels Stunt Show' : 'Hot Wheels Monster Trucks Live'}
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => setAddingPosition(true)}
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          + Add Position
        </button>
      </div>

      {/* Add position form */}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0 16px', padding: '6px 16px 10px', marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Position</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned</div>
        <div style={{ width: 60 }} />
      </div>

      {/* Position rows */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {allPositions.map((position, i) => {
          const assignment = getAssignment(position)
          const staff = assignment?.staff
          const isOpen = !assignment?.staff_id
          const isLast = i === allPositions.length - 1

          return (
            <div
              key={position}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr auto',
                gap: '0 16px', padding: '13px 16px',
                borderBottom: isLast ? 'none' : '0.5px solid var(--glass-border)',
                alignItems: 'center',
              }}
            >
              {/* Position name + open flag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOpen && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M6 1v7M3 5l3-4 3 4" stroke="#FFCC00" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 10h8" stroke="#FFCC00" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                )}
                <span style={{ fontSize: 14, color: isOpen ? 'var(--text-muted)' : 'var(--text-primary)' }}>{position}</span>
              </div>

              {/* Assigned staff */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {staff ? (
                  <>
                    <div
                      onClick={() => handleToggleConfirmed(position)}
                      style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: assignment.confirmed ? '#33FF99' : '#FFCC00', transition: 'background 0.15s' }}
                      title={assignment.confirmed ? 'Confirmed — click to unconfirm' : 'Scheduled — click to confirm'}
                    />
                    <span
                      onClick={() => setAssigningPosition(position)}
                      style={{ fontSize: 14, cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--mint)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    >
                      {staff.first_name} {staff.last_name}
                    </span>
                    {staff.attention_flag && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFCC00', flexShrink: 0 }} title={staff.attention_note || 'Needs attention'} />
                    )}
                  </>
                ) : (
                  <span
                    onClick={() => setAssigningPosition(position)}
                    style={{ fontSize: 13, color: 'var(--mint)', cursor: 'pointer' }}
                  >
                    + Assign
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: 60, justifyContent: 'flex-end' }}>
                {staff && (
                  <div
                    onClick={() => handleRemove(position)}
                    style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >×</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Staff search modal */}
      {assigningPosition && (
        <StaffSearch
          onSelect={handleAssign}
          onClose={() => setAssigningPosition(null)}
        />
      )}

      {/* Double booking confirmation */}
      {confirmOverride && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,204,0,0.4)', borderRadius: 12, padding: 28, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#FFCC00' }}>Double Booking Warning</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {confirmOverride.staffMember.first_name} {confirmOverride.staffMember.last_name} is already assigned to another event during this window
              {confirmOverride.conflict.city && ` (${confirmOverride.conflict.city})`}.
              Assign them anyway?
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmOverride(null)}
                style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: '0.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => doAssign(confirmOverride.staffMember, confirmOverride.position)}
                style={{ fontFamily: 'Rubik, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 7, border: 'none', background: '#FFCC00', color: '#0a1628', cursor: 'pointer', fontWeight: 500 }}
              >
                Assign Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}