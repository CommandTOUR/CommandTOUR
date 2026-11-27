'use client'

// "+ Slots": choose an EVENT first, then a POSITION (only that event's tour's positions), then Add one empty extra slot.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import { formatLocation } from '@/lib/locationFormat'
import { fmtEventRange, Z_POPUP } from './shared'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const label = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-primary)', marginBottom: 4, display: 'block' }
const select = { width: '100%', fontFamily: FONT, fontSize: 14, fontWeight: 500, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-input)', color: 'var(--text-primary)' }

//   events        the events in view
//   positionsFor  (eventId) => [{ id, title, department }]   every position that event's tour has
export default function SlotsPanel({ events, positionsFor, toursById, onAdd, onClose }) {
  const [eventId, setEventId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const positions = eventId ? positionsFor(eventId) : []
  const go = async () => {
    if (!positionId || !eventId) return
    setBusy(true)
    const ok = await onAdd(eventId, positionId)
    setBusy(false)
    if (ok) onClose()
  }
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16, fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-label="Add Extra Slot" style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 18, width: 380, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Add Extra Slot</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}><IconX size={18} /></button>
        </div>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={label}>Event</span>
          <select aria-label="Event" value={eventId} onChange={e => { setEventId(e.target.value); setPositionId('') }} style={select}>
            <option value="">Choose an Event…</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{formatLocation(ev.city, ev.state, ev.country, 'compact')} · {fmtEventRange(ev)} · {toursById[ev.tour_id]?.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={label}>Position</span>
          <select aria-label="Position" value={positionId} onChange={e => setPositionId(e.target.value)} disabled={!eventId} style={select}>
            <option value="">{eventId ? 'Choose a Position…' : 'Choose an Event First'}</option>
            {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` (${p.department})` : ''}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={go} disabled={busy || !positionId || !eventId} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: (busy || !positionId || !eventId) ? 'default' : 'pointer', opacity: (busy || !positionId || !eventId) ? 0.5 : 1 }}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
