'use client'

import { useRef, useState } from 'react'
import { IconLock, IconLockOpen, IconAlertTriangle, IconCalendarExclamation, IconCheck, IconPlus, IconX } from '@tabler/icons-react'
import QuickStatusPill from '../QuickStatusPill'
import { STATUS_OPTIONS, STATUS_BY_VALUE, STATUS_PILL_STYLES, STAFF_TILE_MIN_H, STAFF_TILE_PAD, staffDisplayName } from './shared'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const PILL_OPTIONS = STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))
// Needs Attention shows a warning icon in place of the dot, so color is never the only cue
const DOT_ICONS = { needs_attention: <IconAlertTriangle size={15} aria-hidden="true" /> }

// A staff tile is neutral: normal tile background and a standard dark border. The status DOT is the only status color.
const TILE_BG = 'var(--surface-card)'
const BORDER = '1px solid var(--tile-trim)'
const QUIET_BORDER = '1px dashed var(--border-strong)'

const iconBtn = { background: 'none', border: 'none', padding: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-primary)', flexShrink: 0, borderRadius: 6 }

// Read-only status dot (view mode)
export function StatusDot({ status }) {
  const st = STATUS_BY_VALUE[status] || STATUS_BY_VALUE.pending
  return (
    <span title={st.label} aria-label={`Status: ${st.label}`} role="img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, color: st.color }}>
      {status === 'needs_attention'
        ? <IconAlertTriangle size={15} aria-hidden="true" />
        : <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, display: 'block' }} />}
    </span>
  )
}

// One person (or open / locked slot) in a cell: the NAME and a status dot. The position is in the row label, not here.
//   cell: { key, state: 'FILLED' | 'EMPTY' | 'LOCKED', position, slotIndex, assignment }
//   editable: false for the view-only All Staff board (no drag, no status menu, no assign/lock)
export default function StaffTile({
  cell, editable = true, selectMode, selected, draggable, hasConflict, isOverride, assigning, dimmed, renderSearch,
  dropState, dragging, onRemoveSlot, rework, onReworkClick,
  onStartAssign, onOpenPanel, onSetStatus, onLock, onUnlock, onToggleSelect, onConflictClick,
  onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop,
}) {
  const [hover, setHover] = useState(false)
  const { state, position, slotIndex, assignment } = cell
  const dotDown = useRef(false) // a press that began on the status dot must never start a drag
  const posLabel = slotIndex > 1 ? `${position.title} ${slotIndex}` : position.title
  const base = {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 2,
    padding: STAFF_TILE_PAD, borderRadius: 6, boxSizing: 'border-box', minHeight: STAFF_TILE_MIN_H, fontFamily: FONT, position: 'relative',
    outline: selected ? '3px solid #FFD60A' : 'none', outlineOffset: 1, opacity: dimmed || dragging ? 0.4 : 1,
  }
  // DROP-ZONE highlight while another tile is being dragged over this one: accent = allowed, red = refused / locked
  const danger = dropState && (dropState.kind === 'blocked' || dropState.kind === 'locked')
  const dropStyle = dropState ? {
    outline: `2px solid ${danger ? 'var(--color-danger)' : 'var(--color-info)'}`, outlineOffset: 0,
    background: `color-mix(in srgb, ${danger ? 'var(--color-danger)' : 'var(--color-info)'} 12%, var(--surface-card))`,
    cursor: dropState.kind === 'blocked' ? 'not-allowed' : undefined,
  } : null
  const dropLabel = dropState ? (
    <span data-drop-label={dropState.kind} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', pointerEvents: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRadius: 6, background: `color-mix(in srgb, ${danger ? 'var(--color-danger)' : 'var(--color-info)'} 16%, var(--surface-card))` }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{dropState.label}</span>
    </span>
  ) : null
  const dnd = { onDragOver, onDragEnter, onDragLeave, onDrop, 'data-drop-state': dropState ? dropState.kind : undefined }

  if (state === 'LOCKED') {
    return (
      <div {...dnd} style={{ ...base, border: QUIET_BORDER, background: 'transparent', ...dropStyle }} title={`${posLabel}: Locked`}>
        {dropLabel}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconLock size={13} aria-hidden="true" /> Locked
        </span>
        {editable && !selectMode && (
          <button type="button" onClick={onUnlock} aria-label={`Unlock ${posLabel}`} title="Unlock" style={iconBtn}><IconLockOpen size={15} /></button>
        )}
      </div>
    )
  }

  if (state === 'EMPTY') {
    if (!editable) {
      // quiet: a dashed outline with the hollow ring, no text
      return (
        <div {...dnd} title={`${posLabel}: Open`} aria-label={`${posLabel}: Open`} style={{ ...base, border: QUIET_BORDER, background: 'transparent' }}>
          <span />
          <span aria-hidden="true" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid var(--color-danger)', display: 'block' }} />
          </span>
        </div>
      )
    }
    return (
      <div {...dnd} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ ...base, border: QUIET_BORDER, background: 'transparent', ...dropStyle }}>
        {dropLabel}
        {assigning ? renderSearch() : (
          <button type="button" disabled={selectMode} onClick={onStartAssign} aria-label={`Add Someone to ${posLabel}`}
            style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: selectMode ? 'default' : 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: 'var(--color-info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconPlus size={14} /> Add
          </button>
        )}
        {!assigning && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {cell.extra && !selectMode && onRemoveSlot ? (
              // an empty EXTRA slot can be removed: a small x on hover (a filled extra slot has to be emptied first)
              <button type="button" onClick={onRemoveSlot} aria-label={`Remove Extra ${posLabel} Slot`} title="Remove This Extra Slot" data-remove-slot=""
                style={{ ...iconBtn, opacity: hover ? 1 : 0, transition: 'opacity 0.1s' }} onFocus={() => setHover(true)} onBlur={() => setHover(false)}><IconX size={15} /></button>
            ) : (!selectMode && <button type="button" onClick={onLock} aria-label={`Lock ${posLabel}`} title="Lock This Position" style={iconBtn}><IconLock size={14} /></button>)}
            <span title="Open Position" aria-label="Open Position" role="img" style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid var(--color-danger)', display: 'block' }} />
            </span>
          </div>
        )}
      </div>
    )
  }

  // FILLED
  const name = staffDisplayName(assignment?.staff) || 'Staff'
  const canDrag = editable && draggable && !selectMode
  const clickTile = (e) => { if (editable && selectMode) { e.stopPropagation(); onToggleSelect(e.shiftKey) } }
  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => { if (dotDown.current) { e.preventDefault(); return } onDragStart && onDragStart(e) }}
      onDragEnd={(e) => { dotDown.current = false; onDragEnd && onDragEnd(e) }}
      onMouseUp={() => { dotDown.current = false }}
      onMouseLeave={() => { dotDown.current = false }}
      onClick={clickTile}
      {...dnd}
      style={{ ...base, border: BORDER, background: TILE_BG, cursor: editable && selectMode ? 'pointer' : (canDrag ? 'grab' : 'default'), ...dropStyle }}
    >
      {dropLabel}
      {selected && (
        <span aria-label="Selected" style={{ position: 'absolute', top: -7, left: -7, width: 16, height: 16, borderRadius: '50%', background: '#FFD60A', color: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--tile-trim)', boxSizing: 'border-box' }}>
          <IconCheck size={10} stroke={3} />
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {rework && (
          <button type="button" data-rework-marker="" onClick={(e) => { e.stopPropagation(); onReworkClick && onReworkClick() }} title={rework} aria-label={rework}
            style={{ ...iconBtn, padding: 0, color: 'var(--color-danger)' }}>
            <IconAlertTriangle size={14} />
          </button>
        )}
        {hasConflict && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onConflictClick && onConflictClick() }} title="Booked on Another Event the Same Weekend" aria-label="Booked on Another Event the Same Weekend"
            style={{ ...iconBtn, padding: 0, color: '#FF9500' }}>
            <IconCalendarExclamation size={15} />
          </button>
        )}
        <button type="button" onClick={(e) => { if (editable && selectMode) return; e.stopPropagation(); onOpenPanel() }}
          title={name}
          style={{ background: 'none', border: 'none', padding: 0, minWidth: 0, textAlign: 'left', cursor: editable && selectMode ? 'inherit' : 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </button>
        {isOverride && <span title="Event-Specific Override of the Tour-Wide Assignment" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-info)', flexShrink: 0 }} />}
      </span>
      {editable ? (
        <span
          onMouseDown={() => { dotDown.current = true }}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', pointerEvents: selectMode ? 'none' : 'auto' }}
        >
          <QuickStatusPill
            variant="dot" value={assignment?.status || 'pending'} fallbackValue="pending"
            options={PILL_OPTIONS} styles={STATUS_PILL_STYLES} dotIcons={DOT_ICONS} onSelect={onSetStatus}
          />
        </span>
      ) : <StatusDot status={assignment?.status || 'pending'} />}
    </div>
  )
}

// A person who is no longer on this event but still has booked travel here that needs rework. Listed under the event they left.
export function GhostTile({ name, reason, onClick }) {
  return (
    <div data-ghost="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', columnGap: 2, padding: STAFF_TILE_PAD, borderRadius: 6, boxSizing: 'border-box', minHeight: STAFF_TILE_MIN_H, fontFamily: FONT, border: '1px dashed var(--color-danger)', background: 'transparent' }} title={reason}>
      <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name}</button>
      <span title={reason} aria-label={reason} role="img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, color: 'var(--color-danger)' }}><IconAlertTriangle size={15} aria-hidden="true" /></span>
    </div>
  )
}
