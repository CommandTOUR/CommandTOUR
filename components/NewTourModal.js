'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { IconX, IconPlus, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'
import { getSupabase } from '../lib/supabase'
import { fetchTakenLines, lineOptions, defaultLine, lineToSortOrder } from '../lib/scheduleLines'

const TOUR_COLORS = [
  { label: 'Gold', value: '#C9A84C' },
  { label: 'Mint', value: '#33FF99' },
  { label: 'Yellow', value: '#FFCC00' },
  { label: 'Red', value: '#FF3333' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Orange', value: '#FF8C00' },
  { label: 'Pink', value: '#FF69B4' },
]

const TOUR_TYPES = [
  { label: 'Hot Wheels Stunt Show', value: 'hwss' },
  { label: 'Hot Wheels Monster Trucks Live', value: 'hwmt' },
]

const TOUR_CATEGORIES = [
  { label: 'Domestic', value: 'domestic' },
  { label: 'International', value: 'international' },
  { label: 'Uncategorized', value: 'uncategorized' },
]

const EMPTY_FORM = () => ({
  name: '',
  type: '',
  tour_type: '',
  tour_category: 'uncategorized',
  color: '#C9A84C',
  status: 'upcoming',
})

// Create-tour modal. On success it closes and goes to the new tour's page,
// where staffing positions can be set up (they need the tour id).
export default function NewTourModal({ onClose }) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [initialForm] = useState(() => JSON.stringify(EMPTY_FORM()))
  const [customColor, setCustomColor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [line, setLine] = useState('')
  const [lineOpts, setLineOpts] = useState({ options: [], allStandardTaken: false })
  const [lineNote, setLineNote] = useState('')

  const dirty = JSON.stringify(form) !== initialForm
  const requestClose = () => {
    if (saving) return
    if (dirty && !window.confirm('Discard this tour? Your changes have not been saved.')) return
    onClose()
  }
  const requestCloseRef = useRef(requestClose)
  useEffect(() => { requestCloseRef.current = requestClose })

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestCloseRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Free Master Schedule lines (sort_order values not used by non-deleted tours)
  const loadLines = async (keepChoice = false) => {
    const taken = await fetchTakenLines()
    const opts = lineOptions(taken)
    setLineOpts(opts)
    setLine(prev => (keepChoice && opts.options.some(o => o.value === prev)) ? prev : defaultLine(opts.options))
    return opts
  }
  useEffect(() => {
    let cancelled = false
    fetchTakenLines().then(taken => {
      if (cancelled) return
      const opts = lineOptions(taken)
      setLineOpts(opts)
      setLine(defaultLine(opts.options))
    })
    return () => { cancelled = true }
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.color) {
      setError('Tour name and color are required')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: insertError } = await getSupabase().from('tours').insert([{ ...form, sort_order: lineToSortOrder(line) }]).select().single()
    if (insertError) {
      if (insertError.code === '23505') {
        // Someone else took this line: refresh the options, keep everything else
        await loadLines()
        setLineNote('That line was just taken. Pick another.')
        setSaving(false)
        return
      }
      setError(insertError.message)
      setSaving(false)
      return
    }
    onClose()
    router.push(`/tours/${data.id}`)
  }

  const labelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', display: 'block', marginBottom: 6 }
  const fieldClass = 'nt-field'
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }
  const disabled = saving || !form.name.trim()

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <style>{`
        .nt-field { font-family: inherit; font-size: 15px; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface-input); color: var(--text-primary); outline: none; width: 100%; box-sizing: border-box; }
        .nt-field::placeholder { color: var(--text-muted); }
        .nt-field:focus { border-color: var(--color-info); box-shadow: 0 0 0 2px var(--color-info); }
        [data-theme="dark"] .nt-field { color-scheme: dark; }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--glass-tile-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: 'var(--tile-border)', boxShadow: 'var(--glass-tile-shadow)',
          borderRadius: 'var(--tile-radius)', padding: 24, width: 600, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto',
          boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>New Tour</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>Staffing is set up on the tour page after it&apos;s created.</div>
          </div>
          <button onClick={requestClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <IconX size={20} />
          </button>
        </div>

        <div>
          <label style={labelStyle} htmlFor="nt-name">Tour Name *</label>
          <input id="nt-name" className={fieldClass} autoFocus placeholder="e.g. Hot Wheels Stunt Show North America" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div style={grid}>
          <div>
            <label style={labelStyle} htmlFor="nt-tour-type">Tour Type</label>
            <select
              id="nt-tour-type"
              className={fieldClass}
              style={{ cursor: 'pointer' }}
              value={form.tour_type}
              onChange={e => {
                const val = e.target.value
                const match = TOUR_TYPES.find(t => t.value === val)
                setForm(p => ({ ...p, tour_type: val, type: match ? match.label : p.type }))
              }}
            >
              <option value="">— Select tour type —</option>
              {TOUR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="nt-show-type">Show Type</label>
            <input id="nt-show-type" className={fieldClass} placeholder="e.g. Hot Wheels Stunt Show" value={form.type} onChange={e => set('type', e.target.value)} />
          </div>
        </div>

        <div style={grid}>
          <div>
            <label style={labelStyle} htmlFor="nt-status">Status</label>
            <select id="nt-status" className={fieldClass} style={{ cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="nt-category">Tour Category</label>
            <select id="nt-category" className={fieldClass} style={{ cursor: 'pointer' }} value={form.tour_category} onChange={e => set('tour_category', e.target.value)}>
              {TOUR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="nt-line">Schedule line</label>
          <select id="nt-line" className={fieldClass} style={{ cursor: 'pointer' }} value={line} onChange={e => { setLine(e.target.value); setLineNote('') }}>
            {lineOpts.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {lineOpts.allStandardTaken && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>All six standard lines are in use.</div>}
          {lineNote && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', marginTop: 4 }}>{lineNote}</div>}
        </div>

        <div>
          <label style={labelStyle}>Tour Color</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 4 }}>
            {TOUR_COLORS.map(c => {
              const selected = form.color === c.value && !customColor
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={selected}
                  onClick={() => { set('color', c.value); setCustomColor(false) }}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, cursor: 'pointer', border: '1px solid var(--border-strong)', padding: 0, boxShadow: selected ? '0 0 0 2px var(--surface-card), 0 0 0 4px var(--text-primary)' : 'none' }}
                />
              )
            })}
            <button
              type="button"
              title="Custom color"
              aria-label="Custom color"
              aria-pressed={customColor}
              onClick={() => setCustomColor(true)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: customColor ? form.color : 'var(--surface-input)', cursor: 'pointer', border: '1px solid var(--border-strong)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', boxShadow: customColor ? '0 0 0 2px var(--surface-card), 0 0 0 4px var(--text-primary)' : 'none' }}
            >
              {!customColor && <IconPlus size={16} />}
            </button>
            {customColor && (
              <input type="color" aria-label="Pick custom color" value={form.color} onChange={e => set('color', e.target.value)}
                style={{ width: 40, height: 32, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
            )}
          </div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: form.color, width: '100%', transition: 'background 0.2s' }} />
        </div>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-danger)' }}>
            <IconAlertTriangle size={16} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={requestClose}
            disabled={saving}
            style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={disabled}
            style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {saving && <IconLoader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Saving...' : 'Create Tour'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
