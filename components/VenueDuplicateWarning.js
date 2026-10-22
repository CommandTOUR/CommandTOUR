'use client'

import { IconAlertTriangle } from '@tabler/icons-react'
import { normalizeName, REASON_LABEL } from '../lib/venueGuard'

// Shown when a venue about to be created looks like one that already exists.
//   dupes: [{ venue, reason }]   newName: the name the user is trying to add
export default function VenueDuplicateWarning({ dupes, newName, busy, onUse, onRename, onForce }) {
  if (!dupes?.length) return null
  return (
    <div role="alert" style={{ border: '1px solid var(--status-1hold-border)', background: 'var(--status-1hold-bg)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--status-1hold-text)', fontSize: 14, fontWeight: 600 }}>
        <IconAlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          {dupes.length === 1
            ? <>This looks like an existing venue: {dupes[0].venue.name}{dupes[0].venue.address ? `, ${dupes[0].venue.address}` : ''}. Venues sometimes change names.</>
            : 'These look like existing venues. Venues sometimes change names.'}
        </span>
      </div>
      {dupes.map(m => (
        <div key={m.venue.id} style={{ background: 'var(--surface-card)', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.venue.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {[m.venue.address, m.venue.city, m.venue.state].filter(Boolean).join(', ')} · {REASON_LABEL[m.reason]}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy} onClick={() => onUse(m.venue)}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer' }}>
              Use existing venue
            </button>
            {newName?.trim() && normalizeName(m.venue.name) !== normalizeName(newName) && (
              <button type="button" disabled={busy} onClick={() => onRename(m)}
                style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }}>
                Same venue, new name
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" disabled={busy} onClick={onForce}
        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start', textDecoration: 'underline' }}>
        Add as a separate venue anyway
      </button>
    </div>
  )
}
