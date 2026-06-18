'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const BUCKET_ORDER = ['12 Weeks Out', '6 Weeks Out', '5 Weeks Out', '1 Month Out', '2 Weeks Out', 'Week Of', 'Load-In', 'During Shows', 'Post Show']

const addRowBtnStyle = {
  fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '6px 14px', borderRadius: 7, marginTop: 8,
  border: '0.5px dashed rgba(255,255,255,0.20)', background: 'transparent', color: '#64748b',
  cursor: 'pointer', alignSelf: 'flex-start',
}

function Checkbox({ checked, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${checked ? 'var(--mint)' : 'rgba(255,255,255,0.20)'}`,
        background: checked ? 'var(--mint)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
      }}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-6" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

function NotesInput({ value, onSave }) {
  const [val, setVal] = useState(value || '')
  const [focused, setFocused] = useState(false)

  return (
    <input
      className="sched-input"
      style={{ width: focused ? '100%' : '55%', transition: 'width 0.15s', textAlign: 'left' }}
      placeholder="Add note..."
      value={val}
      onChange={e => setVal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        if (val !== (value || '')) onSave(val)
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
    />
  )
}

function NewTaskRow({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ width: 18 }} />
      <input
        autoFocus
        className="sched-input"
        placeholder="New task name..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) onAdd(name.trim())
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => { if (name.trim()) onAdd(name.trim()); else onCancel() }}
        style={{ flex: 1 }}
      />
    </div>
  )
}

function BucketSection({ bucket, tasks, expanded, onToggleExpand, onToggleTask, onSaveNotes, onAddTask }) {
  const [adding, setAdding] = useState(false)
  const completed = tasks.filter(t => t.completed).length
  const total = tasks.length

  return (
    <div className="glass-card" style={{ marginBottom: 12, overflow: 'hidden', width: '100%' }}>
      <div onClick={onToggleExpand} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{bucket}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{completed}/{total} complete</div>
      </div>
      {expanded && (
        <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column' }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Checkbox checked={task.completed} onChange={() => onToggleTask(task.id, !task.completed)} />
              <div style={{ fontSize: 13, color: task.completed ? '#64748b' : '#f1f5f9', textDecoration: task.completed ? 'line-through' : 'none', minWidth: 220 }}>
                {task.task_name}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <NotesInput value={task.notes} onSave={(val) => onSaveNotes(task.id, val)} />
              </div>
            </div>
          ))}
          {adding ? (
            <NewTaskRow
              onAdd={(name) => { onAddTask(bucket, name); setAdding(false) }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button onClick={() => setAdding(true)} style={addRowBtnStyle}>+ Add Task</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function TasksTab({ eventId, event }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [needsTemplateChoice, setNeedsTemplateChoice] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const populateFromTemplate = async (tourType) => {
    const supabase = getSupabase()
    const { data: templates } = await supabase.from('task_templates').select('*').eq('tour_type', tourType).order('sort_order', { ascending: true })
    if (!templates || templates.length === 0) {
      setNeedsTemplateChoice(false)
      setLoading(false)
      return
    }
    const rows = templates.map(t => ({
      event_id: eventId,
      bucket: t.bucket,
      task_name: t.task_name,
      completed: false,
      notes: null,
      sort_order: t.sort_order,
    }))
    const { data: inserted } = await supabase.from('event_tasks').insert(rows).select()
    setTasks(inserted || [])
    setNeedsTemplateChoice(false)
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      const { data } = await supabase.from('event_tasks').select('*').eq('event_id', eventId).order('sort_order', { ascending: true })
      if (data && data.length > 0) {
        setTasks(data)
        setLoading(false)
      } else if (event.event_type === 'hwss' || event.event_type === 'hwmt') {
        await populateFromTemplate(event.event_type)
      } else {
        setNeedsTemplateChoice(true)
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId])

  const toggleExpand = (bucket) => setExpanded(prev => ({ ...prev, [bucket]: !prev[bucket] }))

  const handleToggleTask = async (id, completed) => {
    setSaveError(null)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    const supabase = getSupabase()
    const { error } = await supabase.from('event_tasks').update({ completed }).eq('id', id)
    if (error) {
      console.error('Failed to save task:', error)
      setSaveError('Failed to save task. Please try again.')
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
    }
  }

  const handleSaveNotes = async (id, notes) => {
    setSaveError(null)
    const supabase = getSupabase()
    const { error } = await supabase.from('event_tasks').update({ notes: notes || null }).eq('id', id)
    if (error) {
      console.error('Failed to save notes:', error)
      setSaveError('Failed to save notes. Please try again.')
      return
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notes } : t))
  }

  const handleAddTask = async (bucket, taskName) => {
    const bucketTasks = tasks.filter(t => t.bucket === bucket)
    const sortOrder = bucketTasks.length > 0 ? Math.max(...bucketTasks.map(t => t.sort_order || 0)) + 1 : 0
    const supabase = getSupabase()
    const { data, error } = await supabase.from('event_tasks').insert([{
      event_id: eventId,
      bucket,
      task_name: taskName,
      completed: false,
      notes: null,
      sort_order: sortOrder,
    }]).select().single()
    if (!error) setTasks(prev => [...prev, data])
  }

  if (loading) return <div style={{ fontSize: 14, color: '#94a3b8' }}>Loading tasks...</div>

  if (needsTemplateChoice) {
    return (
      <div style={{ maxWidth: 600 }}>
        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>
          This event doesn&apos;t have a tour type set. Choose a checklist template to get started:
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => { setLoading(true); populateFromTemplate('hwss') }}>
            Hot Wheels Stunt Show
          </button>
          <button className="btn-primary" onClick={() => { setLoading(true); populateFromTemplate('hwmt') }}>
            Hot Wheels Monster Trucks Live
          </button>
        </div>
      </div>
    )
  }

  const total = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const buckets = BUCKET_ORDER.filter(b => tasks.some(t => t.bucket === b))
  tasks.forEach(t => { if (!BUCKET_ORDER.includes(t.bucket) && !buckets.includes(t.bucket)) buckets.push(t.bucket) })

  return (
    <div style={{ width: '100%' }}>
      {saveError && <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 12px' }}>{saveError}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Tasks</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>{pct}% complete ({completed}/{total})</div>
      </div>
      {buckets.map(bucket => (
        <BucketSection
          key={bucket}
          bucket={bucket}
          tasks={tasks.filter(t => t.bucket === bucket).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))}
          expanded={!!expanded[bucket]}
          onToggleExpand={() => toggleExpand(bucket)}
          onToggleTask={handleToggleTask}
          onSaveNotes={handleSaveNotes}
          onAddTask={handleAddTask}
        />
      ))}
    </div>
  )
}
