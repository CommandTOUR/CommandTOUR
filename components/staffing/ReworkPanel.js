'use client'

// Trips that need rework for one person (they were moved, swapped, pulled or removed while travel was booked).
// "Mark Resolved" clears the flag; "Delete Row" removes the row. Used from the grid (ghost tile / marker) and the staff panel.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import { describeTrip } from '@/lib/travelRework'
import { Z_POPUP } from './shared'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const btn = { fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)' }

//   groups  [{ eventId, eventLabel, rows: [trip] }]   one per event the person left
export function ReworkList({ groups, onResolve, onDelete }) {
  return (
    <div data-rework-list="">
      {groups.map(g => (
        <div key={g.eventId} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{g.eventLabel}</div>
          {g.rows.map((r) => (
            <div key={r.id} data-rework-row="" style={{ border: '1px solid var(--tile-trim)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.direction === 'in' ? 'Arrival' : 'Departure'}: {describeTrip(r)}</div>
              {r.rework_note && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{r.rework_note}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button type="button" onClick={() => onResolve(r, g)} style={{ ...btn, border: '1px solid var(--color-success)' }}>Mark Resolved</button>
                <button type="button" onClick={() => onDelete(r, g)} style={{ ...btn, border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>Delete Row</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ReworkPanel({ name, groups, onResolve, onDelete, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => { if (groups.length === 0) onClose() }, [groups.length, onClose])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16, fontFamily: FONT }}>
      <div role="dialog" aria-modal="true" aria-label="Travel Needs Rework" data-dialog="rework" style={{ background: 'var(--surface-card)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 18, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Travel Needs Rework: {name}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}><IconX size={18} /></button>
        </div>
        <ReworkList groups={groups} onResolve={onResolve} onDelete={onDelete} />
      </div>
    </div>,
    document.body
  )
}
