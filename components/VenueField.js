'use client'

import { useState, useEffect, useRef } from 'react'
import { IconX, IconMapPin, IconPlus, IconArrowLeft, IconLoader2 } from '@tabler/icons-react'
import { getSupabase } from '../lib/supabase'
import { placeState } from '../lib/placesState'
import { useGoogleMaps } from '../lib/useGoogleMaps'
import { quickToast } from '../lib/quickToast'
import VenueDuplicateWarning from './VenueDuplicateWarning'
import { findDuplicateVenues, searchVenues, renameVenue } from '../lib/venueGuard'

const EMPTY_NV = { name: '', address: '', city: '', state: '', country: '', place_id: '', full_address: '', zip: '', latitude: null, longitude: null }

const labelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', display: 'block', marginBottom: 6 }
const fieldStyle = { fontSize: 15, padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-input)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
const linkBtn = { background: 'none', border: 'none', padding: 0, color: 'var(--color-info)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }
const smallBtn = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }

// Venue picker for the event modal.
// Default: search EXISTING venues only (no Google). "Add new venue" opens a panel with Google Places +
// manual fields, guarded against duplicates. Selecting links the event by venue_id.
export default function VenueField({ form, setForm }) {
  const [mode, setMode] = useState('search') // 'search' | 'new'
  const [query, setQuery] = useState(form.venue_name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [selected, setSelected] = useState(null)

  const [nv, setNv] = useState(EMPTY_NV)
  const [dupes, setDupes] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const debounceRef = useRef(null)
  const searchSeq = useRef(0)
  const nameRef = useRef(null)

  // Google Maps script is only needed for the add-new panel
  const mapsLoaded = useGoogleMaps(mode === 'new')

  // Places autocomplete: attached ONLY to the add-new name input
  useEffect(() => {
    if (mode !== 'new' || !mapsLoaded || !nameRef.current || !window.google?.maps?.places) return
    const ac = new window.google.maps.places.Autocomplete(nameRef.current, { types: ['establishment'] })
    const listener = ac.addListener('place_changed', async () => {
      const place = ac.getPlace()
      if (!place || !place.address_components) return
      const get = (type) => place.address_components.find(c => c.types.includes(type))?.long_name || ''
      const picked = {
        name: place.name || '',
        address: [get('street_number'), get('route')].filter(Boolean).join(' '),
        city: get('locality') || get('postal_town') || get('sublocality') || '',
        state: placeState(place.address_components),
        country: get('country'),
        zip: get('postal_code'),
        place_id: place.place_id || '',
        full_address: place.formatted_address || '',
        latitude: place.geometry?.location?.lat() ?? null,
        longitude: place.geometry?.location?.lng() ?? null,
      }
      setNv(picked)
      setErr('')
      setBusy(true)
      setDupes(await findDuplicateVenues(picked))
      setBusy(false)
    })
    return () => { listener?.remove?.(); window.google.maps.event.clearInstanceListeners(ac) }
  }, [mode, mapsLoaded])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    setActiveIdx(-1)
    setForm(p => ({ ...p, venue_name: val, venue_id: null, place_id: '' }))
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const seq = ++searchSeq.current
    debounceRef.current = setTimeout(async () => {
      const found = await searchVenues(val, 8)
      if (seq !== searchSeq.current) return
      setResults(found)
      setSearching(false)
    }, 250)
  }

  const selectVenue = (v) => {
    clearTimeout(debounceRef.current)
    searchSeq.current++
    setSelected(v)
    setMode('search')
    setQuery(v.name)
    setResults([])
    setOpen(false)
    setDupes([])
    setForm(p => ({ ...p, venue_id: v.id, venue_name: v.name, place_id: '', city: v.city || '', state: v.state || '', country: v.country || '' }))
  }

  const clearSelected = () => {
    setSelected(null)
    setQuery('')
    setResults([])
    setForm(p => ({ ...p, venue_id: null, venue_name: '' }))
  }

  // "No venue yet": hold by city. Clears any selected venue and pending new-venue data.
  const toggleNoVenue = () => {
    const next = !form.no_venue
    clearTimeout(debounceRef.current)
    searchSeq.current++
    setSelected(null)
    setQuery('')
    setResults([])
    setOpen(false)
    setNv(EMPTY_NV)
    setDupes([])
    setErr('')
    setMode('search')
    setForm(p => ({ ...p, no_venue: next, venue_id: null, venue_name: '', place_id: '' }))
  }

  const noVenueCheckbox = (
    <div
      role="checkbox"
      aria-checked={!!form.no_venue}
      tabIndex={0}
      onClick={toggleNoVenue}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleNoVenue() } }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, width: 'fit-content', userSelect: 'none' }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        background: form.no_venue ? 'rgba(26,86,219,0.15)' : 'transparent',
        border: form.no_venue ? '1.5px solid var(--color-info)' : '1.5px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        {form.no_venue && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>No venue yet (hold by city)</span>
    </div>
  )

  const openNew = () => {
    setNv({ ...EMPTY_NV, name: query.trim() })
    setDupes([])
    setErr('')
    setOpen(false)
    setMode('new')
  }

  const showAddRow = query.trim().length >= 2 && !searching && results.length < 3
  const rowCount = results.length + (showAddRow ? 1 : 0)

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIdx(i => Math.min(i + 1, rowCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < results.length) selectVenue(results[activeIdx])
      else if (activeIdx === results.length && showAddRow) openNew()
    } else if (e.key === 'Escape' && open && rowCount > 0) {
      e.stopPropagation(); e.nativeEvent.stopImmediatePropagation?.()
      setOpen(false)
    }
  }

  // ── add-new actions ──
  const addVenue = async (force = false) => {
    if (!nv.name.trim() || !nv.city.trim()) { setErr('Venue name and city are required'); return }
    setBusy(true)
    setErr('')
    // Guard runs again right before any insert, whatever was typed or picked
    if (!force) {
      const matches = await findDuplicateVenues(nv)
      if (matches.length) { setDupes(matches); setBusy(false); return }
    }
    const { data, error } = await getSupabase().from('venues').insert([{
      name: nv.name.trim(), address: nv.address, city: nv.city.trim(), state: nv.state, country: nv.country,
      full_address: nv.full_address, place_id: nv.place_id || null, latitude: nv.latitude, longitude: nv.longitude,
      zip: nv.zip, region: '',
    }]).select('*').single()
    setBusy(false)
    if (error) { setErr(error.message); return }
    selectVenue(data)
  }

  const sameVenueNewName = async (match) => {
    const v = match.venue
    if (!window.confirm(`Rename "${v.name}" to "${nv.name}"? The old name is kept as a former name.`)) return
    setBusy(true)
    const { venue: updated, error, savedFormerName } = await renameVenue(v, nv.name.trim())
    setBusy(false)
    if (error || !updated) { setErr(error?.message || 'Could not rename the venue'); return }
    if (!savedFormerName) quickToast('Venue renamed. Old name not saved: former_names column is missing.', 'info')
    selectVenue(updated)
  }

  const setNvField = (k) => (e) => { setNv(p => ({ ...p, [k]: e.target.value })); setDupes([]) }

  // ── render ──
  if (form.no_venue) {
    return (
      <div>
        <label style={labelStyle}>Venue</label>
        {noVenueCheckbox}
      </div>
    )
  }

  if (mode === 'new') {
    return (
      <div>
        <label style={labelStyle}>New venue</label>
        <div style={{ border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 14, background: 'var(--surface-input)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" style={linkBtn} onClick={() => { setMode('search'); setDupes([]) }}>
            <IconArrowLeft size={14} /> Search existing venues
          </button>

          <div>
            <label style={labelStyle}>Venue name</label>
            <div style={{ position: 'relative' }}>
              <IconMapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 13, pointerEvents: 'none' }} />
              <input
                ref={nameRef}
                autoFocus
                value={nv.name}
                onChange={setNvField('name')}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                placeholder="Search Google or type a name"
                autoComplete="off"
                style={{ ...fieldStyle, paddingLeft: 36, background: 'var(--surface-card)' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Street address</label>
            <input value={nv.address} onChange={setNvField('address')} style={{ ...fieldStyle, background: 'var(--surface-card)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div><label style={labelStyle}>City</label><input value={nv.city} onChange={setNvField('city')} style={{ ...fieldStyle, background: 'var(--surface-card)' }} /></div>
            <div><label style={labelStyle}>State</label><input value={nv.state} onChange={setNvField('state')} style={{ ...fieldStyle, background: 'var(--surface-card)' }} /></div>
            <div><label style={labelStyle}>Country</label><input value={nv.country} onChange={setNvField('country')} style={{ ...fieldStyle, background: 'var(--surface-card)' }} /></div>
          </div>

          <VenueDuplicateWarning
            dupes={dupes}
            newName={nv.name}
            busy={busy}
            onUse={selectVenue}
            onRename={sameVenueNewName}
            onForce={() => addVenue(true)}
          />

          {err && <div role="alert" style={{ fontSize: 14, color: 'var(--color-danger)' }}>{err}</div>}

          {dupes.length === 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setMode('search'); setDupes([]) }} style={{ ...smallBtn, borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>Cancel</button>
              <button type="button" disabled={busy} onClick={() => addVenue(false)}
                style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer', opacity: busy ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {busy && <IconLoader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />} Add venue
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label style={labelStyle}>Venue</label>
      {selected ? (
        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderColor: 'var(--color-info)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{[selected.address, selected.city, selected.state].filter(Boolean).join(', ')}</div>
          </div>
          <button type="button" onClick={clearSelected} aria-label="Clear venue" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <IconX size={16} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <IconMapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 13, pointerEvents: 'none' }} />
            <input
              type="text"
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-expanded={open && rowCount > 0}
              aria-controls="venue-results"
              placeholder="Search venues by name, city or address..."
              value={query}
              onChange={handleInput}
              onFocus={() => setOpen(true)}
              onKeyDown={onInputKey}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>

          {open && query.trim().length >= 2 && (
            <div id="venue-results" role="listbox" style={{ marginTop: 6, border: '0.5px solid var(--border-default)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-input)' }}>
              {searching && <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Searching…</div>}
              {!searching && results.length === 0 && <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>No matching venues</div>}
              {results.map((v, i) => (
                <div
                  key={v.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={(e) => { e.preventDefault(); selectVenue(v) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{ padding: '8px 12px', cursor: 'pointer', background: i === activeIdx ? 'var(--glass-tile-hover)' : 'transparent', borderTop: i > 0 ? '0.5px solid var(--border-default)' : 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                    <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{[v.city, v.state].filter(Boolean).join(', ')}</span>
                  </div>
                  {v.address && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address}</div>}
                </div>
              ))}
              {showAddRow && (
                <div
                  role="option"
                  aria-selected={activeIdx === results.length}
                  onMouseDown={(e) => { e.preventDefault(); openNew() }}
                  onMouseEnter={() => setActiveIdx(results.length)}
                  style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 14, color: 'var(--color-info)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, borderTop: results.length ? '0.5px solid var(--border-default)' : 'none', background: activeIdx === results.length ? 'var(--glass-tile-hover)' : 'transparent' }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 450 }}>Can&apos;t find it?</span>
                  <IconPlus size={14} /> Add new venue
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 6 }}>
            <button type="button" style={linkBtn} onClick={openNew}><IconPlus size={14} /> Add new venue</button>
          </div>
        </>
      )}
      {noVenueCheckbox}
    </div>
  )
}
