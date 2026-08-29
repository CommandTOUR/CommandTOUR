'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../lib/supabase'
import { IconAlertTriangle, IconAlertTriangleFilled } from '@tabler/icons-react'

const GLASS = { background: 'var(--glass-tile-bg)', backdropFilter: 'blur(12px) saturate(1.4)', border: '0.5px solid var(--glass-tile-border)', borderRadius: 14, boxShadow: 'var(--glass-tile-shadow)' }

const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Twin']

const OVERLAY = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }

const SECTION_LABEL = { fontSize: 15, fontWeight: 700, color: 'var(--color-info)' }

const ADD_BTN = { fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }

const CANCEL_BTN = { fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--color-info)', background: 'transparent', color: 'var(--color-info)', cursor: 'pointer' }

const SYSTEM_INPUT = { fontSize: 14, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', caretColor: 'var(--color-info)', outline: 'none', width: '100%' }

const SYSTEM_SELECT = { fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', width: '100%', appearance: 'none', WebkitAppearance: 'none' }

const TRAVEL_TYPE_STYLES = {
  flight:  { label: 'Flight',  bg: 'rgba(26,86,219,0.12)',  color: 'var(--color-info)',    border: '0.5px solid rgba(26,86,219,0.35)' },
  train:   { label: 'Train',   bg: 'rgba(0,208,132,0.12)',  color: 'var(--color-success)', border: '0.5px solid rgba(0,208,132,0.35)' },
  bus:     { label: 'Bus',     bg: 'rgba(255,184,0,0.12)',  color: 'var(--color-warning)', border: '0.5px solid rgba(255,184,0,0.35)' },
  driving: { label: 'Driving', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',              border: '0.5px solid rgba(168,85,247,0.35)' },
}

const TRAVEL_GRID = '1.2fr 0.7fr 0.7fr 1fr 0.8fr 0.7fr 1fr 1fr 60px'
const TRAVEL_CELL = { display: 'flex', alignItems: 'center', overflow: 'hidden' }
const TRAVEL_HEADER_CELL = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)' }

const hoverBlue = e => { e.currentTarget.style.background = 'rgba(26,86,219,0.08)' }
const unhoverBlue = e => { e.currentTarget.style.background = 'transparent' }
const hoverDanger = e => { e.currentTarget.style.color = 'var(--color-danger)' }
const unhoverDanger = e => { e.currentTarget.style.color = 'var(--text-muted)' }
const hoverRow = e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }
const unhoverRow = e => { e.currentTarget.style.background = 'transparent' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateHeader(d) {
  const date = new Date(d + 'T00:00:00')
  const wd = date.toLocaleDateString('en-US', { weekday: 'short' })
  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${wd} ${md}`
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function fmtMoney(v) {
  return `$${(Number(v) || 0).toFixed(2)}`
}

function EditableCell({ value, onSave, type = 'text', placeholder = '—', centered = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setVal(value || '') }, [value])
  const handleSave = async () => { setEditing(false); if (val !== (value || '')) await onSave(val) }
  if (editing) {
    return (
      <input ref={inputRef} type={type}
        style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--color-info)', background: 'var(--surface-card)', color: 'var(--text-primary)', caretColor: 'var(--color-info)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setVal(value || '') } }}
      />
    )
  }
  return (
    <div onClick={() => setEditing(true)}
      style={{ fontSize: 12, cursor: 'text', color: val ? 'var(--text-secondary)' : 'var(--text-muted)', minHeight: 18, padding: '2px 0', borderBottom: '0.5px solid transparent', transition: 'border-color 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: centered ? 'center' : 'left' }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = 'var(--border-default)' }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}
    >
      {type === 'date' ? fmtDate(val) : type === 'time' ? fmtTime(val) : (val || placeholder)}
    </div>
  )
}

function Checkbox({ checked, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 16, height: 16, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
      background: checked ? 'rgba(26,86,219,0.12)' : 'transparent',
      border: checked ? '1px solid var(--color-info)' : '1px solid var(--border-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function StaffPicker({ onSelect, onClose, excludeIds = [] }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const fetch = async () => {
      const supabase = getSupabase()
      let query = supabase.from('staff').select('id, first_name, last_name').order('last_name', { ascending: true })
      if (search.trim()) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      const { data } = await query.limit(10)
      setResults((data || []).filter(s => !excludeIds.includes(s.id)))
    }
    fetch()
  }, [search])
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 380, maxHeight: 440, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Select Staff</div>
        <input ref={inputRef}
          style={SYSTEM_INPUT}
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map(s => (
            <div key={s.id} onClick={() => onSelect(s)}
              style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}
              onMouseEnter={hoverRow}
              onMouseLeave={unhoverRow}
            >
              {s.first_name} {s.last_name}
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={CANCEL_BTN}
          onMouseEnter={hoverBlue}
          onMouseLeave={unhoverBlue}
        >Cancel</button>
      </div>
    </div>
  )
}

function WarningTriangle() {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: 16, height: 16, flexShrink: 0 }}>
      <IconAlertTriangleFilled size={16} color="#FFD60A" />
      <IconAlertTriangle size={16} color="#111111" style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
  )
}

function TravelTypeDropdown({ value, onChange }) {
  const current = value || ''
  const style = current && TRAVEL_TYPE_STYLES[current]
    ? TRAVEL_TYPE_STYLES[current]
    : { label: 'N/A', bg: 'rgba(100,116,139,0.10)', color: 'var(--text-muted)', border: '0.5px solid var(--border-default)' }
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
        background: style.bg, color: style.color, border: style.border,
        userSelect: 'none', whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        {style.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 5, flexShrink: 0, opacity: 0.8 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <select
        value={current}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
      >
        <option value="">N/A</option>
        <option value="flight">Flight</option>
        <option value="train">Train</option>
        <option value="bus">Bus</option>
        <option value="driving">Driving</option>
      </select>
    </div>
  )
}

function TravelTableHeader({ sortField, sortDir, onSort, type, onQuickSort }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: TRAVEL_GRID, gap: '0 6px', padding: '14px 12px 0', alignItems: 'center' }}>
      <div style={TRAVEL_HEADER_CELL}>Name</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Travel Type</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort('travel_date')}>Date {sortField === 'travel_date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort('airline')}>Airline / Op {sortField === 'airline' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort('flight_number')}>Flight / Route # {sortField === 'flight_number' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort(type === 'arrival' ? 'arrival_time' : 'departure_time')}>Time {sortField === (type === 'arrival' ? 'arrival_time' : 'departure_time') ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort('airport')}>Airport / Station {sortField === 'airport' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center', cursor: 'pointer' }} onClick={() => onSort('transport')}>Transport {sortField === 'transport' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onQuickSort}
          style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >Quick Sort</button>
      </div>
    </div>
  )
}

function RateField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-info)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtMoney(value)}</div>
    </div>
  )
}

function FieldDivider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-default)' }} />
}

export default function TravelHotelTab({ eventId, event, initialTab }) {
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [tour, setTour] = useState(null)
  const [confirmedStaff, setConfirmedStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [travelTab, setTravelTab] = useState(initialTab || 'arrivals')
  const [arrivalSort, setArrivalSort] = useState(() => {
    try { const s = localStorage.getItem(`arrival_sort_${eventId}`); return s ? JSON.parse(s) : { field: 'travel_date', dir: 'asc' } } catch { return { field: 'travel_date', dir: 'asc' } }
  })
  const [departureSort, setDepartureSort] = useState(() => {
    try { const s = localStorage.getItem(`departure_sort_${eventId}`); return s ? JSON.parse(s) : { field: 'travel_date', dir: 'asc' } } catch { return { field: 'travel_date', dir: 'asc' } }
  })
  const [arrivalSorted, setArrivalSorted] = useState(() => {
    try { return !!localStorage.getItem(`arrival_sort_${eventId}`) } catch { return false }
  })
  const [departureSorted, setDepartureSorted] = useState(() => {
    try { return !!localStorage.getItem(`departure_sort_${eventId}`) } catch { return false }
  })
  const [roomStaffPicker, setRoomStaffPicker] = useState(null)
  const [editingHotel, setEditingHotel] = useState(false)
  const [hotelForm, setHotelForm] = useState({ hotel_name: '', address: '', check_in_date: '', check_out_date: '', notes: '' })
  const [selectedUnroomed, setSelectedUnroomed] = useState([])
  const [saveError, setSaveError] = useState(null)
  const [perDiemRates, setPerDiemRates] = useState(null)
  const [perDiemMeals, setPerDiemMeals] = useState([])
  const [perDiemStaff, setPerDiemStaff] = useState([])
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [showEligibleModal, setShowEligibleModal] = useState(false)
  const [ratesForm, setRatesForm] = useState({ breakfast_rate: '', lunch_rate: '', dinner_rate: '' })
  const [displayArrivals, setDisplayArrivals] = useState([])
  const [displayDepartures, setDisplayDepartures] = useState([])
  const [rentalCars, setRentalCars] = useState([])
  const [editingRental, setEditingRental] = useState(null) // null | 'new' | row object
  const [rentalForm, setRentalForm] = useState({ staff_id: '', pickup_date: '', return_date: '', pickup_location: '', return_location: '', car_class: '', confirmation_number: '', vendor: '', notes: '' })
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.getAttribute('data-theme') !== 'dark'
  })

  useEffect(() => {
    const checkTheme = () => setIsLightMode(document.documentElement.getAttribute('data-theme') !== 'dark')
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => { fetchAll() }, [eventId])

  const fetchAll = async () => {
    const supabase = getSupabase()
    const [arrRes, depRes, hotelRes, roomsRes, staffRes, tourRes, rentalRes] = await Promise.all([
      supabase.from('event_travel_arrivals').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_travel_departures').select('*, staff(first_name, last_name)').eq('event_id', eventId),
      supabase.from('event_hotel').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_hotel_rooms').select('*, s1:staff_id_1(id, first_name, last_name), s2:staff_id_2(id, first_name, last_name)').eq('event_id', eventId),
      supabase.from('staff_assignments')
        .select(`
          staff_id,
          status,
          confirmed,
          staff:staff_id(id, first_name, last_name, display_name)
        `)
        .eq('event_id', eventId)
        .not('staff_id', 'is', null),
      event.tour_id ? supabase.from('tours').select('id, name, color').eq('id', event.tour_id).single() : Promise.resolve({ data: null }),
      supabase.from('event_rental_cars').select('*, staff:staff_id(id, first_name, last_name)').eq('event_id', eventId).order('pickup_date', { ascending: true }),
    ])
    const confirmedRows = (staffRes.data || []).filter(r => r.confirmed === true || r.status === 'confirmed')
    const confirmedStaffIds = new Set(confirmedRows.map(r => r.staff_id).filter(Boolean))

    const existingArrivalStaffIds = new Set((arrRes.data || []).map(r => r.staff_id))
    const missingArrivals = confirmedRows
      .filter(r => !existingArrivalStaffIds.has(r.staff_id))
      .map(r => ({
        id: null,
        event_id: eventId,
        staff_id: r.staff_id,
        staff: r.staff,
        travel_type: '',
        travel_date: null,
        airline: null,
        flight_number: null,
        arrival_time: null,
        airport: null,
        transport: null,
        flagged: true,
        _synthetic: true
      }))
    const computedArrivals = [
      ...(arrRes.data || [])
        .filter(r => confirmedStaffIds.has(r.staff_id))
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })),
      ...missingArrivals
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null }))
    ]
    setArrivals(computedArrivals)
    const arrivalKey = r => r.id ?? `synthetic-${r.staff_id}`
    const savedArrivalSort = (() => { try { const s = localStorage.getItem(`arrival_sort_${eventId}`); return s ? JSON.parse(s) : null } catch { return null } })()
    setDisplayArrivals(prev => {
      const byKey = new Map(computedArrivals.map(a => [arrivalKey(a), a]))
      if (prev.length === 0) {
        return savedArrivalSort ? sortRows(computedArrivals, savedArrivalSort) : computedArrivals
      }
      const merged = prev.map(p => byKey.get(arrivalKey(p))).filter(Boolean)
      const seenKeys = new Set(merged.map(arrivalKey))
      const added = computedArrivals.filter(a => !seenKeys.has(arrivalKey(a)))
      const updated = [...merged, ...added]
      return savedArrivalSort ? sortRows(updated, savedArrivalSort) : updated
    })

    const existingDepartureStaffIds = new Set((depRes.data || []).map(r => r.staff_id))
    const missingDepartures = confirmedRows
      .filter(r => !existingDepartureStaffIds.has(r.staff_id))
      .map(r => ({
        id: null,
        event_id: eventId,
        staff_id: r.staff_id,
        staff: r.staff,
        travel_type: '',
        travel_date: null,
        airline: null,
        flight_number: null,
        departure_time: null,
        airport: null,
        transport: null,
        flagged: true,
        _synthetic: true
      }))
    const computedDepartures = [
      ...(depRes.data || [])
        .filter(r => confirmedStaffIds.has(r.staff_id))
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null })),
      ...missingDepartures
        .map(r => ({ ...r, staff_name: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : null }))
    ]
    setDepartures(computedDepartures)
    const departureKey = r => r.id ?? `synthetic-${r.staff_id}`
    const savedDepartureSort = (() => { try { const s = localStorage.getItem(`departure_sort_${eventId}`); return s ? JSON.parse(s) : null } catch { return null } })()
    setDisplayDepartures(prev => {
      const byKey = new Map(computedDepartures.map(a => [departureKey(a), a]))
      if (prev.length === 0) {
        return savedDepartureSort ? sortRows(computedDepartures, savedDepartureSort) : computedDepartures
      }
      const merged = prev.map(p => byKey.get(departureKey(p))).filter(Boolean)
      const seenKeys = new Set(merged.map(departureKey))
      const added = computedDepartures.filter(a => !seenKeys.has(departureKey(a)))
      const updated = [...merged, ...added]
      return savedDepartureSort ? sortRows(updated, savedDepartureSort) : updated
    })
    if (!hotelRes.error && hotelRes.data) {
      setHotel(hotelRes.data)
      setHotelForm({ hotel_name: hotelRes.data.hotel_name || '', address: hotelRes.data.address || '', check_in_date: hotelRes.data.check_in_date || '', check_out_date: hotelRes.data.check_out_date || '', notes: hotelRes.data.notes || '' })
    }
    setRooms(roomsRes.data || [])
    setConfirmedStaff(confirmedRows.map(r => r.staff).filter(Boolean))
    if (tourRes.data) setTour(tourRes.data)

    const [perDiemRatesRes, perDiemMealsRes, perDiemStaffRes] = await Promise.all([
      supabase.from('event_perdiem_rates').select('*').eq('event_id', eventId).maybeSingle(),
      supabase.from('event_perdiem_meals').select('*').eq('event_id', eventId).order('meal_date', { ascending: true }),
      supabase.from('event_perdiem_staff').select('*, staff:staff_id(id, first_name, last_name)').eq('event_id', eventId),
    ])
    if (perDiemRatesRes.data) { setPerDiemRates(perDiemRatesRes.data); setRatesForm({ breakfast_rate: perDiemRatesRes.data.breakfast_rate, lunch_rate: perDiemRatesRes.data.lunch_rate, dinner_rate: perDiemRatesRes.data.dinner_rate }) }
    setPerDiemMeals(perDiemMealsRes.data || [])
    setPerDiemStaff(perDiemStaffRes.data || [])
    setRentalCars(rentalRes.data || [])

    setLoading(false)
  }

  const sortRows = (rows, sort) => [...rows].sort((a, b) => {
    if (sort.field === 'travel_date') {
      const aDate = a.travel_date || ''
      const bDate = b.travel_date || ''
      const aTime = a.arrival_time || a.departure_time || ''
      const bTime = b.arrival_time || b.departure_time || ''
      const aHasDate = !!aDate
      const bHasDate = !!bDate
      const aHasTime = !!aTime
      const bHasTime = !!bTime
      // Empty dates sink to bottom
      if (!aHasDate && !bHasDate) return 0
      if (!aHasDate) return 1
      if (!bHasDate) return -1
      // Both have dates — compare dates first
      const dateCmp = aDate.localeCompare(bDate)
      if (dateCmp !== 0) return sort.dir === 'asc' ? dateCmp : -dateCmp
      // Same date — date+time floats above date-only
      if (aHasTime && !bHasTime) return -1
      if (!aHasTime && bHasTime) return 1
      // Both have time — sort by time
      return aTime.localeCompare(bTime)
    }
    const av = a[sort.field] || ''
    const bv = b[sort.field] || ''
    return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const handleSort = (table, field) => {
    if (table === 'arrival') {
      const newSort = { field, dir: arrivalSort.field === field && arrivalSort.dir === 'asc' ? 'desc' : 'asc' }
      try { localStorage.setItem(`arrival_sort_${eventId}`, JSON.stringify(newSort)) } catch {}
      setArrivalSorted(true)
      setArrivalSort(newSort)
      setDisplayArrivals(sortRows(arrivals, newSort))
    } else {
      const newSort = { field, dir: departureSort.field === field && departureSort.dir === 'asc' ? 'desc' : 'asc' }
      try { localStorage.setItem(`departure_sort_${eventId}`, JSON.stringify(newSort)) } catch {}
      setDepartureSorted(true)
      setDepartureSort(newSort)
      setDisplayDepartures(sortRows(departures, newSort))
    }
  }

  const handleUpdateArrival = async (row, field, value) => {
    const s = getSupabase()
    if (row.id == null) {
      const { data, error: insertError } = await s.from('event_travel_arrivals')
        .insert([{ event_id: eventId, staff_id: row.staff_id }])
        .select().single()
      if (insertError || !data) { console.error('Failed to create arrival:', insertError); setSaveError('Failed to save. Please try again.'); return }
      const { error } = await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', data.id)
      if (error) { console.error('Failed to update arrival:', error); setSaveError('Failed to save. Please try again.') }
    } else {
      const { error } = await s.from('event_travel_arrivals').update({ [field]: value || null }).eq('id', row.id)
      if (error) { console.error('Failed to update arrival:', error); setSaveError('Failed to save. Please try again.') }
    }
    fetchAll()
  }
  const handleUpdateDeparture = async (row, field, value) => {
    const s = getSupabase()
    if (row.id == null) {
      const { data, error: insertError } = await s.from('event_travel_departures')
        .insert([{ event_id: eventId, staff_id: row.staff_id }])
        .select().single()
      if (insertError || !data) { console.error('Failed to create departure:', insertError); setSaveError('Failed to save. Please try again.'); return }
      const { error } = await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', data.id)
      if (error) { console.error('Failed to update departure:', error); setSaveError('Failed to save. Please try again.') }
    } else {
      const { error } = await s.from('event_travel_departures').update({ [field]: value || null }).eq('id', row.id)
      if (error) { console.error('Failed to update departure:', error); setSaveError('Failed to save. Please try again.') }
    }
    fetchAll()
  }
  const handleRemoveArrival = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_arrivals').delete().eq('id', id)
    if (error) { console.error('Failed to remove arrival:', error); setSaveError('Failed to remove. Please try again.') }
    fetchAll()
  }
  const handleRemoveDeparture = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_travel_departures').delete().eq('id', id)
    if (error) { console.error('Failed to remove departure:', error); setSaveError('Failed to remove. Please try again.') }
    fetchAll()
  }

  const handleAddRental = async () => {
    const supabase = getSupabase()
    const { error } = await supabase.from('event_rental_cars').insert([{
      event_id: eventId,
      staff_id: rentalForm.staff_id || null,
      pickup_date: rentalForm.pickup_date || null,
      return_date: rentalForm.return_date || null,
      pickup_location: rentalForm.pickup_location || null,
      return_location: rentalForm.return_location || null,
      car_class: rentalForm.car_class || null,
      confirmation_number: rentalForm.confirmation_number || null,
      vendor: rentalForm.vendor || null,
      notes: rentalForm.notes || null,
    }])
    if (error) { console.error('Failed to add rental:', error); setSaveError('Failed to add rental. Please try again.'); return }
    setEditingRental(null)
    setRentalForm({ staff_id: '', pickup_date: '', return_date: '', pickup_location: '', return_location: '', car_class: '', confirmation_number: '', vendor: '', notes: '' })
    fetchAll()
  }

  const handleUpdateRental = async (id, field, value) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('event_rental_cars').update({ [field]: value || null }).eq('id', id)
    if (error) { console.error('Failed to update rental:', error); setSaveError('Failed to save. Please try again.') }
    fetchAll()
  }

  const handleRemoveRental = async (id) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('event_rental_cars').delete().eq('id', id)
    if (error) { console.error('Failed to remove rental:', error); setSaveError('Failed to remove. Please try again.') }
    fetchAll()
  }

  const handleSaveHotel = async () => {
    const s = getSupabase()
    const { error } = hotel
      ? await s.from('event_hotel').update(hotelForm).eq('id', hotel.id)
      : await s.from('event_hotel').insert([{ ...hotelForm, event_id: eventId }])
    if (error) { console.error('Failed to save hotel:', error); setSaveError('Failed to save hotel. Please try again.'); return }
    setEditingHotel(false)
    fetchAll()
  }

  const handleAddRoom = async () => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').insert([{ event_id: eventId, room_type: 'Double' }])
    if (error) { console.error('Failed to add room:', error); setSaveError('Failed to add room. Please try again.') }
    fetchAll()
  }
  const handleRemoveRoom = async (id) => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').delete().eq('id', id)
    if (error) { console.error('Failed to remove room:', error); setSaveError('Failed to remove room. Please try again.') }
    fetchAll()
  }
  const handleUpdateRoom = async (id, field, value) => {
    const s = getSupabase()
    const { error } = await s.from('event_hotel_rooms').update({ [field]: value || null }).eq('id', id)
    if (error) { console.error('Failed to update room:', error); setSaveError('Failed to save. Please try again.') }
    fetchAll()
  }

  const handleAssignRoomStaff = async (staffMember) => {
    const { roomId, slot } = roomStaffPicker
    const supabase = getSupabase()
    const { error: e1 } = await supabase.from('event_hotel_rooms').update({ [slot]: staffMember.id }).eq('id', roomId)
    if (e1) {
      console.error('Failed to assign staff to room:', e1)
      setSaveError('Failed to assign staff. Please try again.')
      setRoomStaffPicker(null)
      fetchAll()
      return
    }
    setRoomStaffPicker(null)
    const arrival = arrivals.find(a => a.staff_id === staffMember.id)
    const departure = departures.find(d => d.staff_id === staffMember.id)
    const room = rooms.find(r => r.id === roomId)
    if (arrival?.travel_date || departure?.travel_date) {
      const updates = {}
      const otherStaffId = slot === 'staff_id_1' ? room?.staff_id_2 : room?.staff_id_1
      const otherArrival = arrivals.find(a => a.staff_id === otherStaffId)
      const dates = [arrival?.travel_date, otherArrival?.travel_date].filter(Boolean)
      if (dates.length > 0) updates.check_in_date = dates.sort()[0]
      const otherDeparture = departures.find(d => d.staff_id === otherStaffId)
      const depDates = [departure?.travel_date, otherDeparture?.travel_date].filter(Boolean)
      if (depDates.length > 0) updates.check_out_date = depDates.sort().reverse()[0]
      if (Object.keys(updates).length > 0) {
        const { error: e2 } = await supabase.from('event_hotel_rooms').update(updates).eq('id', roomId)
        if (e2) console.error('Failed to update room dates:', e2)
      }
    }
    fetchAll()
  }

  const roomedStaffIds = rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)
  const unroomedStaff = confirmedStaff.filter(s => !roomedStaffIds.includes(s.id))
  const handleAddSelectedToRooming = async () => {
    const supabase = getSupabase()
    const results = await Promise.all(selectedUnroomed.map(staffId =>
      supabase.from('event_hotel_rooms').insert([{ event_id: eventId, staff_id_1: staffId, room_type: 'Single' }])
    ))
    const failed = results.find(r => r.error)
    if (failed) { console.error('Failed to add to rooming:', failed.error); setSaveError('Failed to add staff to rooming. Please try again.') }
    setSelectedUnroomed([])
    fetchAll()
  }

  const getEventDates = () => {
    if (!event?.load_in_date || !event?.load_out_date) return []
    const dates = []
    const current = new Date(event.load_in_date + 'T00:00:00')
    const end = new Date(event.load_out_date + 'T00:00:00')
    while (current <= end) {
      const pad = n => String(n).padStart(2, '0')
      dates.push(`${current.getFullYear()}-${pad(current.getMonth()+1)}-${pad(current.getDate())}`)
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  const formatStaffDays = (staffId) => {
    const arrival = arrivals.find(a => a.staff_id === staffId)
    const departure = departures.find(d => d.staff_id === staffId)
    const inDate = arrival?.travel_date
    const outDate = departure?.travel_date
    if (!inDate && !outDate) return '—'
    let nights = ''
    if (inDate && outDate) {
      const d1 = new Date(inDate + 'T00:00:00')
      const d2 = new Date(outDate + 'T00:00:00')
      const days = Math.round((d2 - d1) / 86400000) + 1
      nights = ` (${days} day${days === 1 ? '' : 's'})`
    }
    return `${fmtDate(inDate)} – ${fmtDate(outDate)}${nights}`
  }

  const handleSaveRates = async () => {
    const supabase = getSupabase()
    const data = { breakfast_rate: parseFloat(ratesForm.breakfast_rate) || 0, lunch_rate: parseFloat(ratesForm.lunch_rate) || 0, dinner_rate: parseFloat(ratesForm.dinner_rate) || 0, event_id: eventId }
    if (perDiemRates) {
      await supabase.from('event_perdiem_rates').update(data).eq('event_id', eventId)
    } else {
      await supabase.from('event_perdiem_rates').insert([data])
    }
    setShowRatesModal(false)
    fetchAll()
  }

  const handleToggleMeal = async (date, meal) => {
    const supabase = getSupabase()
    const existing = perDiemMeals.find(m => m.meal_date === date)
    if (existing) {
      await supabase.from('event_perdiem_meals').update({ [meal]: !existing[meal] }).eq('id', existing.id)
    } else {
      await supabase.from('event_perdiem_meals').insert([{ event_id: eventId, meal_date: date, [meal]: true }])
    }
    fetchAll()
  }

  const handleToggleExtraDay = async (perDiemStaffId, current) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').update({ extra_day: !current }).eq('id', perDiemStaffId)
    fetchAll()
  }

  const handleAddPerDiemStaff = async (staffId) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').insert([{ event_id: eventId, staff_id: staffId, extra_day: false }])
    fetchAll()
  }

  const handleRemovePerDiemStaff = async (perDiemStaffId) => {
    const supabase = getSupabase()
    await supabase.from('event_perdiem_staff').delete().eq('id', perDiemStaffId)
    fetchAll()
  }

  const calcStaffPerDiem = (staffEntry) => {
    if (!perDiemRates) return 0
    const { breakfast_rate, lunch_rate, dinner_rate } = perDiemRates
    const dailyMax = (breakfast_rate || 0) + (lunch_rate || 0) + (dinner_rate || 0)
    const eventDates = getEventDates()
    let total = 0
    for (const date of eventDates) {
      const meal = perDiemMeals.find(m => m.meal_date === date)
      let dayTotal = 0
      if (!meal?.breakfast_provided) dayTotal += (breakfast_rate || 0)
      if (!meal?.lunch_provided) dayTotal += (lunch_rate || 0)
      if (!meal?.dinner_provided) dayTotal += (dinner_rate || 0)
      total += dayTotal
    }
    if (staffEntry.extra_day) total += dailyMax
    return total
  }

  if (loading) return <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</div>

  const ROOM_GRID = '1.2fr 1.2fr 0.8fr 0.7fr 0.7fr 1fr 24px'
  const eventDates = getEventDates()
  const dailyMax = perDiemRates ? (Number(perDiemRates.breakfast_rate) || 0) + (Number(perDiemRates.lunch_rate) || 0) + (Number(perDiemRates.dinner_rate) || 0) : 0
  const grandTotal = perDiemStaff.reduce((sum, s) => sum + calcStaffPerDiem(s), 0)
  const MEAL_TYPES = [
    { key: 'breakfast_provided', label: 'Breakfast', rate: perDiemRates?.breakfast_rate },
    { key: 'lunch_provided', label: 'Lunch', rate: perDiemRates?.lunch_rate },
    { key: 'dinner_provided', label: 'Dinner', rate: perDiemRates?.dinner_rate },
  ]

  const TABS = [
    { key: 'arrivals', label: `Arrivals (${arrivals.length})` },
    { key: 'departures', label: `Departures (${departures.length})` },
    { key: 'hotel', label: 'Hotel' },
    { key: 'rental', label: `Rental Cars (${rentalCars.length})` },
    { key: 'perdiem', label: 'Per Diem' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 0 }}>
      {saveError && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{saveError}</p>}

      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, padding: '0 0 4px' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTravelTab(t.key)}
              style={travelTab === t.key
                ? { background: 'rgba(26,86,219,0.08)', color: 'var(--color-info)', fontWeight: 600, fontSize: 14, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }
                : { background: 'transparent', color: 'var(--text-secondary)', fontWeight: 400, fontSize: 14, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* ARRIVALS */}
      {travelTab === 'arrivals' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Sticky header block — does not scroll */}
          <div style={{ flexShrink: 0, paddingBottom: 8, background: 'var(--page-bg, var(--surface-card))' }}>
            <TravelTableHeader
              sortField={arrivalSort.field}
              sortDir={arrivalSort.dir}
              onSort={(f) => handleSort('arrival', f)}
              type="arrival"
              onQuickSort={() => {
                const sort = { field: 'travel_date', dir: 'asc' }
                try { localStorage.setItem(`arrival_sort_${eventId}`, JSON.stringify(sort)) } catch {}
                setArrivalSorted(true)
                setArrivalSort(sort)
                setDisplayArrivals(sortRows(arrivals, sort))
              }}
            />
          </div>
          {/* Scrollable tile */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...GLASS }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {displayArrivals.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No arrivals yet. Confirm staff on the Staffing tab to auto-populate.</div>
              )}
              {displayArrivals.map((row, idx) => {
                const isDriving = row.travel_type === 'driving'
                const showWarning = isDriving
                  ? (!row.travel_date || !row.travel_type)
                  : (!row.travel_date || !row.travel_type || !row.airline || !row.flight_number || !row.arrival_time || !row.airport || !row.transport)
                const rowBg = idx % 2 === 0 ? (isLightMode ? '#ffffff' : 'var(--surface-card)') : (isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)')
                return (
                  <div key={row.id ?? `synthetic-${row.staff_id}`}
                    style={{ display: 'grid', gridTemplateColumns: TRAVEL_GRID, gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--border-default)', background: isDriving ? 'rgba(168,85,247,0.06)' : rowBg, transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDriving ? 'rgba(168,85,247,0.10)' : 'var(--glass-tile-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDriving ? 'rgba(168,85,247,0.06)' : rowBg }}
                  >
                    <div style={{ ...TRAVEL_CELL, gap: 6 }}>
                      {showWarning && <WarningTriangle />}
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.staff_name || '—'}</span>
                    </div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><TravelTypeDropdown value={row.travel_type} onChange={v => handleUpdateArrival(row, 'travel_type', v)} /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.travel_date} type="date" centered onSave={v => handleUpdateArrival(row, 'travel_date', v)} /></div>
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.airline} onSave={v => handleUpdateArrival(row, 'airline', v)} placeholder={row.travel_type === 'train' ? 'Operator' : row.travel_type === 'bus' ? 'Operator' : 'Airline'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.flight_number} onSave={v => handleUpdateArrival(row, 'flight_number', v)} placeholder={row.travel_type === 'train' ? 'Train #' : row.travel_type === 'bus' ? 'Route #' : 'Flight #'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.arrival_time} type="time" onSave={v => handleUpdateArrival(row, 'arrival_time', v)} centered /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.airport} onSave={v => handleUpdateArrival(row, 'airport', v)} placeholder={row.travel_type === 'train' ? 'Station' : row.travel_type === 'bus' ? 'Terminal / Stop' : 'Airport'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.transport} onSave={v => handleUpdateArrival(row, 'transport', v)} placeholder="Transport" centered /></div>}
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}>
                      <div onClick={() => handleRemoveArrival(row.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }} onMouseEnter={hoverDanger} onMouseLeave={unhoverDanger}>×</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* DEPARTURES */}
      {travelTab === 'departures' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Sticky header block — does not scroll */}
          <div style={{ flexShrink: 0, paddingBottom: 8, background: 'var(--page-bg, var(--surface-card))' }}>
            <TravelTableHeader
              sortField={departureSort.field}
              sortDir={departureSort.dir}
              onSort={(f) => handleSort('departure', f)}
              type="departure"
              onQuickSort={() => {
                const sort = { field: 'travel_date', dir: 'asc' }
                try { localStorage.setItem(`departure_sort_${eventId}`, JSON.stringify(sort)) } catch {}
                setDepartureSorted(true)
                setDepartureSort(sort)
                setDisplayDepartures(sortRows(departures, sort))
              }}
            />
          </div>
          {/* Scrollable tile */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...GLASS }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {displayDepartures.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No departures yet. Confirm staff on the Staffing tab to auto-populate.</div>
              )}
              {displayDepartures.map((row, idx) => {
                const isDriving = row.travel_type === 'driving'
                const showWarning = isDriving
                  ? (!row.travel_date || !row.travel_type)
                  : (!row.travel_date || !row.travel_type || !row.airline || !row.flight_number || !row.departure_time || !row.airport || !row.transport)
                const rowBg = idx % 2 === 0 ? (isLightMode ? '#ffffff' : 'var(--surface-card)') : (isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)')
                return (
                  <div key={row.id ?? `synthetic-${row.staff_id}`}
                    style={{ display: 'grid', gridTemplateColumns: TRAVEL_GRID, gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--border-default)', background: isDriving ? 'rgba(168,85,247,0.06)' : rowBg, transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isDriving ? 'rgba(168,85,247,0.10)' : 'var(--glass-tile-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isDriving ? 'rgba(168,85,247,0.06)' : rowBg }}
                  >
                    <div style={{ ...TRAVEL_CELL, gap: 6 }}>
                      {showWarning && <WarningTriangle />}
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.staff_name || '—'}</span>
                    </div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><TravelTypeDropdown value={row.travel_type} onChange={v => handleUpdateDeparture(row, 'travel_type', v)} /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.travel_date} type="date" centered onSave={v => handleUpdateDeparture(row, 'travel_date', v)} /></div>
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.airline} onSave={v => handleUpdateDeparture(row, 'airline', v)} placeholder={row.travel_type === 'train' ? 'Operator' : row.travel_type === 'bus' ? 'Operator' : 'Airline'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.flight_number} onSave={v => handleUpdateDeparture(row, 'flight_number', v)} placeholder={row.travel_type === 'train' ? 'Train #' : row.travel_type === 'bus' ? 'Route #' : 'Flight #'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.departure_time} type="time" onSave={v => handleUpdateDeparture(row, 'departure_time', v)} centered /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.airport} onSave={v => handleUpdateDeparture(row, 'airport', v)} placeholder={row.travel_type === 'train' ? 'Station' : row.travel_type === 'bus' ? 'Terminal / Stop' : 'Airport'} centered={true} /></div>}
                    {isDriving ? <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }} /> : <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={row.transport} onSave={v => handleUpdateDeparture(row, 'transport', v)} placeholder="Transport" centered /></div>}
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}>
                      <div onClick={() => handleRemoveDeparture(row.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }} onMouseEnter={hoverDanger} onMouseLeave={unhoverDanger}>×</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENTAL CARS */}
      {travelTab === 'rental' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr 1fr 0.8fr 1fr 1fr 24px', gap: '0 6px', flex: 1, alignItems: 'center', padding: '0 12px' }}>
              <div style={TRAVEL_HEADER_CELL}>Driver</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Pickup Date</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Return Date</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Pickup Location</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Return Location</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Car Class</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Vendor</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Confirmation #</div>
              <div />
            </div>
            <button
              onClick={() => { setRentalForm({ staff_id: '', pickup_date: '', return_date: '', pickup_location: '', return_location: '', car_class: '', confirmation_number: '', vendor: '', notes: '' }); setEditingRental('new') }}
              style={{ ...ADD_BTN, marginLeft: 12, flexShrink: 0 }}
              onMouseEnter={hoverBlue}
              onMouseLeave={unhoverBlue}
            >+ Add</button>
          </div>
          {/* Scrollable tile */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...GLASS }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {rentalCars.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No rental cars added yet.</div>
              )}
              {rentalCars.map((car, idx) => {
                const rowBg = idx % 2 === 0 ? (isLightMode ? '#ffffff' : 'var(--surface-card)') : (isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)')
                const showWarning = !car.pickup_date || !car.return_date || !car.pickup_location || !car.vendor
                return (
                  <div key={car.id}
                    style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 1fr 1fr 0.8fr 1fr 1fr 24px', gap: '0 6px', alignItems: 'center', padding: '7px 12px', borderTop: idx === 0 ? 'none' : '0.5px solid var(--border-default)', background: rowBg, transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                  >
                    <div style={{ ...TRAVEL_CELL, gap: 6 }}>
                      {showWarning && <WarningTriangle />}
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {car.staff ? `${car.staff.first_name} ${car.staff.last_name}` : '—'}
                      </span>
                    </div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.pickup_date} type="date" centered onSave={v => handleUpdateRental(car.id, 'pickup_date', v)} /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.return_date} type="date" centered onSave={v => handleUpdateRental(car.id, 'return_date', v)} /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.pickup_location} centered onSave={v => handleUpdateRental(car.id, 'pickup_location', v)} placeholder="Location" /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.return_location} centered onSave={v => handleUpdateRental(car.id, 'return_location', v)} placeholder="Location" /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.car_class} centered onSave={v => handleUpdateRental(car.id, 'car_class', v)} placeholder="Class" /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.vendor} centered onSave={v => handleUpdateRental(car.id, 'vendor', v)} placeholder="Vendor" /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}><EditableCell value={car.confirmation_number} centered onSave={v => handleUpdateRental(car.id, 'confirmation_number', v)} placeholder="Conf #" /></div>
                    <div style={{ ...TRAVEL_CELL, justifyContent: 'center' }}>
                      <div onClick={() => handleRemoveRental(car.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }} onMouseEnter={hoverDanger} onMouseLeave={unhoverDanger}>×</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* HOTEL */}
      {travelTab === 'hotel' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Sticky header */}
          <div style={{ flexShrink: 0, padding: '14px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 6px', flex: 1, alignItems: 'center', padding: '0 12px' }}>
              <div style={TRAVEL_HEADER_CELL}>Guest 1</div>
              <div style={TRAVEL_HEADER_CELL}>Guest 2</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Type</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Check In</div>
              <div style={{ ...TRAVEL_HEADER_CELL, textAlign: 'center' }}>Check Out</div>
              <div style={TRAVEL_HEADER_CELL}>Notes</div>
              <div />
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
              {hotel && <button onClick={() => setEditingHotel(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Edit Hotel</button>}
              {!hotel && <button onClick={() => setEditingHotel(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Add Hotel</button>}
            </div>
          </div>

          {/* Hotel info strip — shows above the tile when hotel exists */}
          {hotel && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 24, flexWrap: 'wrap', padding: '0 12px 8px' }}>
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Hotel</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.hotel_name || '—'}</div></div>
              {hotel.address && <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Address</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.address}</div></div>}
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Check In</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtDate(hotel.check_in_date)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Check Out</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmtDate(hotel.check_out_date)}</div></div>
              {hotel.notes && <div><div style={{ fontSize: 10, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Notes</div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{hotel.notes}</div></div>}
            </div>
          )}

          {/* Scrollable GLASS tile — rooms + unroomed staff */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...GLASS }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {rooms.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-muted)' }}>No rooms added yet.</div>
              )}
              {rooms.map((room, idx) => {
                const rowBg = idx % 2 === 0 ? (isLightMode ? '#ffffff' : 'var(--surface-card)') : (isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)')
                return (
                  <div key={room.id}
                    style={{ display: 'grid', gridTemplateColumns: ROOM_GRID, gap: '0 6px', padding: '7px 12px', alignItems: 'center', borderTop: idx === 0 ? 'none' : '0.5px solid var(--border-default)', background: rowBg, transition: 'background 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                  >
                    <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_1' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s1 ? 'var(--text-primary)' : 'var(--color-info)' }}>
                      {room.s1 ? `${room.s1.first_name} ${room.s1.last_name}` : '+ Assign'}
                    </div>
                    <div onClick={() => setRoomStaffPicker({ roomId: room.id, slot: 'staff_id_2' })} style={{ fontSize: 13, cursor: 'pointer', color: room.s2 ? 'var(--text-primary)' : 'var(--color-info)' }}>
                      {room.s2 ? `${room.s2.first_name} ${room.s2.last_name}` : '+ Assign'}
                    </div>
                    <select value={room.room_type || 'Double'} onChange={e => handleUpdateRoom(room.id, 'room_type', e.target.value)} style={SYSTEM_SELECT}>
                      {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <EditableCell value={room.check_in_date} type="date" centered onSave={v => handleUpdateRoom(room.id, 'check_in_date', v)} />
                    <EditableCell value={room.check_out_date} type="date" centered onSave={v => handleUpdateRoom(room.id, 'check_out_date', v)} />
                    <EditableCell value={room.notes} onSave={v => handleUpdateRoom(room.id, 'notes', v)} placeholder="Notes" />
                    <div onClick={() => handleRemoveRoom(room.id)} style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'right' }} onMouseEnter={hoverDanger} onMouseLeave={unhoverDanger}>×</div>
                  </div>
                )
              })}
              <div style={{ padding: '8px 12px', borderTop: rooms.length > 0 ? '0.5px solid var(--border-default)' : 'none' }}>
                <span onClick={handleAddRoom} style={{ fontSize: 13, color: 'var(--color-info)', cursor: 'pointer' }}>+ Add room</span>
              </div>

              {/* Unroomed staff */}
              {unroomedStaff.length > 0 && (
                <div style={{ padding: '12px 12px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                      Unroomed Staff ({unroomedStaff.length})
                    </div>
                    {selectedUnroomed.length > 0 && (
                      <button onClick={handleAddSelectedToRooming} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                        Add {selectedUnroomed.length} to Rooming List
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {unroomedStaff.map(s => {
                      const selected = selectedUnroomed.includes(s.id)
                      return (
                        <div key={s.id}
                          onClick={() => setSelectedUnroomed(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                          style={{ ...GLASS, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, ...(selected ? { border: '0.5px solid var(--color-info)', background: 'rgba(26,86,219,0.10)' } : null), transition: 'all 0.15s' }}
                        >
                          <Checkbox checked={selected} onClick={() => {}} />
                          {s.first_name} {s.last_name}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PER DIEM */}
      {travelTab === 'perdiem' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {!perDiemRates ? (
            <div style={{ ...GLASS, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Set meal rates to get started.</div>
              <button onClick={() => setShowRatesModal(true)} style={ADD_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Set Rates</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>

              {/* LEFT — Per Diem Breakout (scrollable) */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2, flexShrink: 0 }}>Per Diem Breakout</div>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...GLASS }}>
                  {/* Column headers */}
                  <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1.4fr 1fr 60px 80px', gap: '0 6px', padding: '12px 16px 6px', borderBottom: '0.5px solid var(--border-default)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Days on Site</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' }}>+1 Day</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>Total</div>
                  </div>
                {/* Scrollable rows */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {perDiemStaff.length === 0 && (
                    <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)' }}>No eligible staff yet.</div>
                  )}
                  {perDiemStaff.map((entry, idx) => {
                    const rowBg = idx % 2 === 0 ? (isLightMode ? '#ffffff' : 'var(--surface-card)') : (isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)')
                    return (
                      <div key={entry.id}
                        style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 60px 80px', gap: '0 6px', alignItems: 'center', padding: '7px 16px', borderTop: '0.5px solid var(--border-default)', background: rowBg, transition: 'background 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                      >
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{entry.staff ? `${entry.staff.first_name} ${entry.staff.last_name}` : '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatStaffDays(entry.staff_id)}</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Checkbox checked={!!entry.extra_day} onClick={() => handleToggleExtraDay(entry.id, entry.extra_day)} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{fmtMoney(calcStaffPerDiem(entry))}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Footer */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                  <span onClick={() => setShowEligibleModal(true)} style={{ fontSize: 13, color: 'var(--color-info)', cursor: 'pointer' }}>+ Add staff</span>
                </div>
                </div>
              </div>

              {/* RIGHT COLUMN — stacked tiles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>

                {/* TOP RIGHT — Per Diem Totals */}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>Per Diem Totals</div>
                  <div style={{ ...GLASS, padding: '16px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    {[
                      { label: 'Breakfast', value: perDiemRates.breakfast_rate },
                      { label: 'Lunch', value: perDiemRates.lunch_rate },
                      { label: 'Dinner', value: perDiemRates.dinner_rate },
                    ].map(r => (
                      <div key={r.label} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3 }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtMoney(r.value)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <button
                      onClick={() => setShowRatesModal(true)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, border: 'none', background: '#FFD60A', color: '#0a1628', cursor: 'pointer' }}
                    >Adjust Rates</button>
                  </div>
                  <div style={{ borderTop: '0.5px solid var(--border-default)', paddingTop: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Grand Total</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-info)' }}>{fmtMoney(grandTotal)}</div>
                  </div>
                  </div>
                </div>

                {/* BOTTOM RIGHT — Meals Provided */}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-info)', marginBottom: 6, paddingLeft: 2 }}>Meals Provided</div>
                  <div style={{ ...GLASS, padding: '16px', flexShrink: 0 }}>
                  {eventDates.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No event dates.</div>
                  ) : (
                    <div>
                      {/* Date headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: `1fr 1fr 1fr 1fr`, gap: '0 4px', marginBottom: 6 }}>
                        <div />
                        {['Breakfast', 'Lunch', 'Dinner'].map(l => (
                          <div key={l} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{l}</div>
                        ))}
                      </div>
                      {eventDates.map((d, di) => {
                        const m = perDiemMeals.find(pm => pm.meal_date === d)
                        return (
                          <div key={d} style={{ display: 'grid', gridTemplateColumns: `1fr 1fr 1fr 1fr`, gap: '0 4px', alignItems: 'center', padding: '6px 0', background: 'transparent', borderTop: di === 0 ? 'none' : '0.5px solid var(--border-default)' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDateHeader(d)}</div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <Checkbox checked={!!m?.breakfast_provided} onClick={() => handleToggleMeal(d, 'breakfast_provided')} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <Checkbox checked={!!m?.lunch_provided} onClick={() => handleToggleMeal(d, 'lunch_provided')} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <Checkbox checked={!!m?.dinner_provided} onClick={() => handleToggleMeal(d, 'dinner_provided')} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* HOTEL EDIT MODAL */}
      {editingHotel && (
        <div style={OVERLAY} onClick={() => setEditingHotel(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 28, width: 500, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{hotel ? 'Edit Hotel' : 'Add Hotel'}</div>
            {[{ label: 'Hotel Name', key: 'hotel_name', type: 'text' }, { label: 'Address', key: 'address', type: 'text' }, { label: 'Check In', key: 'check_in_date', type: 'date' }, { label: 'Check Out', key: 'check_out_date', type: 'date' }, { label: 'Notes', key: 'notes', type: 'text' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} style={SYSTEM_INPUT} value={hotelForm[f.key]} onChange={e => setHotelForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingHotel(false)}
                style={CANCEL_BTN}
                onMouseEnter={hoverBlue}
                onMouseLeave={unhoverBlue}
              >Cancel</button>
              <button className="btn-primary" onClick={handleSaveHotel}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SET RATES MODAL */}
      {showRatesModal && (
        <div style={OVERLAY} onClick={() => setShowRatesModal(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 360, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Set Meal Rates</div>
            {[{ label: 'Breakfast Rate', key: 'breakfast_rate' }, { label: 'Lunch Rate', key: 'lunch_rate' }, { label: 'Dinner Rate', key: 'dinner_rate' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type="number" step="0.01" style={SYSTEM_INPUT} value={ratesForm[f.key]} onChange={e => setRatesForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRatesModal(false)}
                style={CANCEL_BTN}
                onMouseEnter={hoverBlue}
                onMouseLeave={unhoverBlue}
              >Cancel</button>
              <button onClick={handleSaveRates} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--color-info)', color: '#ffffff', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ELIGIBLE STAFF MODAL */}
      {showEligibleModal && (
        <div style={OVERLAY} onClick={() => setShowEligibleModal(false)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 24, width: 400, maxHeight: 480, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Per Diem Eligible Staff</div>
              <div onClick={() => setShowEligibleModal(false)} style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}>×</div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {confirmedStaff.map(s => {
                const entry = perDiemStaff.find(p => p.staff_id === s.id)
                const checked = !!entry
                return (
                  <div key={s.id}
                    onClick={() => checked ? handleRemovePerDiemStaff(entry.id) : handleAddPerDiemStaff(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer' }}
                    onMouseEnter={hoverRow}
                    onMouseLeave={unhoverRow}
                  >
                    <Checkbox checked={checked} onClick={() => {}} />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.first_name} {s.last_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {roomStaffPicker && <StaffPicker onSelect={handleAssignRoomStaff} onClose={() => setRoomStaffPicker(null)} excludeIds={roomedStaffIds} />}

      {/* RENTAL CAR NEW ENTRY MODAL */}
      {editingRental === 'new' && (
        <div style={OVERLAY} onClick={() => setEditingRental(null)}>
          <div style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 14, padding: 28, width: 520, display: 'flex', flexDirection: 'column', gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Add Rental Car</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Driver (Staff)</label>
                <select style={SYSTEM_INPUT} value={rentalForm.staff_id} onChange={e => setRentalForm(p => ({ ...p, staff_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {confirmedStaff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Vendor</label>
                <input style={SYSTEM_INPUT} value={rentalForm.vendor} onChange={e => setRentalForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Enterprise, Hertz, etc." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Pickup Date</label>
                <input type="date" style={SYSTEM_INPUT} value={rentalForm.pickup_date} onChange={e => setRentalForm(p => ({ ...p, pickup_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Return Date</label>
                <input type="date" style={SYSTEM_INPUT} value={rentalForm.return_date} onChange={e => setRentalForm(p => ({ ...p, return_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Pickup Location</label>
                <input style={SYSTEM_INPUT} value={rentalForm.pickup_location} onChange={e => setRentalForm(p => ({ ...p, pickup_location: e.target.value }))} placeholder="Airport, hotel, etc." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Return Location</label>
                <input style={SYSTEM_INPUT} value={rentalForm.return_location} onChange={e => setRentalForm(p => ({ ...p, return_location: e.target.value }))} placeholder="Airport, hotel, etc." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Car Class</label>
                <input style={SYSTEM_INPUT} value={rentalForm.car_class} onChange={e => setRentalForm(p => ({ ...p, car_class: e.target.value }))} placeholder="Economy, SUV, Van, etc." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Confirmation #</label>
                <input style={SYSTEM_INPUT} value={rentalForm.confirmation_number} onChange={e => setRentalForm(p => ({ ...p, confirmation_number: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Notes</label>
                <input style={SYSTEM_INPUT} value={rentalForm.notes} onChange={e => setRentalForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingRental(null)} style={CANCEL_BTN} onMouseEnter={hoverBlue} onMouseLeave={unhoverBlue}>Cancel</button>
              <button onClick={handleAddRental} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--color-info)', color: '#ffffff', cursor: 'pointer' }}>Add Rental Car</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
