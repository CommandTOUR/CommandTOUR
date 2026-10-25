'use client'

import { useState } from 'react'
import { IconBuildingStadium, IconPlus, IconArrowsExchange, IconTrash } from '@tabler/icons-react'
import VenueField from './VenueField'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const btn = { fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)' }

// Venue block for an EXISTING event (side panel, event page). Controlled by the host:
//   base    the saved venue fields { venue_id, venue_name, city, state, country }
//   patch   null, or the pending change in the same shape (host saves it)
//   onChange(patch)  called when the user applies a venue or removes it
// Uses the shared VenueField (existing venues first, guarded Add new venue, former names).
export default function EventVenueEditor({ base, patch, onChange, disabled = false }) {
  const eff = patch || base
  const hasVenue = !!eff.venue_name
  const [picking, setPicking] = useState(false)
  const [form, setForm] = useState(null)

  const startPick = () => {
    setForm({ venue_id: null, venue_name: '', place_id: '', city: eff.city || '', state: eff.state || '', country: eff.country || '', no_venue: false })
    setPicking(true)
  }

  const apply = () => {
    if (!form?.venue_id) return
    onChange({ venue_id: form.venue_id, venue_name: form.venue_name, city: form.city, state: form.state, country: form.country })
    setPicking(false)
  }

  const remove = () => {
    if (!window.confirm(`Remove the venue from this event? It goes back to a hold${eff.city ? ` in ${eff.city}` : ''}.`)) return
    onChange({ venue_id: null, venue_name: null, city: eff.city, state: eff.state, country: eff.country })
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {!picking ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <IconBuildingStadium size={18} color={hasVenue ? 'var(--color-info)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: hasVenue ? 600 : 450, color: hasVenue ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {hasVenue ? eff.venue_name : 'Venue TBD'}
            </div>
            {eff.city && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{[eff.city, eff.state].filter(Boolean).join(', ')}</div>}
          </div>
          {patch && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-1hold-text)', background: 'var(--status-1hold-bg)', border: '1px solid var(--status-1hold-border)', borderRadius: 10, padding: '1px 8px' }}>unsaved</span>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {hasVenue ? (
              <>
                <button type="button" disabled={disabled} onClick={startPick} style={btn}><IconArrowsExchange size={14} /> Change</button>
                <button type="button" disabled={disabled} onClick={remove} style={{ ...btn, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}><IconTrash size={14} /> Remove venue</button>
              </>
            ) : (
              <button type="button" disabled={disabled} onClick={startPick} style={btn}><IconPlus size={14} /> Add venue</button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface-card)' }}>
          <VenueField
            form={form}
            setForm={setForm}
            hideNoVenue
            preserveCity
            originalVenue={base.venue_id ? { id: base.venue_id, name: base.venue_name } : null}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setPicking(false)} style={{ ...btn, borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>Cancel</button>
            <button type="button" onClick={apply} disabled={!form?.venue_id || form.venue_id === eff.venue_id}
              style={{ ...btn, border: 'none', background: '#FFD60A', color: '#0a1628', fontWeight: 700, opacity: (!form?.venue_id || form.venue_id === eff.venue_id) ? 0.5 : 1 }}>
              Use this venue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
