'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import VenueField from './VenueField'
import { placeState } from '../lib/placesState'
import { useGoogleMaps } from '../lib/useGoogleMaps'
import { IconX, IconPlus, IconAlertTriangle, IconLoader2, IconRoute } from '@tabler/icons-react'

export const ALL_STATUSES = ['confirmed', '1-hold', '2-hold', '3-hold', 'tentative', 'date-hold']

export const statusLabel = (s) => {
  if (s === '3-hold') return '3+ Hold'
  if (s === 'date-hold') return 'Date Hold'
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

export const EMPTY_NEW_EVENT_FORM = {
  venue_name: '', place_id: '', no_venue: false, city: '', state: '', country: '', status: 'confirmed',
}

// Shared "new event" modal.
//   form/setForm   controlled by the parent (parent owns the insert)
//   tour           optional { name, color } -> shown as a locked chip
//   extended       adds country, event type, load-in/out, shows and notes
//   countries      optional list used to suggest countries (extended only)
export default function NewEventModal({
  title, subtitle, tour, form, setForm, onClose, onSubmit,
  submitting = false, error = '', extended = false, countries = [],
}) {
  const [initialForm] = useState(() => JSON.stringify(form))
  const cityInputRef = useRef(null)
  const mapsLoaded = useGoogleMaps(!!form.no_venue)

  // "No venue yet": the city field gets Google Places (cities only); typing by hand still works
  useEffect(() => {
    if (!form.no_venue || !mapsLoaded || !cityInputRef.current || !window.google?.maps?.places) return
    const ac = new window.google.maps.places.Autocomplete(cityInputRef.current, { types: ['(cities)'] })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place?.address_components) return
      const get = (type) => place.address_components.find(c => c.types.includes(type))?.long_name || ''
      setForm(p => ({
        ...p,
        city: get('locality') || get('postal_town') || get('sublocality') || place.name || '',
        state: placeState(place.address_components),
        country: get('country'),
      }))
    })
    return () => window.google.maps.event.clearInstanceListeners(ac)
  }, [form.no_venue, mapsLoaded, setForm])

  const dirty = JSON.stringify(form) !== initialForm

  const requestClose = () => {
    if (submitting) return
    if (dirty && !window.confirm('Discard this event? Your changes have not been saved.')) return
    onClose()
  }
  const requestCloseRef = useRef(requestClose)
  useEffect(() => { requestCloseRef.current = requestClose })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      // Let Google's suggestion list consume Escape first (add-new venue panel)
      if (document.querySelector('.pac-container')?.offsetParent && document.activeElement?.tagName === 'INPUT') return
      requestCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const shows = form.shows || []
  const setShow = (i, key, val) => set('shows', shows.map((s, idx) => idx === i ? { ...s, [key]: val } : s))

  const labelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', display: 'block', marginBottom: 6 }
  const fieldStyle = { fontSize: 15, padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
  const ghostBtn = { fontSize: 14, padding: '9px 18px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }
  const row2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }

  const disabled = submitting || (!form.no_venue && !form.venue_name) || !form.city || (extended && !form.load_in_date)

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <div
        id="new-event-modal"
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--glass-tile-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '0.5px solid var(--glass-tile-border)', boxShadow: 'var(--glass-tile-shadow)',
          borderRadius: 14, padding: 24, width: extended ? 560 : 440, maxWidth: '100%', maxHeight: '100%',
          overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={requestClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <IconX size={20} />
          </button>
        </div>

        {tour && (
          <div>
            <label style={labelStyle}>Tour</label>
            <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.85, cursor: 'not-allowed' }}>
              <IconRoute size={18} color={tour.color || 'var(--color-info)'} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: tour.color || 'var(--color-info)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{tour.name}</span>
            </div>
          </div>
        )}

        <VenueField form={form} setForm={setForm} />

        <div style={extended ? row2 : undefined}>
          <div>
            <label style={labelStyle}>City{form.no_venue ? ' *' : ''}</label>
            <input
              ref={cityInputRef}
              type="text"
              value={form.city}
              onChange={e => set('city', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder={form.no_venue ? 'Search for a city...' : 'City will auto-fill from venue'}
              autoComplete="off"
              style={fieldStyle}
            />
          </div>
          {(extended || form.no_venue) && (
            <div>
              <label style={labelStyle}>State / Province</label>
              <input type="text" value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. CA" style={fieldStyle} />
            </div>
          )}
        </div>

        {(extended || form.no_venue) && (
          <div>
            <label style={labelStyle}>Country</label>
            <input type="text" list="new-event-countries" value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. United Kingdom" style={fieldStyle} />
            <datalist id="new-event-countries">
              {countries.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        )}

        <div style={extended ? row2 : undefined}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={fieldStyle}>
              {ALL_STATUSES.map(st => <option key={st} value={st}>{statusLabel(st)}</option>)}
            </select>
          </div>
          {extended && (
            <div>
              <label style={labelStyle}>Event Type</label>
              <select value={form.event_type} onChange={e => set('event_type', e.target.value)} style={fieldStyle}>
                <option value="">— Select event type —</option>
                <option value="hwss">Hot Wheels Stunt Show</option>
                <option value="hwmt">Hot Wheels Monster Trucks Live</option>
              </select>
            </div>
          )}
        </div>

        {extended && (
          <>
            <div>
              <label style={labelStyle}>Load-In Date *</label>
              <input type="date" value={form.load_in_date} onChange={e => set('load_in_date', e.target.value)} style={fieldStyle} />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.extended_load_out} onChange={e => set('extended_load_out', e.target.checked)} style={{ accentColor: 'var(--color-info)', width: 16, height: 16 }} />
                Extended Load-Out
              </label>
              {form.extended_load_out && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Load-Out Date</label>
                  <input type="date" value={form.load_out_date} onChange={e => set('load_out_date', e.target.value)} style={fieldStyle} />
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Shows</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {shows.map((show, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="date" value={show.show_date} onChange={e => setShow(i, 'show_date', e.target.value)} style={{ ...fieldStyle, flex: 2, minWidth: 0 }} />
                    <input type="time" value={show.show_time} onChange={e => setShow(i, 'show_time', e.target.value)} style={{ ...fieldStyle, flex: 1, minWidth: 0 }} />
                    <button type="button" aria-label="Remove show" onClick={() => set('shows', shows.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                      <IconX size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => set('shows', [...shows, { show_date: '', show_time: '' }])} style={{ ...ghostBtn, color: 'var(--color-info)', marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}>
                <IconPlus size={14} /> Add Show
              </button>
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this event..." style={{ ...fieldStyle, height: 80, resize: 'vertical' }} />
            </div>
          </>
        )}

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-danger)' }}>
            <IconAlertTriangle size={16} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={requestClose} disabled={submitting} style={ghostBtn}>Cancel</button>
          <button
            onClick={onSubmit}
            disabled={disabled}
            style={{ fontSize: 14, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
          >
            {submitting && <IconLoader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {submitting ? 'Saving...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
