'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../../../lib/supabase'
import TopNav from '../../../components/TopNav'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconPlus, IconTrash, IconGripVertical, IconChevronDown, IconChevronRight, IconArrowLeft } from '@tabler/icons-react'

async function persistOrder(table, list) {
  const supabase = getSupabase()
  for (let i = 0; i < list.length; i++) {
    await supabase.from(table).update({ sort_order: i }).eq('id', list[i].id)
  }
}

function PositionRow({
  dept, pos, inUse,
  editingPosId, editingPosName, onChangeEditingPosName,
  onStartEditPos, onSaveEditPos, onCancelEditPos,
  onDeletePos, saving,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pos.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const escapingRef = useRef(false)
  const isEditing = editingPosId === pos.id

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span {...attributes} {...listeners} style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}>
          <IconGripVertical size={16} />
        </span>
        {isEditing ? (
          <input
            autoFocus
            value={editingPosName}
            onChange={e => onChangeEditingPosName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); onSaveEditPos(dept.id) }
              else if (e.key === 'Escape') { e.preventDefault(); escapingRef.current = true; onCancelEditPos() }
            }}
            onBlur={() => {
              if (escapingRef.current) { escapingRef.current = false; return }
              onSaveEditPos(dept.id)
            }}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, padding: '4px 8px', outline: 'none', minWidth: 180 }}
          />
        ) : (
          <span
            onClick={() => onStartEditPos(pos)}
            style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {pos.title}
          </span>
        )}
      </div>
      <button
        onClick={() => onDeletePos(dept, pos)}
        disabled={inUse || saving}
        title={inUse ? 'Position is in use on a tour' : 'Delete position'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', padding: 4, flexShrink: 0,
          cursor: inUse ? 'default' : 'pointer', opacity: inUse ? 0.3 : 1, color: 'var(--color-red)',
        }}
      >
        <IconTrash size={15} />
      </button>
    </div>
  )
}

function DepartmentRow({
  dept, expanded, onToggleExpand,
  editingDeptId, editingDeptName, onChangeEditingDeptName,
  onStartEditDept, onSaveEditDept, onCancelEditDept, onDeleteDept,
  positionUsage,
  editingPosId, editingPosName, onChangeEditingPosName,
  onStartEditPos, onSaveEditPos, onCancelEditPos, onDeletePos,
  newPosName, newPosDeptId, onChangeNewPosName, onAddPosition,
  onPosDragEnd, sensors, saving,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dept.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const escapingRef = useRef(false)
  const isEditingName = editingDeptId === dept.id
  const canDelete = dept.positions.length === 0
  const isNewPosOwner = newPosDeptId === dept.id
  const canAddPos = isNewPosOwner && newPosName.trim().length > 0

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: 12 }}>
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div
          onClick={() => onToggleExpand(dept.id)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <span
              {...attributes} {...listeners}
              onClick={e => e.stopPropagation()}
              style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <IconGripVertical size={18} />
            </span>
            <span style={{ display: 'flex', color: 'var(--text-muted)', flexShrink: 0 }}>
              {expanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
            </span>
            {isEditingName ? (
              <input
                autoFocus
                value={editingDeptName}
                onChange={e => onChangeEditingDeptName(e.target.value)}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); onSaveEditDept() }
                  else if (e.key === 'Escape') { e.preventDefault(); escapingRef.current = true; onCancelEditDept() }
                }}
                onBlur={() => {
                  if (escapingRef.current) { escapingRef.current = false; return }
                  onSaveEditDept()
                }}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 6, padding: '4px 8px', outline: 'none', minWidth: 220 }}
              />
            ) : (
              <span
                onClick={e => { e.stopPropagation(); onStartEditDept(dept) }}
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {dept.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {dept.positions.length} {dept.positions.length === 1 ? 'position' : 'positions'}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onDeleteDept(dept) }}
              disabled={!canDelete || saving}
              title={canDelete ? 'Delete department' : 'Remove all positions first'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', padding: 4,
                cursor: canDelete ? 'pointer' : 'default', opacity: canDelete ? 1 : 0.3, color: 'var(--color-red)',
              }}
            >
              <IconTrash size={17} />
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ borderTop: '1px solid var(--border-card)' }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => onPosDragEnd(dept.id, e)}>
              <SortableContext items={dept.positions.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {dept.positions.map(pos => (
                  <PositionRow
                    key={pos.id}
                    dept={dept}
                    pos={pos}
                    inUse={!!positionUsage[pos.id]}
                    editingPosId={editingPosId}
                    editingPosName={editingPosName}
                    onChangeEditingPosName={onChangeEditingPosName}
                    onStartEditPos={onStartEditPos}
                    onSaveEditPos={onSaveEditPos}
                    onCancelEditPos={onCancelEditPos}
                    onDeletePos={onDeletePos}
                    saving={saving}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 14px 40px' }}>
              <input
                type="text"
                placeholder="New position title..."
                value={isNewPosOwner ? newPosName : ''}
                onChange={e => onChangeNewPosName(dept.id, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddPosition(dept.id) } }}
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', flex: 1, maxWidth: 260 }}
              />
              <button
                onClick={() => onAddPosition(dept.id)}
                disabled={!canAddPos || saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
                  borderRadius: 6, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                  cursor: canAddPos ? 'pointer' : 'default', opacity: canAddPos ? 1 : 0.4,
                }}
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StaffingSettingsPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [positionUsage, setPositionUsage] = useState({})

  const [editingDeptId, setEditingDeptId] = useState(null)
  const [editingDeptName, setEditingDeptName] = useState('')
  const [editingPosId, setEditingPosId] = useState(null)
  const [editingPosName, setEditingPosName] = useState('')

  const [newDeptName, setNewDeptName] = useState('')
  const [newPosName, setNewPosName] = useState('')
  const [newPosDeptId, setNewPosDeptId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const fetchDepartments = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('departments')
        .select('*, positions(*)')
        .order('sort_order', { ascending: true })
      if (!error && data) {
        setDepartments(data.map(d => ({
          ...d,
          positions: [...(d.positions || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        })))
      }
      setLoading(false)
    }
    fetchDepartments()
  }, [])

  const totalPositions = departments.reduce((sum, d) => sum + d.positions.length, 0)

  useEffect(() => {
    const positions = departments.flatMap(d => d.positions)
    if (positions.length === 0) return
    let cancelled = false
    const fetchUsage = async () => {
      const supabase = getSupabase()
      const results = {}
      for (const pos of positions) {
        const { data } = await supabase
          .from('tour_positions')
          .select('id')
          .eq('position_id', pos.id)
          .limit(1)
        results[pos.id] = !!(data && data.length > 0)
      }
      if (!cancelled) setPositionUsage(prev => ({ ...prev, ...results }))
    }
    fetchUsage()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPositions])

  const toggleExpand = (deptId) => {
    setExpandedDepts(prev => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  const startEditDept = (dept) => { setEditingDeptId(dept.id); setEditingDeptName(dept.name) }
  const cancelEditDept = () => setEditingDeptId(null)
  const saveEditDept = async () => {
    const id = editingDeptId
    if (!id) return
    const trimmed = editingDeptName.trim()
    setEditingDeptId(null)
    const dept = departments.find(d => d.id === id)
    if (!dept || !trimmed || trimmed === dept.name) return
    const duplicate = departments.some(d => d.id !== id && d.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) { alert('A department with this name already exists.'); return }
    setSaving(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('departments').update({ name: trimmed }).eq('id', id)
    if (!error) setDepartments(prev => prev.map(d => d.id === id ? { ...d, name: trimmed } : d))
    setSaving(false)
  }

  const startEditPos = (pos) => { setEditingPosId(pos.id); setEditingPosName(pos.title) }
  const cancelEditPos = () => setEditingPosId(null)
  const saveEditPos = async (deptId) => {
    const id = editingPosId
    if (!id) return
    const trimmed = editingPosName.trim()
    setEditingPosId(null)
    const dept = departments.find(d => d.id === deptId)
    const pos = dept?.positions.find(p => p.id === id)
    if (!pos || !trimmed || trimmed === pos.title) return
    const duplicate = dept.positions.some(p => p.id !== id && p.title.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) { alert('A position with this title already exists in this department.'); return }
    setSaving(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('positions').update({ title: trimmed }).eq('id', id)
    if (!error) {
      setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, positions: d.positions.map(p => p.id === id ? { ...p, title: trimmed } : p) } : d))
    }
    setSaving(false)
  }

  const deleteDepartment = async (dept) => {
    if (dept.positions.length > 0 || saving) return
    setSaving(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('departments').delete().eq('id', dept.id)
    if (!error) setDepartments(prev => prev.filter(d => d.id !== dept.id))
    setSaving(false)
  }

  const deletePosition = async (dept, pos) => {
    if (positionUsage[pos.id] || saving) return
    setSaving(true)
    const supabase = getSupabase()
    const { error } = await supabase.from('positions').delete().eq('id', pos.id)
    if (!error) {
      setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, positions: d.positions.filter(p => p.id !== pos.id) } : d))
    }
    setSaving(false)
  }

  const addDepartment = async () => {
    const trimmed = newDeptName.trim()
    if (!trimmed || saving) return
    const duplicate = departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) { alert('A department with this name already exists.'); return }
    setSaving(true)
    const supabase = getSupabase()
    const maxSort = departments.reduce((max, d) => Math.max(max, d.sort_order ?? 0), 0)
    const { data, error } = await supabase
      .from('departments')
      .insert({ name: trimmed, sort_order: maxSort + 1 })
      .select()
      .single()
    if (!error && data) {
      setDepartments(prev => [...prev, { ...data, positions: [] }])
      setExpandedDepts(prev => { const next = new Set(prev); next.add(data.id); return next })
      setNewDeptName('')
    }
    setSaving(false)
  }

  const changeNewPosName = (deptId, value) => {
    setNewPosDeptId(deptId)
    setNewPosName(value)
  }

  const addPosition = async (deptId) => {
    if (newPosDeptId !== deptId || saving) return
    const trimmed = newPosName.trim()
    if (!trimmed) return
    const dept = departments.find(d => d.id === deptId)
    if (!dept) return
    const duplicate = dept.positions.some(p => p.title.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) { alert('A position with this title already exists in this department.'); return }
    setSaving(true)
    const supabase = getSupabase()
    const maxSort = dept.positions.reduce((max, p) => Math.max(max, p.sort_order ?? 0), 0)
    const { data, error } = await supabase
      .from('positions')
      .insert({ department_id: deptId, title: trimmed, sort_order: maxSort + 1 })
      .select()
      .single()
    if (!error && data) {
      setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, positions: [...d.positions, data] } : d))
      setPositionUsage(prev => ({ ...prev, [data.id]: false }))
      setNewPosName('')
      setNewPosDeptId(null)
    }
    setSaving(false)
  }

  const handleDeptDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDepartments(prev => {
      const oldIndex = prev.findIndex(d => d.id === active.id)
      const newIndex = prev.findIndex(d => d.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      persistOrder('departments', reordered)
      return reordered
    })
  }, [])

  const handlePosDragEnd = useCallback((deptId, event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDepartments(prev => prev.map(d => {
      if (d.id !== deptId) return d
      const oldIndex = d.positions.findIndex(p => p.id === active.id)
      const newIndex = d.positions.findIndex(p => p.id === over.id)
      const reordered = arrayMove(d.positions, oldIndex, newIndex)
      persistOrder('positions', reordered)
      return { ...d, positions: reordered }
    }))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav />
      <div style={{ marginTop: 88 }}>

        <div style={{ position: 'sticky', top: 88, zIndex: 50, background: 'var(--bg)', borderBottom: '0.5px solid var(--glass-border)', padding: '20px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/staff')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <IconArrowLeft size={16} />
              Staff
            </button>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Staffing Settings</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 3 }}>
                {departments.length} {departments.length === 1 ? 'department' : 'departments'} · {totalPositions} {totalPositions === 1 ? 'position' : 'positions'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 28 }}>

          {loading && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>}

          {!loading && (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDeptDragEnd}>
                <SortableContext items={departments.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {departments.map(dept => (
                    <DepartmentRow
                      key={dept.id}
                      dept={dept}
                      expanded={expandedDepts.has(dept.id)}
                      onToggleExpand={toggleExpand}
                      editingDeptId={editingDeptId}
                      editingDeptName={editingDeptName}
                      onChangeEditingDeptName={setEditingDeptName}
                      onStartEditDept={startEditDept}
                      onSaveEditDept={saveEditDept}
                      onCancelEditDept={cancelEditDept}
                      onDeleteDept={deleteDepartment}
                      positionUsage={positionUsage}
                      editingPosId={editingPosId}
                      editingPosName={editingPosName}
                      onChangeEditingPosName={setEditingPosName}
                      onStartEditPos={startEditPos}
                      onSaveEditPos={saveEditPos}
                      onCancelEditPos={cancelEditPos}
                      onDeletePos={deletePosition}
                      newPosName={newPosName}
                      newPosDeptId={newPosDeptId}
                      onChangeNewPosName={changeNewPosName}
                      onAddPosition={addPosition}
                      onPosDragEnd={handlePosDragEnd}
                      sensors={sensors}
                      saving={saving}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="New department name..."
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDepartment() } }}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', width: 320 }}
                />
                <button
                  className="btn-primary"
                  onClick={addDepartment}
                  disabled={!newDeptName.trim() || saving}
                  style={{ opacity: newDeptName.trim() ? 1 : 0.5, cursor: newDeptName.trim() ? 'pointer' : 'default' }}
                >
                  Add Department
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
