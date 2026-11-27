'use client'

// UNDO for the staffing grid and the Travelers tab.
// Every change runs through undoable(): it snapshots the rows the change can touch, runs it, snapshots again and, if anything
// changed, shows a toast with an Undo button for 5 seconds. See components/staffing/undo.js.
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getSupabase } from '@/lib/supabase'
import { quickToast } from '@/lib/quickToast'
import { takeSnapshot, diffSnapshots, applyUndo } from './undo'
import { Z_TOAST } from './shared'

//   tourIdsFor(eventIds) -> tour ids to snapshot (their tour_positions can change too)
//   onUndone()           -> reload after an undo
//   onMessage(text)      -> a short "Undone" confirmation
export default function useUndoable({ tourIdsFor, onUndone, onMessage }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const undoable = async (message, eventIds, fn) => {
    const sb = getSupabase()
    const evIds = [...new Set(eventIds.filter(Boolean))]
    const tourIds = [...new Set((tourIdsFor ? tourIdsFor(evIds) : []).filter(Boolean))]
    let before = null
    try { before = await takeSnapshot(sb, evIds, tourIds) } catch (e) { console.error('undo snapshot failed:', e) }
    const result = await fn()
    if (!before) return result
    try {
      const after = await takeSnapshot(sb, evIds, tourIds)
      const ops = diffSnapshots(before, after)
      if (!ops.empty) {
        const id = ++seq.current
        setToasts(prev => [...prev, { id, message, ops }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
      }
    } catch (e) { console.error('undo snapshot failed:', e) }
    return result
  }

  const runUndo = async (t) => {
    setToasts(prev => prev.filter(x => x.id !== t.id))
    const res = await applyUndo(getSupabase(), t.ops)
    if (res.ok) onMessage?.('Undone')
    else quickToast(res.reason)
    onUndone?.()
  }

  const toastElement = toasts.length > 0 && typeof document !== 'undefined' ? createPortal(
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: Z_TOAST, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} data-undo-toast="" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1.5px solid var(--tile-trim)', borderRadius: 10, padding: '8px 10px 8px 16px', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.35)', fontFamily: 'inherit', maxWidth: 'calc(100vw - 32px)' }}>
          <span>{t.message}</span>
          <button type="button" onClick={() => runUndo(t)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer' }}>Undo</button>
        </div>
      ))}
    </div>,
    document.body
  ) : null

  return { undoable, toastElement }
}
