'use client'

// Plain-text grid cells: they read as text until hovered or focused. Choices open a small popup menu (portal) instead of a native select.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconPlane, IconTrain, IconCar, IconTicket, IconPointFilled, IconChevronDown, IconChevronRight, IconChevronUp, IconCheck } from '@tabler/icons-react'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import { FS, LINE, SMALL_LABEL, fmtDay } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
export const ICON_SIZE = 14 // every chevron and caret in the workspace

// One chevron size everywhere. open = pointing down (or up when dir="up"); closed = pointing right.
export function Chevron({ open, dir = 'down', style }) {
  const Icon = dir === 'up' ? (open ? IconChevronUp : IconChevronDown) : (open ? IconChevronDown : IconChevronRight)
  return <Icon size={ICON_SIZE} stroke={2} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted-legible)', ...style }} />
}
// A caret that sits after text (status pills, menus)
export const Caret = ({ style }) => <IconChevronDown size={ICON_SIZE} stroke={2} aria-hidden="true" style={{ flexShrink: 0, ...style }} />

// ── mode icons ──────────────────────────────────────────────────────────
const MODE_ICON = { flying: IconPlane, rail: IconTrain, driving: IconCar, carpool: IconCar, books_own: IconTicket, other: IconPointFilled }
const MODE_NAME = { flying: 'Flying', rail: 'Rail', driving: 'Driving', carpool: 'Carpool', books_own: 'Books Own', other: 'Other' }
export const modeName = (m) => MODE_NAME[m] || m
export function ModeIcon({ mode, size = 16 }) {
  const Icon = MODE_ICON[mode] || IconPointFilled
  return <Icon size={size} stroke={1.75} aria-hidden="true" style={{ flexShrink: 0 }} />
}
// To first, then From; the same mode in both shows once; "—" when there are none
export function ModeIcons({ toMode, fromMode }) {
  const label = [toMode && `To: ${modeName(toMode)}`, fromMode && `From: ${modeName(fromMode)}`].filter(Boolean).join(' · ')
  if (!toMode && !fromMode) return <span style={muted}>—</span>
  const same = toMode && fromMode && toMode === fromMode
  return (
    <span role="img" aria-label={label || 'No Travel'} title={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {same || !fromMode ? <ModeIcon mode={toMode} /> : !toMode ? <ModeIcon mode={fromMode} /> : (<><ModeIcon mode={toMode} /><span aria-hidden="true" style={{ width: 1, height: 14, background: LINE }} /><ModeIcon mode={fromMode} /></>)}
    </span>
  )
}

// ── popup menu ──────────────────────────────────────────────────────────
// options: [{ value, label, icon?, hint? }] or [{ group: 'Name', items: [...] }]
export function PickMenu({ anchorRef, open, onClose, options, value, onPick, searchable, width = 220 }) {
  const menuRef = useRef(null)
  const [q, setQ] = useState('')
  const flat = useMemo(() => options.flatMap(o => (o.group ? o.items : [o])), [options])
  const style = useAnchoredMenu(anchorRef, open, width, Math.min(320, flat.length * 30 + (searchable ? 90 : 40)))
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, onClose, anchorRef])
  useEffect(() => { if (!open) setQ('') }, [open])
  if (!open || !style) return null
  const match = (o) => !q.trim() || String(o.label).toLowerCase().includes(q.trim().toLowerCase())
  const item = (o) => (
    <div key={String(o.value)} role="menuitem" onClick={() => { onClose(); onPick(o.value) }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: FS.body, color: 'var(--text-primary)', fontWeight: o.value === value ? 700 : 400 }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      {o.icon || null}<span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>{o.hint ? <span style={{ ...muted, fontSize: FS.small }}>{o.hint}</span> : null}{o.value === value ? <IconCheck size={ICON_SIZE} stroke={2} aria-hidden="true" /> : null}
    </div>
  )
  return createPortal(
    <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, overflowY: 'auto', background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
      {searchable && <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="plain-cell" style={{ margin: '2px 4px 6px', width: 'calc(100% - 8px)', borderBottom: `1px solid ${LINE}` }} />}
      {options.map((o, i) => (o.group
        ? (o.items.filter(match).length ? <div key={o.group || i}><div style={{ ...SMALL_LABEL, padding: '6px 8px 2px' }}>{o.group}</div>{o.items.filter(match).map(item)}</div> : null)
        : (match(o) ? item(o) : null)))}
    </div>, document.body)
}

// Plain text that opens a popup menu. children = what to show (defaults to the chosen option's label).
export function PickText({ value, options, onPick, disabled, placeholder = '—', children, searchable, width, title = 'Click To Change', ariaLabel, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const flat = options.flatMap(o => (o.group ? o.items : [o]))
  const current = flat.find(o => o.value === value)
  const content = children ?? (current ? current.label : null)
  return (
    <>
      <button ref={ref} type="button" className="plain-text-btn" aria-label={ariaLabel} title={disabled ? undefined : title} disabled={disabled} onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }} style={{ cursor: disabled ? 'default' : 'pointer', ...style }}>
        {content || <span style={muted}>{placeholder}</span>}
      </button>
      <PickMenu anchorRef={ref} open={open} onClose={() => setOpen(false)} options={options} value={value} onPick={onPick} searchable={searchable} width={width} />
    </>
  )
}

// Plain text that moves to the next value each click (Type, Parking)
export function CycleText({ value, values, onChange, disabled, format = (v) => v, title = 'Click To Change' }) {
  const i = Math.max(0, values.indexOf(value))
  return <button type="button" className="plain-text-btn" title={disabled ? undefined : title} disabled={disabled} onClick={() => onChange(values[(i + 1) % values.length])} style={{ cursor: disabled ? 'default' : 'pointer' }}>{format(values.includes(value) ? value : values[0])}</button>
}

// ── date picker ─────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Plain text date ("Mon, Jan 4") that opens a small calendar. onPick('YYYY-MM-DD'); the Clear button calls onPick('').
export function DatePick({ value, onPick, disabled, placeholder = '—', clearLabel = 'Clear', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const menuRef = useRef(null)
  const base = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  const today = new Date()
  const [view, setView] = useState(() => ({ y: base ? +base[1] : today.getFullYear(), m: base ? +base[2] - 1 : today.getMonth() }))
  const style = useAnchoredMenu(ref, open, 236, 290)
  useEffect(() => { if (open && base) setView({ y: +base[1], m: +base[2] - 1 }) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const first = new Date(view.y, view.m, 1).getDay()
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const shift = (n) => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const nav = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: FS.title, padding: '0 8px' }
  return (
    <>
      <button ref={ref} type="button" className="plain-text-btn" aria-label={ariaLabel} title={disabled ? undefined : 'Click To Pick A Date'} disabled={disabled} onClick={() => setOpen(o => !o)} style={{ cursor: disabled ? 'default' : 'pointer' }}>
        {value ? fmtDay(value) : <span style={muted}>{placeholder}</span>}
      </button>
      {open && style && createPortal(
        <div ref={menuRef} role="dialog" aria-label="Pick A Date" style={{ ...style, zIndex: Z_MENU, background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box', maxHeight: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <button type="button" aria-label="Previous Month" onClick={() => shift(-1)} style={nav}>‹</button>
            <b style={{ fontSize: FS.body }}>{MONTHS[view.m]} {view.y}</b>
            <button type="button" aria-label="Next Month" onClick={() => shift(1)} style={nav}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ ...SMALL_LABEL, padding: '2px 0' }}>{d}</div>)}
            {cells.map((d, i) => {
              const v = d ? ymd(view.y, view.m, d) : ''
              const sel = v && v === value
              return d ? (
                <button key={i} type="button" onClick={() => { setOpen(false); onPick(v) }}
                  style={{ fontFamily: 'inherit', fontSize: FS.body, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', background: sel ? 'var(--color-info)' : 'transparent', color: sel ? 'var(--text-on-info)' : 'var(--text-primary)', fontWeight: sel ? 700 : 400 }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>{d}</button>
              ) : <span key={i} />
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <button type="button" className="plain-text-btn" onClick={() => { setOpen(false); onPick(ymd(today.getFullYear(), today.getMonth(), today.getDate())) }} style={{ color: 'var(--color-info)', fontSize: FS.small, fontWeight: 600 }}>Today</button>
            <button type="button" className="plain-text-btn" onClick={() => { setOpen(false); onPick('') }} style={{ color: 'var(--color-info)', fontSize: FS.small, fontWeight: 600 }}>{clearLabel}</button>
          </div>
        </div>, document.body)}
    </>
  )
}
