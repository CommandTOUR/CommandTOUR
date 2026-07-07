'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { IconX, IconChevronDown, IconChevronRight, IconFlag } from '@tabler/icons-react'

function staffDisplayName(staff) {
  if (!staff) return ''
  return staff.display_name?.trim() || `${staff.first_name} ${staff.last_name}`
}

const STATUS_COLORS = { confirmed: 'var(--color-mint)', pending: 'var(--color-yellow)', needs_attention: 'var(--color-red)' }

function formatStatusLabel(s) {
  if (!s) return null
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GRID = '220px 160px 100px 100px 100px 1fr 30px'

function StaffPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    const timer = setTimeout(async () => {
      if (!q) { setResults([]); return }
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase
        .from('staff')
        .select('id, first_name, last_name, display_name')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .order('last_name', { ascending: true })
        .limit(6)
      setResults(data || [])
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        placeholder="Search staff..."
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {query.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 8, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {loading && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>}
          {!loading && results.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No results</div>}
          {results.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {staffDisplayName(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InlineDateCell({ value, disabled, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  if (disabled) return <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.4 }}>—</span>

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { setEditing(false); onSave(val || null) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); onSave(val || null) }
          if (e.key === 'Escape') { setEditing(false); setVal(value || '') }
        }}
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: 108 }}
      />
    )
  }
  return (
    <span onClick={() => { setVal(value || ''); setEditing(true) }} style={{ fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
      {fmtDate(value) || '+ date'}
    </span>
  )
}

function InlineTextCell({ value, disabled, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  if (disabled) return <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.4 }}>—</span>

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { setEditing(false); onSave(val) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); onSave(val) }
          if (e.key === 'Escape') { setEditing(false); setVal(value || '') }
        }}
        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
    )
  }
  return (
    <span onClick={() => { setVal(value || ''); setEditing(true) }} style={{ fontSize: 13, color: value ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {value || '+ add note'}
    </span>
  )
}

function PositionSlotRow({ tourPositionId, slotIndex, title, assignment, onAssign, onRemove, onSaveField, isLast }) {
  const [picking, setPicking] = useState(false)
  const hasStaff = !!(assignment && assignment.staff_id && assignment.staff)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 12px', padding: '10px 16px', borderBottom: isLast ? 'none' : '1px solid var(--border-card)', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {!hasStaff && <IconFlag size={12} color="var(--color-mint)" style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      </div>

      <div style={{ position: 'relative' }}>
        {picking ? (
          <StaffPicker
            onSelect={s => { setPicking(false); onAssign(tourPositionId, slotIndex, s) }}
            onClose={() => setPicking(false)}
          />
        ) : hasStaff ? (
          <span onClick={() => setPicking(true)} style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
            {staffDisplayName(assignment.staff)}
          </span>
        ) : (
          <span onClick={() => setPicking(true)} style={{ fontSize: 13, color: 'var(--color-mint)', cursor: 'pointer' }}>+ Assign</span>
        )}
      </div>

      <div>
        {assignment?.status ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[assignment.status] || 'var(--text-muted)' }}>{formatStatusLabel(assignment.status)}</span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.4 }}>—</span>
        )}
      </div>

      <div><InlineDateCell value={assignment?.travel_in_date} disabled={!assignment} onSave={v => onSaveField(assignment, 'travel_in_date', v)} /></div>
      <div><InlineDateCell value={assignment?.travel_out_date} disabled={!assignment} onSave={v => onSaveField(assignment, 'travel_out_date', v)} /></div>
      <div><InlineTextCell value={assignment?.notes} disabled={!assignment} onSave={v => onSaveField(assignment, 'notes', v)} /></div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {hasStaff && (
          <button
            onClick={() => onRemove(tourPositionId, slotIndex)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <IconX size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function DepartmentSection({ dept, expanded, onToggle, filledCount, totalCount, renderSlot }) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-card)', userSelect: 'none' }}
      >
        {expanded ? <IconChevronDown size={14} color="var(--text-muted)" /> : <IconChevronRight size={14} color="var(--text-muted)" />}
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>{dept.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({filledCount}/{totalCount})</span>
      </div>
      {expanded && dept.positions.map(pos => (
        Array.from({ length: pos.quantityNeeded }, (_, i) => i + 1).map(slotIndex => renderSlot(pos, slotIndex))
      ))}
    </div>
  )
}

function AddPositionExceptionModal({ tourId, eventId, existingTourPositions, onClose, onAdded }) {
  const [allDepartments, setAllDepartments] = useState([])
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('departments')
        .select('*, positions(*)')
        .order('sort_order', { ascending: true })
      const depts = (data || []).map(d => ({
        ...d,
        positions: [...(d.positions || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
      setAllDepartments(depts)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handleAdd = async () => {
    if (!selectedPositionId || saving) return
    setSaving(true)
    const supabase = getSupabase()
    let tourPositionId = existingTourPositions.find(tp => tp.position_id === selectedPositionId)?.id
    if (!tourPositionId) {
      const { data, error } = await supabase
        .from('tour_positions')
        .insert({ tour_id: tourId, position_id: selectedPositionId, quantity_needed: quantity })
        .select()
        .single()
      if (error || !data) { setSaving(false); return }
      tourPositionId = data.id
    }
    for (let i = 1; i <= quantity; i++) {
      await supabase.from('staff_assignments').insert({ tour_position_id: tourPositionId, slot_index: i, staff_id: null, event_id: eventId })
    }
    setSaving(false)
    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: 24, width: 420 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Add Position for This Event</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>This won&rsquo;t affect the tour&rsquo;s baseline staffing.</div>

        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Loading positions...</div>
        ) : (
          <>
            <select
              value={selectedPositionId}
              onChange={e => setSelectedPositionId(e.target.value)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', marginBottom: 16, cursor: 'pointer' }}
            >
              <option value="">Select a position...</option>
              {allDepartments.map(dept => (
                <optgroup key={dept.id} label={dept.name}>
                  {dept.positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {selectedPositionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Quantity</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-card)', background: 'var(--bg-card-hover)', color: 'var(--text-primary)', cursor: quantity <= 1 ? 'default' : 'pointer', opacity: quantity <= 1 ? 0.4 : 1 }}
                  >−</button>
                  <span style={{ width: 30, textAlign: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(10, q + 1))}
                    disabled={quantity >= 10}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-card)', background: 'var(--bg-card-hover)', color: 'var(--text-primary)', cursor: quantity >= 10 ? 'default' : 'pointer', opacity: quantity >= 10 ? 0.4 : 1 }}
                  >+</button>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={handleAdd} disabled={!selectedPositionId || saving}>
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffingTab({ tourId, eventId, event }) {
  const router = useRouter()
  const effectiveTourId = tourId || event?.tour_id
  const [departments, setDepartments] = useState([])
  const [assignments, setAssignments] = useState([])
  const [tourPositions, setTourPositions] = useState([])
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showAddException, setShowAddException] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey(k => k + 1)

  useEffect(() => {
    const loadData = async () => {
      if (!effectiveTourId) { setLoading(false); return }
      const supabase = getSupabase()
      const { data: tps } = await supabase
        .from('tour_positions')
        .select(`
          id,
          position_id,
          quantity_needed,
          position:positions(
            id,
            title,
            sort_order,
            department:departments(id, name, sort_order)
          )
        `)
        .eq('tour_id', effectiveTourId)
        .order('created_at', { ascending: true })

      const tourPositionsData = tps || []
      const tpIds = tourPositionsData.map(tp => tp.id)
      setTourPositions(tourPositionsData)

      let assignmentsData = []
      if (tpIds.length > 0) {
        const { data } = await supabase
          .from('staff_assignments')
          .select(`
            id,
            tour_position_id,
            slot_index,
            staff_id,
            event_id,
            status,
            confirmed,
            notes,
            travel_in_date,
            travel_out_date,
            staff:staff(id, first_name, last_name, display_name)
          `)
          .in('tour_position_id', tpIds)
          .or(`event_id.is.null,event_id.eq.${eventId}`)
        assignmentsData = data || []
      }

      const deptMap = {}
      tourPositionsData.forEach(tp => {
        const dept = tp.position.department
        if (!deptMap[dept.id]) deptMap[dept.id] = { id: dept.id, name: dept.name, sortOrder: dept.sort_order, positions: [] }
        deptMap[dept.id].positions.push({
          tourPositionId: tp.id,
          title: tp.position.title,
          sortOrder: tp.position.sort_order,
          quantityNeeded: tp.quantity_needed,
        })
      })
      const deptList = Object.values(deptMap)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(d => ({ ...d, positions: d.positions.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) }))

      setDepartments(deptList)
      setAssignments(assignmentsData)
      setExpandedDepts(new Set(deptList.map(d => d.id)))
      setLoading(false)
    }
    loadData()
  }, [effectiveTourId, eventId, reloadKey])

  const toggleDept = (id) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const findEffectiveAssignment = (tourPositionId, slotIndex) => {
    const eventRow = assignments.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex && a.event_id === eventId)
    if (eventRow) return eventRow
    return assignments.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex && a.event_id === null) || null
  }

  const handleAssign = async (tourPositionId, slotIndex, staffMember) => {
    const supabase = getSupabase()
    const existingEventRow = assignments.find(a => a.tour_position_id === tourPositionId && a.slot_index === slotIndex && a.event_id === eventId)
    if (existingEventRow) {
      const { error } = await supabase.from('staff_assignments').update({ staff_id: staffMember.id }).eq('id', existingEventRow.id)
      if (!error) {
        setAssignments(prev => prev.map(a => a.id === existingEventRow.id ? { ...a, staff_id: staffMember.id, staff: staffMember } : a))
      }
    } else {
      const { data, error } = await supabase
        .from('staff_assignments')
        .insert({ tour_position_id: tourPositionId, slot_index: slotIndex, staff_id: staffMember.id, event_id: eventId })
        .select()
        .single()
      if (!error && data) {
        setAssignments(prev => [...prev, { ...data, staff: staffMember }])
      }
    }
  }

  const handleRemove = async (tourPositionId, slotIndex) => {
    const resolved = findEffectiveAssignment(tourPositionId, slotIndex)
    if (!resolved) return
    const supabase = getSupabase()
    if (resolved.event_id === eventId) {
      setAssignments(prev => prev.filter(a => a.id !== resolved.id))
      const { error } = await supabase.from('staff_assignments').delete().eq('id', resolved.id)
      if (error) reload()
    } else {
      const { data, error } = await supabase
        .from('staff_assignments')
        .insert({ tour_position_id: tourPositionId, slot_index: slotIndex, staff_id: null, event_id: eventId })
        .select()
        .single()
      if (!error && data) setAssignments(prev => [...prev, data])
    }
  }

  const handleSaveField = async (assignment, field, value) => {
    if (!assignment) return
    const supabase = getSupabase()
    const { error } = await supabase.from('staff_assignments').update({ [field]: value }).eq('id', assignment.id)
    if (!error) setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, [field]: value } : a))
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  const isEmpty = departments.length === 0

  const slotFilled = (pos, slotIndex) => {
    const a = findEffectiveAssignment(pos.tourPositionId, slotIndex)
    return !!(a && a.staff_id)
  }
  const deptCounts = (dept) => {
    let total = 0, filled = 0
    dept.positions.forEach(pos => {
      Array.from({ length: pos.quantityNeeded }, (_, i) => i + 1).forEach(slotIndex => {
        total += 1
        if (slotFilled(pos, slotIndex)) filled += 1
      })
    })
    return { total, filled }
  }
  const totals = departments.reduce((acc, d) => {
    const { total, filled } = deptCounts(d)
    return { total: acc.total + total, filled: acc.filled + filled }
  }, { total: 0, filled: 0 })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Staffing
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>({totals.filled}/{totals.total} filled)</span>
        </div>
        <button className="btn-primary" onClick={() => setShowAddException(true)} style={{ fontSize: 12, padding: '6px 14px' }}>+ Add Position</button>
      </div>

      {isEmpty ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>No positions configured for this tour.</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set up staffing in Edit Tour → Tour Staffing.</div>
          <button className="btn-primary" onClick={() => router.push(`/tours/${effectiveTourId}/edit`)}>Go to Edit Tour</button>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border-card)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 12px', padding: '8px 16px', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-card)' }}>
            {['Position', 'Assigned', 'Status', 'Travel In', 'Travel Out', 'Notes', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>

          {departments.map(dept => {
            const { total, filled } = deptCounts(dept)
            return (
              <DepartmentSection
                key={dept.id}
                dept={dept}
                expanded={expandedDepts.has(dept.id)}
                onToggle={() => toggleDept(dept.id)}
                filledCount={filled}
                totalCount={total}
                renderSlot={(pos, slotIndex) => {
                  const assignment = findEffectiveAssignment(pos.tourPositionId, slotIndex)
                  return (
                    <PositionSlotRow
                      key={`${pos.tourPositionId}-${slotIndex}`}
                      tourPositionId={pos.tourPositionId}
                      slotIndex={slotIndex}
                      title={pos.title}
                      assignment={assignment}
                      onAssign={handleAssign}
                      onRemove={handleRemove}
                      onSaveField={handleSaveField}
                    />
                  )
                }}
              />
            )
          })}
        </div>
      )}

      {showAddException && (
        <AddPositionExceptionModal
          tourId={effectiveTourId}
          eventId={eventId}
          existingTourPositions={tourPositions}
          onClose={() => setShowAddException(false)}
          onAdded={() => { setShowAddException(false); reload() }}
        />
      )}
    </div>
  )
}
