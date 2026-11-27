'use client'

import { IconChecks } from '@tabler/icons-react'
import { EVENT_STATUS_PILL_STYLES } from '@/lib/eventStatusStyles'
import { EVENT_STATUS_STYLES, fmtEventRange } from './shared'
import { formatLocation } from '@/lib/locationFormat'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

// Column header tile: tour-colored border, tour name, city, dates, status pill (the Master Schedule colors) and N/M confirmed.
export default function EventHeader({
  event, tour, model, selectMode, onSelectAll, blockedReason, dragging, dragOver, hintLabel,
  onDragOver, onDragEnter, onDragLeave, onDrop,
}) {
  const color = tour?.color || 'var(--border-strong)'
  const label = EVENT_STATUS_STYLES[event.status]?.label || event.status || 'No status'
  const chip = EVENT_STATUS_PILL_STYLES[event.status]
  // count colors: text-safe tokens (the plain warning/yellow token fails contrast on light tiles)
  const countColor = model.open > 0 ? 'var(--color-danger)'
    : (model.total > 0 && model.confirmed === model.total) ? 'var(--color-success)' : 'var(--status-1hold-text)'
  const blocked = dragging && !!blockedReason
  return (
    <div
      data-event-header={event.id}
      onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        width: '100%', boxSizing: 'border-box', fontFamily: FONT,
        background: 'var(--surface-card)', border: `2.5px solid ${color}`, borderRadius: 'var(--tile-radius)', padding: '5px 8px 6px',
        opacity: blocked ? 0.4 : 1, transition: 'opacity 0.12s',
        boxShadow: dragging && dragOver ? `0 0 0 3px ${blocked ? 'var(--color-danger)' : 'var(--color-info)'}` : 'none',
        cursor: dragging && blocked ? 'not-allowed' : undefined,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tour?.name}>
        {tour?.name || 'Tour'}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatLocation(event.city, event.state, event.country, 'full')}>
        {formatLocation(event.city, event.state, event.country, 'compact')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: 'var(--text-primary)' }}>{fmtEventRange(event)}</div>
      {dragging && dragOver && hintLabel ? (
        <div data-drop-label={blocked ? 'blocked' : 'move'} style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', padding: '1px 7px', borderRadius: 10, background: `color-mix(in srgb, ${blocked ? 'var(--color-danger)' : 'var(--color-info)'} 16%, var(--surface-card))`, border: `1px solid ${blocked ? 'var(--color-danger)' : 'var(--color-info)'}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hintLabel}</div>
      ) : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '0 7px', borderRadius: 10, border: `1px solid ${chip?.border || 'var(--border-strong)'}`, color: 'var(--text-primary)', background: chip?.background || 'var(--surface-raised)', whiteSpace: 'nowrap' }}>
          {chip && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: chip.color, flexShrink: 0 }} />}
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: countColor, whiteSpace: 'nowrap' }}>{model.confirmed}/{model.total}</span>
      </div>
      )}
      {selectMode && (
        <button type="button" onClick={onSelectAll} style={{ marginTop: 3, background: 'none', border: 'none', padding: 0, color: 'var(--color-info)', fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconChecks size={14} /> Select All Here
        </button>
      )}
    </div>
  )
}
