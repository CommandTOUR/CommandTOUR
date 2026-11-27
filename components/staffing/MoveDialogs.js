'use client'

// Confirmation dialogs for same-weekend moves and swaps. They never allow a double booking: the grid re-checks canAssign
// right before writing. Rendered in a portal above the grid; Enter confirms, Esc cancels, Tab stays inside.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLock, IconPlaneDeparture } from '@tabler/icons-react'
import { Z_POPUP } from './shared'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const ROW_H = 92  // card height (px): the crossing arrows are drawn against these heights
const ROW_GAP = 14

// One person at one position on one event.  event = { place, range, tour, color }
function Card({ name, position, event, tag }) {
  return (
    <div data-card={tag} style={{ boxSizing: 'border-box', height: ROW_H, border: '1px solid var(--tile-trim)', borderLeft: `5px solid ${event?.color || 'var(--tile-trim)'}`, borderRadius: 8, padding: '8px 10px', background: 'var(--surface-card)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{position}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event?.place} · {event?.range}</div>
      {event?.tour && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.tour}</div>}
    </div>
  )
}

const colHead = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)', marginBottom: 6 }
const ArrowDefs = () => (
  <defs>
    <marker id="mv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-info)" />
    </marker>
  </defs>
)

// SWAP: both people and both events side by side, arrows crossing.
//   a, b: { name, position, event }   (their CURRENT cell)   left column = now, right column = after the swap
export function SwapLayout({ a, b }) {
  const H = ROW_H * 2 + ROW_GAP
  const yA = ROW_H / 2, yB = ROW_H + ROW_GAP + ROW_H / 2
  return (
    <div data-layout="swap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px minmax(0,1fr)', columnGap: 0, alignItems: 'start' }}>
      <div><div style={colHead}>Now</div><div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
        <Card tag="now-a" name={a.name} position={a.position} event={a.event} />
        <Card tag="now-b" name={b.name} position={b.position} event={b.event} />
      </div></div>
      <svg width="64" height={H} viewBox={`0 0 64 ${H}`} aria-hidden="true" style={{ marginTop: 21 }} data-arrows="crossing">
        <ArrowDefs />
        {/* A (top left) goes to B's cell (bottom right); B (bottom left) goes to A's cell (top right) */}
        <line x1="4" y1={yA} x2="60" y2={yB} stroke="var(--color-info)" strokeWidth="2.5" markerEnd="url(#mv-arrow)" />
        <line x1="4" y1={yB} x2="60" y2={yA} stroke="var(--color-info)" strokeWidth="2.5" markerEnd="url(#mv-arrow)" />
      </svg>
      <div><div style={colHead}>After</div><div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
        <Card tag="after-top" name={b.name} position={a.position} event={a.event} />
        <Card tag="after-bottom" name={a.name} position={b.position} event={b.event} />
      </div></div>
    </div>
  )
}

// MOVE / PULL: one person, one arrow.   from, to: { name, position, event }
export function MoveLayout({ from, to }) {
  return (
    <div data-layout="move" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px minmax(0,1fr)', alignItems: 'center' }}>
      <div><div style={colHead}>Now</div><Card tag="from" name={from.name} position={from.position} event={from.event} /></div>
      <svg width="56" height="24" viewBox="0 0 56 24" aria-hidden="true" style={{ marginTop: 21 }} data-arrows="single">
        <ArrowDefs />
        <line x1="4" y1="12" x2="52" y2="12" stroke="var(--color-info)" strokeWidth="2.5" markerEnd="url(#mv-arrow)" />
      </svg>
      <div><div style={colHead}>After</div><Card tag="to" name={to.name} position={to.position} event={to.event} /></div>
    </div>
  )
}

//   dialog = { title, kind: 'swap' | 'move', a, b | from, to, notes: [string], locks: [string], primary, onConfirm: async () => void }
export default function MoveDialog({ dialog, onClose }) {
  const [busy, setBusy] = useState(false)
  const okRef = useRef(null)
  const cancelRef = useRef(null)
  const busyRef = useRef(false)
  const confirm = async () => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try { await dialog.onConfirm() } finally { busyRef.current = false; setBusy(false); onClose() }
  }
  useEffect(() => { okRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (busyRef.current) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'Enter') { e.preventDefault(); if (document.activeElement === cancelRef.current) onClose(); else confirm() }
      else if (e.key === 'Tab') { // keep focus inside the dialog
        e.preventDefault()
        const next = document.activeElement === okRef.current ? cancelRef.current : okRef.current
        next?.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (typeof document === 'undefined') return null
  const btn = { fontFamily: FONT, fontSize: 14, borderRadius: 8, padding: '8px 18px', cursor: busy ? 'default' : 'pointer' }
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" data-dialog={dialog.kind}
        style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 20, width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', color: 'var(--text-primary)' }}>
        <div id="move-dialog-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{dialog.title}</div>
        {dialog.kind === 'swap' ? <SwapLayout a={dialog.a} b={dialog.b} /> : dialog.kind === 'remove' ? null : <MoveLayout from={dialog.from} to={dialog.to} />}
        {(dialog.travel || []).length > 0 && (
          <div data-travel-warning="" style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--color-danger)', background: 'color-mix(in srgb, var(--color-danger) 8%, var(--surface-card))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}><IconPlaneDeparture size={16} aria-hidden="true" /> Booked Travel</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>{dialog.travel.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}
        {(dialog.locks || []).map((t, i) => (
          <div key={i} data-lock-notice="" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 12%, var(--surface-card))', fontSize: 14, fontWeight: 600 }}>
            <IconLock size={16} aria-hidden="true" /> {t}
          </div>
        ))}
        {(dialog.notes || []).length > 0 && (
          <ul data-notes="" style={{ margin: '14px 0 0', paddingLeft: 18, fontSize: 14, fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dialog.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button ref={cancelRef} type="button" onClick={onClose} disabled={busy} style={{ ...btn, fontWeight: 600, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)' }}>Cancel</button>
          <button ref={okRef} type="button" onClick={confirm} disabled={busy} data-primary="" style={{ ...btn, fontWeight: 700, border: 'none', background: '#FFD60A', color: '#0a1628', opacity: busy ? 0.6 : 1 }}>{busy ? 'Working…' : dialog.primary}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
